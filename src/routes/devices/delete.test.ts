/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { vi, type MockInstance } from 'vitest'
import { logger } from '../../logging/index.js'
import { deleteDevice } from './delete.js'
let res: Express.Response
let statusSpy: MockInstance
let jsonSpy: MockInstance
let endSpy: MockInstance

beforeEach(() => {
  res = {
    status: () => res,
    json: () => res,
    end: () => res
  }
  statusSpy = vi.spyOn(res as any, 'status')
  endSpy = vi.spyOn(res as any, 'end')
  jsonSpy = vi.spyOn(res as any, 'json')
})

afterEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
})

const req = {
  params: {
    guid: '00000000-0000-0000-0000-000000000000'
  },
  db: {
    devices: {
      delete: () => {},
      getById: () => {}
    }
  },
  tenantID: '123',
  query: {
    isSecretToBeDeleted: 'false'
  },
  secrets: {
    deleteSecretAtPath: () => {},
    deleteSecrets: () => {}
  }
} as any

const reqWithOutQuery = {
  params: {
    guid: '00000000-0000-0000-0000-000000000000'
  },
  db: {
    devices: {
      delete: () => {},
      getById: () => {}
    }
  },
  tenantID: '123',
  query: {},
  secrets: {
    deleteSecretAtPath: () => {},
    deleteSecrets: () => {}
  }
} as any

