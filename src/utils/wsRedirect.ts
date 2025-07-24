/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { logger, messages } from '../logging/index.js'
import { type IncomingMessage } from 'node:http'
import { type queryParams } from '../models/Config.js'
import { devices } from '../server/mpsserver.js'
import { type ISecretManagerService } from '../interfaces/ISecretManagerService.js'
import { RedirectInterceptor } from './redirectInterceptor.js'
import type WebSocket from 'ws'
import { CIRAHandler } from '../amt/CIRAHandler.js'
import { type CIRAChannel } from '../amt/CIRAChannel.js'
import { MqttProvider } from './MqttProvider.js'

export class WsRedirect {
  secrets: ISecretManagerService
  interceptor: RedirectInterceptor
  websocketFromWeb: WebSocket
  websocketFromDevice: CIRAChannel // | Socket
  ciraHandler: CIRAHandler
  constructor(ws: WebSocket, secrets: ISecretManagerService) {
    this.secrets = secrets
    this.websocketFromWeb = ws
  }

  handleConnection = async (req: IncomingMessage): Promise<void> => {
    const reqQueryURL = new URL(req.url, 'http://dummy.com')
    const params: queryParams = {
      host: reqQueryURL.searchParams.get('host'),
      port: Number(reqQueryURL.searchParams.get('port')),
      p: Number(reqQueryURL.searchParams.get('p')),
      tls: Number(reqQueryURL.searchParams.get('tls')),
      tls1only: Number(reqQueryURL.searchParams.get('tls1only')),
      mode: reqQueryURL.searchParams.get('mode')
    }

    ;(this.websocketFromWeb as any)._socket.pause()
    // When data is received from the web socket, forward the data into the associated TCP connection.
    // If the TCP connection is pending, buffer up the data until it connects.
    this.websocketFromWeb.onmessage = this.handleMessage.bind(this)

    // If the web socket is closed, close the associated TCP connection.
    this.websocketFromWeb.onclose = this.handleClose.bind(this, params)

    // We got a new web socket connection, initiate a TCP connection to the target Intel AMT host/port.
    logger.debug(`${messages.REDIRECT_OPENING_WEB_SOCKET} to ${params.host}: ${params.port}.`)
    MqttProvider.publishEvent('success', ['handleConnection'], messages.REDIRECTION_SESSION_STARTED)

    // Fetch Intel AMT credentials & Setup interceptor
    const credentials = await this.secrets.getAMTCredentials(params.host)
    if (credentials != null) {
      this.createCredential(params, credentials)
    }

    if (params.tls === 0) {
      const device = devices[params.host]
      if (device != null) {
        this.ciraHandler = new CIRAHandler(device.httpHandler, device.username, device.password)
        this.setNormalTCP(params)
      }
    }
  }

  async handleMessage(msg: WebSocket.MessageEvent): Promise<void> {
    let msgStr = msg.data.toString('binary')

    if (this.interceptor) {
      msgStr = this.interceptor.processBrowserData(msgStr)
    } // Run data thru interceptor

    if (this.websocketFromDevice && this.websocketFromDevice.state > 0) {
      await this.websocketFromDevice.writeData(msgStr) // Forward data to the associated TCP connection.
    } else {
      logger.error('Attempted to write to a closed CIRA Channel.')
      this.websocketFromWeb.close()
    }
  }

  handleClose(params: queryParams, CloseEvent: WebSocket.CloseEvent): void {
    logger.debug(`${messages.REDIRECT_CLOSING_WEB_SOCKET} to ${params.host}: ${params.port}.`)
    if (this.websocketFromDevice) {
      switch (params.mode) {
        case 'kvm':
          devices[params.host].kvmConnect = false // Indicate no current KVM session on the device
          break
        case 'ider':
          devices[params.host].iderConnect = false // Indicate no current ider session on the device
          break
        case 'sol':
          devices[params.host].solConnect = false // Indicate no current sol session on the device
          break
      }

      this.websocketFromDevice.CloseChannel()
      MqttProvider.publishEvent('success', ['handleClose'], messages.REDIRECTION_SESSION_ENDED)
    }
  }

  createCredential(params: queryParams, credentials: string[]): void {
    if (credentials?.length === 2 && credentials[0] != null && credentials[1] != null) {
      logger.debug(messages.REDIRECT_CREATING_CREDENTIAL)
      if (params.p === 2) {
        this.interceptor = new RedirectInterceptor({
          user: credentials[0],
          pass: credentials[1]
        })
      }
    }
  }

  setNormalTCP(params: queryParams): void {
    // If this is TCP (without TLS) set a normal TCP socket
    // check if this is MPS connection

    this.websocketFromDevice = this.ciraHandler.SetupCiraChannel(devices[params.host].ciraSocket, params.port)
    this.websocketFromDevice.write = null
    // this.websocketFromDevice.xtls = 0
    this.websocketFromDevice.onData = (data: string): void => {
      // Run data thru interceptor
      if (this.interceptor) {
        data = this.interceptor.processAmtData(data)
      }
      try {
        this.websocketFromWeb.send(data)
      } catch (e) {
        logger.error(`${messages.REDIRECT_FORWARD_DATA_EXCEPTION}: ${e}`)
      }
    }

    this.websocketFromDevice.onStateChange.on('stateChange', (state: number) => {
      logger.debug(`${messages.REDIRECT_CIRA_STATE_CHANGE}:` + state)
      if (state === 0) {
        try {
          logger.debug(messages.REDIRECT_CLOSING_WEB_SOCKET)
          devices[params.host].kvmConnect = false // Indicate no current KVM session on the device
          this.websocketFromWeb.close()
        } catch (e) {
          logger.error(`${messages.REDIRECT_CLOSING_WEBSOCKET_EXCEPTION}: ${e}`)
        }
      }
    })
    ;(this.websocketFromWeb as any)._socket.resume()
  }
}
