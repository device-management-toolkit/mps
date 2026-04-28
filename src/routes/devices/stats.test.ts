/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { vi, type MockInstance } from 'vitest'
import { stats } from './stats.js'
let res: Express.Response
let jsonSpy: MockInstance
let resSpy: MockInstance

beforeEach(() => {
  res = {
    status: () => res,
    json: () => res,
    end: () => res
  }
  jsonSpy = vi.spyOn(res as any, 'json')
  resSpy = vi.spyOn(res as any, 'status')
})

afterEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
})

describe('stats', () => {
  it('should get stats when a device exists', async () => {
    const allCount = 20
    const connectedCount = 10
    const req = {
      db: {
        devices: {
          getConnectedDevices: vi.fn().mockReturnValue(connectedCount),
          getCount: vi.fn().mockReturnValue(allCount)
        }
      }
    }
    await stats(req as any, res as any)
    const expectedTotalCount = allCount
    const expectedConnectedCount = connectedCount
    const expectedDisconnectedCount = Math.max(expectedTotalCount - expectedConnectedCount, 0)
    const expectedJson = {
      totalCount: expectedTotalCount,
      connectedCount: expectedConnectedCount,
      disconnectedCount: expectedDisconnectedCount
    }
    expect(jsonSpy).toHaveBeenCalledWith(expectedJson)
  })
  it('should return 500 when error', async () => {
    const req = {
      db: {
        devices: {
          getConnectedDevices: vi.fn<any>().mockRejectedValue(new Error()),
          getCount: vi.fn<any>().mockRejectedValue(new Error())
        }
      }
    }
    await stats(req as any, res as any)

    expect(resSpy).toHaveBeenCalledWith(500)
  })
  it('should get stats even when no device exists', async () => {
    const req = {
      db: {
        devices: {
          getConnectedDevices: vi.fn().mockReturnValue(0),
          getCount: vi.fn().mockReturnValue(0)
        }
      }
    }
    await stats(req as any, res as any)
    const expectedTotalCount = 0
    const expectedConnectedCount = 0
    const expectedDisconnectedCount = 0
    const expectedJson = {
      totalCount: expectedTotalCount,
      connectedCount: expectedConnectedCount,
      disconnectedCount: expectedDisconnectedCount
    }
    expect(jsonSpy).toHaveBeenCalledWith(expectedJson)
  })
})
