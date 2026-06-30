/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type AMT, type CIM, type IPS } from '@device-management-toolkit/wsman-messages'

// InstanceID substrings that identify the AMT ethernet port interfaces.
export const WIRED_ETHERNET_INSTANCE_ID = 'Intel(r) AMT Ethernet Port Settings 0'
export const WIRELESS_ETHERNET_INSTANCE_ID = 'Intel(r) AMT Ethernet Port Settings 1'

const INSTANCE_ID_PREFIX_USER_SETTINGS = 'Intel(r) AMT:WiFi Endpoint User Settings'

// Enum -> string maps mirror go-wsman-messages so MPS responses match Console.
const LINK_POLICY_TO_STRING: Record<number, string> = {
  1: 'S0 AC',
  14: 'Sx AC',
  16: 'S0 DC',
  224: 'Sx DC'
}
const LINK_PREFERENCE_TO_STRING: Record<number, string> = {
  1: 'Management Engine',
  2: 'Host'
}
const LINK_CONTROL_TO_STRING: Record<number, string> = {
  1: 'Management Engine',
  2: 'Host'
}
const WLAN_LINK_PROTECTION_LEVEL_TO_STRING: Record<number, string> = {
  0: 'Override',
  1: 'None',
  2: 'Passive',
  3: 'High'
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
export const AUTHENTICATION_METHOD_TO_STRING: Record<number, string> = {
  1: 'Other',
  2: 'OpenSystem',
  3: 'SharedKey',
  4: 'WPAPSK',
  5: 'WPAIEEE8021x',
  6: 'WPA2PSK',
  7: 'WPA2IEEE8021x',
  32768: 'WPA3SAE',
  32769: 'WPA3OWE'
}
export const ENCRYPTION_METHOD_TO_STRING: Record<number, string> = {
  1: 'Other',
  2: 'WEP',
  3: 'TKIP',
  4: 'CCMP',
  5: 'None'
}
const BSS_TYPE_TO_STRING: Record<number, string> = {
  0: 'Unknown',
  2: 'Independent',
  3: 'Infrastructure'
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

export interface WiFiNetwork {
  elementName: string
  ssid: string
  authenticationMethod: string
  encryptionMethod: string
  priority: number
  bsstype: string
}

export interface WirelessIEEE8021xSettings {
  authenticationProtocol: number
  roamingIdentity: string
  serverCertificateName: string
  serverCertificateNameComparison: number
  username: string
  domain: string
}

export interface WiFiPortConfigService {
  requestedState: number
  enabledState: number
  healthState: number
  elementName: string
  systemCreationClassName: string
  systemName: string
  creationClassName: string
  name: string
  localProfileSynchronizationEnabled: number
  lastConnectedSsidUnderMeControl: string
  noHostCsmeSoftwarePolicy: number
  uefiWiFiProfileShareEnabled: boolean
}

export interface WirelessNetworkInfo extends NetworkInfo {
  wifiNetworks: WiFiNetwork[]
  ieee8021xSettings: WirelessIEEE8021xSettings[]
  wifiPortConfigService: WiFiPortConfigService
}

export interface NetworkSettings {
  wired: WiredNetworkInfo | null
  wireless: WirelessNetworkInfo | null
}

export interface WiredNetworkConfigRequest {
  dhcpEnabled?: boolean
  ipSyncEnabled?: boolean
  ipAddress?: string
  subnetMask?: string
  defaultGateway?: string
  primaryDNS?: string
  secondaryDNS?: string
  ieee8021x?: unknown
}

export const asArray = <T>(value: T | T[] | undefined | null): T[] => {
  if (value == null) return []
  return Array.isArray(value) ? value : [value]
}

export function mapEnum(value: unknown, map: Record<number, string>): string  | null {
  if (typeof value !== 'number') {
    return null
  }
  return map[value] ?? null
}

function mapLinkPolicy(linkPolicy: unknown): string[] {
  if (linkPolicy == null) {
    return []
  }
  const values = Array.isArray(linkPolicy) ? linkPolicy : [linkPolicy]
  return values.map((value) => mapEnum(value, LINK_POLICY_TO_STRING) ?? 'Unknown')
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
    physicalConnectionType: mapEnum(port.PhysicalConnectionType, PHYSICAL_CONNECTION_TYPE_TO_STRING) ?? '',
    physicalNICMedium: mapEnum(port.PhysicalNicMedium, PHYSICAL_NIC_MEDIUM_TO_STRING) ?? ''
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
      enabled: mapEnum(ieee8021x?.Enabled, IEEE8021X_ENABLED_TO_STRING) ?? '',
      availableInS0: ieee8021x?.AvailableInS0 ?? false,
      pxeTimeout: ieee8021x?.PxeTimeout ?? 0
    }
  }
}

