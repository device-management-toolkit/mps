/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { findEthernetPort, toWiredNetworkInfo, WIRED_ETHERNET_INSTANCE_ID } from './helper.js'

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
})
