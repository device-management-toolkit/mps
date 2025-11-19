/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { check, query } from 'express-validator'

export const linkPreferenceValidator = (): any => [
  check('linkPreference').isInt({ min: 1, max: 2 }).withMessage('linkPreference must be 1 (ME) or 2 (HOST)'),
  check('timeout').isInt({ min: 0 }).withMessage('timeout must be a non-negative integer'),
  query('instanceID').optional().isString()
]

