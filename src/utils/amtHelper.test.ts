/*********************************************************************
 * Copyright (c) Intel Corporation 2026
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { ErrorResponse } from './amtHelper.js'

describe('ErrorResponse', () => {
  it('uses the table message for a plain status', () => {
    expect(ErrorResponse(500)).toEqual({ error: 'Internal Server Error' })
  })
  it('adds errorDescription when given', () => {
    expect(ErrorResponse(400, 'bad input')).toEqual({ error: 'Incorrect URI or Bad Request', errorDescription: 'bad input' })
  })
  it('selects the 404 message by key', () => {
    expect(ErrorResponse(404, 'guid : 1', 'device')).toEqual({
      error: 'Device not found/connected. Please connect again using CIRA.',
      errorDescription: 'guid : 1'
    })
  })
  it('returns a string, not the table, for a 404 without a key', () => {
    const response = ErrorResponse(404, 'thing not found')
    expect(response).toEqual({ error: 'Not Found', errorDescription: 'thing not found' })
    expect(typeof response.error).toBe('string')
  })
  it('falls back to a string for an unknown 404 key', () => {
    expect(ErrorResponse(404, undefined, 'nope')).toEqual({ error: 'Not Found' })
  })
})
