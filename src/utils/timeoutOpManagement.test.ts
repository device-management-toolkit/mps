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
  // Each test gets its own promise so the resolved state of the first does
  // not leak into the second. The original jest suite shared a single
  // `myPromise` across both tests, which passed under jest only because the
  // un-awaited assertion in the second test let the (already-resolved) value
  // flow through before the timeout tripped.
  const makePromise = (): Promise<string> =>
    new Promise<string>((resolve) => {
      setTimeout(() => {
        resolve('Operation completed')
      }, 2000)
    })

  it('Operation finishes before the default timeout', async () => {
    const mytimeout = tomgmt.getTimeoutMsDefault()

    await expect(tomgmt.operationWithTimeout(makePromise(), mytimeout)).resolves.toBe('Operation completed')
  })

  it('Operation finishes after the default timeout', async () => {
    const mytimeout = 1000 // 1 second

    await expect(tomgmt.operationWithTimeout(makePromise(), mytimeout)).rejects.toBeInstanceOf(tomgmt.TimeoutError)
  })
})
