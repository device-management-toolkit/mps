/*********************************************************************
 * Copyright (c) Intel Corporation 2026
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { WebServer } from './webserver.js'
import { request } from '../test/helper/http.js'

describe('Web server Express compatibility', () => {
  let web: WebServer

  beforeEach(async () => {
    vi.spyOn(WebServer.prototype, 'loadCustomMiddleware').mockResolvedValue([])
    web = new WebServer({} as any, {} as any)
    await Promise.resolve()
    web.app.get('/test-query', (req, res) => res.json(req.query))
    web.app.post('/test-body', (req, res) => res.json(req.body))
  })

  afterEach(() => {
    web.relayWSS.close()
    vi.restoreAllMocks()
  })

  it('preserves nested query parsing', async () => {
    expect(await request(web.app, '/test-query?filter[name]=device&tags[]=one&tags[]=two')).toEqual({
      status: 200,
      body: { filter: { name: 'device' }, tags: ['one', 'two'] }
    })
  })

  it('parses JSON bodies', async () => {
    expect(
      await request(web.app, '/test-body', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendlyName: 'device' })
      })
    ).toEqual({ status: 200, body: { friendlyName: 'device' } })
  })

  it('preserves an empty body when no JSON is supplied', async () => {
    expect(await request(web.app, '/test-body', { method: 'POST' })).toEqual({ status: 200, body: {} })
  })

  it('returns the existing JSON error for malformed JSON', async () => {
    const response = await request(web.app, '/test-body', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{'
    })
    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty('error')
  })
})
