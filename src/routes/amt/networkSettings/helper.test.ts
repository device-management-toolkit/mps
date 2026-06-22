/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import {
  buildProfileSyncResponse,
  buildWiFiPortConfigRequest,
  buildWiredSettingsRequest,
  findEthernetPort,
  hasWiFiPort,
  isLocalProfileSyncEnabled,
  toWiredNetworkInfo,
  validateWiredNetworkConfig,
  WIRED_ETHERNET_INSTANCE_ID,
  extractIEEE8021xSettings,
  extractWirelessSettings,
  isUserSettingsInstanceID,
  mapEnum,
  findWiFiPortEnabledState,
  toWiFiNetworks,
  toWiFiPortConfigService,
  toWirelessIEEE8021xSettings,
  toWirelessNetworkInfo
} from './helper.js'

describe('networkSettings helper', () => {
  describe('findEthernetPort', () => {
    it('finds the wired port from an array', () => {
      const items = {
        AMT_EthernetPortSettings: [
          { InstanceID: 'Intel(r) AMT Ethernet Port Settings 1' },
          { InstanceID: 'Intel(r) AMT Ethernet Port Settings 0' }
        ]
      }
      expect(findEthernetPort(items, WIRED_ETHERNET_INSTANCE_ID)?.InstanceID).toBe(
        'Intel(r) AMT Ethernet Port Settings 0'
      )
    })

    it('finds the wired port from a single object', () => {
      const items = { AMT_EthernetPortSettings: { InstanceID: 'Intel(r) AMT Ethernet Port Settings 0' } }
      expect(findEthernetPort(items, WIRED_ETHERNET_INSTANCE_ID)).not.toBeNull()
    })

    it('returns null when no port matches', () => {
      const items = { AMT_EthernetPortSettings: { InstanceID: 'Intel(r) AMT Ethernet Port Settings 1' } }
      expect(findEthernetPort(items, WIRED_ETHERNET_INSTANCE_ID)).toBeNull()
    })

    it('returns null when items are missing', () => {
      expect(findEthernetPort(undefined, WIRED_ETHERNET_INSTANCE_ID)).toBeNull()
    })
  })

  describe('toWiredNetworkInfo', () => {
    it('maps enum and boolean fields and omits absent optional fields', () => {
      const info = toWiredNetworkInfo(
        {
          ElementName: 'Intel(r) AMT Ethernet Port Settings',
          InstanceID: 'Intel(r) AMT Ethernet Port Settings 0',
          MACAddress: 'aa-bb',
          LinkIsUp: true,
          LinkPolicy: 16,
          DHCPEnabled: false,
          PhysicalConnectionType: 0,
          PhysicalNicMedium: 1
        } as any,
        { Enabled: 6, AvailableInS0: false, PxeTimeout: 120 } as any
      )
      expect(info.linkPolicy).toEqual(['S0 DC'])
      expect(info.physicalConnectionType).toBe('Integrated LAN NIC')
      expect(info.physicalNICMedium).toBe('PCIe')
      expect(info.ieee8021x).toEqual({ enabled: 'EnabledWithoutCertificates', availableInS0: false, pxeTimeout: 120 })
      expect(info.linkPreference).toBeUndefined()
      expect(info.wlanLinkProtectionLevel).toBeUndefined()
    })

    it('maps unknown enum values to a not-found marker', () => {
      const info = toWiredNetworkInfo({ PhysicalConnectionType: 99 } as any, null)
      expect(info.physicalConnectionType).toBe('')
      expect(info.ieee8021x.enabled).toBe('')
    })
  })

  describe('validateWiredNetworkConfig', () => {
    it('rejects DHCP combined with static IP', () => {
      expect(validateWiredNetworkConfig({ dhcpEnabled: true, ipAddress: '1.2.3.4' })).not.toBeNull()
    })

    it('rejects IP sync combined with static IP', () => {
      expect(validateWiredNetworkConfig({ ipSyncEnabled: true, ipAddress: '1.2.3.4' })).not.toBeNull()
    })

    it('rejects empty configuration', () => {
      expect(validateWiredNetworkConfig({})).not.toBeNull()
    })

    it('requires core static fields when DHCP and sync are off', () => {
      expect(validateWiredNetworkConfig({ dhcpEnabled: false, ipAddress: '1.2.3.4' })).not.toBeNull()
    })

    it('accepts a valid static configuration', () => {
      expect(
        validateWiredNetworkConfig({
          dhcpEnabled: false,
          ipAddress: '1.2.3.4',
          subnetMask: '255.255.255.0',
          defaultGateway: '1.2.3.1',
          primaryDNS: '1.2.3.1'
        })
      ).toBeNull()
    })

    it('accepts DHCP enabled', () => {
      expect(validateWiredNetworkConfig({ dhcpEnabled: true })).toBeNull()
    })
  })

  describe('buildWiredSettingsRequest', () => {
    const current = {
      ElementName: 'Intel(r) AMT Ethernet Port Settings',
      InstanceID: 'Intel(r) AMT Ethernet Port Settings 0',
      SharedMAC: true,
      IpSyncEnabled: false,
      DHCPEnabled: false,
      IPAddress: '192.168.1.50',
      SubnetMask: '255.255.255.0',
      DefaultGateway: '192.168.1.1',
      PrimaryDNS: '192.168.1.1',
      SecondaryDNS: ''
    } as any

    it('omits IP fields and enables sync for DHCP', () => {
      const result = buildWiredSettingsRequest(current, { dhcpEnabled: true })
      expect(result.DHCPEnabled).toBe(true)
      expect(result.IpSyncEnabled).toBe(true)
      expect(result.SharedStaticIp).toBe(false)
      // Empty IP fields are omitted so they are not serialized as empty XML
      // elements (which AMT would treat as a no-op).
      expect(result).not.toHaveProperty('IPAddress')
      expect(result).not.toHaveProperty('SubnetMask')
      expect(result).not.toHaveProperty('DefaultGateway')
      expect(result).not.toHaveProperty('PrimaryDNS')
      expect(result).not.toHaveProperty('SecondaryDNS')
    })

    it('applies static IP fields when DHCP and sync are off', () => {
      const result = buildWiredSettingsRequest(current, {
        dhcpEnabled: false,
        ipSyncEnabled: false,
        ipAddress: '10.0.0.5',
        subnetMask: '255.255.255.0',
        defaultGateway: '10.0.0.1',
        primaryDNS: '10.0.0.1'
      })
      expect(result.DHCPEnabled).toBe(false)
      expect(result.IpSyncEnabled).toBe(false)
      expect(result.SharedStaticIp).toBe(false)
      expect(result.IPAddress).toBe('10.0.0.5')
    })

    it('omits IP fields when ipSync is enabled', () => {
      const result = buildWiredSettingsRequest(current, { dhcpEnabled: false, ipSyncEnabled: true })
      expect(result.IpSyncEnabled).toBe(true)
      expect(result.SharedStaticIp).toBe(true)
      expect(result).not.toHaveProperty('IPAddress')
      expect(result).not.toHaveProperty('SubnetMask')
    })
  })

  describe('hasWiFiPort', () => {
    it('returns true for a single port object', () => {
      expect(hasWiFiPort({ CIM_WiFiPort: { InstanceID: 'x' } })).toBe(true)
    })

    it('returns true for a non-empty array of ports', () => {
      expect(hasWiFiPort({ CIM_WiFiPort: [{ InstanceID: 'x' }] })).toBe(true)
    })

    it('returns false for an empty array', () => {
      expect(hasWiFiPort({ CIM_WiFiPort: [] })).toBe(false)
    })

    it('returns false when no port is present', () => {
      expect(hasWiFiPort({})).toBe(false)
      expect(hasWiFiPort(undefined)).toBe(false)
    })
  })

  describe('isLocalProfileSyncEnabled', () => {
    it('treats any non-disabled state as enabled', () => {
      expect(isLocalProfileSyncEnabled(3)).toBe(true)
      expect(isLocalProfileSyncEnabled(1)).toBe(true)
    })

    it('treats disabled/unset states as not enabled', () => {
      expect(isLocalProfileSyncEnabled(0)).toBe(false)
      expect(isLocalProfileSyncEnabled(undefined)).toBe(false)
      expect(isLocalProfileSyncEnabled(null)).toBe(false)
    })
  })

  describe('buildProfileSyncResponse', () => {
    it('maps the config service and UEFI support into the DTO', () => {
      const result = buildProfileSyncResponse(
        { localProfileSynchronizationEnabled: 3, UEFIWiFiProfileShareEnabled: 1 } as any,
        true
      )
      expect(result).toEqual({ localProfileSync: true, uefiProfileSync: true, uefiProfileSyncSupported: true })
    })

    it('defaults to disabled when the config service is null', () => {
      const result = buildProfileSyncResponse(null, false)
      expect(result).toEqual({ localProfileSync: false, uefiProfileSync: false, uefiProfileSyncSupported: false })
    })
  })

  describe('buildWiFiPortConfigRequest', () => {
    it('copies existing fields and overrides only the sync states', () => {
      const current = {
        ElementName: 'svc',
        Name: 'Intel(r) AMT WiFi Port Configuration Service',
        localProfileSynchronizationEnabled: 0,
        UEFIWiFiProfileShareEnabled: 0
      } as any
      const result = buildWiFiPortConfigRequest(current, 3, 1)
      expect(result.ElementName).toBe('svc')
      expect(result.Name).toBe('Intel(r) AMT WiFi Port Configuration Service')
      expect(result.localProfileSynchronizationEnabled).toBe(3)
      expect(result.UEFIWiFiProfileShareEnabled).toBe(1)
    })
  })
})

