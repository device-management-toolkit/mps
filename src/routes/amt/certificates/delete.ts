/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type Response, type Request } from 'express'
import { logger, messages } from '../../../logging/index.js'
import { ErrorResponse } from '../../../utils/amtHelper.js'
import { MPSValidationError } from '../../../utils/MPSValidationError.js'
import { MqttProvider } from '../../../utils/MqttProvider.js'

interface AMTPublicKeyCertificate {
  InstanceID: string
  ElementName?: string
  ReadOnlyCertificate?: boolean
  AssociatedProfiles?: string[]
}

interface AMTCredentialContext {
  ElementInContext?: {
    ReferenceParameters?: {
      SelectorSet?: {
        Selector?: string
      }
    }
  }
  ElementProvidingContext?: {
    ReferenceParameters?: {
      SelectorSet?: {
        Selector?: string
      }
    }
  }
}

interface AMTCertificatesResponse {
  PublicKeyCertificateResponse?: {
    AMT_PublicKeyCertificate?: AMTPublicKeyCertificate[] | AMTPublicKeyCertificate
  }
  CIMCredentialContextResponse?: {
    AMT_TLSCredentialContext?: AMTCredentialContext[] | AMTCredentialContext
    AMT_8021XCredentialContext?: AMTCredentialContext[] | AMTCredentialContext
    AMT_8021XWiredCredentialContext?: AMTCredentialContext[] | AMTCredentialContext
  }
}

export async function deleteAMTCertificate(req: Request, res: Response): Promise<void> {
  try {
    const guid: string = req.params.guid
    // Handle can come from URL parameter (instanceId) or request body
    const handle = req.params.instanceId || req.body.handle

    if (!handle) {
      throw new MPSValidationError('Certificate handle/instanceId is required', 400)
    }

    // Step 1: Get current certificates to check for references
    const amtCertificates = await req.deviceAction.getCertificates()
    if (amtCertificates == null) {
      throw new MPSValidationError('Failed to retrieve current certificates', 500)
    }

    // Step 2: Check if certificate exists and is deletable
    await validateCertificateForDeletion(handle, amtCertificates)

    // Step 3: Perform the deletion
    const result = await req.deviceAction.removeCertificate(handle)
    if (!result) {
      throw new MPSValidationError('Failed to delete certificate from device', 500)
    }

    MqttProvider.publishEvent('success', ['AMT_DeleteCertificate'], messages.AMT_CERTIFICATES_DELETE_SUCCESS, guid)
    res.status(200).json({ message: 'Certificate deleted successfully', handle }).end()
  } catch (error) {
    logger.error(`${messages.AMT_CERTIFICATES_EXCEPTION}: ${error}`)
    if (error instanceof MPSValidationError) {
      res.status(error.status ?? 400).json(ErrorResponse(error.status ?? 400, error.message))
    } else {
      MqttProvider.publishEvent('fail', ['AMT_DeleteCertificate'], messages.INTERNAL_SERVICE_ERROR)
      res.status(500).json(ErrorResponse(500, messages.AMT_CERTIFICATES_EXCEPTION))
    }
  }
}

async function validateCertificateForDeletion(handle: string, amtCertificates: AMTCertificatesResponse): Promise<void> {
  // Find the certificate by handle
  const certificates = amtCertificates.PublicKeyCertificateResponse?.AMT_PublicKeyCertificate || []
  const certificatesArray = Array.isArray(certificates) ? certificates : [certificates]
  
  const targetCert = certificatesArray.find((cert: AMTPublicKeyCertificate) => 
    cert.InstanceID === handle || cert.ElementName === handle
  )

  if (!targetCert) {
    throw new MPSValidationError(`Certificate with handle '${handle}' not found`, 404)
  }

  // Check if certificate is read-only
  if (targetCert.ReadOnlyCertificate) {
    throw new MPSValidationError(
      `Cannot delete certificate '${handle}': Certificate is read-only and cannot be removed`,
      400
    )
  }

  // Check for profile associations
  const references = await getCertificateReferences(handle, amtCertificates)
  
  if (references.length > 0) {
    const referenceList = references.join(', ')
    throw new MPSValidationError(
      `Cannot delete certificate '${handle}': Certificate is currently referenced by the following AMT profiles/configurations: ${referenceList}. Remove these references before deleting the certificate.`,
      409 // Conflict status code
    )
  }
}

/**
 * Extracts a clean profile ID from an AMT profile selector string
 * @param profileSelector - The raw profile selector string from AMT
 * @returns Clean profile ID or 'Unknown Profile' if extraction fails
 */
function extractProfileID(profileSelector?: string): string {
  return profileSelector?.replace(/^Intel\(r\) AMT:IEEE 802\.1x Settings /, '') || 'Unknown Profile'
}

async function getCertificateReferences(handle: string, amtCertificates: AMTCertificatesResponse): Promise<string[]> {
  const references: string[] = []

  // Check direct AssociatedProfiles on the certificate
  const certificates = amtCertificates.PublicKeyCertificateResponse?.AMT_PublicKeyCertificate || []
  const certificatesArray = Array.isArray(certificates) ? certificates : [certificates]
  
  const targetCert = certificatesArray.find((cert: AMTPublicKeyCertificate) => 
    cert.InstanceID === handle || cert.ElementName === handle
  )

  if (targetCert?.AssociatedProfiles?.length > 0) {
    references.push(...targetCert.AssociatedProfiles)
  }

  // Check credential contexts for references
  const contextResponse = amtCertificates.CIMCredentialContextResponse
  
  if (contextResponse) {
    // Check TLS contexts
    const tlsContexts = contextResponse.AMT_TLSCredentialContext || []
    const tlsArray = Array.isArray(tlsContexts) ? tlsContexts : [tlsContexts]
    
    for (const context of tlsArray) {
      const certificateHandle = context.ElementInContext?.ReferenceParameters?.SelectorSet?.Selector
      if (certificateHandle === handle) {
        const profileSelector = context.ElementProvidingContext?.ReferenceParameters?.SelectorSet?.Selector
        const profileID = extractProfileID(profileSelector)
        references.push(`TLS - ${profileID}`)
      }
    }

    // Check 802.1X Wireless contexts
    const wirelessContexts = contextResponse.AMT_8021XCredentialContext || []
    const wirelessArray = Array.isArray(wirelessContexts) ? wirelessContexts : [wirelessContexts]
    
    for (const context of wirelessArray) {
      const certificateHandle = context.ElementInContext?.ReferenceParameters?.SelectorSet?.Selector
      if (certificateHandle === handle) {
        const profileSelector = context.ElementProvidingContext?.ReferenceParameters?.SelectorSet?.Selector
        const profileID = extractProfileID(profileSelector)
        references.push(`Wireless - ${profileID}`)
      }
    }

    // Check 802.1X Wired contexts
    const wiredContexts = contextResponse.AMT_8021XWiredCredentialContext || []
    const wiredArray = Array.isArray(wiredContexts) ? wiredContexts : [wiredContexts]
    
    for (const context of wiredArray) {
      const certificateHandle = context.ElementInContext?.ReferenceParameters?.SelectorSet?.Selector
      if (certificateHandle === handle) {
        const profileSelector = context.ElementProvidingContext?.ReferenceParameters?.SelectorSet?.Selector
        const profileID = extractProfileID(profileSelector)
        references.push(`Wired - ${profileID}`)
      }
    }
  }

  // Remove duplicates and return
  return [...new Set(references)]
}