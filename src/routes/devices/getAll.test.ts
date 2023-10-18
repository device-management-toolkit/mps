/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { v4 as uuid } from 'uuid'
import { getAllDevices } from './getAll'
import { type Device } from '../../models/models'
import { type DataWithCount } from '../../models/Config'

let req
let res
let statusSpy: jest.SpyInstance
let jsonSpy: jest.SpyInstance
let endSpy: jest.SpyInstance
let mockDevice: Device
let allDevices: Device[]
let getSpy: jest.SpyInstance
let getCountSpy: jest.SpyInstance

beforeEach(() => {
  mockDevice = {
    guid: uuid(),
    tenantId: '',
    hostname: 'host01.test.com',
    mpsInstance: '',
    tags: [],
    connectionStatus: true,
    mpsusername: 'userName01',
    friendlyName: null,
    dnsSuffix: null,
    deviceInfo: {
      fwVersion: '16.1',
      fwBuild: '1111',
      fwSku: '16392',
      currentMode: '0',
      ipAddress: ''
    }
  }
  allDevices = [
    mockDevice,
    {
      ...mockDevice,
      guid: uuid(),
      hostname: 'host02.test.com',
      connectionStatus: false
    }
  ]

  req = {
    tenantId: 'tenantId01',
    query: {
      $top: 0,
      $skip: 0
    },
    db: {
      devices: {
        get: jest.fn().mockReturnValue(allDevices),
        getByFriendlyName: jest.fn().mockReturnValue(allDevices),
        getByHostname: jest.fn().mockReturnValue(allDevices),
        getByTags: jest.fn().mockReturnValue(allDevices),
        getCount: jest.fn().mockReturnValue(allDevices.length)
      }
    }
  }
  getSpy = jest.spyOn(req.db.devices, 'get')
  getCountSpy = jest.spyOn(req.db.devices, 'getCount')
  res = {
    status: () => res,
    json: () => res,
    end: () => res
  }
  statusSpy = jest.spyOn(res, 'status')
  endSpy = jest.spyOn(res, 'end')
  jsonSpy = jest.spyOn(res, 'json')
})

async function run200WithCount (expected: DataWithCount): Promise<void> {
  req.query.$count = true
  await getAllDevices(req, res)
  expect(getSpy).toHaveBeenCalledWith(req.query.$top, req.query.$skip, req.tenantId)
  expect(getCountSpy).toHaveBeenCalledWith(req.tenantId)
  expect(statusSpy).toHaveBeenCalledWith(200)
  expect(jsonSpy).toHaveBeenCalledWith(expected)
  expect(endSpy).toHaveBeenCalled()
}

async function run200WithoutCount (expected: Device[]): Promise<void> {
  await getAllDevices(req, res)
  expect(getCountSpy).not.toHaveBeenCalled()
  expect(statusSpy).toHaveBeenCalledWith(200)
  expect(jsonSpy).toHaveBeenCalledWith(expected)
  expect(endSpy).toHaveBeenCalled()
}

describe('getAll', () => {
  it('should return 200 with devices and count', async () => {
    const expected = {
      data: allDevices,
      totalCount: allDevices.length
    }
    await run200WithCount(expected)
  })
  it('should return 200 with connected devices and count', async () => {
    req.query.status = 1
    const expected = {
      data: allDevices.filter(d => d.connectionStatus),
      totalCount: allDevices.length
    }
    await run200WithCount(expected)
  })
  it('should return 200 with disconnected devices and count', async () => {
    req.query.status = 0
    const expected = {
      data: allDevices.filter(d => !d.connectionStatus),
      totalCount: allDevices.length
    }
    await run200WithCount(expected)
  })
  it('should return 200 with no devices on unknown status', async () => {
    req.query.status = 2
    const expected = {
      data: [],
      totalCount: allDevices.length
    }
    await run200WithCount(expected)
  })
  it('should return 200 with devices as a list', async () => {
    await run200WithoutCount(allDevices)
    expect(getSpy).toHaveBeenCalledWith(req.query.$top, req.query.$skip, req.tenantId)
  })
  it('should get by hostname', async () => {
    req.query.hostname = mockDevice.hostname
    const expected = [mockDevice]
    const spy = jest.spyOn(req.db.devices, 'getByHostname').mockResolvedValue(expected)
    await run200WithoutCount(expected)
    expect(spy).toHaveBeenCalledWith(mockDevice.hostname, req.tenantId)
  })
  it('should get by friendlyName', async () => {
    req.query.friendlyName = mockDevice.friendlyName = 'friendlyName'
    const expected = [mockDevice]
    const spy = jest.spyOn(req.db.devices, 'getByFriendlyName').mockResolvedValue(expected)
    await run200WithoutCount(expected)
    expect(spy).toHaveBeenCalledWith(mockDevice.friendlyName, req.tenantId)
  })
  it('should get by friendlyName', async () => {
    const tags = ['tag1', 'tag2', 'tag3']
    const method = 'AND'
    req.query.tags = tags.join(',')
    req.query.method = method
    const expected = [mockDevice]
    const spy = jest.spyOn(req.db.devices, 'getByTags').mockResolvedValue(expected)
    await run200WithoutCount(expected)
    expect(spy).toHaveBeenCalledWith(tags, method, req.query.$top, req.query.$skip, req.tenantId)
  })
  it('should return 500 on error', async () => {
    getSpy.mockRejectedValue(new Error('expected this'))
    await getAllDevices(req, res)
    expect(statusSpy).toHaveBeenCalledWith(500)
    expect(jsonSpy).not.toHaveBeenCalled()
    expect(endSpy).toHaveBeenCalled()
  })

  describe('hostname get', () => {
    const req = {
      query: {
        hostname: 'test'
      },
      tenantId: '',
      db: {
        devices: {
          getById: () => {}
        }
      }
    } as any

    it('should set status to 200 and get result if device exists in DB', async () => {
      req.db.devices.getByHostname = jest.fn().mockReturnValue([{}])
      await getAllDevices(req, res)
      expect(req.db.devices.getByHostname).toHaveBeenCalledWith(req.query.hostname, req.tenantId)
      expect(statusSpy).toHaveBeenCalledWith(200)
      expect(jsonSpy).toHaveBeenCalledWith([{}])
      expect(endSpy).toHaveBeenCalled()
    })

    it('should set status to 404 if device does not exist in DB', async () => {
      req.db.devices.getByHostname = jest.fn().mockReturnValue([])
      await getAllDevices(req, res)
      expect(req.db.devices.getByHostname).toHaveBeenCalledWith(req.query.hostname, req.tenantId)
      expect(statusSpy).toHaveBeenCalledWith(200)
      expect(jsonSpy).toHaveBeenCalledWith([])
      expect(endSpy).toHaveBeenCalled()
    })

    it('should set status to 500 if error occurs while getting device from DB', async () => {
      req.db.devices.getByHostname = jest.fn().mockImplementation(() => {
        throw new TypeError('fake error')
      })
      await getAllDevices(req, res)
      expect(req.db.devices.getByHostname).toHaveBeenCalledWith(req.query.hostname, req.tenantId)
      expect(statusSpy).toHaveBeenCalledWith(500)
      expect(jsonSpy).not.toHaveBeenCalled()
      expect(endSpy).toHaveBeenCalled()
    })
  })
})
