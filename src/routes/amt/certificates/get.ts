/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type Response, type Request } from 'express'
import { logger, messages } from '../../../logging/index.js'
import { ErrorResponse } from '../../../utils/amtHelper.js'
import { MPSValidationError } from '../../../utils/MPSValidationError.js'
import { MqttProvider } from '../../../utils/MqttProvider.js'
import {
  AMTPublicKeyCertificateResponse,
  AMTPublicPrivateKeyPairResponse,
  CertificateItem,
  CertificatesDTO,
  KeyPairsDTO,
  ProfileAssociation,
  PublicPrivateKeyPairItem,
  type SecuritySettings
} from '../../../models/models.js'

const TypeWireless = 'Wireless'
const TypeWired = 'Wired'
const TypeTLS = 'TLS'

export async function getAMTCertificates(req: Request, res: Response): Promise<void> {
  try {
    const guid: string = req.params.guid
    const amtCertificates = await req.deviceAction.getCertificates()

    MqttProvider.publishEvent('request', ['AMT_GetCertificates'], messages.AMT_CERTIFICATES_GET_REQUESTED, guid)

    if (amtCertificates == null) {
      throw new MPSValidationError(messages.AMT_CERTIFICATES_GET_REQUEST_FAILED, 404)
    }

    const securitySettings: SecuritySettings = {
      certificates: certificatesToDTO(amtCertificates.PublicKeyCertificateResponse),
      publicKeys: keysToDTO(amtCertificates.PublicPrivateKeyPairResponse),
      profileAssociation: []
    }

    const contextResponse = amtCertificates.CIMCredentialContextResponse

    // Process different types of credential contexts if they exist
    if (contextResponse) {
      const tlsContext = contextResponse.AMT_TLSCredentialContext || []
      const wirelessContext = contextResponse.AMT_8021XCredentialContext || []
      const wiredContext = contextResponse.AMT_8021XWiredCredentialContext || []

      // Check for TLS context
      if (tlsContext) {
        const tlsContextArr = Array.isArray(tlsContext) ? tlsContext : [tlsContext]
        processCertificates(tlsContextArr, amtCertificates, TypeTLS, securitySettings)
      }

      // Check for Wireless context (8021x)
      if (wirelessContext) {
        const wirelessContextArr = Array.isArray(wirelessContext) ? wirelessContext : [wirelessContext]
        processCertificates(wirelessContextArr, amtCertificates, TypeWireless, securitySettings)
      }

      // Check for Wired context
      if (wiredContext) {
        const wiredContextArr = Array.isArray(wiredContext) ? wiredContext : [wiredContext]
        processCertificates(wiredContextArr, amtCertificates, TypeWired, securitySettings)
      }
    }

    MqttProvider.publishEvent('success', ['AMT_GetCertificates'], messages.AMT_CERTIFICATES_GET_SUCCESS, guid)

    res.status(200).json(securitySettings).end()
  } catch (error) {
    logger.error(`${messages.AMT_CERTIFICATES_EXCEPTION}: ${error}`)
    if (error instanceof MPSValidationError) {
      res.status(error.status ?? 400).json(ErrorResponse(error.status ?? 400, error.message))
    } else {
      MqttProvider.publishEvent('fail', ['AMT_GetCertificates'], messages.INTERNAL_SERVICE_ERROR)
      res.status(500).json(ErrorResponse(500, messages.AMT_CERTIFICATES_EXCEPTION))
    }
  }
}

function certificatesToDTO(response: AMTPublicKeyCertificateResponse): CertificatesDTO {
  if (!response?.AMT_PublicKeyCertificate) {
    return { keyManagementItems: [], publicKeyCertificateItems: [] }
  }

  const regex = /CN=([^,]+)/
  const certificates = Array.isArray(response.AMT_PublicKeyCertificate)
    ? response.AMT_PublicKeyCertificate
    : [response.AMT_PublicKeyCertificate]

  const publicKeyCertificateItems = certificates.map((cert: any): CertificateItem => {
    const match = regex.exec(cert.Subject)
    const displayName = match?.[1] || cert.InstanceID

    return {
      elementName: cert.ElementName,
      instanceID: cert.InstanceID,
      x509Certificate: cert.X509Certificate,
      trustedRootCertificate: cert.TrustedRootCertficate, // Note: Typo in AMT_PublicKeyCertificate, should be TrustedRootCertificate
      issuer: cert.Issuer,
      subject: cert.Subject,
      readOnlyCertificate: cert.ReadOnlyCertificate,
      publicKeyHandle: cert.PublicKeyHandle,
      associatedProfiles: cert.AssociatedProfiles || [],
      displayName: displayName
    }
  })

  return {
    keyManagementItems: [],
    publicKeyCertificateItems
  }
}

