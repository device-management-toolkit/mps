/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

// import httpZ, { HttpZResponseModel } from 'http-z'
import { Buffer } from 'node:buffer'
import { type CIRASocket } from '../models/models.js'
import APFProcessor from './APFProcessor.js'
import { type connectionParams, type HttpHandler } from './HttpHandler.js'
import { EventEmitter } from 'node:events'
import { parse } from 'http-z'
import { parseBody } from '../utils/parseWSManResponseBody.js'
import { logger } from '../logging/index.js'

export class CIRAChannel {
  targetport: number
  channelid: number
  socket: CIRASocket
  state: number
  closeSent: boolean
  sendcredits: number
  amtpendingcredits: number
  amtCiraWindow: number
  ciraWindow: number
  write?: (data: string) => Promise<string>
  sendBuffer?: Buffer = null
  amtchannelid?: number
  closing?: number
  onStateChange?: EventEmitter // (state: number) => void
  onData?: any
  sendchannelclose?: any
  rawChunkedData = ''
  digestChallenge = ''
  resolve: (data) => void
  messages = {}
  constructor(
    private readonly httpHandler: HttpHandler,
    targetport: number,
    socket: CIRASocket
  ) {
    this.targetport = targetport
    this.channelid = socket.tag.nextchannelid++
    this.socket = socket
    this.state = 1
    this.closeSent = false
    this.sendcredits = 0
    this.amtpendingcredits = 0
    this.amtCiraWindow = 0
    this.ciraWindow = 32768
    this.onStateChange = new EventEmitter()

    this.onData = (data) => {
      this.rawChunkedData += data
      // For 401 Unauthorized error during digest authentication message ends with </html>, rest all the messages ends with 0\r\n\r\n
      if (this.rawChunkedData.includes('</html>') || this.rawChunkedData.includes('0\r\n\r\n')) {
        try {
          const message = parse(this.rawChunkedData)
          if (!('statusCode' in message)) {
            throw new Error('Invalid message format: missing statusCode')
          }
          if (message.statusCode === 200) {
            const xmlBody = parseBody(message)
            // pares WSMan xml response to json
            const response = httpHandler.parseXML(xmlBody)
            this.messages[response.Envelope.Header.RelatesTo.toString()](this.rawChunkedData)
          } else {
            this.resolve(this.rawChunkedData)
          }
        } catch (err) {
          logger.error(JSON.stringify(err, null, '\t'))
          this.resolve(this.rawChunkedData)
        }
        this.rawChunkedData = ''
      }
    }
  }

  async writeData(data: string, params?: connectionParams): Promise<string> {
    let messageId
    return await new Promise((resolve, reject) => {
      if (data) {
        const messageIDStartIndex = data.indexOf('<a:MessageID>')
        if (messageIDStartIndex !== -1) {
          const messageIDEndIndex = data.indexOf('</a:MessageID>')
          messageId = data.substring(messageIDStartIndex + 13, messageIDEndIndex)
        }
      } else {
        messageId = 0
      }
      if (messageId != null) {
        this.resolve = this.messages[messageId] = resolve
      } else {
        this.resolve = resolve
      }
      if (this.state === 0) {
        reject(new Error('Closed'))
        return
      } // return false
      let wsmanRequest: Buffer
      if (params != null) {
        // this is an API Call
        wsmanRequest = this.httpHandler.wrapIt(params, data)
      } else {
        wsmanRequest = Buffer.from(data, 'binary')
      }
      if (this.sendBuffer == null) {
        this.sendBuffer = wsmanRequest
      } else {
        this.sendBuffer = Buffer.concat([this.sendBuffer, wsmanRequest])
      }
      if (this.state !== 1 && this.sendcredits !== 0) {
        APFProcessor.SendPendingData(this)
      }
      if (messageId == null) {
        resolve(null)
      }
    })
  }

  CloseChannel(): number {
    if (this.state === 0 || this.closing === 1) return this.state
    if (this.state === 1) {
      this.closing = 1
      this.state = 0
      return this.state
    }
    this.state = 0
    this.closing = 1
    APFProcessor.SendChannelClose(this)
    return this.state
  }
}
