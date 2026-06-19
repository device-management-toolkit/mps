/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { vi } from 'vitest'
import { getNetworkSettings } from './getNetworkSettings.js'
import { createSpyObj } from '../../../test/helper/vitest.js'
import { CIRAHandler } from '../../../amt/CIRAHandler.js'
import { DeviceAction } from '../../../amt/DeviceAction.js'
import { HttpHandler } from '../../../amt/HttpHandler.js'
import { messages } from '../../../logging/index.js'

const wiredPort = {
  ElementName: 'Intel(r) AMT Ethernet Port Settings',
  InstanceID: 'Intel(r) AMT Ethernet Port Settings 0',
  VLANTag: 0,
  SharedMAC: true,
  MACAddress: 'a4-bb-6d-89-52-e4',
  LinkIsUp: true,
  LinkPolicy: [1, 14],
  SharedStaticIp: false,
  SharedDynamicIP: true,
  IpSyncEnabled: true,
  DHCPEnabled: true,
  IPAddress: '192.168.1.50',
  SubnetMask: '255.255.255.0',
  DefaultGateway: '192.168.1.1',
  PrimaryDNS: '192.168.1.1',
  SecondaryDNS: '',
  PhysicalConnectionType: 0,
  PhysicalNicMedium: 0
}

const wirelessPort = {
  ElementName: 'Intel(r) AMT Ethernet Port Settings',
  InstanceID: 'Intel(r) AMT Ethernet Port Settings 1',
  MACAddress: '00-00-00-00-00-00',
  LinkIsUp: false,
  LinkPolicy: [1],
  SharedStaticIp: false,
  SharedDynamicIP: true,
  IpSyncEnabled: true,
  DHCPEnabled: true,
  IPAddress: '192.168.1.80',
  SubnetMask: '255.255.255.0',
  DefaultGateway: '192.168.1.1',
  PrimaryDNS: '192.168.1.1',
  SecondaryDNS: '',
  PhysicalConnectionType: 3,
  PhysicalNicMedium: 0,
  LinkPreference: 1,
  LinkControl: 2,
  WLANLinkProtectionLevel: 3
}

const ethernetResponse = {
  Body: {
    PullResponse: {
      Items: {
        AMT_EthernetPortSettings: [wiredPort, wirelessPort]
      }
    }
  }
}

const ieee8021xResponse = {
  Body: {
    IPS_IEEE8021xSettings: {
      Enabled: 3,
      AvailableInS0: true,
      PxeTimeout: 0
    }
  }
}

const wifiEndpointResponse = {
  Body: {
    PullResponse: {
      Items: {
        CIM_WiFiEndpointSettings: [
          {
            ElementName: 'home-ssid',
            InstanceID: 'Intel(r) Wireless Profile: home-ssid',
            SSID: 'home-ssid',
            Priority: 1,
            AuthenticationMethod: 6,
            EncryptionMethod: 4,
            BSSType: 3
          },
          {
            ElementName: 'Endpoint User Settings',
            InstanceID: 'Intel(r) Wireless Endpoint User Settings'
          }
        ]
      }
    }
  }
}

const cimIeee8021xResponse = {
  Body: {
    PullResponse: {
      Items: {
        CIM_IEEE8021xSettings: {
          ElementName: 'wifi-8021x',
          InstanceID: 'Intel(r) Wireless 8021x',
          AuthenticationProtocol: 0,
          Username: 'user1',
          Domain: 'example.com'
        }
      }
    }
  }
}

const wifiPortConfigResponse = {
  Body: {
    AMT_WiFiPortConfigurationService: {
      RequestedState: 5,
      EnabledState: 5,
      HealthState: 5,
      ElementName: 'Intel(r) AMT WiFi Port Configuration Service',
      SystemCreationClassName: 'CIM_ComputerSystem',
      SystemName: 'Intel(r) AMT',
      CreationClassName: 'AMT_WiFiPortConfigurationService',
      Name: 'Intel(r) AMT WiFi Port Configuration Service',
      localProfileSynchronizationEnabled: 1,
      LastConnectedSsidUnderMeControl: 'home-ssid',
      NoHostCsmeSoftwarePolicy: 0,
      UEFIWiFiProfileShareEnabled: true
    }
  }
}