describe('delete', () => {
  it('should set status to 404 when device does not exist in db and deleteSecrets is false', async () => {
    req.db.devices.getById = vi.fn().mockReturnValue(null)
    req.db.devices.delete = vi.fn().mockReturnValue(0)

    await deleteDevice(req, res as any)
    expect(statusSpy).toHaveBeenCalledWith(404)
    expect(jsonSpy).toHaveBeenCalledWith({ error: 'NOT FOUND', message: `Device ID ${req.params.guid} not found` })
    expect(endSpy).toHaveBeenCalled()
  })

  it('should return 404 and NOT delete secrets when device does not exist, even for the blank tenant', async () => {
    // Null lookup must never purge the GUID-keyed secret (cross-tenant safe).
    req.tenantId = '' // blank/root tenant — must still be blocked
    req.db.devices.getById = vi.fn().mockReturnValue(null)
    req.db.devices.delete = vi.fn().mockReturnValue(0)
    req.secrets.deleteSecretAtPath = vi.fn().mockResolvedValue(true)

    req.query.isSecretToBeDeleted = 'true'

    await deleteDevice(req, res as any)

    expect(req.secrets.deleteSecretAtPath).not.toHaveBeenCalled()
    expect(statusSpy).toHaveBeenCalledWith(404)
    expect(jsonSpy).toHaveBeenCalledWith({ error: 'NOT FOUND', message: `Device ID ${req.params.guid} not found` })
    expect(endSpy).toHaveBeenCalled()
  })

  it('should not delete secrets cross-tenant and return 404 when device is null for a scoped tenant', async () => {
    // Isolated request with its own nested mocks (no shared-fixture spread).
    const getById = vi.fn().mockReturnValue(null)
    const deleteSecretAtPath = vi.fn().mockResolvedValue(true)
    const scopedReq = {
      params: { guid: '11111111-1111-1111-1111-111111111111' },
      tenantId: 'tenantB',
      query: { isSecretToBeDeleted: 'true' },
      db: { devices: { getById, delete: vi.fn().mockReturnValue(0) } },
      secrets: { deleteSecretAtPath }
    } as any

    await deleteDevice(scopedReq, res as any)

    // Lookup must be scoped to the caller's tenant, and Vault must be untouched.
    expect(getById).toHaveBeenCalledWith(scopedReq.params.guid, 'tenantB')
    expect(deleteSecretAtPath).not.toHaveBeenCalled()
    expect(statusSpy).toHaveBeenCalledWith(404)
    expect(jsonSpy).toHaveBeenCalledWith({
      error: 'NOT FOUND',
      message: `Device ID ${scopedReq.params.guid} not found`
    })
    expect(endSpy).toHaveBeenCalled()
  })

  it('should return 404 when device exists but secrets deletion fails', async () => {
    // Existing device so deleteSecrets is actually invoked and then rejects.
    req.db.devices.getById = vi.fn().mockReturnValue({})
    req.db.devices.delete = vi.fn().mockReturnValue({})
    req.secrets.deleteSecretAtPath = vi.fn<any>().mockRejectedValue(new Error())
    req.query.isSecretToBeDeleted = 'true'
    await deleteDevice(req, res as any)

    expect(req.secrets.deleteSecretAtPath).toHaveBeenCalled()
    expect(statusSpy).toHaveBeenCalledWith(404)
    expect(jsonSpy).toHaveBeenCalledWith({ error: 'NOT FOUND', message: `Device ID ${req.params.guid} not found` })
    expect(endSpy).toHaveBeenCalled()
  })

  it('should set status to 204 when delete device exists in db and deleteSecrets is false', async () => {
    req.db.devices.getById = vi.fn().mockReturnValue({})
    req.db.devices.delete = vi.fn().mockReturnValue({})

    req.query.isSecretToBeDeleted = 'false'

    await deleteDevice(req, res as any)
    expect(statusSpy).toHaveBeenCalledWith(204)
    expect(jsonSpy).not.toHaveBeenCalled()
    expect(endSpy).toHaveBeenCalled()
  })

  it('should set status to 204 when delete device exists in db and deleteSecrets is true', async () => {
    req.db.devices.getById = vi.fn().mockReturnValue({})
    req.db.devices.delete = vi.fn().mockReturnValue({})
    req.secrets.deleteSecretAtPath = vi.fn().mockReturnValue(true)

    req.query.isSecretToBeDeleted = 'true'

    await deleteDevice(req, res as any)
    expect(statusSpy).toHaveBeenCalledWith(204)
    expect(jsonSpy).not.toHaveBeenCalled()
    expect(endSpy).toHaveBeenCalled()
  })

  it('should set status to 404 when guid exists in db and secrets, but fails to delete from secret', async () => {
    req.db.devices.getById = vi.fn().mockReturnValue({})
    req.db.devices.delete = vi.fn().mockReturnValue({})
    req.secrets.deleteSecretAtPath = vi.fn<any>().mockRejectedValue(new Error())

    req.query.isSecretToBeDeleted = 'true'

    await deleteDevice(req, res as any)
    expect(statusSpy).toHaveBeenCalledWith(404)
    expect(jsonSpy).toHaveBeenCalled()
    expect(endSpy).toHaveBeenCalled()
  })

  it('should set status to 204 and delete device if it exists in db', async () => {
    req.db.devices.getById = vi.fn().mockReturnValue({})
    req.db.devices.delete = vi.fn().mockReturnValue({})

    req.query.isSecretToBeDeleted = 'false'

    await deleteDevice(req, res as any)

    expect(statusSpy).toHaveBeenCalledWith(204)
    expect(jsonSpy).not.toHaveBeenCalled()
    expect(endSpy).toHaveBeenCalled()
  })

  it('should set status to 500 and not delete device if error occurs', async () => {
    req.db.devices.getById = vi.fn().mockImplementation(() => {
      throw new TypeError('fake error')
    })
    req.db.devices.delete = vi.fn().mockReturnValue({})
    const errorSpy = vi.spyOn(logger, 'error')
    await deleteDevice(req, res as any)
    expect(statusSpy).toHaveBeenCalledWith(500)
    expect(jsonSpy).not.toHaveBeenCalled()
    expect(endSpy).toHaveBeenCalled()
    expect(errorSpy).toHaveBeenCalled()
  })

  it('should set status to 404 when device does not exist in db and no deleteSecrets param', async () => {
    reqWithOutQuery.db.devices.getById = vi.fn().mockReturnValue(null)
    reqWithOutQuery.db.devices.delete = vi.fn().mockReturnValue(0)

    await deleteDevice(reqWithOutQuery, res as any)
    expect(statusSpy).toHaveBeenCalledWith(404)
    expect(jsonSpy).toHaveBeenCalledWith({ error: 'NOT FOUND', message: `Device ID ${req.params.guid} not found` })
    expect(endSpy).toHaveBeenCalled()
  })

  //  it('should set status to 404 when there is no secret in vault', async () => {
  //   req.db.devices.getById = vi.fn().mockReturnValue({})
  //   req.db.devices.delete = vi.fn().mockReturnValue({})
  // })
})
