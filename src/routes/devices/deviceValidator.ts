/*********************************************************************
 * Copyright (c) Intel Corporation 2021
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { check, query } from 'express-validator'

export const validator = (): any => {
  return [
    check('guid')
      .isUUID(),
    check('hostname')
      .optional({ nullable: true })
      .isString(),
    check('mpsusername')
      .optional({ nullable: true })
      .isString(),
    check('tags')
      .optional()
      .isArray()
      .withMessage('tags should be an array of strings')
  ]
}

export const odataValidator = (): any => {
  return [
    query('$top')
      .optional()
      .isInt({ min: 0 })
      .default(25)
      .withMessage('The number of items to return should be a positive integer'),
    query('$skip')
      .optional()
      .isInt({ min: 0 })
      .default(0)
      .withMessage('The number of items to skip before starting to collect the result set should be a positive integer'),
    query('$count')
      .optional()
      .isBoolean()
      .withMessage('To return total number of records in result set should be boolean')
      .toBoolean()
  ]
}

export const metadataQueryValidator = (): any => {
  return [
    check('tags')
      .optional()
      .isString(),
    check('hostname')
      .optional()
      .isLength({ min: 0, max: 256 })
      .isString(),
    check('status')
      .optional()
      .isNumeric()
      .isIn([0, 1])
      .toInt(),
    check('method')
      .optional()
      .isIn(['AND', 'OR'])
      .isString()
  ]
}
