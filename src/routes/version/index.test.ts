/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import index from './index.js'
import { spyOn } from 'jest-mock'

describe('Check index from version', () => {
  let indexSpy: jest.Spied<any>
  beforeEach(() => {
    indexSpy = spyOn(index, 'get')
  })
  it('should pass', async () => {
    expect(indexSpy).toBeDefined()
  })
})