export const isUserSettingsInstanceID = (instanceID: string): boolean =>
  instanceID.startsWith(INSTANCE_ID_PREFIX_USER_SETTINGS)

/**
 * Extracts the wireless endpoint settings from a CIM_WiFiEndpointSettings pull response,
 * skipping empty and user-managed instances.
 */
export const extractWirelessSettings = (items: unknown): CIM.Models.WiFiEndpointSettings[] =>
  asArray<CIM.Models.WiFiEndpointSettings>(
    (items as { CIM_WiFiEndpointSettings?: CIM.Models.WiFiEndpointSettings | CIM.Models.WiFiEndpointSettings[] })
      ?.CIM_WiFiEndpointSettings
  ).filter((setting) => setting?.InstanceID && !isUserSettingsInstanceID(setting.InstanceID))

/**
 * Extracts CIM_IEEE8021xSettings from a pull response and normalizes to an array.
 */
export const extractIEEE8021xSettings = (items: unknown): CIM.Models.IEEE8021xSettings[] =>
  asArray<CIM.Models.IEEE8021xSettings>(
    (items as { CIM_IEEE8021xSettings?: CIM.Models.IEEE8021xSettings | CIM.Models.IEEE8021xSettings[] })
      ?.CIM_IEEE8021xSettings
  )

/**
 * Builds the WiFiNetworks list from a CIM_WiFiEndpointSettings pull response.
 * Mirrors Console: the user-managed "Endpoint User Settings" entry is excluded.
 */
export function toWiFiNetworks(items: unknown): WiFiNetwork[] {
  return extractWirelessSettings(items).map((s) => ({
    elementName: s.ElementName ?? '',
    ssid: s.SSID ?? '',
    authenticationMethod: mapEnum(s.AuthenticationMethod, AUTHENTICATION_METHOD_TO_STRING) ?? '',
    encryptionMethod: mapEnum(s.EncryptionMethod, ENCRYPTION_METHOD_TO_STRING) ?? '',
    priority: s.Priority ?? 0,
    bsstype: mapEnum(s.BSSType, BSS_TYPE_TO_STRING) ?? ''
  }))
}

/**
 * Builds the IEEE8021xSettings list from a CIM_IEEE8021xSettings pull response.
 * Non-secret fields are copied raw (no enum conversion). Credential-like fields
 * (password, protectedAccessCredential, pacPassword, psk) are intentionally
 * omitted so this read endpoint never echoes WiFi/802.1X secrets back to API
 * consumers.
 */
export function toWirelessIEEE8021xSettings(items: unknown): WirelessIEEE8021xSettings[] {
  return extractIEEE8021xSettings(items).map((s) => ({
    authenticationProtocol: s.AuthenticationProtocol ?? 0,
    roamingIdentity: s.RoamingIdentity ?? '',
    serverCertificateName: s.ServerCertificateName ?? '',
    serverCertificateNameComparison: s.ServerCertificateNameComparison ?? 0,
    username: s.Username ?? '',
    domain: s.Domain ?? ''
  }))
}

/**
 * Maps AMT_WiFiPortConfigurationService into the DTO. Numeric state fields are
 * copied raw (no enum conversion), matching Console.
 */
export function toWiFiPortConfigService(
  service: AMT.Models.WiFiPortConfigurationService | null
): WiFiPortConfigService {
  return {
    requestedState: service?.RequestedState ?? 0,
    enabledState: service?.EnabledState ?? 0,
    healthState: service?.HealthState ?? 0,
    elementName: service?.ElementName ?? '',
    systemCreationClassName: service?.SystemCreationClassName ?? '',
    systemName: service?.SystemName ?? '',
    creationClassName: service?.CreationClassName ?? '',
    name: service?.Name ?? '',
    localProfileSynchronizationEnabled: service?.localProfileSynchronizationEnabled ?? 0,
    lastConnectedSsidUnderMeControl: service?.LastConnectedSsidUnderMeControl ?? '',
    noHostCsmeSoftwarePolicy: service?.NoHostCsmeSoftwarePolicy ?? 0,
    uefiWiFiProfileShareEnabled: Boolean(service?.UEFIWiFiProfileShareEnabled)
  }
}

/**
 * Converts the raw WSMAN wireless ethernet port plus WiFi-specific results into
 * the wireless network DTO (matches Console's response shape).
 */
