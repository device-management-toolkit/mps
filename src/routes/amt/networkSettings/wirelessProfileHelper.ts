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
  mapEnum
} from './helper.js'

export const RESOURCE_CIM_WIFI_ENDPOINT_SETTINGS = 'CIM_WiFiEndpointSettings'
export const RESOURCE_CIM_IEEE8021X_SETTINGS = 'CIM_IEEE8021xSettings'

export const ieee8021xInstanceID = (profileName: string): string => `Intel(r) AMT:IEEE 802.1x Settings ${profileName}`

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
