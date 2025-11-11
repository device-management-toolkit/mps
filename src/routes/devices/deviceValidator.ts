/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { check, query } from 'express-validator'

export const validator = (): any => [
  check('guid').isUUID('loose').isString(),
  check('friendlyName').optional({ nullable: true }).isString(),
  check('hostname')
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 255 })
    .withMessage('Hostname must be less than 256 characters'),
  check('mpsusername').optional({ nullable: true }).isString(),
  check('connect').optional({ nullable: true }).isISO8601().toDate(),
  check('disconnect').optional({ nullable: true }).isISO8601().toDate(),
  check('tags').optional().isArray().withMessage('tags should be an array of strings'),
  check('tags.*').optional().isString().withMessage('tags should be an array of strings'),
  check('deviceInfo').optional({ nullable: true }).isObject().withMessage('deviceInfo should be an object if provided')
]

export const odataValidator = (): any => [
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

export const metadataQueryValidator = (): any => [
  check('tags').optional().isString(),
  check('hostname').optional().isLength({ min: 0, max: 256 }).isString(),
  check('status').optional().isNumeric().isIn([0, 1]).toInt(),
  check('method').optional().isIn(['AND', 'OR']).isString()
]
