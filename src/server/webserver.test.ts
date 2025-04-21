/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type certificatesType } from '../models/Config.js'
import { type ISecretManagerService } from '../interfaces/ISecretManagerService.js'
import { config } from '../test/helper/config.js'
import { Environment } from '../utils/Environment.js'
import { IncomingMessage } from 'node:http'
import { Socket } from 'node:net'
import { devices } from './mpsserver.js'
import { signature } from '../routes/auth/signature.js'
import { jest } from '@jest/globals'
import { spyOn } from 'jest-mock'

Environment.Config = config

let certs: certificatesType
let secrets: ISecretManagerService
jest.unstable_mockModule('node:fs', () => ({
  existsSync: jest.fn(() => true),
  lstatSync: jest.fn(() => ({ isDirectory: () => true })),
  readdirSync: jest.fn(() => ['example.js'] as any)
}))
jest.unstable_mockModule('node:url', () => ({
  URL: jest.fn(() => ({ pathname: '/relay/webrelay.ashx' })),
  fileURLToPath: jest.fn(() => ''),
  pathToFileURL: jest.fn(() => ({ href: '../middleware/custom/example' }))
}))
jest.unstable_mockModule('../middleware/custom/example', () => ({ default: () => function (req, res, next) {} }))
const webserver = await import('./webserver.js')
let web: any