function keysToDTO(response: AMTPublicPrivateKeyPairResponse): KeyPairsDTO {
  const keyPair = response?.AMT_PublicPrivateKeyPair
  if (!keyPair) return { publicPrivateKeyPairItems: [] }

  const pairs = Array.isArray(keyPair) ? keyPair : [keyPair]

  const publicPrivateKeyPairItems = pairs.map(
    (key: any): PublicPrivateKeyPairItem => ({
      elementName: key.ElementName,
      instanceID: key.InstanceID,
      derKey: key.DERKey,
      certificateHandle: key.CertificateHandle
    })
  )

  return { publicPrivateKeyPairItems }
}

function processConcreteDependencies(
  certificateHandle: string,
  profileAssociation: ProfileAssociation,
  dependencyItems: any[],
  securitySettings: SecuritySettings
): void {
  for (const dependency of dependencyItems) {
    const antecedent = dependency.Antecedent?.ReferenceParameters?.SelectorSet?.Selector

    if (antecedent === certificateHandle) {
      const dependent = dependency.Dependent?.ReferenceParameters?.SelectorSet?.Selector
      const keyHandle = Array.isArray(dependent) ? dependent[1] : dependent

      const matchedKey = securitySettings.publicKeys.publicPrivateKeyPairItems.find(
        (key: any) => key.InstanceID === keyHandle
      )

      if (matchedKey) {
        profileAssociation.publicKey = { ...matchedKey }
        return
      }
    }
  }
}

function buildCertificateAssociations(
  profileAssociation: ProfileAssociation,
  securitySettings: SecuritySettings
): void {
  let publicKeyHandle = ''

  if (profileAssociation.clientCertificate) {
    const matchedKeyPair = securitySettings.publicKeys.publicPrivateKeyPairItems.find(
      (key) => key.instanceID === profileAssociation.publicKey?.instanceID
    )

    if (matchedKeyPair) {
      matchedKeyPair.certificateHandle = profileAssociation.clientCertificate.instanceID
      publicKeyHandle = matchedKeyPair.instanceID
    }
  }

  const certs = securitySettings.certificates.publicKeyCertificateItems
  const profileAssociationText = getProfileAssociationText(profileAssociation)

  for (const cert of certs) {
    const isClientCertMatch = profileAssociation.clientCertificate?.instanceID === cert.instanceID
    const isRootCertMatch = profileAssociation.rootCertificate?.instanceID === cert.instanceID

    if (!isClientCertMatch && !isRootCertMatch) {
      continue
    }

    if (!cert.trustedRootCertificate) {
      cert.publicKeyHandle = publicKeyHandle
    }

    cert.associatedProfiles.push(profileAssociationText)
  }
}

function getProfileAssociationText(profileAssociation: ProfileAssociation): string {
  return profileAssociation.type === TypeWireless
    ? `${profileAssociation.type} - ${profileAssociation.profileID}`
    : profileAssociation.type
}

function buildProfileAssociations(
  certificateHandle: string,
  profileAssociation: ProfileAssociation,
  response: any,
  securitySettings: SecuritySettings
): void {
  // Step 1: Match certificate by InstanceID
  const matchedCert = securitySettings.certificates.publicKeyCertificateItems.find(
    (cert: any) => cert.instanceID === certificateHandle
  )
  if (matchedCert) {
    if (matchedCert.trustedRootCertificate) {
      profileAssociation.rootCertificate = matchedCert
    } else {
      profileAssociation.clientCertificate = matchedCert

      const dependencyItems = response?.ConcreteDependencyResponse?.CIM_ConcreteDependency
      if (dependencyItems) {
        processConcreteDependencies(certificateHandle, profileAssociation, dependencyItems, securitySettings)
      }
    }
  }

  // Step 2: Check if profile association already exists
  const existingAssociation = securitySettings.profileAssociation.find(
    (assoc: any) => assoc.profileID === profileAssociation.profileID
  )

  if (existingAssociation) {
    updateCertificate(existingAssociation, profileAssociation)
  } else {
    securitySettings.profileAssociation.push(profileAssociation)
  }
}

function updateCertificate(existing: ProfileAssociation, incoming: ProfileAssociation): void {
  if (incoming.rootCertificate) existing.rootCertificate = incoming.rootCertificate
  if (incoming.clientCertificate) existing.clientCertificate = incoming.clientCertificate
  if (incoming.publicKey) existing.publicKey = incoming.publicKey
}

function processCertificates(
  contextItems: any[],
  response: any,
  profileType: string,
  securitySettings: SecuritySettings
): void {
  if (!contextItems?.length) return

  for (const item of contextItems) {
    const selector = item.ElementProvidingContext?.ReferenceParameters?.SelectorSet?.Selector
    const profileID = selector?.replace(/^Intel\(r\) AMT:IEEE 802\.1x Settings /, '') || ''

    const certificateHandle = item.ElementInContext?.ReferenceParameters?.SelectorSet?.Selector
    if (!certificateHandle) continue

    const profileAssociation: ProfileAssociation = {
      type: profileType,
      profileID
    }

    buildProfileAssociations(certificateHandle, profileAssociation, response, securitySettings)
    buildCertificateAssociations(profileAssociation, securitySettings)
  }
}
