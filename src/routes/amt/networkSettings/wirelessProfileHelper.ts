/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type CIM } from '@device-management-toolkit/wsman-messages'
import {
  AUTHENTICATION_METHOD_TO_STRING,
  ENCRYPTION_METHOD_TO_STRING,
  asArray,
  extractIEEE8021xSettings,
  extractWirelessSettings,
  mapEnum,
  mapEnumReverse
} from './helper.js'
import { type DeviceAction } from '../../../amt/DeviceAction.js'
import { type Certificates } from '../../../models/models.js'

export const RESOURCE_CIM_WIFI_ENDPOINT_SETTINGS = 'CIM_WiFiEndpointSettings'
export const RESOURCE_CIM_IEEE8021X_SETTINGS = 'CIM_IEEE8021xSettings'
export const MAX_WIRELESS_PROFILE_PRIORITY = 255
export const MAX_WIRELESS_PROFILES = 8

export const ieee8021xInstanceID = (profileName: string): string =>
  `Intel(r) AMT:IEEE 802.1x Settings ${profileName}`
export const wifiEndpointInstanceID = (profileName: string): string =>
  `Intel(r) AMT:WiFi Endpoint Settings ${profileName}`

export interface WirelessProfileIEEE8021xResponse {
  username: string
  authenticationProtocol: number
}

export interface WirelessProfileResponse {
  profileName: string
  ssid: string
  authenticationMethod: string
  encryptionMethod: string
  priority: number
  ieee8021x?: WirelessProfileIEEE8021xResponse
}

export interface WirelessProfileIEEE8021xRequest {
  username?: string
  password?: string
  authenticationProtocol?: number
  clientCert?: string
  privateKey?: string
  caCert?: string
}

export interface WirelessProfileConfigRequest {
  profileName?: string
  ssid?: string
  priority?: number
  authenticationMethod?: string
  encryptionMethod?: string
  password?: string
  ieee8021x?: WirelessProfileIEEE8021xRequest
}

export interface IEEE8021xCertHandles {
  clientCertHandle: string
  rootCertHandle: string
}

export interface PreparedWirelessProfile {
  wifiRequest: CIM.Models.WiFiEndpointSettings
  ieee8021xRequest: CIM.Models.IEEE8021xSettings
  certHandles: IEEE8021xCertHandles
  needsPauseBeforeApply: boolean
}

// Loosely-typed WSMAN association shapes. CIM.Models.Dependency types Antecedent/
// Dependent as `any` upstream, so these mirror the parsed-XML structure we read.
type WsmanSelector = string | { $?: { Name?: string }; Name?: string; _?: string; Text?: string }

interface WsmanReference {
  ReferenceParameters?: {
    ResourceURI?: string
    SelectorSet?: { Selector?: WsmanSelector | WsmanSelector[] }
  }
}

interface ConcreteDependencyItem {
  Antecedent?: WsmanReference
  Dependent?: WsmanReference
}

const wifiSettingToResponse = (setting: CIM.Models.WiFiEndpointSettings): WirelessProfileResponse => ({
  profileName: setting.ElementName ?? '',
  ssid: setting.SSID ?? '',
  authenticationMethod: mapEnum(setting.AuthenticationMethod, AUTHENTICATION_METHOD_TO_STRING) ?? '',
  encryptionMethod: mapEnum(setting.EncryptionMethod, ENCRYPTION_METHOD_TO_STRING) ?? '',
  priority: setting.Priority ?? 0
})

const referenceInstanceID = (reference: WsmanReference | undefined): string | null => {
  const selectors = asArray<WsmanSelector>(reference?.ReferenceParameters?.SelectorSet?.Selector)
  for (const selector of selectors) {
    const name = typeof selector === 'string' ? undefined : (selector?.$?.Name ?? selector?.Name)
    if (typeof name === 'string' && name.toLowerCase() === 'instanceid') {
      const text = typeof selector === 'string' ? selector : (selector?._ ?? selector?.Text)
      return text || null
    }
  }
  return null
}

const isAssociationResource = (resourceURI: string | undefined, resourceName: string): boolean =>
  typeof resourceURI === 'string' && resourceURI.toLowerCase().endsWith(resourceName.toLowerCase())

/**
 * Builds a WiFi-endpoint -> IEEE8021x InstanceID association map from CIM_ConcreteDependency
 * items.
 */
