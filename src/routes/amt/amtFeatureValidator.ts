/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { check } from 'express-validator'

export const amtFeaturesValidator = (): any => [
  check('userConsent')
    .isIn([
      'kvm',
      'all',
      'none'
    ])
    .isString(),
  check('enableSOL').isBoolean().toBoolean(),
  check('enableIDER').isBoolean().toBoolean(),
  check('enableKVM').isBoolean().toBoolean(),
  check('ocr').optional().isBoolean().toBoolean()
]
