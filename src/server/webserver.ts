/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

/**
 * @description Intel AMT Web server object
 * @author Ylian Saint-Hilaire
 * @version v0.2.0c
 */

import { type Socket } from 'node:net'

import express, { type NextFunction, type Request, type RequestHandler, type Response } from 'express'
import { createServer, type IncomingMessage, type Server } from 'node:http'
import parser from 'body-parser'
import jws from 'jws'
import { type certificatesType } from '../models/Config.js'
import { ErrorResponse } from '../utils/amtHelper.js'
import { logger, messages } from '../logging/index.js'
import routes from '../routes/index.js'
import { WebSocketServer, ServerOptions, WebSocket } from 'ws'
import { URL, fileURLToPath, pathToFileURL } from 'node:url'
import cors from 'cors'
import { lstatSync, existsSync, readdirSync } from 'node:fs'
import { DbCreatorFactory } from '../factories/DbCreatorFactory.js'
import { Environment } from '../utils/Environment.js'
import { type ISecretManagerService } from '../interfaces/ISecretManagerService.js'
import { WsRedirect } from '../utils/wsRedirect.js'
import { devices } from './mpsserver.js'
import path from 'node:path'
export class WebServer {
  app: express.Express
  server: Server = null
  relayWSS: WebSocketServer = null
  secrets: ISecretManagerService
  certs: certificatesType
  // to unit test code
  jws: jws = jws
  __filename: string
  __dirname: string
  constructor(secrets: ISecretManagerService, certs: certificatesType) {
    try {
      this.__filename = fileURLToPath(import.meta.url)
      this.__dirname = path.dirname(this.__filename)
      this.secrets = secrets
      this.certs = certs
      this.app = express()

      const options: ServerOptions = {
        noServer: true,
        verifyClient: (info) => this.verifyClientToken(info)
      }
      this.relayWSS = new WebSocketServer(options)

      // Create Server
      this.server = createServer(this.app)
      this.app.use(cors())

      // Handles the Bad JSON exceptions
      this.app.use(parser.json(), this.appUseJsonParser.bind(this))
      this.app.use(this.appUseCall.bind(this))

      // Relay websocket. KVM, IDER & SOL use this websocket.
      this.relayWSS.on('connection', this.relayConnection.bind(this))

      this.loadCustomMiddleware()
        .then((customMiddleware) => {
          this.app.use('/api/v1', this.useAPIv1.bind(this), customMiddleware, routes)
        })
        .catch((err) => {
          logger.error('Error loading custom middleware')
          logger.error(err)
          process.exit(0)
        })

      // Handle upgrade on websocket
      this.server.on('upgrade', this.handleUpgrade.bind(this))
    } catch (error) {
      logger.error(`${messages.WEBSERVER_EXCEPTION}: ${error}`)
      process.exit(0)
    }
  }

  appUseJsonParser(err: any, req: Request, res: Response, next: () => void): Response {
    if (err instanceof SyntaxError) {
      return res.status(400).send(ErrorResponse(400))
    } else {
      logger.debug(messages.APP_USE_JSON_PARSER_ERROR)
    }
    next()
  }

  async loadCustomMiddleware(): Promise<RequestHandler[]> {
    const pathToCustomMiddleware = path.join(this.__dirname, '../middleware/custom')
    const middleware: RequestHandler[] = []
    const doesExist = existsSync(pathToCustomMiddleware)
    const isDirectory = lstatSync(pathToCustomMiddleware).isDirectory()
    if (doesExist && isDirectory) {
      const files = readdirSync(pathToCustomMiddleware)
      for (const file of files) {
        if (path.extname(file) === '.js' && !file.endsWith('test.js')) {
          const filePath = path.join(pathToCustomMiddleware, file)
          const fileURL = pathToFileURL(filePath) // Convert path to URL
          // const customMiddleware = await import(path.join(pathToCustomMiddleware, file.substring(0, file.lastIndexOf('.'))))
          const customMiddleware = await import(fileURL.href) // Use URL href for dynamic import
          logger.info('Loading custom middleware: ' + file)
          if (customMiddleware?.default != null) {
            middleware.push(customMiddleware.default)
          }
        }
      }
    }

    return middleware
  }

