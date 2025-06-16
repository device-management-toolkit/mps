/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { getRedirStatus } from './getRedirStatus.js'
import { type Request, type Response } from 'express'
import { devices } from '../../server/mpsserver.js'
import { jest } from '@jest/globals'
import { spyOn } from 'jest-mock'

jest.mock('../../logging', () => ({
  logger: {
    error: jest.fn()
  },
  messages: {
    DEVICE_GET_EXCEPTION: 'Device get exception'
  }
}))

jest.mock('../../server/mpsserver', () => ({
  devices: {}
}))

describe('getRedirStatus', () => {
  let req
  let res
  let testDevices
  let getByIdSpy: jest.Spied<any>

  beforeEach(() => {
    testDevices = devices
    req = {
      params: { guid: 'test-guid' },
      query: {},
      db: { devices: { getById: jest.fn() } }
    } as unknown as Request
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      end: jest.fn()
    } as unknown as Response
    getByIdSpy = spyOn(req.db.devices, 'getById')
  })

  it('should return 404 if device is not found', async () => {
    getByIdSpy.mockResolvedValue(null)

    await getRedirStatus(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.end).toHaveBeenCalled()
  })

  it('should return device redirection status', async () => {
    testDevices['test-guid'] = { kvmConnect: true, solConnect: false, iderConnect: false }
    getByIdSpy.mockResolvedValue({ tenantId: 'test-tenant' })
    req.tenantId = 'test-tenant'

    await getRedirStatus(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      isKVMConnected: true,
      isSOLConnected: false,
      isIDERConnected: false
    })
  })

  it('should return 204 if tenant IDs do not match', async () => {
    testDevices['test-guid'] = { kvmConnect: true, solConnect: false, iderConnect: false }
    getByIdSpy.mockResolvedValue({ tenantId: 'other-tenant' })
    req.tenantId = 'test-tenant'

    await getRedirStatus(req, res)

    expect(res.status).toHaveBeenCalledWith(204)
    expect(res.end).toHaveBeenCalled()
  })

  it('should handle errors', async () => {
    getByIdSpy.mockRejectedValue(new Error('Test Error'))

    await getRedirStatus(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.end).toHaveBeenCalled()
  })
})
