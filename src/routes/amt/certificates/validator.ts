/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { check, type CustomValidator } from 'express-validator'
import crypto from 'node:crypto'

export const certValidator = (): any => [
  check('cert').not().isEmpty().withMessage('Certificate is required').custom(expirationValidator),
  check('isTrusted').isBoolean().withMessage('isTrusted must be a boolean value')
]

export const deleteCertValidator = (): any => [
  // Validate instanceId from params, allow optional handle in body for backward compatibility
  check('instanceId').optional().isString().withMessage('instanceId must be a string'),
  check('handle').optional().isString().withMessage('handle must be a string'),
  check(['instanceId', 'handle']).custom((value, { req }) => {
    if (!req.params.instanceId && !req.body.handle) {
      throw new Error('At least one of instanceId or handle must be provided')
    }
    return true
  })
]

const expirationValidator: CustomValidator = (value, { req }) => {
  const certInput = req.body.cert as string
  let certData: Buffer

  try {
    certData = Buffer.from(certInput, 'base64')
  } catch {
    throw new Error('Invalid base64 certificate data')
  }

  let cert: crypto.X509Certificate

  try {
    cert = new crypto.X509Certificate(certData)
  } catch (err) {
    try {
      const certString = certData.toString('utf8')
      if (certString.includes('-----BEGIN CERTIFICATE-----')) {
        cert = new crypto.X509Certificate(certString)
      } else {
        throw new Error('Invalid certificate format (not valid DER or PEM)')
      }
    } catch (err) {
      throw new Error('Invalid certificate format (not valid DER or PEM)')
    }
  }

  try {
    const now = new Date()
    const notAfter = new Date(cert.validTo)

    if (notAfter < now) {
      throw new Error('Certificate has expired')
    }

    return true
  } catch (err) {
    if (err instanceof Error && err.message === 'Certificate has expired') {
      throw err
    }
    throw new Error('Failed to validate certificate expiration')
  }
}
