/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { check } from 'express-validator'
import { mapEnumReverse, WIRELESS_STATE_VALUE_TO_STRING } from './helper.js'

export const wirelessStateValidator = (): any => [
  check('state')
    .exists()
    .withMessage('state is required')
    .bail()
    .custom((value) => mapEnumReverse(value, WIRELESS_STATE_VALUE_TO_STRING) != null)
    .withMessage('state must be one of WifiDisabled, WifiEnabledS0, WifiEnabledS0SxAC')
]
