/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { vi } from 'vitest'
import jws from 'jws'
import { createSpyObj } from '../../test/helper/vitest.js'
import { Environment } from '../../utils/Environment.js'
const auth = await import('./authorizeDevice.js')

describe('Redirection token issuance', () => {
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
          getById: vi.fn()
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
  it('should return 404 without a token when the device is not found', async () => {
    req.db.devices.getById.mockResolvedValueOnce(null)
    await auth.authorizeDevice(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(404)
    expect(resSpy.end).toHaveBeenCalled()
    expect(resSpy.send).not.toHaveBeenCalled()
  })
  it.each([
    'tenant-a',
    '',
    undefined,
    null
  ])('should issue a device-scoped token for the matching request tenant: %s', async (requestTenant) => {
    req.tenantId = requestTenant
    const tenantId = requestTenant ?? ''
    req.db.devices.getById.mockResolvedValueOnce({ guid: req.params.guid, tenantId })

    await auth.authorizeDevice(req, resSpy)

    expect(req.db.devices.getById).toHaveBeenCalledWith(req.params.guid, tenantId)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    const { token } = resSpy.send.mock.calls[0][0]
    expect(jws.verify(token, 'HS256', Environment.Config.jwt_secret)).toBe(true)
    expect(jws.decode(token).payload).toMatchObject({ deviceId: req.params.guid, tenantId })
    expect(jws.decode(token).payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000))
  })
  it('should not issue a token for a device owned by another tenant', async () => {
    req.tenantId = 'tenant-b'
    const device = {
      guid: req.params.guid,
      tenantId: 'tenant-a'
    }
    req.db.devices.getById.mockImplementation(async (guid, tenantId) =>
      guid === device.guid && tenantId === device.tenantId ? device : null
    )

    await auth.authorizeDevice(req, resSpy)

    expect(req.db.devices.getById).toHaveBeenCalledWith(device.guid, 'tenant-b')
    expect(resSpy.status).toHaveBeenCalledWith(404)
    expect(resSpy.end).toHaveBeenCalled()
    expect(resSpy.send).not.toHaveBeenCalled()
  })
})
