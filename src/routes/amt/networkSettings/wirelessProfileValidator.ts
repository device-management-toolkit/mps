/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { check } from 'express-validator'

export const wirelessProfileValidator = (): any => [
  check('profileName')
    .isString()
    .matches(/^[a-zA-Z0-9]+$/)
    .withMessage('profileName is required and must be alphanumeric'),
  check('ssid').isString().notEmpty().withMessage('ssid is required'),
  check('priority').isInt({ min: 1, max: 255 }).withMessage('priority must be between 1 and 255'),
  check('authenticationMethod').isString().notEmpty().withMessage('authenticationMethod is required'),
  check('encryptionMethod').isString().notEmpty().withMessage('encryptionMethod is required'),
  check('password').optional({ checkFalsy: true }).isString(),
  check('ieee8021x').optional().isObject().withMessage('ieee8021x must be an object'),
  check('ieee8021x.username')
    .if(check('ieee8021x').exists())
    .isString()
    .notEmpty()
    .withMessage('ieee8021x.username is required'),
  check('ieee8021x.authenticationProtocol')
    .if(check('ieee8021x').exists())
    .isInt({ min: 0, max: 2 })
    .withMessage('ieee8021x.authenticationProtocol must be 0 (EAP-TLS) or 2 (PEAP)')
]