  appUseCall(req: Request, res: Response, next: NextFunction): void {
    res.on('finish', this.afterResponse.bind(this, req, res))
    res.on('close', this.afterResponse.bind(this, req, res))
    req.on('aborted', this.onAborted.bind(this, req, res))
    next()
  }

  onAborted(req: Request, res: Response): void {
    logger.debug(`Request aborted: ${req.url ?? 'undefined'}`)
    this.afterResponse(req, res)
  }

  afterResponse(req: Request, res: Response): void {
    if (req.deviceAction?.ciraHandler?.channel) {
      logger.debug(messages.EOR_CLOSING_CHANNEL)
      req.deviceAction.ciraHandler.channel.CloseChannel()
    }
    res.removeListener('finish', this.afterResponse)
    res.removeListener('close', this.afterResponse)
    req.removeListener('aborted', this.onAborted)
    // actions after response
  }

  async relayConnection(ws: WebSocket, req: IncomingMessage): Promise<void> {
    try {
      const wsRedirect = new WsRedirect(ws, this.secrets)
      await wsRedirect.handleConnection(req)
    } catch (err) {
      logger.error(`${messages.EXCEPTION_CAUGHT}: `, err)
    }
  }

  async useAPIv1(req: Request, res: Response, next: NextFunction): Promise<void> {
    const newDB = new DbCreatorFactory()

    req.db = await newDB.getDb()
    req.secrets = this.secrets
    req.certs = this.certs
    next()
  }

  listen(): void {
    // Validate port number
    let port = 3000
    if (Environment.Config.web_port != null) {
      port = Environment.Config.web_port
    } else {
      logger.debug(messages.WEB_PORT_NULL)
    }

    this.server
      .listen(port, () => {
        logger.info(`${messages.MPS_RUNNING_ON} ${Environment.Config.common_name}:${port}.`)
      })
      .on('error', function (err: NodeJS.ErrnoException) {
        if (err.code === 'EADDRINUSE' || err.code === 'EACCES') {
          logger.error(messages.WEB_PORT_INVALID)
        } else {
          logger.error(JSON.stringify(err))
        }
        process.exit(0)
      })
  }

  // Handle Upgrade - WebSocket
  handleUpgrade(request: IncomingMessage, socket: Socket, head: Buffer): void {
    const pathname = new URL(request.url, 'http://dummy.com').pathname
    if (pathname === '/relay/webrelay.ashx') {
      this.relayWSS.handleUpgrade(request, socket, head, (ws) => {
        this.relayWSS.emit('connection', ws, request)
      })
    } else {
      // Invalid endpoint
      logger.debug(messages.ROUTE_DOES_NOT_EXIST)
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
      socket.destroy()
    }
  }

  updateDeviceConnection(guid: string, connectionType: string): boolean {
    const connectionProperty = `${connectionType}Connect`
    if (devices[guid]?.[connectionProperty]) {
      return false
    } else if (devices[guid] != null) {
      devices[guid][connectionProperty] = true
      return true
    } else {
      return false
    }
  }

  verifyClientToken(info): boolean {
    const reqParams: Record<string, any> = {}
    // verify JWT
    try {
      const valid = this.jws.verify(info.req.headers['sec-websocket-protocol'], 'HS256', Environment.Config.jwt_secret)
      const decodedToken = this.jws.decode(info.req.headers['sec-websocket-protocol'])
      const currentTimestamp = Math.floor(Date.now() / 1000) // Current timestamp in seconds
      const deviceId = decodedToken.payload.deviceId

      const queryString = info.req.url.split('?')[1] as string
      const params = new URLSearchParams(queryString)
      params.forEach((value, key) => {
        reqParams[key] = value
      })

      if (
        !valid ||
        !(decodedToken.payload.exp && decodedToken.payload.exp > currentTimestamp) ||
        !(deviceId === reqParams.host)
      ) {
        logger.error('Redirection token invalid')
        return false // reject connection if problem with verify
      }
    } catch (error) {
      logger.error(`Error verifying the token: ${error.message}`)
    }

    const guid = reqParams.host as string
    const mode = reqParams.mode as string
    const modes = [
      'kvm',
      'sol',
      'ider'
    ]

    // Check for backward compatibility
    if (!modes.includes(mode)) {
      return devices[guid]?.kvmConnect ? false : !!devices[guid]
    }

    // Handle device connection based on mode
    return this.updateDeviceConnection(guid, mode)
  }
}
