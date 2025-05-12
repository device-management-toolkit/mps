/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type CIRASocket } from '../models/models.js'
import APFProcessor from './APFProcessor.js'
import { type connectionParams, type HttpHandler } from './HttpHandler.js'
import { parse } from 'http-z'
import { AMTPort } from '../utils/constants.js'
import { type Common } from '@open-amt-cloud-toolkit/wsman-messages'
import { CIRAChannel } from './CIRAChannel.js'
import { parseBody } from '../utils/parseWSManResponseBody.js'
import Bottleneck from 'bottleneck'

export interface PendingRequests {
  xml?: string
  response?: any
  messageId?: string
}
export class CIRAHandler {
  xml: string
  httpHandler: HttpHandler
  username: string
  password: string
  channel: CIRAChannel
  channelState = 0
  connectAttempts = 0
  socket: CIRASocket
  constructor(
    httpHandler: HttpHandler,
    username: string,
    password: string,
    public limiter: Bottleneck = new Bottleneck()
  ) {
    this.username = username
    this.password = password
    this.httpHandler = httpHandler
  }

  // Setup CIRA Channel
  SetupCiraChannel(socket: CIRASocket, targetPort: number): CIRAChannel {
    const sourcePort = (socket.tag.nextsourceport++ % 30000) + 1024
    const channel = new CIRAChannel(this.httpHandler, targetPort, socket)
    APFProcessor.SendChannelOpen(
      channel.socket,
      false,
      channel.channelid,
      channel.ciraWindow,
      channel.socket.tag.host,
      channel.targetport,
      '1.2.3.4',
      sourcePort
    )
    channel.write = async (rawXML: string): Promise<any> => {
      const params: connectionParams = {
        guid: this.channel.socket.tag.nodeid,
        port: AMTPort,
        digestChallenge: this.httpHandler.digestChallenge,
        username: this.username,
        password: this.password
      }
      return await channel.writeData(rawXML, params)
    }
    socket.tag.channels[channel.channelid] = channel
    return channel
  }

  async Connect(): Promise<number> {
    return await new Promise((resolve, reject) => {
      this.channel = this.SetupCiraChannel(this.socket, AMTPort)
      this.channel.onStateChange.on('stateChange', (state: number) => {
        this.channelState = state
        resolve(state)
      })
    })
  }

  async Delete<T>(socket: CIRASocket, rawXml: string): Promise<Common.Models.Response<T>> {
    return await this.Send(socket, rawXml)
  }

  async Enumerate(socket: CIRASocket, rawXml: string): Promise<Common.Models.Response<Common.Models.Enumerate>> {
    return await this.Send(socket, rawXml)
  }

  async Pull<T>(socket: CIRASocket, rawXml: string): Promise<Common.Models.Response<Common.Models.Pull<T>>> {
    return await this.Send(socket, rawXml)
  }

  async Get<T>(socket: CIRASocket, rawXml: string): Promise<Common.Models.Response<T>> {
    return await this.Send(socket, rawXml)
  }

  async Send(socket: CIRASocket, rawXml: string): Promise<any> {
    this.socket = socket
    return await this.limiter.schedule(async () => await this.ExecRequest(rawXml))
  }

  async ExecRequest(xml: string): Promise<any> {
    if (this.channelState === 0) {
      this.channelState = await this.Connect()
    }
    if (this.channelState === 2) {
      try {
        if (this.httpHandler.isAuthInProgress == null) {
          this.httpHandler.isAuthInProgress = new Promise((resolve, reject) => {
            this.httpHandler.authResolve = resolve
          })
        } else {
          await this.httpHandler.isAuthInProgress
        }
        const data = await this.channel.write(xml)
        const parsedData = this.handleResult(data)
        return parsedData
      } catch (error) {
        if (error?.message === 'Unauthorized' || error?.message === 'Closed') {
          this.channelState = this.channel.CloseChannel()
          return await this.ExecRequest(xml)
        } else {
          throw error
        }
      }
    }

    return null
  }

  handleAuth(message: any): Common.Models.DigestChallenge {
    const found = message.headers.find((item) => item.name === 'Www-Authenticate')
    if (found != null) {
      return this.httpHandler.parseAuthenticateResponseHeader(found.value)
    }
    return null
  }

  handleResult(data: string): any {
    const message = parse(data)

    if (!('statusCode' in message)) {
      throw new Error('Invalid message format: missing statusCode')
    }

    if (message.statusCode === 401) {
      this.connectAttempts++
      if (this.connectAttempts < 4) {
        this.httpHandler.digestChallenge = this.handleAuth(message)
        this.httpHandler.authResolve()
        if (this.httpHandler.digestChallenge != null) {
          // Executing the failed request once again
          throw new Error('Unauthorized') // could be better
        }
      } else {
        throw new Error('Unable to authenticate with AMT. Exceeded Retry Attempts')
      }
    } else if (message.statusCode === 200) {
      this.connectAttempts = 0
      const xmlBody = parseBody(message)
      // pares WSMan xml response to json
      const response = this.httpHandler.parseXML(xmlBody)
      response.statusCode = message.statusCode
      return response
    } else {
      this.connectAttempts = 0
      const xmlBody = parseBody(message)
      // pares WSMan xml response to json
      const response = this.httpHandler.parseXML(xmlBody)
      response.statusCode = message.statusCode
      return response
    }
  }
}