const mapAssociatedIEEE8021xByWiFiID = (dependencies: unknown): Record<string, string> => {
  const associated: Record<string, string> = {}
  const items = asArray<ConcreteDependencyItem>(
    (dependencies as { CIM_ConcreteDependency?: ConcreteDependencyItem | ConcreteDependencyItem[] })
      ?.CIM_ConcreteDependency
  )
  for (const dependency of items) {
    const antecedentURI = dependency?.Antecedent?.ReferenceParameters?.ResourceURI
    const dependentURI = dependency?.Dependent?.ReferenceParameters?.ResourceURI

    let wifiReference: WsmanReference | undefined
    let ieee8021xReference: WsmanReference | undefined
    if (
      isAssociationResource(antecedentURI, RESOURCE_CIM_WIFI_ENDPOINT_SETTINGS) &&
      isAssociationResource(dependentURI, RESOURCE_CIM_IEEE8021X_SETTINGS)
    ) {
      wifiReference = dependency.Antecedent
      ieee8021xReference = dependency.Dependent
    } else if (
      isAssociationResource(antecedentURI, RESOURCE_CIM_IEEE8021X_SETTINGS) &&
      isAssociationResource(dependentURI, RESOURCE_CIM_WIFI_ENDPOINT_SETTINGS)
    ) {
      wifiReference = dependency.Dependent
      ieee8021xReference = dependency.Antecedent
    } else {
      continue
    }

    const wifiID = referenceInstanceID(wifiReference)
    const ieee8021xID = referenceInstanceID(ieee8021xReference)
    if (wifiID && ieee8021xID) {
      associated[wifiID] = ieee8021xID
    }
  }
  return associated
}

const indexByInstanceID = (items: CIM.Models.IEEE8021xSettings[]): Record<string, CIM.Models.IEEE8021xSettings> => {
  const indexed: Record<string, CIM.Models.IEEE8021xSettings> = {}
  for (const item of items) {
    if (item?.InstanceID) {
      indexed[item.InstanceID] = item
    }
  }
  return indexed
}

const indexByProfileName = (items: CIM.Models.IEEE8021xSettings[]): Record<string, CIM.Models.IEEE8021xSettings> => {
  const indexed: Record<string, CIM.Models.IEEE8021xSettings> = {}
  for (const item of items) {
    if (item?.ElementName) {
      indexed[item.ElementName.trim().toLowerCase()] = item
    }
  }
  return indexed
}

const findAssociatedIEEE8021xSettings = (
  setting: CIM.Models.WiFiEndpointSettings,
  associatedByWiFiID: Record<string, string>,
  byID: Record<string, CIM.Models.IEEE8021xSettings>,
  byProfileName: Record<string, CIM.Models.IEEE8021xSettings>
): CIM.Models.IEEE8021xSettings | null => {
  const associatedID = associatedByWiFiID[setting.InstanceID]
  if (associatedID && byID[associatedID]) {
    return byID[associatedID]
  }

  if (!setting.ElementName) {
    return null
  }

  const fallbackID = ieee8021xInstanceID(setting.ElementName)
  if (byID[fallbackID]) {
    return byID[fallbackID]
  }

  return byProfileName[setting.ElementName.trim().toLowerCase()] ?? null
}

/**
 * Builds sanitized wireless-profile responses, associating IEEE 802.1x settings to each
 * profile via concrete dependencies (with profile-name fallback).
 */
export const buildWirelessProfileResponses = (
  wifiItems: unknown,
  ieee8021xItems: unknown,
  concreteDependencies: unknown
): WirelessProfileResponse[] => {
  const settings = extractWirelessSettings(wifiItems)
  const ieee8021xSettings = extractIEEE8021xSettings(ieee8021xItems)

  const byID = indexByInstanceID(ieee8021xSettings)
  const byProfileName = indexByProfileName(ieee8021xSettings)
  const associatedByWiFiID = mapAssociatedIEEE8021xByWiFiID(concreteDependencies)

  return settings.map((setting) => {
    const response = wifiSettingToResponse(setting)
    const associated = findAssociatedIEEE8021xSettings(setting, associatedByWiFiID, byID, byProfileName)
    if (associated != null) {
      response.ieee8021x = {
        username: associated.Username ?? '',
        authenticationProtocol: (associated.AuthenticationProtocol as unknown as number) ?? 0
      }
    }
    return response
  })
}

const isPSKAuthenticationMethod = (authMethod: number): boolean => {
  const wpapsk = mapEnumReverse('WPAPSK', AUTHENTICATION_METHOD_TO_STRING)
  const wpa2psk = mapEnumReverse('WPA2PSK', AUTHENTICATION_METHOD_TO_STRING)
  return authMethod === wpapsk || authMethod === wpa2psk
}