export function toWirelessNetworkInfo(
  port: AMT.Models.EthernetPortSettings,
  wifiNetworks: WiFiNetwork[],
  ieee8021xSettings: WirelessIEEE8021xSettings[],
  wifiPortConfigService: WiFiPortConfigService
): WirelessNetworkInfo {
  return {
    ...toNetworkInfo(port),
    // Console always sets these for the wireless interface (via enum String()).
    linkPreference: mapEnum(port.LinkPreference, LINK_PREFERENCE_TO_STRING) ?? '',
    linkControl: mapEnum(port.LinkControl, LINK_CONTROL_TO_STRING) ?? '',
    wlanLinkProtectionLevel: mapEnum(port.WLANLinkProtectionLevel, WLAN_LINK_PROTECTION_LEVEL_TO_STRING) ?? '',
    wifiNetworks,
    ieee8021xSettings,
    wifiPortConfigService
  }
}

function hasStaticIPSettings(req: WiredNetworkConfigRequest): boolean {
  return (
    Boolean(req.ipAddress) ||
    Boolean(req.subnetMask) ||
    Boolean(req.defaultGateway) ||
    Boolean(req.primaryDNS) ||
    Boolean(req.secondaryDNS)
  )
}

/**
 * Enforces the DHCP vs static-IP combination rules that cannot be expressed with
 * field-level validators. Returns an error message string, or null if valid.
 */
export function validateWiredNetworkConfig(req: WiredNetworkConfigRequest): string | null {
  const dhcpEnabled = req.dhcpEnabled === true
  const ipSyncEnabled = req.ipSyncEnabled === true
  const staticIPProvided = hasStaticIPSettings(req)

  if (dhcpEnabled && staticIPProvided) {
    return 'cannot specify static IP settings when DHCP is enabled'
  }
  if (ipSyncEnabled && staticIPProvided) {
    return 'cannot specify static IP settings when IP sync is enabled'
  }
  if (!dhcpEnabled && !ipSyncEnabled && !staticIPProvided) {
    return 'must enable DHCP, enable IP sync, or provide static IP settings'
  }
  if (!dhcpEnabled && staticIPProvided) {
    const required = [
      { value: req.ipAddress, name: 'ipAddress' },
      { value: req.subnetMask, name: 'subnetMask' },
      { value: req.defaultGateway, name: 'defaultGateway' },
      { value: req.primaryDNS, name: 'primaryDNS' }
    ]
    for (const { value, name } of required) {
      if (!value) {
        return `${name} is required for static IP configuration`
      }
    }
  }

  return null
}

/**
 * Builds an ethernet port settings Put request by overlaying the requested IPv4
 * changes on top of the device's current wired settings.
 */
export function buildWiredSettingsRequest(
  current: AMT.Models.EthernetPortSettings,
  req: WiredNetworkConfigRequest
): AMT.Models.EthernetPortSettings {
  const settingsRequest: AMT.Models.EthernetPortSettings = {
    ElementName: current.ElementName,
    InstanceID: current.InstanceID,
    SharedMAC: current.SharedMAC,
    SharedStaticIp: current.SharedStaticIp,
    IpSyncEnabled: current.IpSyncEnabled,
    DHCPEnabled: current.DHCPEnabled,
    IPAddress: current.IPAddress,
    SubnetMask: current.SubnetMask,
    DefaultGateway: current.DefaultGateway,
    PrimaryDNS: current.PrimaryDNS,
    SecondaryDNS: current.SecondaryDNS
  }

  if (req.dhcpEnabled === true) {
    // DHCP mode: AMT acquires IP settings, host/ME stay in sync.
    settingsRequest.DHCPEnabled = true
    settingsRequest.IpSyncEnabled = true
    settingsRequest.SharedStaticIp = false
  } else {
    // Static IP mode.
    settingsRequest.DHCPEnabled = false

    const ipSyncEnabled = req.ipSyncEnabled ?? current.IpSyncEnabled ?? false
    // SharedStaticIp always follows IpSyncEnabled; the AMT firmware does not
    // support sharing a static IP without host sync.
    settingsRequest.IpSyncEnabled = ipSyncEnabled
    settingsRequest.SharedStaticIp = ipSyncEnabled

    settingsRequest.IPAddress = req.ipAddress ?? ''
    settingsRequest.SubnetMask = req.subnetMask ?? ''
    settingsRequest.DefaultGateway = req.defaultGateway ?? ''
    settingsRequest.PrimaryDNS = req.primaryDNS ?? ''
    settingsRequest.SecondaryDNS = req.secondaryDNS ?? ''
  }

  // When IP settings come from DHCP or are synced with the host, AMT rejects
  // explicit IP fields, so they must be cleared.
  if (settingsRequest.IpSyncEnabled === true || settingsRequest.DHCPEnabled === true) {
    settingsRequest.IPAddress = ''
    settingsRequest.SubnetMask = ''
    settingsRequest.DefaultGateway = ''
    settingsRequest.PrimaryDNS = ''
    settingsRequest.SecondaryDNS = ''
  }

  // Mirror go-wsman's `omitempty`: the wsman-messages serializer emits empty
  // strings as empty XML elements (e.g. <IPAddress></IPAddress>), which AMT
  // treats as a no-op and silently keeps the previous static configuration
  // (so switching back to DHCP appears to succeed but does not take effect).
  // Drop empty IP fields entirely so they are omitted from the Put request.
  const ipFields = [
    'IPAddress',
    'SubnetMask',
    'DefaultGateway',
    'PrimaryDNS',
    'SecondaryDNS'
  ] as const
  for (const field of ipFields) {
    if (!settingsRequest[field]) {
      delete settingsRequest[field]
    }
  }

  return settingsRequest
}

