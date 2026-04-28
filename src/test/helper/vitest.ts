/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { vi, type Mock } from 'vitest'
export const createSpyObj = (baseName, methodNames): Record<string, Mock<any>> => {
  const obj: any = {}

  for (const methodName of methodNames) {
    obj[methodName] = vi.fn()
  }

  return obj
}