describe('network settings - combined get', () => {
  let resSpy
  let req
  let getEthernetSpy
  let getIeee8021xSpy
  let getWiFiEndpointSpy
  let getCIMIeee8021xSpy
  let getWiFiPortConfigSpy

  beforeEach(() => {
    const handler = new CIRAHandler(new HttpHandler(), 'admin', 'P@ssw0rd')
    const device = new DeviceAction(handler, null)
    resSpy = createSpyObj('Response', [
      'status',
      'json',
      'end',
      'send'
    ])
    req = {
      params: { guid: '4c4c4544-004b-4210-8033-b6c04f504633' },
      deviceAction: device
    }
    resSpy.status.mockReturnThis()
    resSpy.json.mockReturnThis()
    resSpy.send.mockReturnThis()

    getEthernetSpy = vi.spyOn(device, 'getEthernetPortSettings')
    getIeee8021xSpy = vi.spyOn(device, 'getIPSIEEE8021xSettings')
    getWiFiEndpointSpy = vi.spyOn(device, 'getWiFiEndpointSettings')
    getCIMIeee8021xSpy = vi.spyOn(device, 'getCIMIEEE8021xSettings')
    getWiFiPortConfigSpy = vi.spyOn(device, 'getWiFiPortConfigurationService')
  })

  it('should return combined wired + wireless settings with status 200', async () => {
    getEthernetSpy.mockResolvedValueOnce(ethernetResponse as any)
    getIeee8021xSpy.mockResolvedValueOnce(ieee8021xResponse as any)
    getWiFiEndpointSpy.mockResolvedValueOnce(wifiEndpointResponse as any)
    getCIMIeee8021xSpy.mockResolvedValueOnce(cimIeee8021xResponse as any)
    getWiFiPortConfigSpy.mockResolvedValueOnce(wifiPortConfigResponse as any)

    await getNetworkSettings(req, resSpy)

    expect(resSpy.status).toHaveBeenCalledWith(200)
    const payload = resSpy.json.mock.calls[0][0]
    expect(payload.wired).toEqual(
      expect.objectContaining({
        instanceID: 'Intel(r) AMT Ethernet Port Settings 0',
        macAddress: 'a4-bb-6d-89-52-e4',
        linkPolicy: ['S0 AC', 'Sx AC'],
        physicalConnectionType: 'Integrated LAN NIC',
        ieee8021x: { enabled: 'Disabled', availableInS0: true, pxeTimeout: 0 }
      })
    )
    // wired must not carry wireless-only fields
    expect(payload.wired.linkPreference).toBeUndefined()
    expect(payload.wired.linkControl).toBeUndefined()
    expect(payload.wired.wlanLinkProtectionLevel).toBeUndefined()

    expect(payload.wireless).toEqual(
      expect.objectContaining({
        instanceID: 'Intel(r) AMT Ethernet Port Settings 1',
        physicalConnectionType: 'Wireless LAN',
        linkPreference: 'Management Engine',
        linkControl: 'Host',
        wlanLinkProtectionLevel: 'High'
      })
    )
    // Endpoint User Settings entry is excluded
    expect(payload.wireless.wifiNetworks).toEqual([
      {
        elementName: 'home-ssid',
        ssid: 'home-ssid',
        authenticationMethod: 'WPA2PSK',
        encryptionMethod: 'CCMP',
        priority: 1,
        bsstype: 'Infrastructure'
      }
    ])
    expect(payload.wireless.ieee8021xSettings).toEqual([
      expect.objectContaining({ username: 'user1', domain: 'example.com', authenticationProtocol: 0 })
    ])
    expect(payload.wireless.wifiPortConfigService).toEqual(
      expect.objectContaining({
        localProfileSynchronizationEnabled: 1,
        uefiWiFiProfileShareEnabled: true,
        name: 'Intel(r) AMT WiFi Port Configuration Service'
      })
    )
  })

  it('should return wired only with wireless null when no wireless port', async () => {
    getEthernetSpy.mockResolvedValueOnce({
      Body: { PullResponse: { Items: { AMT_EthernetPortSettings: wiredPort } } }
    } as any)
    getIeee8021xSpy.mockResolvedValueOnce(ieee8021xResponse as any)

    await getNetworkSettings(req, resSpy)

    expect(resSpy.status).toHaveBeenCalledWith(200)
    const payload = resSpy.json.mock.calls[0][0]
    expect(payload.wired).not.toBeNull()
    expect(payload.wireless).toBeNull()
    expect(getWiFiEndpointSpy).not.toHaveBeenCalled()
  })

  it('should return wireless only with wired null when no wired port', async () => {
    getEthernetSpy.mockResolvedValueOnce({
      Body: { PullResponse: { Items: { AMT_EthernetPortSettings: wirelessPort } } }
    } as any)
    getWiFiEndpointSpy.mockResolvedValueOnce(wifiEndpointResponse as any)
    getCIMIeee8021xSpy.mockResolvedValueOnce(cimIeee8021xResponse as any)
    getWiFiPortConfigSpy.mockResolvedValueOnce(wifiPortConfigResponse as any)

    await getNetworkSettings(req, resSpy)

    expect(resSpy.status).toHaveBeenCalledWith(200)
    const payload = resSpy.json.mock.calls[0][0]
    expect(payload.wired).toBeNull()
    expect(payload.wireless).not.toBeNull()
    expect(getIeee8021xSpy).not.toHaveBeenCalled()
  })

  it('should return 404 when neither wired nor wireless port is found', async () => {
    getEthernetSpy.mockResolvedValueOnce({
      Body: { PullResponse: { Items: {} } }
    } as any)

    await getNetworkSettings(req, resSpy)

    expect(resSpy.status).toHaveBeenCalledWith(404)
    expect(resSpy.json).toHaveBeenCalledWith({
      error: messages.NETWORK_SETTINGS_NOT_FOUND,
      errorDescription: `guid : ${req.params.guid}`
    })
  })

  it('should return 500 on unexpected exception', async () => {
    getEthernetSpy.mockImplementation(() => {
      throw new Error()
    })

    await getNetworkSettings(req, resSpy)

    expect(resSpy.status).toHaveBeenCalledWith(500)
  })
})
