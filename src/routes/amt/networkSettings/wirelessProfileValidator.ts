/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { body, param } from 'express-validator'

export const wirelessProfileDeleteValidator = (): any => [
  param('profileName')
    .isString()
    .matches(/^[a-zA-Z0-9]+$/)
    .withMessage('profileName must be alphanumeric')
]

export const wirelessProfileValidator = (): any => [
  body('profileName')
    .isString()
    .matches(/^[a-zA-Z0-9]+$/)
    .withMessage('profileName is required and must be alphanumeric'),
  body('ssid').isString().notEmpty().withMessage('ssid is required'),
  body('priority').isInt({ min: 1, max: 255 }).withMessage('priority must be between 1 and 255'),
  body('authenticationMethod').isString().notEmpty().withMessage('authenticationMethod is required'),
  body('encryptionMethod').isString().notEmpty().withMessage('encryptionMethod is required'),
  body('password').optional({ checkFalsy: true }).isString(),
  body('ieee8021x').optional().isObject().withMessage('ieee8021x must be an object'),
  body('ieee8021x.username')
    .if(body('ieee8021x').exists())
    .isString()
    .notEmpty()
    .withMessage('ieee8021x.username is required'),
  body('ieee8021x.authenticationProtocol')
    .if(body('ieee8021x').exists())
    .isInt({ min: 0, max: 2 })
    .withMessage('ieee8021x.authenticationProtocol must be 0 (EAP-TLS) or 2 (PEAP)')
]
