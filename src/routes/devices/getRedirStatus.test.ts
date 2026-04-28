/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { vi, type MockInstance } from 'vitest'
import { getRedirStatus } from './getRedirStatus.js'
import { type Request, type Response } from 'express'
import { devices } from '../../server/mpsserver.js'
vi.mock('../../logging', () => ({
  logger: {
    error: vi.fn()
  },
  messages: {
    DEVICE_GET_EXCEPTION: 'Device get exception'
  }
}))

vi.mock('../../server/mpsserver', () => ({
  devices: {}
}))

describe('getRedirStatus', () => {
  let req
  let res
  let testDevices
  let getByIdSpy: MockInstance

  beforeEach(() => {
    testDevices = devices
    req = {
      params: { guid: 'test-guid' },
      query: {},
      db: { devices: { getById: vi.fn() } }
    } as unknown as Request
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      end: vi.fn()
    } as unknown as Response
    getByIdSpy = vi.spyOn(req.db.devices, 'getById')
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
