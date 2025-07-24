/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type Response, type Request } from 'express'
import { logger, messages } from '../../../logging/index.js'
import { ErrorResponse } from '../../../utils/amtHelper.js'
import { MPSValidationError } from '../../../utils/MPSValidationError.js'
import { MqttProvider } from '../../../utils/MqttProvider.js'
import crypto from 'node:crypto'

interface CertInfo {
  cert: string
  isTrusted: boolean
}

export async function addAMTCertificate(req: Request, res: Response): Promise<void> {
  try {
    const guid: string = req.params.guid
    const certInfo: CertInfo = req.body

    // Add certificate using device action
    const handle = await addCertificateToDevice(req, guid, certInfo)

    MqttProvider.publishEvent('success', ['AMT_AddCertificate'], messages.AMT_CERTIFICATES_ADD_SUCCESS, guid)
    res.status(200).json({ handle: handle }).end()
  } catch (error) {
    logger.error(`${messages.AMT_CERTIFICATES_EXCEPTION}: ${error}`)
    if (error instanceof MPSValidationError) {
      res.status(error.status ?? 400).json(ErrorResponse(error.status ?? 400, error.message))
    } else {
      MqttProvider.publishEvent('fail', ['AMT_AddCertificate'], messages.INTERNAL_SERVICE_ERROR)
      res.status(500).json(ErrorResponse(500, messages.AMT_CERTIFICATES_EXCEPTION))
    }
  }
}

async function addCertificateToDevice(req: Request, guid: string, certInfo: CertInfo): Promise<string> {
  let certData: Buffer

  // Step 1: Decode from base64
  try {
    certData = Buffer.from(certInfo.cert, 'base64')
  } catch {
    throw new MPSValidationError('Invalid base64 certificate data', 400)
  }

  // Step 2: Convert to PEM string (try both DER and PEM input)
  let pem: string
  const certString = certData.toString('utf8')

  if (certString.includes('-----BEGIN CERTIFICATE-----')) {
    pem = certString
  } else {
    try {
      const cert = new crypto.X509Certificate(certData)
      pem = cert.toString()
    } catch {
      throw new MPSValidationError('Invalid certificate format (not valid DER or PEM)', 400)
    }
  }

  // Step 3: Validate certificate using node-forge
  try {
    const cert = new crypto.X509Certificate(pem)

    // Check expiration
    const now = new Date()
    const notAfter = new Date(cert.validTo)
    if (notAfter < now) {
      throw new MPSValidationError('Certificate has expired', 400)
    }

    // Clean certificate content (remove headers/footers)
    const cleanedCert = pem
      .split('\n')
      .filter((line) => !line.includes('BEGIN CERTIFICATE') && !line.includes('END CERTIFICATE'))
      .join('')
      .replace(/\r/g, '')

    // Step 4: Add to device
    const handle = await req.deviceAction.addCertificate(cleanedCert, certInfo.isTrusted)
    if (!handle) {
      throw new MPSValidationError('Failed to add certificate to device', 400)
    }

    return handle
  } catch (err) {
    logger.warn('Certificate validation failed:', err)
    throw new MPSValidationError('Failed to validate or process certificate', 400)
  }
}
