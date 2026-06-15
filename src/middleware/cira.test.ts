/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { vi } from 'vitest'
import { createSpyObj } from '../test/helper/vitest.js'
import { ErrorResponse } from '../utils/amtHelper.js'
import ciraMiddleware from './cira.js'
import { devices } from '../server/mpsserver.js'
describe('CIRA Middleware', () => {
  let req, next, resSpy

  beforeEach(() => {
    req = {
      params: { guid: 'some-guid' },
      tenantId: null,
      deviceAction: null
    }
    next = vi.fn()
    resSpy = createSpyObj('Response', [
      'status',
      'json',
      'end',
      'send'
    ])
    resSpy.status.mockReturnThis()
    resSpy.json.mockReturnThis()
    resSpy.send.mockReturnThis()
  })

  it('Should handle unauthorized tenant', async () => {
    // mock device
    const device: any = { ciraSocket: { readyState: 'open' }, tenantId: 'another-tenant' }
    req.tenantId = 'some-tenant'
    devices['some-guid'] = device

    await ciraMiddleware(req, resSpy, next)

    expect(resSpy.status).toHaveBeenCalledWith(401)
    expect(resSpy.json).toHaveBeenCalledWith(ErrorResponse(401, 'Unauthorized'))
    expect(resSpy.end).toHaveBeenCalled()
    expect(next).not.toHaveBeenCalled()
  })

  it('Should handle missing device', async () => {
    // no device for the provided guid
    delete devices['some-guid']

    await ciraMiddleware(req, resSpy, next)

    expect(resSpy.status).toHaveBeenCalledWith(404)
    expect(resSpy.json).toHaveBeenCalledWith(ErrorResponse(404, 'guid : some-guid', 'device'))
    expect(resSpy.end).toHaveBeenCalled()
    expect(next).not.toHaveBeenCalled()
  })

  it('Should pass the middleware if multitenancy isnt used and ciraSocket is open', async () => {
    // mock device
    const device: any = { ciraSocket: { readyState: 'open' }, tenantId: 'some-tenant' }
    devices['some-guid'] = device

    await ciraMiddleware(req, resSpy, next)

    expect(req.deviceAction).toBeDefined()
    expect(next).toHaveBeenCalled()
  })
})
