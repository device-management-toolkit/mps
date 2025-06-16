/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { stats } from './stats.js'
import { jest } from '@jest/globals'
import { spyOn } from 'jest-mock'

let res: Express.Response
let jsonSpy: jest.Spied<any>
let resSpy: jest.Spied<any>

beforeEach(() => {
  res = {
    status: () => res,
    json: () => res,
    end: () => res
  }
  jsonSpy = spyOn(res as any, 'json')
  resSpy = spyOn(res as any, 'status')
})

afterEach(() => {
  jest.clearAllMocks()
  jest.resetModules()
})

describe('stats', () => {
  it('should get stats when a device exists', async () => {
    const allCount = 20
    const connectedCount = 10
    const req = {
      db: {
        devices: {
          getConnectedDevices: jest.fn().mockReturnValue(connectedCount),
          getCount: jest.fn().mockReturnValue(allCount)
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
          getConnectedDevices: jest.fn<any>().mockRejectedValue(new Error()),
          getCount: jest.fn<any>().mockRejectedValue(new Error())
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
          getConnectedDevices: jest.fn().mockReturnValue(0),
          getCount: jest.fn().mockReturnValue(0)
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
