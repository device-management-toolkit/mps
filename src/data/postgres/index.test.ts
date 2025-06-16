/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type QueryResult } from 'pg'
import PostgresDb, { POSTGRES_RESPONSE_CODES } from './index.js'
import { jest } from '@jest/globals'
import { spyOn } from 'jest-mock'

const db: PostgresDb = new PostgresDb('postgresql://postgresadmin:admin123@localhost:5432/mpsdb?sslmode=no-verify')
describe('Postgres', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  test('should return result when query executes', async () => {
    const dbQuery = spyOn(db, 'query')
    dbQuery.mockResolvedValueOnce({ rows: [0], command: 'SELECT', fields: null, rowCount: 0, oid: 0 })
    const result = await db.query('SELECT * FROM devices')
    expect(result).toEqual({ rows: [0], command: 'SELECT', fields: null, rowCount: 0, oid: 0 })
  })

  test('should return result when pool query executes', async () => {
    const qr: QueryResult = { rows: [0], command: 'SELECT', fields: null, rowCount: 0, oid: 0 }
    const dbQuery = spyOn(db.pool, 'query').mockImplementation(async () => qr)
    const result = await db.query('SELECT * FROM devices', null)
    expect(result.rowCount).toBe(0)
    expect(dbQuery).toHaveBeenCalledWith('SELECT * FROM devices', null)
    expect(dbQuery).toHaveBeenCalled()
  })

  test('should get unknown error when status code is not known', () => {
    const result = POSTGRES_RESPONSE_CODES('28P00')
    expect(result).toBe('unknown error')
  })

  test('should get invalid password when status code is 28P01', () => {
    const result = POSTGRES_RESPONSE_CODES('28P01')
    expect(result).toBe('invalid_password')
  })

  test('should get null when status code is not given', () => {
    const result = POSTGRES_RESPONSE_CODES()
    expect(result).toBe('statusCode null')
  })
})
