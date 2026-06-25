/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { check } from 'express-validator'
import { parseWirelessState } from './helper.js'

export const wirelessStateValidator = (): any => [
  check('state')
    .exists()
    .withMessage('state is required')
    .bail()
    .custom((value) => parseWirelessState(value) != null)
    .withMessage('state must be one of WifiDisabled, WifiEnabledS0, WifiEnabledS0SxAC')
]