describe('extractWirelessSettings', () => {
  const items = {
    CIM_WiFiEndpointSettings: [
      {
        InstanceID: 'Intel(r) AMT:WiFi Endpoint Settings home',
        ElementName: 'home',
        Priority: 1,
        SSID: 'homeSsid',
        AuthenticationMethod: 6,
        EncryptionMethod: 4
      },
      {
        InstanceID: 'Intel(r) AMT:WiFi Endpoint User Settings skip',
        ElementName: 'skip',
        Priority: 2
      }
    ]
  }

  it('detects user-managed instance ids', () => {
    expect(isUserSettingsInstanceID('Intel(r) AMT:WiFi Endpoint User Settings X')).toBe(true)
    expect(isUserSettingsInstanceID('Intel(r) AMT:WiFi Endpoint Settings X')).toBe(false)
  })

  it('skips user-managed settings', () => {
    const settings = extractWirelessSettings(items)
    expect(settings).toHaveLength(1)
    expect(settings[0].ElementName).toBe('home')
  })

  it('handles a single (non-array) setting object', () => {
    const single = {
      CIM_WiFiEndpointSettings: {
        InstanceID: 'Intel(r) AMT:WiFi Endpoint Settings solo',
        ElementName: 'solo',
        Priority: 5
      }
    }
    expect(extractWirelessSettings(single)).toHaveLength(1)
  })
})

