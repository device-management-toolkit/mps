/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { check } from 'express-validator'

export const wirelessProfileSyncValidator = (): any => [
  check('localProfileSync')
    .optional({ nullable: true })
    .isBoolean({ strict: true })
    .withMessage('localProfileSync must be a boolean'),
  check('uefiProfileSync')
    .optional({ nullable: true })
    .isBoolean({ strict: true })
    .withMessage('uefiProfileSync must be a boolean')
]
