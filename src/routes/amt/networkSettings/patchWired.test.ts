/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { vi } from 'vitest'
import { patchWiredNetworkSettings } from './patchWired.js'
import { createSpyObj } from '../../../test/helper/vitest.js'
import { CIRAHandler } from '../../../amt/CIRAHandler.js'
import { DeviceAction } from '../../../amt/DeviceAction.js'
import { HttpHandler } from '../../../amt/HttpHandler.js'

const ethernetResponse = {
  Body: {
    PullResponse: {
      Items: {
        AMT_EthernetPortSettings: {
          ElementName: 'Intel(r) AMT Ethernet Port Settings',
          InstanceID: 'Intel(r) AMT Ethernet Port Settings 0',
          SharedMAC: true,
          MACAddress: 'a4-bb-6d-89-52-e4',
          LinkIsUp: true,
          SharedStaticIp: true,
          IpSyncEnabled: false,
          DHCPEnabled: false,
          IPAddress: '192.168.1.50',
          SubnetMask: '255.255.255.0',
          DefaultGateway: '192.168.1.1',
          PrimaryDNS: '192.168.1.1',
          SecondaryDNS: '',
          PhysicalConnectionType: 0,
          PhysicalNicMedium: 0
        }
      }
    }
  }
}

describe('wired network settings - patch', () => {
  let resSpy
  let req
  let getEthernetSpy
  let putEthernetSpy

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
      body: {},
      deviceAction: device
    }
    resSpy.status.mockReturnThis()
    resSpy.json.mockReturnThis()
    resSpy.send.mockReturnThis()
    resSpy.end.mockReturnThis()

    getEthernetSpy = vi.spyOn(device, 'getEthernetPortSettings')
    putEthernetSpy = vi.spyOn(device, 'putEthernetPortSettings')
  })

  it('should update settings to DHCP and return 204', async () => {
    req.body = { dhcpEnabled: true }
    getEthernetSpy.mockResolvedValueOnce(ethernetResponse as any)
    putEthernetSpy.mockResolvedValueOnce({ Body: {}, statusCode: 200 } as any)
    await patchWiredNetworkSettings(req, resSpy)
    expect(putEthernetSpy).toHaveBeenCalledWith(
      expect.objectContaining({ DHCPEnabled: true, IpSyncEnabled: true, SharedStaticIp: false })
    )
    // Empty IP fields must be omitted (not sent as empty XML elements) so AMT
    // actually applies the switch back to DHCP.
    const dhcpPayload = putEthernetSpy.mock.calls[0][0]
    expect(dhcpPayload).not.toHaveProperty('IPAddress')
    expect(dhcpPayload).not.toHaveProperty('SubnetMask')
    expect(dhcpPayload).not.toHaveProperty('DefaultGateway')
    expect(dhcpPayload).not.toHaveProperty('PrimaryDNS')
    expect(dhcpPayload).not.toHaveProperty('SecondaryDNS')
    expect(resSpy.status).toHaveBeenCalledWith(204)
  })

  it('should update static IP settings and return 204', async () => {
    req.body = {
      dhcpEnabled: false,
      ipSyncEnabled: false,
      ipAddress: '10.0.0.5',
      subnetMask: '255.255.255.0',
      defaultGateway: '10.0.0.1',
      primaryDNS: '10.0.0.1'
    }
    getEthernetSpy.mockResolvedValueOnce(ethernetResponse as any)
    putEthernetSpy.mockResolvedValueOnce({ Body: {}, statusCode: 200 } as any)
    await patchWiredNetworkSettings(req, resSpy)
    expect(putEthernetSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        DHCPEnabled: false,
        IpSyncEnabled: false,
        SharedStaticIp: false,
        IPAddress: '10.0.0.5'
      })
    )
    expect(resSpy.status).toHaveBeenCalledWith(204)
  })

  it('should return 400 for invalid combination (DHCP + static IP)', async () => {
    req.body = { dhcpEnabled: true, ipAddress: '10.0.0.5' }
    await patchWiredNetworkSettings(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(400)
    expect(putEthernetSpy).not.toHaveBeenCalled()
  })

  it('should return 501 when ieee8021x is provided', async () => {
    req.body = { dhcpEnabled: true, ieee8021x: {} }
    await patchWiredNetworkSettings(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(501)
    expect(getEthernetSpy).not.toHaveBeenCalled()
  })

  it('should return 400 when the AMT PUT returns null', async () => {
    req.body = { dhcpEnabled: true }
    getEthernetSpy.mockResolvedValueOnce(ethernetResponse as any)
    putEthernetSpy.mockResolvedValueOnce(null as any)
    await patchWiredNetworkSettings(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(400)
  })

  it('should return 400 when AMT rejects the PUT with a non-200 status', async () => {
    req.body = { dhcpEnabled: true }
    getEthernetSpy.mockResolvedValueOnce(ethernetResponse as any)
    putEthernetSpy.mockResolvedValueOnce({ Body: {}, statusCode: 400 } as any)
    await patchWiredNetworkSettings(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(400)
  })

  it('should return 400 and surface the fault reason when AMT returns a SOAP fault', async () => {
    req.body = { dhcpEnabled: true }
    getEthernetSpy.mockResolvedValueOnce(ethernetResponse as any)
    putEthernetSpy.mockResolvedValueOnce({
      Body: { Fault: { Reason: { Text: 'Invalid value' } } },
      statusCode: 400
    } as any)
    await patchWiredNetworkSettings(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(400)
    expect(resSpy.json).toHaveBeenCalledWith(
      expect.objectContaining({ errorDescription: expect.stringContaining('Invalid value') })
    )
  })

  it('should return 404 when no wired port is found', async () => {
    req.body = { dhcpEnabled: true }
    getEthernetSpy.mockResolvedValueOnce({
      Body: {
        PullResponse: { Items: { AMT_EthernetPortSettings: { InstanceID: 'Intel(r) AMT Ethernet Port Settings 1' } } }
      }
    } as any)
    await patchWiredNetworkSettings(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(404)
    const body = resSpy.json.mock.calls[0][0]
    expect(typeof body.error).toBe('string')
    expect(body).toEqual(
      expect.objectContaining({
        error: expect.any(String),
        errorDescription: expect.stringContaining('Wired Network Settings not found')
      })
    )
  })

  it('should return 500 on unexpected exception', async () => {
    req.body = { dhcpEnabled: true }
    getEthernetSpy.mockImplementation(() => {
      throw new Error()
    })
    await patchWiredNetworkSettings(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(500)
  })
})
