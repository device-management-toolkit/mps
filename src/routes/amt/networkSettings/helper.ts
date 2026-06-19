/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type AMT, type IPS } from '@device-management-toolkit/wsman-messages'

// InstanceID substrings that identify the AMT ethernet port interfaces.
export const WIRED_ETHERNET_INSTANCE_ID = 'Intel(r) AMT Ethernet Port Settings 0'

const VALUE_NOT_FOUND = 'Value not found in map'

// Enum -> string maps mirror go-wsman-messages so MPS responses match Console.
const LINK_POLICY_TO_STRING: Record<number, string> = {
  1: 'S0 AC',
  14: 'Sx AC',
  16: 'S0 DC',
  224: 'Sx DC'
}
const PHYSICAL_CONNECTION_TYPE_TO_STRING: Record<number, string> = {
  0: 'Integrated LAN NIC',
  1: 'Discrete LAN NIC',
  2: 'LAN via Thunderbolt Dock',
  3: 'Wireless LAN'
}
const PHYSICAL_NIC_MEDIUM_TO_STRING: Record<number, string> = {
  0: 'SMBUS',
  1: 'PCIe'
}
const IEEE8021X_ENABLED_TO_STRING: Record<number, string> = {
  2: 'EnabledWithCertificates',
  3: 'Disabled',
  6: 'EnabledWithoutCertificates'
}

export interface IEEE8021xInfo {
  enabled: string
  availableInS0: boolean
  pxeTimeout: number
}

export interface NetworkInfo {
  elementName: string
  instanceID: string
  vlanTag: number
  sharedMAC: boolean
  macAddress: string
  linkIsUp: boolean
  linkPolicy: string[]
  linkPreference?: string
  linkControl?: string
  sharedStaticIP: boolean
  sharedDynamicIP: boolean
  ipSyncEnabled: boolean
  dhcpEnabled: boolean
  ipAddress: string
  subnetMask: string
  defaultGateway: string
  primaryDNS: string
  secondaryDNS: string
  consoleTCPMaxRetransmissions?: number
  wlanLinkProtectionLevel?: string
  physicalConnectionType: string
  physicalNICMedium: string
}

export interface WiredNetworkInfo extends NetworkInfo {
  ieee8021x: IEEE8021xInfo
}

function mapEnum(value: unknown, map: Record<number, string>): string {
  if (typeof value !== 'number') {
    return VALUE_NOT_FOUND
  }
  return map[value] ?? VALUE_NOT_FOUND
}

function mapLinkPolicy(linkPolicy: unknown): string[] {
  if (linkPolicy == null) {
    return []
  }
  const values = Array.isArray(linkPolicy) ? linkPolicy : [linkPolicy]
  return values.map((value) => mapEnum(value, LINK_POLICY_TO_STRING))
}

/**
 * Locates the AMT ethernet port whose InstanceID identifies it as the given
 * interface (wired = port 0, wireless = port 1) within a getEthernetPortSettings
 * pull response.
 */
export function findEthernetPort(items: unknown, instanceIDSubstring: string): AMT.Models.EthernetPortSettings | null {
  const settings = (items as { AMT_EthernetPortSettings?: unknown })?.AMT_EthernetPortSettings
  if (settings == null) {
    return null
  }
  const ports = (Array.isArray(settings) ? settings : [settings]) as AMT.Models.EthernetPortSettings[]
  return ports.find((port) => port.InstanceID?.includes(instanceIDSubstring)) ?? null
}

/**
 * Maps the shared WSMAN ethernet port fields into the common NetworkInfo DTO.
 * Mirrors Console's convertToNetworkInfo: linkPreference / linkControl /
 * wlanLinkProtectionLevel are intentionally NOT set here (they are wired-empty
 * and set explicitly only for the wireless interface).
 */
function toNetworkInfo(port: AMT.Models.EthernetPortSettings): NetworkInfo {
  const info: NetworkInfo = {
    elementName: port.ElementName ?? '',
    instanceID: port.InstanceID ?? '',
    vlanTag: port.VLANTag ?? 0,
    sharedMAC: port.SharedMAC ?? false,
    macAddress: port.MACAddress ?? '',
    linkIsUp: port.LinkIsUp ?? false,
    linkPolicy: mapLinkPolicy(port.LinkPolicy),
    sharedStaticIP: port.SharedStaticIp ?? false,
    sharedDynamicIP: port.SharedDynamicIP ?? false,
    ipSyncEnabled: port.IpSyncEnabled ?? false,
    dhcpEnabled: port.DHCPEnabled ?? false,
    ipAddress: port.IPAddress ?? '',
    subnetMask: port.SubnetMask ?? '',
    defaultGateway: port.DefaultGateway ?? '',
    primaryDNS: port.PrimaryDNS ?? '',
    secondaryDNS: port.SecondaryDNS ?? '',
    physicalConnectionType: mapEnum(port.PhysicalConnectionType, PHYSICAL_CONNECTION_TYPE_TO_STRING),
    physicalNICMedium: mapEnum(port.PhysicalNicMedium, PHYSICAL_NIC_MEDIUM_TO_STRING)
  }

  // omitempty: Console omits ConsoleTCPMaxRetransmissions when it is zero/unset.
  if (port.ConsoleTcpMaxRetransmissions) {
    info.consoleTCPMaxRetransmissions = port.ConsoleTcpMaxRetransmissions
  }

  return info
}

/**
 * Converts the raw WSMAN wired ethernet port + IPS 802.1X settings into the wired
 * network DTO that the Sample Web UI consumes (matches Console's response shape).
 */
export function toWiredNetworkInfo(
  port: AMT.Models.EthernetPortSettings,
  ieee8021x: IPS.Models.IEEE8021xSettings | null
): WiredNetworkInfo {
  return {
    ...toNetworkInfo(port),
    ieee8021x: {
      enabled: mapEnum(ieee8021x?.Enabled, IEEE8021X_ENABLED_TO_STRING),
      availableInS0: ieee8021x?.AvailableInS0 ?? false,
      pxeTimeout: ieee8021x?.PxeTimeout ?? 0
    }
  }
}
