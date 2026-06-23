/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { body } from 'express-validator'

// Validators for the CIM_OpaqueManagementDataService POST routes. Handle is the
// InstanceID of the data block; the reference-typed parameters (Identity, Owner,
// NewOwner, BasedOnExtent) are passed as their selector value strings.
export const readOpaqueManagementDataValidator = (): any => [
  body('Handle').isString().withMessage('Handle is required'),
  body('Length').optional().isInt({ min: 0 }),
  body('Offset').optional().isInt({ min: 0 }),
  body('LockToken').optional().isString()
]

export const writeOpaqueManagementDataValidator = (): any => [
  body('Handle').isString().withMessage('Handle is required'),
  body('Data').isString().withMessage('Data is required'),
  body('Length').optional().isInt({ min: 0 }),
  body('Offset').optional().isInt({ min: 0 }),
  body('Truncate').optional().isBoolean(),
  body('LockToken').optional().isString()
]

export const createOpaqueManagementDataValidator = (): any => [
  body('DataFormat').optional().isString(),
  body('ElementName').optional().isString(),
  body('MaxSize').optional().isInt({ min: 0 }),
  body('BasedOnExtent').optional().isString(),
  body('Owner').optional().isString()
]

export const lockOpaqueManagementDataValidator = (): any => [
  body('Handle').isString().withMessage('Handle is required'),
  body('Lock').isBoolean().withMessage('Lock must be a boolean'),
  body('LockToken').optional().isString()
]

export const assignAccessOpaqueManagementDataValidator = (): any => [
  body('Handle').isString().withMessage('Handle is required'),
  body('Identity').isString().withMessage('Identity is required'),
  body('Activities').isArray().withMessage('Activities must be an array of uint16 values')
]

export const reassignOwnershipOpaqueManagementDataValidator = (): any => [
  body('Handle').isString().withMessage('Handle is required'),
  body('NewOwner').isString().withMessage('NewOwner is required')
]

export const exportOpaqueManagementDataToURIValidator = (): any => [
  body('Handle').isString().withMessage('Handle is required'),
  body('ExportURI').isString().withMessage('ExportURI is required'),
  body('Length').optional().isInt({ min: 0 }),
  body('Offset').optional().isInt({ min: 0 }),
  body('LockToken').optional().isString()
]

export const importOpaqueManagementDataFromURIValidator = (): any => [
  body('Handle').isString().withMessage('Handle is required'),
  body('ImportURI').isString().withMessage('ImportURI is required'),
  body('Length').optional().isInt({ min: 0 }),
  body('Offset').optional().isInt({ min: 0 }),
  body('Truncate').optional().isBoolean(),
  body('LockToken').optional().isString()
]
