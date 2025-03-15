/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { check } from 'express-validator'
import { DMTFCombinedPowerStates } from '../../utils/constants.js'

export const powerActionValidator = (): any => [
  check('action').isIn(DMTFCombinedPowerStates).isNumeric()
]
