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
  WIRED_ETHERNET_INSTANCE_ID
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
      expect(info.physicalConnectionType).toBe('Value not found in map')
      expect(info.ieee8021x.enabled).toBe('Value not found in map')
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
