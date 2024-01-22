/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import MongoDB from './index.js'
import { jest } from '@jest/globals'
import { spyOn } from 'jest-mock'

describe('Mongo', () => {
  let dbInstance: MongoDB = null
  let mockStats: jest.Mock<any>
  beforeEach(() => {
    dbInstance = new MongoDB('mongodb://postgresadmin:admin123@localhost:5432')
    mockStats = jest.fn<any>()
    dbInstance.db = { stats: mockStats } as any // Mock the stats function of the db
  })
  afterEach(() => {
    jest.clearAllMocks()
  })
  it('should return true when db is healthy', async () => {
    mockStats.mockResolvedValue({ ok: 1 }) // Mock a successful response

    const result = await dbInstance.query('someText')
    expect(result).toBe(true)
  })

  it('should return false when db is not healthy', async () => {
    mockStats.mockResolvedValue({ ok: 0 }) // Mock an unhealthy response

    const result = await dbInstance.query('someText')
    expect(result).toBe(false)
  })
  it('should return false and log error when exception occurs', async () => {
    mockStats.mockRejectedValue(new Error('DB error')) // Mock an error

    const logSpy = spyOn(console, 'error').mockImplementation(() => {}) // Mock console.error to prevent actual logging

    const result = await dbInstance.query('someText')
    expect(result).toBe(false)
    expect(logSpy).toHaveBeenCalledWith('Database health check failed:', new Error('DB error'))

    logSpy.mockRestore() // Restore console.error after test
  })
})
