/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import express from 'express'
import router from './index.js'
import { request } from '../test/helper/http.js'

const { childRouter } = vi.hoisted(() => ({
  childRouter: async () => {
    const { Router } = await import('express')
    return { default: Router().get('/', (req, res) => res.json({ mounted: req.baseUrl })) }
  }
}))

vi.mock('./auth/index.js', () => childRouter())
vi.mock('./devices/index.js', () => childRouter())
vi.mock('./amt/index.js', () => childRouter())
vi.mock('./health/index.js', () => childRouter())
vi.mock('./version/index.js', () => childRouter())
vi.mock('./certs/index.js', () => ({ mpsrootcert: (_req, res) => res.json({ certificate: 'root' }) }))

describe('API router', () => {
  it.each([
    'authorize',
    'devices',
    'amt',
    'health',
    'version'
  ])('mounts /%s', async (path) => {
    expect(await request(express().use('/api/v1', router), `/api/v1/${path}`)).toEqual({
      status: 200,
      body: { mounted: `/api/v1/${path}` }
    })
  })

  it('serves /ciracert', async () => {
    expect(await request(express().use('/api/v1', router), '/api/v1/ciracert')).toEqual({
      status: 200,
      body: { certificate: 'root' }
    })
  })
})
