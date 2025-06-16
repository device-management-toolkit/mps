/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type certificatesType } from '../models/Config.js'
import { devices, MPSServer } from './mpsserver.js'
import { type ISecretManagerService } from '../interfaces/ISecretManagerService.js'
import { type Device } from '../models/models.js'
import { type IDeviceTable } from '../interfaces/IDeviceTable.js'
import { type IDB } from '../interfaces/IDb.js'
import { Environment } from '../utils/Environment.js'
import { logger } from '../logging/index.js'
import APFProcessor from '../amt/APFProcessor.js'
import { jest } from '@jest/globals'
import { spyOn } from 'jest-mock'

let certs: certificatesType
let db: IDB
let devicesMock: IDeviceTable
let secrets: ISecretManagerService
let mps: MPSServer

describe('MPS Server', function () {
  let deviceSpy: jest.Spied<any>
  let deviceUpdateSpy: jest.Spied<any>
  let processCommandSpy: jest.Spied<any>
  let getSecretSpy: jest.Spied<any>
  let getCredsSpy: jest.Spied<any>
  let sendUserAuthSpy: jest.Spied<any>
  let sendUserAuthFailSpy: jest.Spied<any>
  let socket
  let testDevice: Device
  beforeEach(async function () {
    jest.setTimeout(60000)
    testDevice = { mpsusername: 'admin' } as any
    devicesMock = {
      get: async () => [] as Device[],
      getCount: async () => 0,
      getDistinctTags: async () => ['tag'],
      getById: async (guid) => testDevice,
      getByTags: async (tags) => [testDevice] as Device[],
      getByFriendlyName: async (hostname) => [testDevice] as Device[],
      getByHostname: async (hostname) => [testDevice] as Device[],
      getConnectedDevices: async (tenantId?) => 0,
      clearInstanceStatus: async () => true,
      delete: async (guid) => true,
      insert: async (device) => device,
      update: async () => testDevice
    }

    db = {
      devices: devicesMock,
      query: async (text, params): Promise<any> => {}
    }
    secrets = {
      getSecretFromKey: async (path: string, key: string) => 'P@ssw0rd',
      getSecretAtPath: async (path: string) => ({}) as any,
      getAMTCredentials: async (path: string) => ['admin', 'P@ssw0rd'],
      getMPSCerts: async () => ({}) as any,
      writeSecretWithObject: async (path: string, data: any) => false,
      health: async () => ({}),
      deleteSecretAtPath: async (path: string) => {}
    }
    certs = {
      mps_tls_config: {} as any,
      web_tls_config: {} as any
    }
    deviceSpy = spyOn(devicesMock, 'getById')
    deviceUpdateSpy = spyOn(devicesMock, 'update')
    getSecretSpy = spyOn(secrets, 'getSecretFromKey')
    getCredsSpy = spyOn(secrets, 'getAMTCredentials')
    sendUserAuthSpy = spyOn(APFProcessor, 'SendUserAuthSuccess').mockReturnValue(null)
    sendUserAuthFailSpy = spyOn(APFProcessor, 'SendUserAuthFail').mockReturnValue(null)
    processCommandSpy = spyOn(APFProcessor, 'processCommand').mockResolvedValue(0)
    socket = {
      tag: { SystemId: '123', id: 'ABC123XYZ', nodeid: '123' },
      end: jest.fn(),
      write: jest.fn(),
      setEncoding: jest.fn(),
      setTimeout: jest.fn(),
      on: jest.fn(),
      addListener: jest.fn(),
      getPeerCertificate: jest.fn()
    } as any
    delete devices['123']
    mps = new MPSServer(certs, db, secrets)
  })
  it('should initialize', () => {
    expect(mps.certs).toBeDefined()
    expect(mps.secrets).toBeDefined()
    expect(mps.db).toBeDefined()
    expect(mps.server).toBeDefined()
    expect(mps.events).toBeDefined()
    expect(true).toBeTruthy()
  })
  it('should listen on configured port', () => {
    const listenSpy = spyOn(mps.server, 'listen').mockReturnValue(null)
    Environment.Config = { port: 3000 } as any
    mps.listen()
    expect(listenSpy).toHaveBeenCalledWith(3000, mps.listeningListener)
  })
  it('should log what port the server is listening on', () => {
    const infoSpy = spyOn(logger, 'info')
    Environment.Config = { common_name: 'localhost', port: 3000 } as any
    mps.listeningListener()
    expect(infoSpy).toHaveBeenCalledWith('Intel(R) AMT server running on localhost:3000.')
  })
  it('should handle onAPFDisconnected', async () => {
    const deviceDisconnectSpy = spyOn(mps, 'handleDeviceDisconnect')
    const emitSpy = spyOn(mps.events, 'emit')
    devices['123'] = { ciraSocket: { tag: { id: 'ABC123XYZ', nodeid: '123' } } } as any
    await mps.onAPFDisconnected('123')
    expect(devices['123']).toBeUndefined()
    expect(deviceDisconnectSpy).toHaveBeenCalledWith('123')
    expect(emitSpy).toHaveBeenCalledWith('disconnected', '123')
  })
  it('should handle onAPFKeepAliveRequest', async () => {
    const lastSeenUpdateSpy = spyOn(mps, 'handleLastSeenUpdate')
    devices['123'] = { ciraSocket: { tag: { id: 'ABC123XYZ', nodeid: '123' } } } as any
    await mps.onAPFKeepAliveRequest('123')
    expect(lastSeenUpdateSpy).toHaveBeenCalledWith('123')
  })
  it('should allow device to connect if exists in db', async () => {
    await mps.onAPFProtocolVersion(socket)
    expect(deviceSpy).toHaveBeenCalledWith('123')
  })
  it('should not allow device to connect if exists in db', async () => {
    deviceSpy = spyOn(devicesMock, 'getById').mockResolvedValue(null)
    const endSpy = spyOn(socket, 'end')
    await mps.onAPFProtocolVersion(socket)
    expect(deviceSpy).toHaveBeenCalledWith('123')
    expect(endSpy).toHaveBeenCalled()
  })
  it('should verify user auth when valid', async () => {
    const deviceConnectSpy = spyOn(mps, 'handleDeviceConnect').mockResolvedValue(null)
    await mps.onVerifyUserAuth(socket, 'admin', 'P@ssw0rd')
    expect(deviceSpy).toHaveBeenCalledWith('123')
    expect(getSecretSpy).toHaveBeenCalledWith('devices/123', 'MPS_PASSWORD')
    expect(getCredsSpy).toHaveBeenCalledWith('123')
    expect(devices['123']).toBeDefined()
    expect(deviceConnectSpy).toHaveBeenCalledWith('123')
    expect(sendUserAuthSpy).toHaveBeenCalledWith(socket)
  })
  it('should delete old device connection if a new connection request comes from same device', async () => {
    const deviceConnectSpy = spyOn(mps, 'handleDeviceConnect')
    const deviceDisconnectSpy = spyOn(mps, 'handleDeviceDisconnect')
    devices['123'] = { ciraSocket: { tag: { SystemId: '123', id: 'MNO123XYZ', nodeid: '123' }, end: jest.fn() } } as any
    await mps.onVerifyUserAuth(socket, 'admin', 'P@ssw0rd')
    expect(deviceSpy).toHaveBeenCalledWith('123')
    expect(getSecretSpy).toHaveBeenCalledWith('devices/123', 'MPS_PASSWORD')
    expect(deviceDisconnectSpy).toHaveBeenCalledWith('123')
    expect(getCredsSpy).toHaveBeenCalledWith('123')
    expect(devices['123']).toBeDefined()
    expect(devices['123'].ciraSocket.tag.id).toEqual('ABC123XYZ')
    expect(deviceConnectSpy).toHaveBeenCalledWith('123')
    expect(sendUserAuthSpy).toHaveBeenCalledWith(socket)
  })
  it('should update last seen update', async () => {
    const debugSpy = spyOn(logger, 'debug')
    testDevice = {} as any
    Environment.Config = { instance_name: 'mpsInstance' } as any
    devices['123'] = { ciraSocket: { tag: { SystemId: '123', id: 'MNO123XYZ', nodeid: '123' }, end: jest.fn() } } as any
    await mps.handleLastSeenUpdate('123')
    expect(deviceSpy).toHaveBeenCalledWith('123')
    expect(deviceUpdateSpy).toHaveBeenCalledWith({
      connectionStatus: true,
      mpsInstance: 'mpsInstance',
      lastSeen: testDevice.lastSeen
    })
    expect(debugSpy).toHaveBeenCalledWith('Device last seen status updated in db : 123')
  })
  it('should NOT verify user auth when NOT valid', async () => {
    const deviceConnectSpy = spyOn(mps, 'handleDeviceConnect').mockResolvedValue(null)
    await mps.onVerifyUserAuth(socket, 'admin', 'WrongP@ssw0rd')
    expect(deviceSpy).toHaveBeenCalled()
    expect(getSecretSpy).toHaveBeenCalled()
    expect(getCredsSpy).not.toHaveBeenCalled()
    expect(devices['123']).toBeUndefined()
    expect(deviceConnectSpy).not.toHaveBeenCalled()
    expect(sendUserAuthFailSpy).toHaveBeenCalledWith(socket)
  })
  it('should NOT verify user auth valid but vault call fails', async () => {
    const deviceConnectSpy = spyOn(mps, 'handleDeviceConnect').mockResolvedValue(null)
    getCredsSpy.mockRejectedValue(new Error('unknown'))
    await mps.onVerifyUserAuth(socket, 'admin', 'P@ssw0rd')
    expect(deviceSpy).toHaveBeenCalled()
    expect(getSecretSpy).toHaveBeenCalled()
    expect(getCredsSpy).toHaveBeenCalledWith('123')
    expect(devices['123']).toBeUndefined()
    expect(deviceConnectSpy).not.toHaveBeenCalledWith('123')
    expect(sendUserAuthFailSpy).toHaveBeenCalledWith(socket)
  })
  it('should connect with TLS', () => {
    const addHandlersSpy = spyOn(mps, 'addHandlers').mockReturnValue(null)
    delete socket.tag
    mps.onTLSConnection(socket)
    expect(socket.tag).toBeDefined()
    expect(addHandlersSpy).toHaveBeenCalledWith(socket)
  })
  it('should add handlers', () => {
    const setEncodingSpy = spyOn(socket, 'setEncoding')
    const setTimeoutSpy = spyOn(socket, 'setTimeout')
    const onSpy = spyOn(socket, 'on')
    const addListenerSpy = spyOn(socket, 'addListener')
    mps.addHandlers(socket)
    expect(setEncodingSpy).toHaveBeenCalled()
    expect(setTimeoutSpy).toHaveBeenCalled()
    expect(onSpy).toHaveBeenCalled()
    expect(addListenerSpy).toHaveBeenCalledTimes(3)
  })
  it('should disconnect on timeout', async () => {
    const endSpy = spyOn(socket, 'end')
    const deviceDisconnectSpy = spyOn(mps, 'handleDeviceDisconnect')
    devices['123'] = { ciraSocket: { tag: { id: 'ABC123XYZ', nodeid: '123' } } } as any
    await mps.onTimeout(socket)
    expect(endSpy).toHaveBeenCalled()
    expect(deviceDisconnectSpy).toHaveBeenCalledWith('123')
    expect(devices['123']).toBeUndefined()
  })
  it('should NOT disconnect on timeout if socketids dont match', async () => {
    const endSpy = spyOn(socket, 'end')
    const deviceDisconnectSpy = spyOn(mps, 'handleDeviceDisconnect')
    devices['123'] = { ciraSocket: { tag: { id: 'Mno123XYZ', nodeid: '123' } } } as any
    await mps.onTimeout(socket)
    expect(endSpy).toHaveBeenCalled()
    expect(deviceDisconnectSpy).not.toHaveBeenCalledWith('123')
    expect(devices['123']).toBeDefined()
  })
  it('should do nothing data when not much is received', async () => {
    const endSpy = spyOn(socket, 'end')
    socket.tag.accumulator = ''
    socket.tag.first = true
    await mps.onDataReceived(socket, 'A')
    expect(endSpy).not.toHaveBeenCalled()
    expect(processCommandSpy).not.toHaveBeenCalled()
  })
  it('should NOT process data when HTTP request received', async () => {
    const endSpy = spyOn(socket, 'end')
    socket.tag.accumulator = ''
    socket.tag.first = true
    await mps.onDataReceived(socket, 'GET')
    expect(endSpy).toHaveBeenCalled()
    expect(processCommandSpy).not.toHaveBeenCalled()
  })
  it('should process data when data received', async () => {
    const endSpy = spyOn(socket, 'end')
    socket.tag.accumulator = ''
    socket.tag.first = true
    await mps.onDataReceived(socket, 'data')
    expect(processCommandSpy).toHaveBeenCalledWith(socket)
    expect(endSpy).not.toHaveBeenCalled()
  })
  it('should continue process data when data received ', async () => {
    const length = 9
    let callCount = 0
    processCommandSpy = spyOn(APFProcessor, 'processCommand').mockImplementation(async () => {
      if (callCount === 0) {
        callCount++
        return length
      }
      return 0
    })
    const endSpy = spyOn(socket, 'end')
    socket.tag.accumulator = ''
    socket.tag.first = true
    await mps.onDataReceived(socket, 'datadata')
    expect(processCommandSpy).toHaveBeenCalledWith(socket)
    expect(socket.tag.accumulator).toBe('')
    expect(endSpy).not.toHaveBeenCalled()
  })
  it('should end connection when unknown command', async () => {
    processCommandSpy = spyOn(APFProcessor, 'processCommand').mockResolvedValue(-1)
    const endSpy = spyOn(socket, 'end')
    socket.tag.accumulator = ''
    socket.tag.first = true
    await mps.onDataReceived(socket, 'data')
    expect(processCommandSpy).toHaveBeenCalledWith(socket)
    expect(endSpy).toHaveBeenCalled()
  })
  it('should disconnect on close', async () => {
    const deviceDisconnectSpy = spyOn(mps, 'handleDeviceDisconnect')
    devices['123'] = { ciraSocket: { tag: { id: 'ABC123XYZ', nodeid: '123' } } } as any
    await mps.onClose(socket)
    expect(deviceDisconnectSpy).toHaveBeenCalledWith('123')
  })
  it('should NOT disconnect on close if socketids dont match', async () => {
    const deviceDisconnectSpy = spyOn(mps, 'handleDeviceDisconnect')
    devices['123'] = { ciraSocket: { tag: { id: 'OAMCT123MNO', nodeid: '123' } } } as any
    await mps.onClose(socket)
    expect(deviceDisconnectSpy).not.toHaveBeenCalledWith('123')
    expect(devices['123']).toBeDefined()
  })
  it('should NOT log on error when ECONNRESET', () => {
    const errorLogSpy = spyOn(logger, 'error')
    mps.onError(socket, { code: 'ECONNRESET' } as any)
    expect(errorLogSpy).not.toHaveBeenCalled()
  })
  it('should log on error when other error', () => {
    const errorLogSpy = spyOn(logger, 'error')
    mps.onError(socket, { code: 'COOL ERROR' } as any)
    expect(errorLogSpy).toHaveBeenCalled()
  })
  it('should handle device disconnect', async () => {
    const emitSpy = spyOn(mps.events, 'emit')
    devices['123'] = { device: 'a device' } as any
    await mps.handleDeviceDisconnect('123')
    expect(devices['123']).toBeUndefined()
    expect(deviceSpy).toHaveBeenCalledWith('123')
    const roughDateTest = new Date()
    expect(testDevice.lastDisconnected.getDay()).toBe(roughDateTest.getDay())
    expect(testDevice.lastDisconnected.getMonth()).toBe(roughDateTest.getMonth())
    expect(testDevice.lastDisconnected.getFullYear()).toBe(roughDateTest.getFullYear())
    expect(deviceUpdateSpy).toHaveBeenCalledWith({
      connectionStatus: false,
      mpsInstance: null,
      mpsusername: 'admin',
      lastDisconnected: testDevice.lastDisconnected
    })
    expect(emitSpy).toHaveBeenCalledWith('disconnected', '123')
  })
  it('should handle device connect', async () => {
    devices['123'] = { device: 'a device' } as any
    Environment.Config = { instance_name: 'mpsInstance' } as any
    await mps.handleDeviceConnect('123')
    const roughDateTest = new Date()
    expect(testDevice.lastConnected.getDay()).toBe(roughDateTest.getDay())
    expect(testDevice.lastConnected.getMonth()).toBe(roughDateTest.getMonth())
    expect(testDevice.lastConnected.getFullYear()).toBe(roughDateTest.getFullYear())
    expect(deviceUpdateSpy).toHaveBeenCalledWith({
      connectionStatus: true,
      mpsInstance: 'mpsInstance',
      mpsusername: 'admin',
      lastConnected: testDevice.lastConnected
    })
  })
})