const isIEEE8021xAuthenticationMethod = (authMethod: number): boolean => {
  const wpaieee8021x = mapEnumReverse('WPAIEEE8021X', AUTHENTICATION_METHOD_TO_STRING)
  const wpa2ieee8021x = mapEnumReverse('WPA2IEEE8021X', AUTHENTICATION_METHOD_TO_STRING)
  return authMethod === wpaieee8021x || authMethod === wpa2ieee8021x
}

const reAlphaNumProfileName = /^[a-zA-Z0-9]+$/

export const validateWirelessProfileConfig = (profile: WirelessProfileConfigRequest): string | null => {
  if (profile == null) {
    return 'wireless profile payload is required'
  }

  if (!profile.profileName || !reAlphaNumProfileName.test(profile.profileName)) {
    return 'profileName is required and must be alphanumeric'
  }

  if (!profile.ssid) {
    return 'ssid is required'
  }

  if (profile.priority == null || profile.priority <= 0 || profile.priority > MAX_WIRELESS_PROFILE_PRIORITY) {
    return `priority is required and must be between 1 and ${MAX_WIRELESS_PROFILE_PRIORITY}`
  }

  const authMethod = mapEnumReverse(profile.authenticationMethod, AUTHENTICATION_METHOD_TO_STRING)
  if (authMethod == null) {
    return 'authenticationMethod is invalid'
  }

  if (mapEnumReverse(profile.encryptionMethod, ENCRYPTION_METHOD_TO_STRING) == null) {
    return 'encryptionMethod is invalid'
  }

  return validateWirelessProfileCredentials(profile, authMethod)
}

const validateWirelessProfileCredentials = (
  profile: WirelessProfileConfigRequest,
  authMethod: number
): string | null => {
  if (isPSKAuthenticationMethod(authMethod)) {
    if (!profile.password || profile.ieee8021x != null) {
      return 'PSK authentication requires a password and must not include ieee8021x settings'
    }
    return null
  }

  if (isIEEE8021xAuthenticationMethod(authMethod)) {
    if (profile.ieee8021x == null || profile.password) {
      return 'IEEE 802.1x authentication requires ieee8021x settings and must not include a password'
    }
    if (!profile.ieee8021x.username) {
      return 'ieee8021x.username is required'
    }
    const protocol = profile.ieee8021x.authenticationProtocol
    if (protocol !== 0 && protocol !== 2) {
      return 'ieee8021x.authenticationProtocol must be 0 (EAP-TLS) or 2 (PEAP)'
    }
    return null
  }

  return 'authenticationMethod is not supported'
}

export const findWirelessSettingByProfileName = (
  settings: CIM.Models.WiFiEndpointSettings[],
  profileName: string
): CIM.Models.WiFiEndpointSettings | null => settings.find((setting) => setting.ElementName === profileName) ?? null

export const findWirelessSettingByPriority = (
  settings: CIM.Models.WiFiEndpointSettings[],
  priority: number
): CIM.Models.WiFiEndpointSettings | null => settings.find((setting) => setting.Priority === priority) ?? null

export const hasReachedWirelessProfileLimit = (settings: CIM.Models.WiFiEndpointSettings[]): boolean =>
  settings.length >= MAX_WIRELESS_PROFILES

export const toWiFiEndpointSettingsRequest = (profile: WirelessProfileConfigRequest): CIM.Models.WiFiEndpointSettings =>
  ({
    ElementName: profile.profileName,
    InstanceID: wifiEndpointInstanceID(profile.profileName),
    AuthenticationMethod: mapEnumReverse(profile.authenticationMethod, AUTHENTICATION_METHOD_TO_STRING),
    EncryptionMethod: mapEnumReverse(profile.encryptionMethod, ENCRYPTION_METHOD_TO_STRING),
    SSID: profile.ssid,
    Priority: profile.priority,
    PSKPassPhrase: profile.password
  }) as CIM.Models.WiFiEndpointSettings

export const toIEEE8021xSettingsRequest = (profile: WirelessProfileConfigRequest): CIM.Models.IEEE8021xSettings => {
  if (profile.ieee8021x == null) {
    return {} as CIM.Models.IEEE8021xSettings
  }

  return {
    ElementName: profile.profileName,
    InstanceID: ieee8021xInstanceID(profile.profileName),
    AuthenticationProtocol: profile.ieee8021x.authenticationProtocol,
    Username: profile.ieee8021x.username,
    Password: profile.ieee8021x.password
  } as CIM.Models.IEEE8021xSettings
}

const normalizeCertItems = (certs: Certificates): any[] =>
  asArray<any>((certs?.PublicKeyCertificateResponse as any)?.AMT_PublicKeyCertificate)

