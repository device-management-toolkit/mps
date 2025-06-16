/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { randomUUID } from 'node:crypto'
import { getDevice } from './get.js'
import { type Device } from '../../models/models.js'
import { jest } from '@jest/globals'
import { spyOn } from 'jest-mock'

let req
let res
let statusSpy: jest.Spied<any>
let jsonSpy: jest.Spied<any>
let endSpy: jest.Spied<any>
let getByIdSpy: jest.Spied<any>
let mockDevice: Device

beforeEach(() => {
  const guid = randomUUID()
  mockDevice = {
    guid,
    tenantId: '',
    hostname: 'host01.test.com',
    mpsInstance: '',
    tags: [],
    connectionStatus: true,
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
  req = {
    params: { guid },
    db: {
      devices: {
        getById: jest.fn()
      }
    }
  }
  res = {
    status: () => res,
    json: () => res,
    end: () => res
  }
  statusSpy = spyOn(res, 'status')
  endSpy = spyOn(res, 'end')
  jsonSpy = spyOn(res, 'json')
  getByIdSpy = spyOn(req.db.devices, 'getById')
})

async function run200(): Promise<void> {
  getByIdSpy.mockResolvedValue(mockDevice)
  await getDevice(req, res)
  expect(getByIdSpy).toHaveBeenCalledWith(req.params.guid)
  expect(statusSpy).toHaveBeenCalledWith(200)
  expect(jsonSpy).toHaveBeenCalledWith(mockDevice)
  expect(endSpy).toHaveBeenCalled()
}

async function run204(): Promise<void> {
  getByIdSpy.mockResolvedValue(mockDevice)
  await getDevice(req, res)
  expect(getByIdSpy).toHaveBeenCalledWith(req.params.guid)
  expect(statusSpy).toHaveBeenCalledWith(204)
  expect(jsonSpy).not.toHaveBeenCalled()
  expect(endSpy).toHaveBeenCalled()
}

describe('get', () => {
  it('should return 200 with device if exists and req tenantId matches', async () => {
    mockDevice.tenantId = 'tenantId'
    req.tenantId = mockDevice.tenantId
    await run200()
  })

  it('should return 200 with device if exists and query tenantId matches', async () => {
    mockDevice.tenantId = 'tenantId'
    req.query = { tenantId: mockDevice.tenantId }
    await run200()
  })

  it('should return 204 and empty if tenantId not set, not in req, no query', async () => {
    await run204()
  })

  it('should return 204 and empty if tenantId not set, not in req, not in query', async () => {
    req.query = { otherQueryParam: 'whocares' }
    await run204()
  })

  it('should return 204 and empty if exists but req tenantId does not match', async () => {
    mockDevice.tenantId = 'tenantId'
    req.tenantId = 'notTheRightTenantId'
    getByIdSpy.mockResolvedValue(mockDevice)
    await run204()
  })
  it('should return 204 and empty if exists and query tenantId does not match', async () => {
    mockDevice.tenantId = 'tenantId'
    req.query = { tenantId: 'notTheRightTenantId' }
    await run204()
  })

  it('should set status to 404 if device does not exist in DB', async () => {
    getByIdSpy.mockResolvedValue(null)
    await getDevice(req, res)
    expect(statusSpy).toHaveBeenCalledWith(404)
    expect(jsonSpy).not.toHaveBeenCalled()
    expect(endSpy).toHaveBeenCalled()
  })

  it('should set status to 500 if error occurs while getting device from DB', async () => {
    getByIdSpy.mockRejectedValue(new Error('this is expected'))
    await getDevice(req, res)
    expect(statusSpy).toHaveBeenCalledWith(500)
    expect(jsonSpy).not.toHaveBeenCalled()
    expect(endSpy).toHaveBeenCalled()
  })
})