describe('extractIEEE8021xSettings', () => {
  it('returns an empty list when settings are missing', () => {
    expect(extractIEEE8021xSettings({})).toEqual([])
    expect(extractIEEE8021xSettings(undefined)).toEqual([])
  })

  it('normalizes a single setting object to an array', () => {
    const items = {
      CIM_IEEE8021xSettings: {
        InstanceID: 'Intel(r) AMT:IEEE 802.1x Settings corp',
        ElementName: 'corp',
        Username: 'user'
      }
    }

    const settings = extractIEEE8021xSettings(items)
    expect(settings).toHaveLength(1)
    expect(settings[0].InstanceID).toBe('Intel(r) AMT:IEEE 802.1x Settings corp')
  })

  it('returns the full list when settings are already an array', () => {
    const items = {
      CIM_IEEE8021xSettings: [
        { InstanceID: 'Intel(r) AMT:IEEE 802.1x Settings corp' },
        { InstanceID: 'Intel(r) AMT:IEEE 802.1x Settings guest' }
      ]
    }

    const settings = extractIEEE8021xSettings(items)
    expect(settings).toHaveLength(2)
    expect(settings.map((s) => s.InstanceID)).toEqual([
      'Intel(r) AMT:IEEE 802.1x Settings corp',
      'Intel(r) AMT:IEEE 802.1x Settings guest'
    ])
  })

  describe('mapEnum', () => {
    it('maps numeric enum values to strings', () => {
      expect(mapEnum(2, { 1: 'one', 2: 'two' })).toBe('two')
    })

    it('returns null for non-number values and unknown numeric values', () => {
      expect(mapEnum('2', { 1: 'one', 2: 'two' } as any)).toBeNull()
      expect(mapEnum(3, { 1: 'one', 2: 'two' })).toBeNull()
    })
  })

  describe('findWiFiPortEnabledState', () => {
    it('returns enabled state from a single CIM_WiFiPort object', () => {
      expect(findWiFiPortEnabledState({ CIM_WiFiPort: { EnabledState: 32768 } })).toBe(32768)
    })

    it('returns enabled state from the first CIM_WiFiPort in an array', () => {
      expect(findWiFiPortEnabledState({ CIM_WiFiPort: [{ EnabledState: 3 }, { EnabledState: 32769 }] })).toBe(3)
    })

    it('returns null when no WiFi port exists or EnabledState is missing', () => {
      expect(findWiFiPortEnabledState({})).toBeNull()
      expect(findWiFiPortEnabledState({ CIM_WiFiPort: { InstanceID: 'x' } })).toBeNull()
      expect(findWiFiPortEnabledState(undefined)).toBeNull()
    })
  })

  describe('toWiFiNetworks', () => {
    it('maps wireless endpoint settings and skips user-managed entries', () => {
      const result = toWiFiNetworks({
        CIM_WiFiEndpointSettings: [
          {
            InstanceID: 'Intel(r) AMT:WiFi Endpoint Settings corp',
            ElementName: 'corp',
            SSID: 'corpSsid',
            AuthenticationMethod: 7,
            EncryptionMethod: 4,
            Priority: 3,
            BSSType: 3
          },
          {
            InstanceID: 'Intel(r) AMT:WiFi Endpoint User Settings skip',
            ElementName: 'skip',
            SSID: 'skip'
          }
        ]
      })

      expect(result).toEqual([
        {
          elementName: 'corp',
          ssid: 'corpSsid',
          authenticationMethod: 'WPA2IEEE8021x',
          encryptionMethod: 'CCMP',
          priority: 3,
          bsstype: 'Infrastructure'
        }
      ])
    })

    it('defaults missing/unknown fields', () => {
      const result = toWiFiNetworks({
        CIM_WiFiEndpointSettings: {
          InstanceID: 'Intel(r) AMT:WiFi Endpoint Settings open',
          AuthenticationMethod: 999,
          EncryptionMethod: 999,
          BSSType: 999
        }
      })

      expect(result).toEqual([
        {
          elementName: '',
          ssid: '',
          authenticationMethod: '',
          encryptionMethod: '',
          priority: 0,
          bsstype: ''
        }
      ])
    })
  })

  describe('toWiFiPortConfigService', () => {
    it('maps fields from the configuration service and coerces uefi share to boolean', () => {
      const result = toWiFiPortConfigService({
        RequestedState: 7,
        EnabledState: 2,
        HealthState: 5,
        ElementName: 'svc',
        SystemCreationClassName: 'sysClass',
        SystemName: 'sys',
        CreationClassName: 'createClass',
        Name: 'wifiSvc',
        localProfileSynchronizationEnabled: 3,
        LastConnectedSsidUnderMeControl: 'corp',
        NoHostCsmeSoftwarePolicy: 1,
        UEFIWiFiProfileShareEnabled: 1
      } as any)

      expect(result).toEqual({
        requestedState: 7,
        enabledState: 2,
        healthState: 5,
        elementName: 'svc',
        systemCreationClassName: 'sysClass',
        systemName: 'sys',
        creationClassName: 'createClass',
        name: 'wifiSvc',
        localProfileSynchronizationEnabled: 3,
        lastConnectedSsidUnderMeControl: 'corp',
        noHostCsmeSoftwarePolicy: 1,
        uefiWiFiProfileShareEnabled: true
      })
    })

    it('returns zero/empty defaults for a null service', () => {
      expect(toWiFiPortConfigService(null)).toEqual({
        requestedState: 0,
        enabledState: 0,
        healthState: 0,
        elementName: '',
        systemCreationClassName: '',
        systemName: '',
        creationClassName: '',
        name: '',
        localProfileSynchronizationEnabled: 0,
        lastConnectedSsidUnderMeControl: '',
        noHostCsmeSoftwarePolicy: 0,
        uefiWiFiProfileShareEnabled: false
      })
    })
  })

  describe('toWirelessIEEE8021xSettings', () => {
    it('maps non-secret fields and omits credential-like fields', () => {
      const result = toWirelessIEEE8021xSettings({
        CIM_IEEE8021xSettings: {
          AuthenticationProtocol: 2,
          RoamingIdentity: 'roam',
          ServerCertificateName: 'CN=server',
          ServerCertificateNameComparison: 1,
          Username: 'user',
          Domain: 'corp',
          Password: 'secret',
          ProtectedAccessCredential: 'secret',
          PacPassword: 'secret',
          PSK: 'secret'
        }
      })

      expect(result).toEqual([
        {
          authenticationProtocol: 2,
          roamingIdentity: 'roam',
          serverCertificateName: 'CN=server',
          serverCertificateNameComparison: 1,
          username: 'user',
          domain: 'corp'
        }
      ])
      expect(JSON.stringify(result)).not.toContain('secret')
    })

    it('defaults unset fields', () => {
      const result = toWirelessIEEE8021xSettings({
        CIM_IEEE8021xSettings: {
          AuthenticationProtocol: undefined,
          RoamingIdentity: undefined,
          ServerCertificateName: undefined,
          ServerCertificateNameComparison: undefined,
          Username: undefined,
          Domain: undefined
        }
      })

      expect(result).toEqual([
        {
          authenticationProtocol: 0,
          roamingIdentity: '',
          serverCertificateName: '',
          serverCertificateNameComparison: 0,
          username: '',
          domain: ''
        }
      ])
    })
  })

  describe('toWirelessNetworkInfo', () => {
    it('maps common network fields and wireless-specific enums', () => {
      const wifiNetworks = [{
        elementName: 'corp',
        ssid: 'corpSsid',
        authenticationMethod: 'WPA2IEEE8021x',
        encryptionMethod: 'CCMP',
        priority: 1,
        bsstype: 'Infrastructure'
      }]
      const ieee8021xSettings = [{
        authenticationProtocol: 2,
        roamingIdentity: 'roam',
        serverCertificateName: 'CN=server',
        serverCertificateNameComparison: 1,
        username: 'user',
        domain: 'corp'
      }]
      const wifiPortConfigService = {
        requestedState: 2,
        enabledState: 2,
        healthState: 5,
        elementName: 'svc',
        systemCreationClassName: 'sysClass',
        systemName: 'sys',
        creationClassName: 'createClass',
        name: 'wifiSvc',
        localProfileSynchronizationEnabled: 3,
        lastConnectedSsidUnderMeControl: 'corp',
        noHostCsmeSoftwarePolicy: 0,
        uefiWiFiProfileShareEnabled: true
      }

      const result = toWirelessNetworkInfo(
        {
          ElementName: 'Intel(r) AMT Ethernet Port Settings',
          InstanceID: 'Intel(r) AMT Ethernet Port Settings 1',
          MACAddress: 'aa-bb',
          LinkIsUp: true,
          LinkPolicy: [1, 999],
          PhysicalConnectionType: 3,
          PhysicalNicMedium: 1,
          LinkPreference: 1,
          LinkControl: 2,
          WLANLinkProtectionLevel: 3
        } as any,
        wifiNetworks,
        ieee8021xSettings,
        wifiPortConfigService
      )

      expect(result.linkPolicy).toEqual(['S0 AC', 'Unknown'])
      expect(result.linkPreference).toBe('Management Engine')
      expect(result.linkControl).toBe('Host')
      expect(result.wlanLinkProtectionLevel).toBe('High')
      expect(result.physicalConnectionType).toBe('Wireless LAN')
      expect(result.physicalNICMedium).toBe('PCIe')
      expect(result.wifiNetworks).toEqual(wifiNetworks)
      expect(result.ieee8021xSettings).toEqual(ieee8021xSettings)
      expect(result.wifiPortConfigService).toEqual(wifiPortConfigService)
    })

    it('defaults unsupported wireless-specific enums to empty strings', () => {
      const result = toWirelessNetworkInfo({ LinkPreference: 99, LinkControl: 99, WLANLinkProtectionLevel: 99 } as any, [], [], {
        requestedState: 0,
        enabledState: 0,
        healthState: 0,
        elementName: '',
        systemCreationClassName: '',
        systemName: '',
        creationClassName: '',
        name: '',
        localProfileSynchronizationEnabled: 0,
        lastConnectedSsidUnderMeControl: '',
        noHostCsmeSoftwarePolicy: 0,
        uefiWiFiProfileShareEnabled: false
      })

      expect(result.linkPreference).toBe('')
      expect(result.linkControl).toBe('')
      expect(result.wlanLinkProtectionLevel).toBe('')
    })
  })
})
