/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { vi, type MockInstance } from 'vitest'
import { randomUUID } from 'node:crypto'
import { insertDevice } from './create.js'
import { MPSValidationError } from '../../utils/MPSValidationError.js'
import { type Device } from '../../models/models.js'
let req
let res
let statusSpy: MockInstance
let jsonSpy: MockInstance
let endSpy: MockInstance
let mockDevice: Device
let reqDevice: any

beforeEach(() => {
  const guid = randomUUID()
  const tenantId = 'tenantId01'
  const connectionStatus = true
  mockDevice = {
    guid,
    tenantId,
    connectionStatus,
    hostname: 'host01.test.com',
    mpsInstance: '',
    tags: [],
    mpsusername: 'userName01',
    friendlyName: null,
    dnsSuffix: null,
    lastConnected: null,
    lastSeen: null,
    lastDisconnected: null,
    deviceInfo: {
      fwVersion: '16.1',
      fwBuild: '1111',
      fwSku: '16392',
      features: '',
      currentMode: '0',
      ipAddress: '',
      lastUpdated: null
    }
  }
  reqDevice = {
    guid,
    tenantId,
    connectionStatus,
    hostname: 'host02.test.com',
    mpsusername: 'userName02',
    tags: ['tag01', 'tag02'],
    friendlyName: 'frienleName02'
  }
  req = {
    db: {
      devices: {
        getById: vi.fn(),
        insert: vi.fn().mockImplementation(async (device) => device),
        update: vi.fn().mockImplementation(async (device) => device)
      }
    },
    body: {}
  }
  res = {
    status: () => res,
    json: () => res,
    end: () => res
  }
  statusSpy = vi.spyOn(res, 'status')
  endSpy = vi.spyOn(res, 'end')
  jsonSpy = vi.spyOn(res, 'json')
})

describe('create', () => {
  it('should not insert server-owned power state fields from the request body', async () => {
    req.db.devices.getById.mockResolvedValue(null)
    req.body = {
      ...reqDevice,
      powerState: 2,
      osPowerSavingState: 2,
      powerStateUpdatedAt: '2020-01-01T00:00:00.000Z'
    }
    await insertDevice(req, res)
    const inserted = req.db.devices.insert.mock.calls[0][0]
    expect(inserted.hostname).toBe(reqDevice.hostname)
    expect(inserted).not.toHaveProperty('powerState')
    expect(inserted).not.toHaveProperty('osPowerSavingState')
    expect(inserted).not.toHaveProperty('powerStateUpdatedAt')
    expect(statusSpy).toHaveBeenCalledWith(201)
  })
  it('should not let a create request overwrite cached power state on an existing device', async () => {
    const updatedAt = new Date('2026-08-25T17:00:00.000Z')
    req.db.devices.getById.mockResolvedValue({ ...mockDevice, powerState: 4, powerStateUpdatedAt: updatedAt })
    req.body = { ...reqDevice, powerState: 2, powerStateUpdatedAt: '2020-01-01T00:00:00.000Z' }
    await insertDevice(req, res)
    const updated = req.db.devices.update.mock.calls[0][0]
    expect(updated.hostname).toBe(reqDevice.hostname)
    expect(updated.powerState).toBe(4)
    expect(updated.powerStateUpdatedAt).toBe(updatedAt)
    expect(statusSpy).toHaveBeenCalledWith(200)
  })
  it('should update device and return 200 if device exists', async () => {
    const expectedDevice = {
      ...mockDevice,
      ...reqDevice
    }
    req.body = reqDevice
    req.db.devices.getById.mockResolvedValueOnce(mockDevice)
    await insertDevice(req, res)
    expect(req.db.devices.getById).toHaveBeenCalledWith(reqDevice.guid, reqDevice.tenantId)
    expect(req.db.devices.update).toHaveBeenCalledWith(expectedDevice)
    expect(statusSpy).toHaveBeenCalledWith(200)
    expect(jsonSpy).toHaveBeenCalledWith(expectedDevice)
  })

  it('should insert device and return 201 if device when device not exist', async () => {
    req.body = reqDevice
    req.db.devices.getById.mockResolvedValueOnce(null)
    await insertDevice(req, res)
    expect(req.db.devices.getById).toHaveBeenCalledWith(reqDevice.guid, reqDevice.tenantId)
    expect(req.db.devices.insert).toHaveBeenCalledWith(reqDevice)
    expect(statusSpy).toHaveBeenCalledWith(201)
    expect(jsonSpy).toHaveBeenCalledWith(reqDevice)
  })

  it('should handle MPSValidationError', async () => {
    const err = new MPSValidationError('errorMessage', 100, 'errorName')
    const expectedErr = {
      error: err.name,
      message: err.message
    }
    req.body = reqDevice
    req.db.devices.getById.mockRejectedValueOnce(err)
    await insertDevice(req, res)
    expect(req.db.devices.getById).toHaveBeenCalledWith(reqDevice.guid, reqDevice.tenantId)
    expect(statusSpy).toHaveBeenCalledWith(err.status)
    expect(jsonSpy).toHaveBeenCalledWith(expectedErr)
  })

  it('should handle other error', async () => {
    const err = new Error('errorMessage')
    req.body = reqDevice
    req.db.devices.getById.mockRejectedValueOnce(err)
    await insertDevice(req, res)
    expect(req.db.devices.getById).toHaveBeenCalledWith(reqDevice.guid, reqDevice.tenantId)
    expect(statusSpy).toHaveBeenCalledWith(500)
    expect(jsonSpy).not.toHaveBeenCalled()
    expect(endSpy).toHaveBeenCalled()
  })
})
