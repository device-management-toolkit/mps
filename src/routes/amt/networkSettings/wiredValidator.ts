/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { check } from 'express-validator'

export const wiredNetworkValidator = (): any => [
  check('dhcpEnabled').isBoolean().withMessage('dhcpEnabled must be a boolean').toBoolean(),
  check('ipSyncEnabled').optional().isBoolean().withMessage('ipSyncEnabled must be a boolean').toBoolean(),
  check('ipAddress').optional({ checkFalsy: true }).isIP(4).withMessage('ipAddress must be a valid IPv4 address'),
  check('subnetMask').optional({ checkFalsy: true }).isIP(4).withMessage('subnetMask must be a valid IPv4 address'),
  check('defaultGateway')
    .optional({ checkFalsy: true })
    .isIP(4)
    .withMessage('defaultGateway must be a valid IPv4 address'),
  check('primaryDNS').optional({ checkFalsy: true }).isIP(4).withMessage('primaryDNS must be a valid IPv4 address'),
  check('secondaryDNS').optional({ checkFalsy: true }).isIP(4).withMessage('secondaryDNS must be a valid IPv4 address')
]
