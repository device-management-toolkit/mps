/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { vi } from 'vitest'
import { getWirelessProfileSync } from './getWirelessProfileSync.js'
import { createSpyObj } from '../../../test/helper/vitest.js'
import { CIRAHandler } from '../../../amt/CIRAHandler.js'
import { DeviceAction } from '../../../amt/DeviceAction.js'
import { HttpHandler } from '../../../amt/HttpHandler.js'

const wifiPortPresent = (): any => ({
  Body: { PullResponse: { Items: { CIM_WiFiPort: { InstanceID: 'Intel(r) AMT:WiFi Endpoint 0' } } } }
})

const configResponse = (localSync: number, uefiSync: number): any => ({
  Body: {
    AMT_WiFiPortConfigurationService: {
      localProfileSynchronizationEnabled: localSync,
      UEFIWiFiProfileShareEnabled: uefiSync
    }
  }
})

const powerCaps = (uefiSupported: boolean): any => ({
  Body: { AMT_BootCapabilities: { UEFIWiFiCoExistenceAndProfileShare: uefiSupported } }
})

describe('wireless profile sync - get', () => {
  let resSpy
  let req
  let getWiFiPortStateSpy
  let getWiFiPortConfigurationServiceSpy
  let getPowerCapabilitiesSpy

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

    getWiFiPortStateSpy = vi.spyOn(device, 'getWiFiPortState')
    getWiFiPortConfigurationServiceSpy = vi.spyOn(device, 'getWiFiPortConfigurationService')
    getPowerCapabilitiesSpy = vi.spyOn(device, 'getPowerCapabilities')
  })

  it('should return profile sync settings with status 200', async () => {
    getWiFiPortStateSpy.mockResolvedValueOnce(wifiPortPresent())
    getWiFiPortConfigurationServiceSpy.mockResolvedValueOnce(configResponse(3, 1))
    getPowerCapabilitiesSpy.mockResolvedValueOnce(powerCaps(true))
    await getWirelessProfileSync(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith({
      localProfileSync: true,
      uefiProfileSync: true,
      uefiProfileSyncSupported: true
    })
  })

  it('should report disabled sync and unsupported UEFI', async () => {
    getWiFiPortStateSpy.mockResolvedValueOnce(wifiPortPresent())
    getWiFiPortConfigurationServiceSpy.mockResolvedValueOnce(configResponse(0, 0))
    getPowerCapabilitiesSpy.mockResolvedValueOnce(powerCaps(false))
    await getWirelessProfileSync(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith({
      localProfileSync: false,
      uefiProfileSync: false,
      uefiProfileSyncSupported: false
    })
  })

  it('should default to disabled when the configuration service is empty', async () => {
    getWiFiPortStateSpy.mockResolvedValueOnce(wifiPortPresent())
    getWiFiPortConfigurationServiceSpy.mockResolvedValueOnce({ Body: {} } as any)
    getPowerCapabilitiesSpy.mockResolvedValueOnce(powerCaps(true))
    await getWirelessProfileSync(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith({
      localProfileSync: false,
      uefiProfileSync: false,
      uefiProfileSyncSupported: true
    })
  })

  it('should return 404 when no WiFi port is found', async () => {
    getWiFiPortStateSpy.mockResolvedValueOnce({ Body: { PullResponse: { Items: {} } } } as any)
    await getWirelessProfileSync(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(404)
    const body = resSpy.json.mock.calls[0][0]
    expect(typeof body.error).toBe('string')
    expect(body).toEqual(
      expect.objectContaining({
        error: expect.any(String),
        errorDescription: expect.stringContaining('not found')
      })
    )
  })

  it('should return 500 on unexpected exception', async () => {
    getWiFiPortStateSpy.mockImplementation(() => {
      throw new Error()
    })
    await getWirelessProfileSync(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(500)
  })
})