const normalizeKeyItems = (certs: Certificates): any[] =>
  asArray<any>((certs?.PublicPrivateKeyPairResponse as any)?.AMT_PublicPrivateKeyPair)

const findExistingPrivateKeyHandle = (certs: Certificates, privateKey: string): string | null => {
  for (const item of normalizeKeyItems(certs)) {
    if (item?.DERKey === privateKey) {
      return item.InstanceID ?? null
    }
  }
  return null
}

const isTrustedRootCert = (item: any): boolean => Boolean(item?.TrustedRootCertficate ?? item?.TrustedRootCertificate)

const findExistingClientCertHandle = (certs: Certificates, clientCert: string): string | null => {
  for (const item of normalizeCertItems(certs)) {
    if (item?.X509Certificate === clientCert && !isTrustedRootCert(item)) {
      return item.InstanceID ?? null
    }
  }
  return null
}

const findExistingTrustedRootCertHandle = (certs: Certificates, caCert: string): string | null => {
  for (const item of normalizeCertItems(certs)) {
    if (item?.X509Certificate === caCert && isTrustedRootCert(item)) {
      return item.InstanceID ?? null
    }
  }
  return null
}

type CredentialFinder = (certs: Certificates, credential: string) => string | null
type CredentialAdder = (credential: string) => Promise<string | null>

interface ResolveResult {
  handle: string
  certs: Certificates
  added: boolean
}

const resolveOrAddCredentialHandle = async (
  certs: Certificates,
  credential: string,
  find: CredentialFinder,
  add: CredentialAdder,
  refresh: () => Promise<Certificates>
): Promise<ResolveResult> => {
  let updatedCerts = certs

  const existing = find(updatedCerts, credential)
  if (existing != null) {
    return { handle: existing, certs: updatedCerts, added: false }
  }

  const handle = await add(credential)
  if (handle != null) {
    return { handle, certs: updatedCerts, added: true }
  }

  updatedCerts = await refresh()
  const refreshed = find(updatedCerts, credential)
  if (refreshed == null) {
    throw new Error('failed to resolve certificate handle')
  }

  return { handle: refreshed, certs: updatedCerts, added: false }
}

export const configureIEEE8021xCertificates = async (
  device: DeviceAction,
  privateKey: string,
  clientCert: string,
  caCert: string
): Promise<{ handles: IEEE8021xCertHandles; addedCredentials: boolean }> => {
  const handles: IEEE8021xCertHandles = { clientCertHandle: '', rootCertHandle: '' }
  let certs = await device.getCertificates()
  let addedCredentials = false

  const refresh = async (): Promise<Certificates> => device.getCertificates()

  if (privateKey) {
    const result = await resolveOrAddCredentialHandle(
      certs,
      privateKey,
      findExistingPrivateKeyHandle,
      async (credential) => device.addPrivateKey(credential),
      refresh
    )
    certs = result.certs
    addedCredentials = addedCredentials || result.added
  }

  if (clientCert) {
    const result = await resolveOrAddCredentialHandle(
      certs,
      clientCert,
      findExistingClientCertHandle,
      async (credential) => device.addCertificate(credential, false),
      refresh
    )
    handles.clientCertHandle = result.handle
    certs = result.certs
    addedCredentials = addedCredentials || result.added
  }

  if (caCert) {
    const result = await resolveOrAddCredentialHandle(
      certs,
      caCert,
      findExistingTrustedRootCertHandle,
      async (credential) => device.addCertificate(credential, true),
      refresh
    )
    handles.rootCertHandle = result.handle
    addedCredentials = addedCredentials || result.added
  }

  return { handles, addedCredentials }
}

export const prepareWirelessProfileForApply = async (
  device: DeviceAction,
  profile: WirelessProfileConfigRequest
): Promise<PreparedWirelessProfile> => {
  const prepared: PreparedWirelessProfile = {
    wifiRequest: toWiFiEndpointSettingsRequest(profile),
    ieee8021xRequest: {} as CIM.Models.IEEE8021xSettings,
    certHandles: { clientCertHandle: '', rootCertHandle: '' },
    needsPauseBeforeApply: false
  }

  if (profile.ieee8021x != null) {
    prepared.ieee8021xRequest = toIEEE8021xSettingsRequest(profile)
    const { handles, addedCredentials } = await configureIEEE8021xCertificates(
      device,
      profile.ieee8021x.privateKey ?? '',
      profile.ieee8021x.clientCert ?? '',
      profile.ieee8021x.caCert ?? ''
    )
    prepared.certHandles = handles
    prepared.needsPauseBeforeApply = addedCredentials
  }

  return prepared
}

export const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))
