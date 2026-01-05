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
import { type SpyInstance, spyOn } from 'jest-mock'
import { logger } from '../logging/index.js'

const fakeGuid = '00000000-0000-0000-0000-000000000000'

describe('WsRedirect tests', () => {
  const mockWebSocket = {
    _socket: {
      pause: jest.fn(),
      resume: jest.fn()
    }
  }
  let pauseSpy: SpyInstance<any>
  let resumeSpy: SpyInstance<any>
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

      expect(setNormalTCPSpy).toBeCalled()
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

    expect(interceptorSpy).toBeCalledWith(message.data)
    expect(writeSpy).toBeCalledWith('binaryData')
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

    expect(interceptorSpy).toBeCalledWith(message.data)
    expect(closeSpy).toBeCalled()
  })

  describe('handleClose tests', () => {
    let params: queryParams
    let publishEventSpy
    let mockEvent: any

    beforeEach(() => {
      params = {
        host: 'localhost',
        port: 1111,
        mode: 'kvm' // default mode for testing
      } as any
      wsRedirect.websocketFromDevice = {
        CloseChannel: jest.fn(),
        state: 1 // Default state: connecting/active
      } as any
      devices[params.host] = { kvmConnect: true, iderConnect: true, solConnect: true } as any
      publishEventSpy = spyOn(MqttProvider, 'publishEvent')
      mockEvent = {
        wasClean: true,
        code: 1000,
        reason: 'Normal closure'
      } as any
    })

    it('should handle close for KVM mode', () => {
      const logKvmCloseSpy = spyOn(wsRedirect as any, 'logKvmCloseSource')
      wsRedirect.handleClose(params, mockEvent)
      expect(logKvmCloseSpy).toHaveBeenCalledWith(true, 1, params.host)
      expect(publishEventSpy).toHaveBeenCalled()
      expect(wsRedirect.websocketFromDevice.CloseChannel).toBeCalled()
      expect(devices[params.host].kvmConnect).toBeFalsy()
    })

    it('should handle close for IDER mode', () => {
      params.mode = 'ider'
      wsRedirect.handleClose(params, mockEvent)
      expect(devices[params.host].iderConnect).toBeFalsy()
    })

    it('should handle close for SOL mode', () => {
      params.mode = 'sol'
      wsRedirect.handleClose(params, mockEvent)
      expect(devices[params.host].solConnect).toBeFalsy()
    })

    it('should do nothing if websocketFromDevice is not set', () => {
      publishEventSpy.mockClear() // Clear previous calls
      wsRedirect.websocketFromDevice = null
      wsRedirect.handleClose(params, mockEvent)
      expect(publishEventSpy).not.toHaveBeenCalled()
    })
  })

  describe('logKvmCloseSource tests', () => {
    let publishEventSpy: SpyInstance<any>
    let loggerInfoSpy: SpyInstance<any>

    beforeEach(() => {
      publishEventSpy = spyOn(MqttProvider, 'publishEvent')
      loggerInfoSpy = spyOn(logger, 'info')
    })

    it('should log device-side closure when wasClean is true and state is 0', () => {
      // Access private method using bracket notation
      wsRedirect['logKvmCloseSource'](true, 0, fakeGuid)

      expect(loggerInfoSpy).toHaveBeenCalledWith(`[${fakeGuid}] KVM session closed by device (state: 0)`)
      expect(publishEventSpy).toHaveBeenCalledWith(
        'success',
        ['logKvmCloseSource'],
        'KVM session closed by device (state: 0)',
        fakeGuid
      )
    })

    it('should log web-side closure when wasClean is true and state is 1', () => {
      wsRedirect['logKvmCloseSource'](true, 1, fakeGuid)

      expect(loggerInfoSpy).toHaveBeenCalledWith(`[${fakeGuid}] KVM session closed by web (state: 1)`)
      expect(publishEventSpy).toHaveBeenCalledWith(
        'success',
        ['logKvmCloseSource'],
        'KVM session closed by web (state: 1)',
        fakeGuid
      )
    })

    it('should log web-side closure when wasClean is true and state is 2', () => {
      wsRedirect['logKvmCloseSource'](true, 2, fakeGuid)

      expect(loggerInfoSpy).toHaveBeenCalledWith(`[${fakeGuid}] KVM session closed by web (state: 2)`)
      expect(publishEventSpy).toHaveBeenCalledWith(
        'success',
        ['logKvmCloseSource'],
        'KVM session closed by web (state: 2)',
        fakeGuid
      )
    })

    it('should log unexpected closure when wasClean is false', () => {
      const loggerWarnSpy = spyOn(logger, 'warn')
      wsRedirect['logKvmCloseSource'](false, 0, fakeGuid)

      expect(loggerWarnSpy).toHaveBeenCalledWith(`[${fakeGuid}] KVM session closed unexpectedly (state: 0)`)
      expect(publishEventSpy).toHaveBeenCalledWith(
        'fail',
        ['logKvmCloseSource'],
        'KVM session closed unexpectedly (state: 0)',
        fakeGuid
      )
    })

    it('should log unexpected closure when wasClean is false regardless of state', () => {
      const loggerWarnSpy = spyOn(logger, 'warn')
      wsRedirect['logKvmCloseSource'](false, 1, fakeGuid)

      expect(loggerWarnSpy).toHaveBeenCalledWith(`[${fakeGuid}] KVM session closed unexpectedly (state: 1)`)
      expect(publishEventSpy).toHaveBeenCalledWith(
        'fail',
        ['logKvmCloseSource'],
        'KVM session closed unexpectedly (state: 1)',
        fakeGuid
      )
    })

    it('should log warning when state is unexpected and return early', () => {
      const loggerWarnSpy = spyOn(logger, 'warn')
      loggerInfoSpy.mockClear() // Clear previous calls from other tests
      wsRedirect['logKvmCloseSource'](true, 999, fakeGuid)

      expect(loggerWarnSpy).toHaveBeenCalledWith(`[${fakeGuid}] KVM session closed with unexpected channel state: 999`)
      expect(publishEventSpy).toHaveBeenCalledWith(
        'fail',
        ['logKvmCloseSource'],
        'KVM session closed with unexpected channel state: 999',
        fakeGuid
      )
      expect(loggerInfoSpy).not.toHaveBeenCalled()
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
