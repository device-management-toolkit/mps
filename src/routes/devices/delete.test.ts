/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { logger } from '../../logging/index.js'
import { deleteDevice } from './delete.js'
import { jest } from '@jest/globals'
import { spyOn } from 'jest-mock'

let res: Express.Response
let statusSpy: jest.Spied<any>
let jsonSpy: jest.Spied<any>
let endSpy: jest.Spied<any>

beforeEach(() => {
  res = {
    status: () => res,
    json: () => res,
    end: () => res
  }
  statusSpy = spyOn(res as any, 'status')
  endSpy = spyOn(res as any, 'end')
  jsonSpy = spyOn(res as any, 'json')
})

afterEach(() => {
  jest.clearAllMocks()
  jest.resetModules()
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
    req.db.devices.getById = jest.fn().mockReturnValue(null)
    req.db.devices.delete = jest.fn().mockReturnValue(0)

    await deleteDevice(req, res as any)
    expect(statusSpy).toHaveBeenCalledWith(404)
    expect(jsonSpy).toHaveBeenCalledWith({ error: 'NOT FOUND', message: `Device ID ${req.params.guid} not found` })
    expect(endSpy).toHaveBeenCalled()
  })

  it('should set status to 204 when device does not exist in db and deleteSecrets is true', async () => {
    req.db.devices.getById = jest.fn().mockReturnValue(null)
    req.db.devices.delete = jest.fn().mockReturnValue(0)
    req.secrets.deleteSecretAtPath = jest.fn().mockReturnValue(true)

    req.query.isSecretToBeDeleted = 'true'

    await deleteDevice(req, res as any)
    expect(statusSpy).toHaveBeenCalledWith(204)
    expect(endSpy).toHaveBeenCalled()
  })

  it('should return 404 when device or secrets deletion fails', async () => {
    req.secrets.deleteSecretAtPath = jest.fn<any>().mockRejectedValue(new Error())
    req.db.devices.getById = jest.fn().mockReturnValue(null)
    req.query.isSecretToBeDeleted = 'true'
    await deleteDevice(req, res as any)

    expect(statusSpy).toHaveBeenCalledWith(404)
    expect(jsonSpy).toHaveBeenCalledWith({ error: 'NOT FOUND', message: `Device ID ${req.params.guid} not found` })
    expect(endSpy).toHaveBeenCalled()
  })

  it('should set status to 204 when delete device exists in db and deleteSecrets is false', async () => {
    req.db.devices.getById = jest.fn().mockReturnValue({})
    req.db.devices.delete = jest.fn().mockReturnValue({})

    req.query.isSecretToBeDeleted = 'false'

    await deleteDevice(req, res as any)
    expect(statusSpy).toHaveBeenCalledWith(204)
    expect(jsonSpy).not.toHaveBeenCalled()
    expect(endSpy).toHaveBeenCalled()
  })

  it('should set status to 204 when delete device exists in db and deleteSecrets is true', async () => {
    req.db.devices.getById = jest.fn().mockReturnValue({})
    req.db.devices.delete = jest.fn().mockReturnValue({})
    req.secrets.deleteSecretAtPath = jest.fn().mockReturnValue(true)

    req.query.isSecretToBeDeleted = 'true'

    await deleteDevice(req, res as any)
    expect(statusSpy).toHaveBeenCalledWith(204)
    expect(jsonSpy).not.toHaveBeenCalled()
    expect(endSpy).toHaveBeenCalled()
  })

  it('should set status to 404 when guid exists in db and secrets, but fails to delete from secret', async () => {
    req.db.devices.getById = jest.fn().mockReturnValue({})
    req.db.devices.delete = jest.fn().mockReturnValue({})
    req.secrets.deleteSecretAtPath = jest.fn<any>().mockRejectedValue(new Error())

    req.query.isSecretToBeDeleted = 'true'

    await deleteDevice(req, res as any)
    expect(statusSpy).toHaveBeenCalledWith(404)
    expect(jsonSpy).toHaveBeenCalled()
    expect(endSpy).toHaveBeenCalled()
  })

  it('should set status to 204 and delete device if it exists in db', async () => {
    req.db.devices.getById = jest.fn().mockReturnValue({})
    req.db.devices.delete = jest.fn().mockReturnValue({})

    req.query.isSecretToBeDeleted = 'false'

    await deleteDevice(req, res as any)

    expect(statusSpy).toHaveBeenCalledWith(204)
    expect(jsonSpy).not.toHaveBeenCalled()
    expect(endSpy).toHaveBeenCalled()
  })

  it('should set status to 500 and not delete device if error occurs', async () => {
    req.db.devices.getById = jest.fn().mockImplementation(() => {
      throw new TypeError('fake error')
    })
    req.db.devices.delete = jest.fn().mockReturnValue({})
    const errorSpy = spyOn(logger, 'error')
    await deleteDevice(req, res as any)
    expect(statusSpy).toHaveBeenCalledWith(500)
    expect(jsonSpy).not.toHaveBeenCalled()
    expect(endSpy).toHaveBeenCalled()
    expect(errorSpy).toHaveBeenCalled()
  })

  it('should set status to 404 when device does not exist in db and no deleteSecrets param', async () => {
    reqWithOutQuery.db.devices.getById = jest.fn().mockReturnValue(null)
    reqWithOutQuery.db.devices.delete = jest.fn().mockReturnValue(0)

    await deleteDevice(reqWithOutQuery, res as any)
    expect(statusSpy).toHaveBeenCalledWith(404)
    expect(jsonSpy).toHaveBeenCalledWith({ error: 'NOT FOUND', message: `Device ID ${req.params.guid} not found` })
    expect(endSpy).toHaveBeenCalled()
  })

  //  it('should set status to 404 when there is no secret in vault', async () => {
  //   req.db.devices.getById = jest.fn().mockReturnValue({})
  //   req.db.devices.delete = jest.fn().mockReturnValue({})
  // })
})
