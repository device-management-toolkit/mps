/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { vi, type MockInstance } from 'vitest'
import index from './index.js'
describe('Check index from version', () => {
  let indexSpy: MockInstance
  beforeEach(() => {
    indexSpy = vi.spyOn(index, 'get')
  })
  it('should pass', async () => {
    expect(indexSpy).toBeDefined()
  })
})
