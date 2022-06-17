/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { check } from 'express-validator'
import { DMTFPowerExtendedStates } from '../../utils/constants'

export const bootOptionsValidator = (): any => {
  return [
    check('action')
      .isIn(DMTFPowerExtendedStates)
      .isNumeric(),
    check('useSOL')
      .isBoolean()
      .toBoolean()
  ]
}
