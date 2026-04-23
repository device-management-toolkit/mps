/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { vi, type MockInstance } from 'vitest'
import { logger, messages } from '../../logging/index.js'
import { devices } from '../../server/mpsserver.js'
import { disconnect } from './disconnect.js'
let res: Express.Response
let statusSpy: MockInstance
let jsonSpy: MockInstance

beforeEach(() => {
  res = {
    status: () => res,
    json: () => res,
    end: () => res
  }
  statusSpy = vi.spyOn(res as any, 'status')
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
    devices: {}
  }
} as any

describe('disconnect', () => {
  it('should disconnect device if it is connected', async () => {
    const guid = req.params.guid
    devices[guid] = {
      ciraSocket: {
        destroy: vi.fn()
      }
    } as any
    await disconnect(req, res as any)
    expect(devices[guid].ciraSocket.destroy).toHaveBeenCalled()
    expect(jsonSpy).toHaveBeenCalledWith({
      success: 200,
      description: `${messages.DEVICE_DISCONNECTED_SUCCESS} : ${guid}`
    })
  })

  it('should set status to 500 if error occurs when calling destroy on socket of connected device', async () => {
    devices[req.params.guid] = {
      ciraSocket: {
        destroy: vi.fn().mockImplementation(() => {
          throw new TypeError('fake error')
        })
      }
    } as any
    const loggerSpy = vi.spyOn(logger, 'error')
    await disconnect(req, res as any)
    expect(statusSpy).toHaveBeenCalledWith(500)
    expect(loggerSpy).toHaveBeenCalled()
  })
})
