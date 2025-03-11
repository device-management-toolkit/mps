/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { check } from 'express-validator'
import { DMTFOSPowerSavingState } from '../../utils/constants.js'

export const osPowerSavingStateValidator = (): any => [
  check('OSPowerSavingState').isIn(DMTFOSPowerSavingState).isNumeric()
]