// WiFi radio state values mirror go-wsman-messages CIM_WiFiPort
// EnabledState/RequestedState (and the strings the Sample Web UI sends/receives).
export const WIRELESS_STATE_VALUE_TO_STRING: Record<number, string> = {
  3: 'WifiDisabled',
  32768: 'WifiEnabledS0',
  32769: 'WifiEnabledS0SxAC'
}

const WIRELESS_STATE_STRING_TO_VALUE: Record<string, number> = {
  WIFIDISABLED: 3,
  WIFIENABLEDS0: 32768,
  WIFIENABLEDS0SXAC: 32769
}

/** Returns the canonical WiFi state string for an EnabledState/RequestedState value, or null. */
export function wirelessStateToString(value: number | undefined | null): string | null {
  if (value == null) {
    return null
  }
  return WIRELESS_STATE_VALUE_TO_STRING[value] ?? null
}

/**
 * Parses a WiFi state string (case-insensitive, matching Console) into its
 * RequestedState numeric value, or null when unsupported.
 */
export function parseWirelessState(state: unknown): number | null {
  if (typeof state !== 'string') {
    return null
  }
  const value = WIRELESS_STATE_STRING_TO_VALUE[state.toUpperCase()]
  return value ?? null
}

/** Extracts the first CIM_WiFiPort EnabledState from a pull response, or null when no port exists. */
export function findWiFiPortEnabledState(items: unknown): number | null {
  const ports = (items as { CIM_WiFiPort?: unknown })?.CIM_WiFiPort
  if (ports == null) {
    return null
  }
  const port = Array.isArray(ports) ? ports[0] : ports
  const enabledState = (port as { EnabledState?: number })?.EnabledState
  return enabledState ?? null
}

/** Returns true when the pull response contains at least one CIM_WiFiPort. */
export function hasWiFiPort(items: unknown): boolean {
  const ports = (items as { CIM_WiFiPort?: unknown })?.CIM_WiFiPort
  if (ports == null) {
    return false
  }
  return Array.isArray(ports) ? ports.length > 0 : true
}

// LocalProfileSynchronizationEnabled values (AMT_WiFiPortConfigurationService).
// The wsman-messages TS type permits 0 | 3; UnrestrictedSync (3) is the enabled
// value used across the DMT TS/RPC stack (matches RPS), 0 disables local sync.
export const LOCAL_SYNC_DISABLED = 0
export const LOCAL_PROFILE_SYNC_ENABLED = 3

export interface WirelessProfileSyncRequest {
  localProfileSync?: boolean
  uefiProfileSync?: boolean
}

export interface WirelessProfileSyncResponse {
  localProfileSync: boolean
  uefiProfileSync: boolean
  uefiProfileSyncSupported: boolean
}

/** Local profile sync is considered enabled for any non-disabled state. */
export function isLocalProfileSyncEnabled(state: number | undefined | null): boolean {
  return state != null && state !== LOCAL_SYNC_DISABLED
}

/** Maps the current WiFi port configuration plus UEFI support into the profile-sync DTO. */
export function buildProfileSyncResponse(
  service: AMT.Models.WiFiPortConfigurationService | null,
  uefiSupported: boolean
): WirelessProfileSyncResponse {
  return {
    localProfileSync: isLocalProfileSyncEnabled(service?.localProfileSynchronizationEnabled),
    uefiProfileSync: Boolean(service?.UEFIWiFiProfileShareEnabled),
    uefiProfileSyncSupported: uefiSupported
  }
}

/**
 * Builds the AMT_WiFiPortConfigurationService Put payload, copying all fields from
 * the current configuration and overriding only the local/UEFI sync states.
 */
export function buildWiFiPortConfigRequest(
  current: AMT.Models.WiFiPortConfigurationService,
  localSyncState: AMT.Types.WiFiPortConfigurationService.localProfileSynchronizationEnabled,
  uefiWiFiSyncState: AMT.Types.WiFiPortConfigurationService.UEFIWiFiProfileShareEnabled
): AMT.Models.WiFiPortConfigurationService {
  return {
    ...current,
    localProfileSynchronizationEnabled: localSyncState,
    UEFIWiFiProfileShareEnabled: uefiWiFiSyncState
  }
}
