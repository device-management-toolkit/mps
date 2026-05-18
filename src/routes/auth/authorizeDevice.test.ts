/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { vi } from 'vitest'
import { createSpyObj } from '../../test/helper/vitest.js'
import { Environment } from '../../utils/Environment.js'
vi.mock('express-validator', () => ({
  validationResult: () =>
    ({
      isEmpty: vi.fn().mockReturnValue(true),
      array: vi.fn().mockReturnValue([{ test: 'error' }])
    }) as any
}))
const auth = await import('./authorizeDevice.js')

describe('Check login', () => {
  let resSpy
  let req

  beforeEach(() => {
    resSpy = createSpyObj('Response', [
      'status',
      'json',
      'end',
      'send'
    ])
    req = {
      params: {
        guid: '4c4c4544-004b-4210-8033-b6c04f504633'
      },
      db: {
        devices: {
          getById: () => {}
        }
      }
    }
    resSpy.status.mockReturnThis()
    resSpy.json.mockReturnThis()
    resSpy.send.mockReturnThis()
    Environment.Config = {
      web_admin_user: 'admin',
      web_admin_password: 'Passw0rd',
      jwt_expiration: 1440,
      jwt_issuer: 'fake',
      jwt_secret: 'my_secret',
      redirection_expiration_time: 5
    } as any
  })
  it('should fail with device does not exits', async () => {
    const query = vi.spyOn(req.db.devices, 'getById')
    query.mockResolvedValueOnce(null)
    await auth.authorizeDevice(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(404)
  })
  it('should pass with a token', async () => {
    const device = {
      guid: '4c4c4544-004b-4210-8033-b6c04f504633',
      hostname: 'hostname',
      tags: null,
      mpsInstance: 'localhost',
      connectionStatus: false,
      mpsusername: 'admin',
      tenantId: null
    }
    const query = vi.spyOn(req.db.devices, 'getById')
    query.mockResolvedValueOnce({ rows: [device], command: '', fields: null, rowCount: 0, oid: 0 })
    await auth.authorizeDevice(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
  })
})
