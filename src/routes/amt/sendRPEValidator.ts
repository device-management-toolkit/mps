/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { body, type ValidationChain } from 'express-validator'
import { MAX_SSD_PASSWORD_LENGTH } from './rpeConstants.js'

export const sendRPEValidator = (): ValidationChain[] => [
  body('secureEraseAllSSDs').optional().isBoolean({ strict: true }).withMessage('secureEraseAllSSDs must be a boolean'),
  body('tpmClear').optional().isBoolean({ strict: true }).withMessage('tpmClear must be a boolean'),
  body('restoreBIOSToEOM').optional().isBoolean({ strict: true }).withMessage('restoreBIOSToEOM must be a boolean'),
  body('unconfigureCSME').optional().isBoolean({ strict: true }).withMessage('unconfigureCSME must be a boolean'),
  body().custom((value) => {
    const { secureEraseAllSSDs, tpmClear, restoreBIOSToEOM, unconfigureCSME } = value
    if (!secureEraseAllSSDs && !tpmClear && !restoreBIOSToEOM && !unconfigureCSME) {
      throw new Error('At least one erase option must be enabled')
    }
    return true
  }),
  ...['ssdPassword', 'psid'].map((field) =>
    body(field)
      .optional()
      .isString()
      .withMessage(`${field} must be a string`)
      .bail()
      .custom((value: string) => {
        if (Buffer.byteLength(value, 'utf8') > MAX_SSD_PASSWORD_LENGTH) {
          throw new Error(
            `${field === 'ssdPassword' ? 'SSD password' : 'PSID'} must not exceed ${MAX_SSD_PASSWORD_LENGTH} bytes`
          )
        }
        return true
      })
  )
]
