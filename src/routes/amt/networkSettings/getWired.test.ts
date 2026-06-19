/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { vi } from 'vitest'
import { getWiredNetworkSettings } from './getWired.js'
import { createSpyObj } from '../../../test/helper/vitest.js'
import { CIRAHandler } from '../../../amt/CIRAHandler.js'
import { DeviceAction } from '../../../amt/DeviceAction.js'
import { HttpHandler } from '../../../amt/HttpHandler.js'

const ethernetResponse = {
  Body: {
    PullResponse: {
      Items: {
        AMT_EthernetPortSettings: [
          {
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
          },
          {
            ElementName: 'Intel(r) AMT Ethernet Port Settings',
            InstanceID: 'Intel(r) AMT Ethernet Port Settings 1',
            MACAddress: '00-00-00-00-00-00',
            LinkIsUp: false,
            PhysicalConnectionType: 3
          }
        ]
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

describe('wired network settings - get', () => {
  let resSpy
  let req
  let getEthernetSpy
  let getIeee8021xSpy

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
  })

  it('should return mapped wired network settings with status 200', async () => {
    getEthernetSpy.mockResolvedValueOnce(ethernetResponse as any)
    getIeee8021xSpy.mockResolvedValueOnce(ieee8021xResponse as any)
    await getWiredNetworkSettings(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith(
      expect.objectContaining({
        instanceID: 'Intel(r) AMT Ethernet Port Settings 0',
        macAddress: 'a4-bb-6d-89-52-e4',
        linkIsUp: true,
        linkPolicy: ['S0 AC', 'Sx AC'],
        dhcpEnabled: true,
        ipSyncEnabled: true,
        physicalConnectionType: 'Integrated LAN NIC',
        physicalNICMedium: 'SMBUS',
        ieee8021x: { enabled: 'Disabled', availableInS0: true, pxeTimeout: 0 }
      })
    )
  })

  it('should return 404 when no wired port is found', async () => {
    getEthernetSpy.mockResolvedValueOnce({
      Body: {
        PullResponse: {
          Items: { AMT_EthernetPortSettings: ethernetResponse.Body.PullResponse.Items.AMT_EthernetPortSettings[1] }
        }
      }
    } as any)
    await getWiredNetworkSettings(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(404)
  })

  it('should return 500 on unexpected exception', async () => {
    getEthernetSpy.mockImplementation(() => {
      throw new Error()
    })
    await getWiredNetworkSettings(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(500)
  })
})
