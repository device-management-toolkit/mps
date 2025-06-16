/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { getDistinctTags } from './tags.js'
import { logger } from '../../logging/index.js'
import { jest } from '@jest/globals'
import { spyOn } from 'jest-mock'

let req: any
let res: any
let statusSpy: jest.Spied<any>
let jsonSpy: jest.Spied<any>

beforeEach(() => {
  req = {
    db: {
      devices: {
        getDistinctTags: undefined
      }
    }
  }
  res = {
    status: () => res,
    json: () => res,
    end: () => res
  }
  statusSpy = spyOn(res, 'status')
  jsonSpy = spyOn(res, 'json')
})

afterEach(() => {
  jest.clearAllMocks()
  jest.resetModules()
})

describe('tags', () => {
  it('should set status to 200 when getting results from getDistinctTags', async () => {
    const expectedResult = {}
    req.db.devices.getDistinctTags = jest.fn().mockReturnValue(expectedResult)
    await getDistinctTags(req, res)
    expect(statusSpy).toHaveBeenCalledWith(200)
  })

  it('should set status to 404 when getting no results from getDistinctTags', async () => {
    const expectedResult = null
    req.db.devices.getDistinctTags = jest.fn().mockReturnValue(expectedResult)
    await getDistinctTags(req, res)
    expect(statusSpy).toHaveBeenCalledWith(404)
    expect(jsonSpy).not.toHaveBeenCalled()
  })

  it('should set status to 500 when exception occurs from getDistinctTags', async () => {
    req.db.devices.getDistinctTags = jest.fn().mockImplementation(() => {
      throw new TypeError('fake error')
    })
    const logSpy = spyOn(logger, 'error')
    await getDistinctTags(req, res)
    expect(statusSpy).toHaveBeenCalledWith(500)
    expect(jsonSpy).not.toHaveBeenCalled()
    expect(logSpy).toHaveBeenCalled()
  })
})