describe('webserver tests', () => {
  beforeAll(async function () {
    jest.setTimeout(60000)

    secrets = {
      getSecretFromKey: async (path: string, key: string) => 'P@ssw0rd',
      getSecretAtPath: async (path: string) => ({}) as any,
      getAMTCredentials: async (path: string) => ['admin', 'P@ssw0rd'],
      getMPSCerts: async () => ({}) as any,
      writeSecretWithObject: async (path: string, data: any) => false,
      deleteSecretAtPath: async (path: string) => {},
      health: async () => ({})
    }
    certs = {
      mps_tls_config: {} as any,
      web_tls_config: {} as any
    }
    web = new webserver.WebServer(secrets, certs)
  })

  describe('WEB Server test', () => {
    it('Create WEBServer', () => {
      expect(web).toBeDefined()
      expect(web.app).toBeDefined()
      expect(web.relayWSS).toBeDefined()
      expect(web.certs).toBeDefined()
      expect(web.app).toBeDefined()
      expect(web.server).toBeDefined()
    })
  })

  describe('verify client token', () => {
    it('should return false when client jwt token is invalid', () => {
      const jwsSpy = spyOn(web.jws, 'verify')
      jwsSpy.mockImplementationOnce(() => false)
      const info = {
        req: {
          url: '/relay/webrelay.ashx?p=2&host=4c4c4544-004b-4210-8033-b6c04f504633&port=16994&tls=0&tls1only=0',
          headers: ['sec-websocket-protocol:invalid']
        }
      }
      const result = web.verifyClientToken(info)
      expect(result).toBe(false)
    })
    it('should return false when client jwt token is for invalid device', () => {
      const inValidToken = signature(5, '4c4c4544-004d-4d10-8050-b3c04f325133', '')
      const info = {
        req: {
          url: '/relay/webrelay.ashx?p=2&host=4c4c4544-004b-4210-8033-b6c04f504633&port=16994&tls=0&tls1only=0',
          headers: {
            'sec-websocket-protocol': inValidToken
          }
        }
      }
      const result = web.verifyClientToken(info)
      expect(result).toBe(false)
    })
    it('should return false when client jwt token is expired', () => {
      const info = {
        req: {
          url: '/relay/webrelay.ashx?p=2&host=4c4c4544-004d-4d10-8050-b3c04f325133&port=16994&tls=0&tls1only=0',
          headers: {
            'sec-websocket-protocol':
              'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZW5hbnRJZCI6IiIsImlzcyI6IjlFbVJKVGJJaUliNGJJZVNzbWdjV0lqclI2SHlFVHFjIiwiZGV2aWNlSWQiOiI0YzRjNDU0NC0wMDRkLTRkMTAtODA1MC1iM2MwNGYzMjUxMzMiLCJleHAiOjE2OTY2MDk5NTN9.52h9jO1f8F4PmckqZeGyrpd3F5Wmq2d8041tO9cFrBc'
          }
        }
      }
      const result = web.verifyClientToken(info)
      expect(result).toBe(false)
    })
    it('should return true when client jwt token is valid', () => {
      const validToken = signature(5, '4c4c4544-004b-4210-8033-b6c04f504633', '')
      devices['4c4c4544-004b-4210-8033-b6c04f504633'] = {} as any
      const info = {
        req: {
          url: '/relay/webrelay.ashx?p=2&host=4c4c4544-004b-4210-8033-b6c04f504633&port=16994&tls=0&tls1only=0',
          headers: {
            'sec-websocket-protocol': validToken
          }
        }
      }
      const result = web.verifyClientToken(info)
      expect(result).toBe(true)
    })
    it('should return false and handle error while client jwt token is verified', () => {
      const jwsSpy = spyOn(web.jws, 'verify')
      jwsSpy.mockImplementationOnce(() => {
        throw new Error()
      })
      const info = {
        req: {
          url: '/relay/webrelay.ashx?p=2&host=4c4c4544-004b-4210-8033-b6c04f504633&port=16994&tls=0&tls1only=0',
          headers: ['sec-websocket-protocol:invalid']
        }
      }
      const result = web.verifyClientToken(info)
      expect(result).toBe(false)
    })
    it('should allow KVM connection when no KVM connection', () => {
      const validToken = signature(5, '4c4c4544-004b-4210-8033-b6c04f504633', '')
      devices['4c4c4544-004b-4210-8033-b6c04f504633'].kvmConnect = false // {} as any
      const info = {
        req: {
          url: '/relay/webrelay.ashx?p=2&host=4c4c4544-004b-4210-8033-b6c04f504633&port=16994&tls=0&tls1only=0',
          headers: {
            'sec-websocket-protocol': validToken
          }
        }
      }
      const result = web.verifyClientToken(info)
      expect(result).toBe(true)
    })

    it('should allow KVM connection when no KVM connection and mode is kvm', () => {
      const validToken = signature(5, '4c4c4544-004b-4210-8033-b6c04f504633', '')
      devices['4c4c4544-004b-4210-8033-b6c04f504633'].kvmConnect = false // {} as any
      const info = {
        req: {
          url: '/relay/webrelay.ashx?p=2&host=4c4c4544-004b-4210-8033-b6c04f504633&port=16994&tls=0&tls1only=0&mode=kvm',
          headers: {
            'sec-websocket-protocol': validToken
          }
        }
      }
      const result = web.verifyClientToken(info)
      expect(result).toBe(true)
    })

    it('should not allow KVM connection when no KVM connection and mode is kvm', () => {
      const validToken = signature(5, '4c4c4544-004b-4210-8033-b6c04f504633', '')
      devices['4c4c4544-004b-4210-8033-b6c04f504633'].kvmConnect = true // {} as any
      const info = {
        req: {
          url: '/relay/webrelay.ashx?p=2&host=4c4c4544-004b-4210-8033-b6c04f504633&port=16994&tls=0&tls1only=0&mode=kvm',
          headers: {
            'sec-websocket-protocol': validToken
          }
        }
      }
      const result = web.verifyClientToken(info)
      expect(result).toBe(false)
    })

    it('should not allow sol connection when sol connection and mode is sol', () => {
      const validToken = signature(5, '4c4c4544-004b-4210-8033-b6c04f504633', '')
      devices['4c4c4544-004b-4210-8033-b6c04f504633'].solConnect = true // {} as any
      const info = {
        req: {
          url: '/relay/webrelay.ashx?p=2&host=4c4c4544-004b-4210-8033-b6c04f504633&port=16994&tls=0&tls1only=0&mode=sol',
          headers: {
            'sec-websocket-protocol': validToken
          }
        }
      }
      const result = web.verifyClientToken(info)
      expect(result).toBe(false)
    })

    it('should not allow sol connection when no sol connection and mode is sol', () => {
      const validToken = signature(5, '4c4c4544-004b-4210-8033-b6c04f504633', '')
      devices['4c4c4544-004b-4210-8033-b6c04f504633'].solConnect = false // {} as any
      const info = {
        req: {
          url: '/relay/webrelay.ashx?p=2&host=4c4c4544-004b-4210-8033-b6c04f504633&port=16994&tls=0&tls1only=0&mode=sol',
          headers: {
            'sec-websocket-protocol': validToken
          }
        }
      }
      const result = web.verifyClientToken(info)
      expect(result).toBe(true)
    })

    it('should not allow ider connection when ider connection and mode is ider', () => {
      const validToken = signature(5, '4c4c4544-004b-4210-8033-b6c04f504633', '')
      devices['4c4c4544-004b-4210-8033-b6c04f504633'].iderConnect = true // {} as any
      const info = {
        req: {
          url: '/relay/webrelay.ashx?p=2&host=4c4c4544-004b-4210-8033-b6c04f504633&port=16994&tls=0&tls1only=0&mode=ider',
          headers: {
            'sec-websocket-protocol': validToken
          }
        }
      }
      const result = web.verifyClientToken(info)
      expect(result).toBe(false)
    })

    it('should allow ider connection when no ider connection and mode is ider', () => {
      const validToken = signature(5, '4c4c4544-004b-4210-8033-b6c04f504633', '')
      devices['4c4c4544-004b-4210-8033-b6c04f504633'].iderConnect = false // {} as any
      const info = {
        req: {
          url: '/relay/webrelay.ashx?p=2&host=4c4c4544-004b-4210-8033-b6c04f504633&port=16994&tls=0&tls1only=0&mode=ider',
          headers: {
            'sec-websocket-protocol': validToken
          }
        }
      }
      const result = web.verifyClientToken(info)
      expect(result).toBe(true)
    })

    it('should not allow KVM connection when KVM connection active', () => {
      const validToken = signature(5, '4c4c4544-004b-4210-8033-b6c04f504633', '')
      devices['4c4c4544-004b-4210-8033-b6c04f504633'].kvmConnect = true // {} as any
      const info = {
        req: {
          url: '/relay/webrelay.ashx?p=2&host=4c4c4544-004b-4210-8033-b6c04f504633&port=16994&tls=0&tls1only=0',
          headers: {
            'sec-websocket-protocol': validToken
          }
        }
      }
      const result = web.verifyClientToken(info)
      expect(result).toBe(false)
    })
    it('should not allow KVM connection when no connection exists', () => {
      const validToken = signature(5, '4c4c4544-004b-4210-8033-b6c04f504633', '')
      devices['4c4c4544-004b-4210-8033-b6c04f504633'] = null
      const info = {
        req: {
          url: '/relay/webrelay.ashx?p=2&host=4c4c4544-004b-4210-8033-b6c04f504633&port=16994&tls=0&tls1only=0',
          headers: {
            'sec-websocket-protocol': validToken
          }
        }
      }
      const result = web.verifyClientToken(info)
      expect(result).toBe(false)
    })
  })

  describe('handle upgrade', () => {
    it('should route the message', () => {
      const request = new IncomingMessage(null)
      request.url = '/relay/webrelay.ashx?p=2&host=4c4c4544-004b-4210-8033-b6c04f504633&port=16994&tls=0&tls1only=0'
      const socket: Socket = new Socket()
      const head: Buffer = null
      const handleUpgradeSpy = spyOn(web.relayWSS, 'handleUpgrade')
      web.handleUpgrade(request, socket, head)
      expect(handleUpgradeSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('middleware', () => {
    it('should load custom middleware', async () => {
      const result = await web.loadCustomMiddleware()
      expect(result.length).toBe(1)
    })
  })

  describe('listen', () => {
    it('should listen on port 3000', () => {
      const listenSpy = spyOn(web.server, 'listen')
      web.listen()
      expect(listenSpy).toHaveBeenCalledTimes(1)
      web.server.close()
    })
    it('should listen on port null', () => {
      const listenSpy = spyOn(web.server, 'listen')
      Environment.Config.web_port = null
      web.listen()
      expect(listenSpy).toHaveBeenCalledTimes(2)
      web.server.close()
    })
  })

  describe('useapiv1', () => {
    it('test useapiv1', async () => {
      const req: Express.Request = {
        db: null,
        secrets: null,
        certs: null
      }
      let res: Express.Response
      const useapiv1Spy = spyOn(web, 'useAPIv1')
      await web.useAPIv1(req as any, res as any, jest.fn())
      expect(useapiv1Spy).toHaveBeenCalledTimes(1)
    })
  })

  describe('appUseJsonParser', () => {
    it('test appUseJsonParser', () => {
      const req: Express.Request = {
        db: null,
        secrets: null,
        certs: null
      }
      let res: Express.Response
      const appUseJsonParserSpy = spyOn(web, 'appUseJsonParser')
      web.appUseJsonParser(null, req as any, res as any, jest.fn())
      expect(appUseJsonParserSpy).toHaveBeenCalledTimes(1)
    })
    it('test appUseJsonParser with error', () => {
      const req: Express.Request = {
        db: null,
        secrets: null,
        certs: null
      }
      const res: Express.Response = {
        status(): any {
          return returnMock
        }
      }
      const returnMock = {
        send(any): void {}
      }
      const err = new SyntaxError()
      const appUseJsonParserSpy = spyOn(web, 'appUseJsonParser')
      web.appUseJsonParser(err, req as any, res as any, jest.fn())
      expect(appUseJsonParserSpy).toHaveBeenCalledTimes(2)
    })
  })

  describe('appUseCall', () => {
    it('test appUseCall', () => {
      const req: Express.Request = {
        deviceAction: {
          ciraHandler: {
            channel: 2
          }
        },
        on: jest.fn()
      }
      const res: Express.Response = {
        on: jest.fn()
      }
      const next = jest.fn()
      const appUseCallSpy = spyOn(web, 'appUseCall')
      web.appUseCall(req as any, res as any, next)
      expect(appUseCallSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('afterResponse', () => {
    it('test afterResponse', () => {
      const req: Express.Request = {
        deviceAction: {
          ciraHandler: {
            channel: {
              CloseChannel: jest.fn()
            }
          }
        },
        on: jest.fn(),
        removeListener: jest.fn()
      }
      const res: Express.Response = {
        removeListener: jest.fn()
      }
      const afterResponseSpy = spyOn(web, 'afterResponse')
      const closeChannelSpy = spyOn((req as any).deviceAction.ciraHandler.channel, 'CloseChannel')
      const reqRemoveListenerSpy = spyOn(req as any, 'removeListener')
      const resRemoveListenerSpy = spyOn(res as any, 'removeListener')
      web.afterResponse(req as any, res as any)
      expect(afterResponseSpy).toHaveBeenCalledTimes(1)
      expect(closeChannelSpy).toHaveBeenCalledTimes(1)
      expect(reqRemoveListenerSpy).toHaveBeenCalledTimes(1)
      expect(resRemoveListenerSpy).toHaveBeenCalledTimes(2)
    })
    it('test afterResponse with undefined channel', () => {
      const req: Express.Request = {
        deviceAction: {
          ciraHandler: {
            channel: null
          }
        },
        on: jest.fn(),
        removeListener: jest.fn()
      }
      const res: Express.Response = {
        removeListener: jest.fn()
      }
      const afterResponseSpy = spyOn(web, 'afterResponse')
      web.afterResponse(req as any, res as any)
      expect(afterResponseSpy).toHaveBeenCalledTimes(2)
    })
    it('test onAborted calls afterResponse', () => {
      const req: Express.Request = {
        deviceAction: {
          ciraHandler: {
            channel: null
          }
        },
        on: jest.fn(),
        removeListener: jest.fn()
      }
      const res: Express.Response = {
        removeListener: jest.fn()
      }
      const afterResponseSpy = spyOn(web, 'afterResponse')
      web.onAborted(req as any, res as any)
      expect(afterResponseSpy).toHaveBeenCalledTimes(3)
    })
  })

  describe('relayconnection', () => {
    it('test relayconnection', async () => {
      const mockWebSocket = {
        pause: jest.fn()
      }
      const mockSocket = new Socket()
      mockSocket.connect = jest.fn() as any

      const mockWebSocketExt = {
        _socket: mockWebSocket,
        forwardclient: mockSocket,
        on: jest.fn()
      }
      const mockIncomingMessage = {
        url: 'https://iotg.com?tls=0'
      }
      const relayConnectionSpy = spyOn(web, 'relayConnection')
      await web.relayConnection(mockWebSocketExt as any, mockIncomingMessage as any)
      expect(relayConnectionSpy).toHaveBeenCalledTimes(1)
    })
  })

  afterAll(function () {})
})
