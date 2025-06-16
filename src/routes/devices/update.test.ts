/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { MPSValidationError } from '../../utils/MPSValidationError.js'
import { updateDevice } from './update.js'
import { logger } from '../../logging/index.js'
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
  jsonSpy = spyOn(res as any, 'json')
  endSpy = spyOn(res as any, 'end')
})

afterEach(() => {
  jest.clearAllMocks()
  jest.resetModules()
})

describe('update', () => {
  const guid = '00000000-0000-0000-0000-000000000000'
  const errorSpy = spyOn(logger, 'error')

  it('should set status to 404 if getById gets no result', async () => {
    const req = {
      db: {
        devices: {
          getById: jest.fn().mockReturnValue(null)
        }
      },
      body: {
        guid
      }
    }
    await updateDevice(req as any, res as any)
    expect(statusSpy).toHaveBeenCalledWith(404)
    expect(jsonSpy).toHaveBeenCalledWith({ error: 'NOT FOUND', message: `Device ID ${guid} not found` })
    expect(endSpy).toHaveBeenCalled()
  })

  it('should set status to 200 if getById gets a result', async () => {
    const device = {} as any

    const req = {
      db: {
        devices: {
          getById: jest.fn().mockReturnValue(device),
          update: () => {}
        }
      },
      body: {
        guid
      }
    }
    const expectedDevice = { ...device, ...req.body }
    const updateSpy = spyOn(req.db.devices, 'update').mockReturnValue(expectedDevice)
    await updateDevice(req as any, res as any)
    expect(updateSpy).toHaveBeenCalled()
    expect(statusSpy).toHaveBeenCalledWith(200)
    expect(jsonSpy).toHaveBeenCalledWith(expectedDevice)
    expect(endSpy).toHaveBeenCalled()
  })

  it('should set status to that of MPSValidationError if it occurs', async () => {
    const errorName = 'FakeMPSError'
    const errorMessage = 'This is a fake error'
    const errorStatus = 555
    const req = {
      db: {
        devices: {
          getById: jest.fn().mockImplementation(() => {
            throw new MPSValidationError(errorMessage, errorStatus, errorName)
          })
        }
      },
      body: {
        guid
      }
    }
    await updateDevice(req as any, res as any)
    expect(statusSpy).toHaveBeenCalled()
    expect(jsonSpy).toHaveBeenCalledWith({ error: errorName, message: errorMessage })
    expect(endSpy).toHaveBeenCalled()
    expect(errorSpy).toHaveBeenCalled()
  })

  it('should set status to 500 if error other than MPSValidationError occurs', async () => {
    const req = {
      db: {
        devices: {
          getById: jest.fn().mockImplementation(() => {
            throw new TypeError('fake error')
          })
        }
      },
      body: {
        guid
      }
    }
    await updateDevice(req as any, res as any)
    expect(statusSpy).toHaveBeenCalledWith(500)
    expect(endSpy).toHaveBeenCalled()
    expect(errorSpy).toHaveBeenCalled()
  })
})
