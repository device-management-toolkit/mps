/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import * as tomgmt from './timeoutOpManagement.js'

// getTimeoutMsDefault: Verifies the value in config file for default timeout. If not found, it returns a predefined value (10000 ms).

describe('getTimeoutMsDefault', () => {
  it('It must return a positive number is milliseconds (from config file or predefined)', () => {
    const predefined = tomgmt.getTimeoutMsDefault()
    expect(predefined).toBeGreaterThan(0)
    expect(typeof predefined).toBe('number')
  })
})

describe('operationWithTimeout', () => {
  // Simulate an asynchronous operation that might take time

  const myPromise = new Promise<string>((resolve) => {
    setTimeout(() => {
      resolve('Operation completed')
    }, 2000)
  })

  it('Operation finishes before the default timeout', () => {
    const mytimeout = tomgmt.getTimeoutMsDefault()

    expect(tomgmt.operationWithTimeout(myPromise, mytimeout)).resolves.toBe('Operation completed')
  })

  it('Operation finishes after the default timeout', () => {
    const mytimeout = 1000 // 1 second

    expect(tomgmt.operationWithTimeout(myPromise, mytimeout)).resolves.toBeInstanceOf(tomgmt.TimeoutError)
  })
})
