/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { body } from 'express-validator'
import { MAX_SSD_PASSWORD_LENGTH } from './rpeConstants.js'

export const sendRPEValidator = (): any => [
  body('secureEraseAllSSDs').optional().isBoolean({ strict: true }).withMessage('secureEraseAllSSDs must be a boolean'),
  body('tpmClear').optional().isBoolean({ strict: true }).withMessage('tpmClear must be a boolean'),
  body('restoreBIOSToEOM').optional().isBoolean({ strict: true }).withMessage('restoreBIOSToEOM must be a boolean'),
  body('unconfigureCSME').optional().isBoolean({ strict: true }).withMessage('unconfigureCSME must be a boolean'),
  body('ssdPassword').optional().isString().withMessage('ssdPassword must be a string'),
  body().custom((value) => {
    const { secureEraseAllSSDs, tpmClear, restoreBIOSToEOM, unconfigureCSME } = value
    if (!secureEraseAllSSDs && !tpmClear && !restoreBIOSToEOM && !unconfigureCSME) {
      throw new Error('At least one erase option must be enabled')
    }
    return true
  }),
  body('ssdPassword').optional().custom((value: string) => {
    if (typeof value === 'string' && new TextEncoder().encode(value).length > MAX_SSD_PASSWORD_LENGTH) {
      throw new Error(`SSD password must not exceed ${MAX_SSD_PASSWORD_LENGTH} bytes`)
    }
    return true
  })
]
