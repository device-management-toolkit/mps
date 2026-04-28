/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { vi } from 'vitest'
import index from './index.js'
describe('Check index from health', () => {
  let indexSpy: any
  beforeEach(() => {
    indexSpy = vi.spyOn(index, 'get')
  })
  it('should pass', async () => {
    expect(indexSpy).toBeDefined()
  })
})
