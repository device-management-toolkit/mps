/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { WsRedirect } from './wsRedirect.js'
import { type queryParams } from '../models/Config.js'
import { RedirectInterceptor } from './redirectInterceptor.js'
import { devices } from '../server/mpsserver.js'
import { ConnectedDevice } from '../amt/ConnectedDevice.js'
import { Socket } from 'node:net'
import { MqttProvider } from './MqttProvider.js'
import { EventEmitter } from 'node:events'
import { jest } from '@jest/globals'
import { spyOn } from 'jest-mock'

const fakeGuid = '00000000-0000-0000-0000-000000000000'

describe('WsRedirect tests', () => {
  const mockWebSocket = {
    _socket: {
      pause: jest.fn(),
      resume: jest.fn()
    }
  }
  let pauseSpy: jest.Spied<any>
  let resumeSpy: jest.Spied<any>
  let wsRedirect: WsRedirect

  beforeEach(() => {
    const secretManagerService = {
      getSecretFromKey: async (path: string, key: string) => 'P@ssw0rd',
      getSecretAtPath: async (path: string) => ({}) as any,
      getAMTCredentials: async (path: string) => ['admin', 'P@ssw0rd'],
      getMPSCerts: async () => ({}) as any,
      writeSecretWithObject: async (path: string, data: any) => false,
      deleteSecretAtPath: async (path: string) => {},
      health: async () => ({})
    }
    resumeSpy = spyOn(mockWebSocket._socket, 'resume').mockReturnValue(null)
    pauseSpy = spyOn(mockWebSocket._socket, 'pause').mockReturnValue(null)
    wsRedirect = new WsRedirect(mockWebSocket as any, secretManagerService)
  })

  describe('handleConnection tests', () => {
    it('should handle connection with TCP socket', async () => {
      const mockSocket = new Socket()
      ;(mockSocket as any).connect = jest.fn()

      const mockIncomingMessage = {
        url: `https://iotg.com?tls=0&host=${fakeGuid}`
      }
      devices[fakeGuid] = new ConnectedDevice(null, 'admin', 'P@ssw0rd', '')

      const setNormalTCPSpy = spyOn(wsRedirect, 'setNormalTCP').mockReturnValue()
      const publishEventSpy = spyOn(MqttProvider, 'publishEvent')
      await wsRedirect.handleConnection(mockIncomingMessage as any)

      expect(setNormalTCPSpy).toHaveBeenCalled()
      expect(publishEventSpy).toHaveBeenCalled()
      expect(pauseSpy).toHaveBeenCalled()
    })
  })

  it('should handle message', () => {
    const message: any = { data: 'hello' }

    wsRedirect.websocketFromDevice = {
      writeData: jest.fn(),
      state: 1
    } as any
    wsRedirect.websocketFromWeb = {
      close: jest.fn()
    } as any
    wsRedirect.interceptor = {
      processBrowserData: jest.fn()
    } as any
    const interceptorSpy = spyOn(wsRedirect.interceptor, 'processBrowserData').mockReturnValue('binaryData')
    const writeSpy = spyOn(wsRedirect.websocketFromDevice, 'writeData')
    void wsRedirect.handleMessage(message)
    const closeSpy = spyOn(wsRedirect.websocketFromWeb, 'close')

    expect(interceptorSpy).toHaveBeenCalledWith(message.data)
    expect(writeSpy).toHaveBeenCalledWith('binaryData')
  })

  it('should close websocket conn to browser if cira channel is closed', () => {
    const message: any = { data: 'hello' }

    wsRedirect.websocketFromDevice = {
      writeData: jest.fn(),
      state: 0
    } as any
    wsRedirect.websocketFromWeb = {
      close: jest.fn()
    } as any
    wsRedirect.interceptor = {
      processBrowserData: jest.fn()
    } as any
    const interceptorSpy = spyOn(wsRedirect.interceptor, 'processBrowserData').mockReturnValue('binaryData')
    const writeSpy = spyOn(wsRedirect.websocketFromDevice, 'writeData')
    void wsRedirect.handleMessage(message)
    const closeSpy = spyOn(wsRedirect.websocketFromWeb, 'close')

    expect(interceptorSpy).toHaveBeenCalledWith(message.data)
    expect(closeSpy).toHaveBeenCalled()
  })

  describe('handleClose tests', () => {
    let params: queryParams
    let publishEventSpy

    beforeEach(() => {
      params = {
        host: 'localhost',
        port: 1111,
        mode: 'kvm' // default mode for testing
      } as any
      wsRedirect.websocketFromDevice = {
        CloseChannel: jest.fn()
      } as any
      devices[params.host] = { kvmConnect: true, iderConnect: true, solConnect: true } as any
      publishEventSpy = spyOn(MqttProvider, 'publishEvent')
    })

    it('should handle close for KVM mode', () => {
      wsRedirect.handleClose(params, null)
      expect(publishEventSpy).toHaveBeenCalled()
      expect(wsRedirect.websocketFromDevice.CloseChannel).toHaveBeenCalled()
      expect(devices[params.host].kvmConnect).toBeFalsy()
    })

    it('should handle close for IDER mode', () => {
      params.mode = 'ider'
      wsRedirect.handleClose(params, null)
      expect(devices[params.host].iderConnect).toBeFalsy()
    })

    it('should handle close for SOL mode', () => {
      params.mode = 'sol'
      wsRedirect.handleClose(params, null)
      expect(devices[params.host].solConnect).toBeFalsy()
    })

    it('should do nothing if websocketFromDevice is not set', () => {
      wsRedirect.websocketFromDevice = null
      wsRedirect.handleClose(params, null)
      expect(publishEventSpy).toHaveBeenCalled()
    })
  })

  describe('createCredential tests', () => {
    it('should create credential for RedirectInterceptor', () => {
      const paramsWithPof2 = {
        p: 2
      }
      const credentials = ['joe blow', 'P@ssw0rd']

      wsRedirect.createCredential(paramsWithPof2 as any, credentials as any)
      expect(wsRedirect.interceptor).toBeInstanceOf(RedirectInterceptor)
      expect(wsRedirect.interceptor.args).toMatchObject({
        user: credentials[0],
        pass: credentials[1]
      })
    })

    it('should not create credential if none are passed in', () => {
      const paramsWithPof2 = {
        p: 2
      }
      const credentials = null

      wsRedirect.createCredential(paramsWithPof2 as any, credentials)
      expect(wsRedirect.interceptor).toBeFalsy()
    })

    it('should not create credential if any are missing', () => {
      const paramsWithPof2 = {
        p: 2
      }
      const credentials = ['test']

      wsRedirect.createCredential(paramsWithPof2 as any, credentials)
      expect(wsRedirect.interceptor).toBeFalsy()
    })

    it('should not create credential too many are passed in', () => {
      const paramsWithPof2 = {
        p: 2
      }
      const credentials = [
        'test1',
        'test2',
        'test3'
      ]

      wsRedirect.createCredential(paramsWithPof2 as any, credentials)
      expect(wsRedirect.interceptor).toBeFalsy()
    })
  })

  describe('setnormalTCP test', () => {
    it('should set normal tcp socket for mps connection', () => {
      const params: queryParams = {
        host: fakeGuid,
        port: 16994
      } as any
      const mockCiraChannel = {
        onData: jest.fn(),
        onStateChange: { on: jest.fn() },
        send: jest.fn()
      } as any
      wsRedirect.ciraHandler = {
        SetupCiraChannel: jest.fn()
      } as any
      wsRedirect.interceptor = {
        processBrowserData: jest.fn()
      } as any
      const setupCIRASpy = spyOn(wsRedirect.ciraHandler, 'SetupCiraChannel').mockReturnValue(mockCiraChannel)

      wsRedirect.setNormalTCP(params)
      expect(setupCIRASpy).toHaveBeenCalled()
      expect(resumeSpy).toHaveBeenCalled()
    })

    it('should close websocket connection and set kvmConnect to false when cira state changes to 0', () => {
      devices[fakeGuid] = new ConnectedDevice(null, 'admin', 'P@ssw0rd', '')
      devices[fakeGuid].kvmConnect = true // Set kvmConnect to true
      const params: queryParams = {
        host: fakeGuid,
        port: 16994
      } as any
      const mockCiraChannel = {
        onData: jest.fn(),
        onStateChange: new EventEmitter(),
        send: jest.fn()
      } as any
      wsRedirect.ciraHandler = {
        SetupCiraChannel: jest.fn()
      } as any
      const setupCIRASpy = spyOn(wsRedirect.ciraHandler, 'SetupCiraChannel').mockReturnValue(mockCiraChannel)

      wsRedirect.setNormalTCP(params)

      const onClose = jest.fn()
      wsRedirect.websocketFromWeb = { close: onClose } as any
      wsRedirect.websocketFromDevice.onStateChange.emit('stateChange', 0) // Emit stateChange event

      expect(setupCIRASpy).toHaveBeenCalled()
      expect(onClose).toHaveBeenCalled()
      expect(devices[fakeGuid].kvmConnect).toBe(false)
    })
  })
})
