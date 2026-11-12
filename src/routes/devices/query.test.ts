/*********************************************************************
 * Copyright (c) Intel Corporation 2026
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import express from 'express'
import router from './index.js'
import { request } from '../../test/helper/http.js'

describe('Device queries over HTTP', () => {
  const connected = { guid: 'connected', connectionStatus: true }
  const disconnected = { guid: 'disconnected', connectionStatus: false }
  let app: express.Express
  let get: ReturnType<typeof vi.fn>
  let getCount: ReturnType<typeof vi.fn>

  beforeEach(() => {
    get = vi.fn().mockResolvedValue([connected, disconnected])
    getCount = vi.fn().mockResolvedValue(2)
    app = express()
    app.set('query parser', 'extended')
    app.use((req, _res, next) => {
      req.db = { devices: { get, getCount } } as any
      req.tenantId = 'tenant-a'
      next()
    })
    app.use('/devices', router)
  })

  it('keeps an uncounted response when $count=false', async () => {
    expect(await request(app, '/devices?$count=false')).toEqual({ status: 200, body: [connected, disconnected] })
    expect(getCount).not.toHaveBeenCalled()
  })

  it('returns the count and passes pagination and tenant to the database', async () => {
    expect(await request(app, '/devices?$count=true&$top=5&$skip=2')).toEqual({
      status: 200,
      body: { data: [connected, disconnected], totalCount: 2 }
    })
    expect(get).toHaveBeenCalledWith('5', '2', 'tenant-a')
    expect(getCount).toHaveBeenCalledWith('tenant-a')
  })

  it('preserves omitted pagination for the database defaults', async () => {
    expect(await request(app, '/devices')).toEqual({ status: 200, body: [connected, disconnected] })
    expect(get).toHaveBeenCalledWith(undefined, undefined, 'tenant-a')
  })

  it.each([0, 1])('filters devices with status=%s', async (status) => {
    expect(await request(app, `/devices?status=${status}`)).toEqual({
      status: 200,
      body: [status === 1 ? connected : disconnected]
    })
  })

  it.each([
    '$top=-1',
    '$skip=invalid',
    '$count=invalid',
    'status=2'
  ])('rejects invalid query %s', async (query) => {
    expect((await request(app, `/devices?${query}`)).status).toBe(400)
    expect(get).not.toHaveBeenCalled()
  })
})
