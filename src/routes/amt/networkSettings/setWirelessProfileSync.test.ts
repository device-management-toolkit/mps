/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { vi } from 'vitest'
import { setWirelessProfileSync } from './setWirelessProfileSync.js'
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
      ElementName: 'Intel(r) AMT WiFi Port Configuration Service',
      localProfileSynchronizationEnabled: localSync,
      UEFIWiFiProfileShareEnabled: uefiSync
    }
  }
})

const powerCaps = (uefiSupported: boolean): any => ({
  Body: { AMT_BootCapabilities: { UEFIWiFiCoExistenceAndProfileShare: uefiSupported } }
})

describe('wireless profile sync - set', () => {
  let resSpy
  let req
  let getWiFiPortStateSpy
  let getWiFiPortConfigurationServiceSpy
  let getPowerCapabilitiesSpy
  let putWiFiPortConfigurationServiceSpy

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

    getWiFiPortStateSpy = vi.spyOn(device, 'getWiFiPortState')
    getWiFiPortConfigurationServiceSpy = vi.spyOn(device, 'getWiFiPortConfigurationService')
    getPowerCapabilitiesSpy = vi.spyOn(device, 'getPowerCapabilities')
    putWiFiPortConfigurationServiceSpy = vi.spyOn(device, 'putWiFiPortConfigurationService')

    getWiFiPortStateSpy.mockResolvedValue(wifiPortPresent())
  })

  it('should update local profile sync and return 200', async () => {
    req.body = { localProfileSync: true }
    getWiFiPortConfigurationServiceSpy.mockResolvedValueOnce(configResponse(0, 0))
    getPowerCapabilitiesSpy.mockResolvedValueOnce(powerCaps(true))
    putWiFiPortConfigurationServiceSpy.mockResolvedValueOnce(configResponse(3, 0))
    await setWirelessProfileSync(req, resSpy)
    expect(putWiFiPortConfigurationServiceSpy).toHaveBeenCalled()
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith({
      localProfileSync: true,
      uefiProfileSync: false,
      uefiProfileSyncSupported: true
    })
  })

  it('should update UEFI profile sync when supported', async () => {
    req.body = { uefiProfileSync: true }
    getWiFiPortConfigurationServiceSpy.mockResolvedValueOnce(configResponse(0, 0))
    getPowerCapabilitiesSpy.mockResolvedValueOnce(powerCaps(true))
    putWiFiPortConfigurationServiceSpy.mockResolvedValueOnce(configResponse(0, 1))
    await setWirelessProfileSync(req, resSpy)
    expect(putWiFiPortConfigurationServiceSpy).toHaveBeenCalled()
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith({
      localProfileSync: false,
      uefiProfileSync: true,
      uefiProfileSyncSupported: true
    })
  })

  it('should return 400 when AMT rejects the PUT with a non-200 status', async () => {
    req.body = { localProfileSync: true }
    getWiFiPortConfigurationServiceSpy.mockResolvedValueOnce(configResponse(0, 0))
    getPowerCapabilitiesSpy.mockResolvedValueOnce(powerCaps(true))
    putWiFiPortConfigurationServiceSpy.mockResolvedValueOnce({ Body: {}, statusCode: 400 } as any)
    await setWirelessProfileSync(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(400)
    const body = resSpy.json.mock.calls[0][0]
    expect(typeof body.error).toBe('string')
    expect(body).toEqual(
      expect.objectContaining({
        error: expect.any(String),
        errorDescription: expect.any(String)
      })
    )
  })

  it('should return 400 and surface the fault reason when AMT returns a SOAP fault', async () => {
    req.body = { localProfileSync: true }
    getWiFiPortConfigurationServiceSpy.mockResolvedValueOnce(configResponse(0, 0))
    getPowerCapabilitiesSpy.mockResolvedValueOnce(powerCaps(true))
    putWiFiPortConfigurationServiceSpy.mockResolvedValueOnce({
      Body: { Fault: { Reason: { Text: 'Invalid value' } } },
      statusCode: 400
    } as any)
    await setWirelessProfileSync(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(400)
    expect(resSpy.json).toHaveBeenCalledWith(
      expect.objectContaining({ errorDescription: expect.stringContaining('Invalid value') })
    )
  })

  it('should return 409 when UEFI sync requested but unsupported', async () => {
    req.body = { uefiProfileSync: true }
    getWiFiPortConfigurationServiceSpy.mockResolvedValueOnce(configResponse(0, 0))
    getPowerCapabilitiesSpy.mockResolvedValueOnce(powerCaps(false))
    await setWirelessProfileSync(req, resSpy)
    expect(putWiFiPortConfigurationServiceSpy).not.toHaveBeenCalled()
    expect(resSpy.status).toHaveBeenCalledWith(409)
    const body = resSpy.json.mock.calls[0][0]
    expect(typeof body.error).toBe('string')
    expect(body).toEqual(
      expect.objectContaining({
        error: expect.any(String),
        errorDescription: expect.any(String)
      })
    )
  })

  it('should not call put when nothing changes', async () => {
    req.body = { localProfileSync: true, uefiProfileSync: false }
    getWiFiPortConfigurationServiceSpy.mockResolvedValueOnce(configResponse(3, 0))
    getPowerCapabilitiesSpy.mockResolvedValueOnce(powerCaps(true))
    await setWirelessProfileSync(req, resSpy)
    expect(putWiFiPortConfigurationServiceSpy).not.toHaveBeenCalled()
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith({
      localProfileSync: true,
      uefiProfileSync: false,
      uefiProfileSyncSupported: true
    })
  })

  it('should treat null fields as omitted and keep current state', async () => {
    req.body = { localProfileSync: null, uefiProfileSync: null }
    getWiFiPortConfigurationServiceSpy.mockResolvedValueOnce(configResponse(3, 0))
    getPowerCapabilitiesSpy.mockResolvedValueOnce(powerCaps(true))
    await setWirelessProfileSync(req, resSpy)
    expect(putWiFiPortConfigurationServiceSpy).not.toHaveBeenCalled()
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith({
      localProfileSync: true,
      uefiProfileSync: false,
      uefiProfileSyncSupported: true
    })
  })

  it('should disable local and UEFI sync and return 200', async () => {
    req.body = { localProfileSync: false, uefiProfileSync: false }
    getWiFiPortConfigurationServiceSpy.mockResolvedValueOnce(configResponse(3, 1))
    getPowerCapabilitiesSpy.mockResolvedValueOnce(powerCaps(true))
    putWiFiPortConfigurationServiceSpy.mockResolvedValueOnce(configResponse(0, 0))
    await setWirelessProfileSync(req, resSpy)
    expect(putWiFiPortConfigurationServiceSpy).toHaveBeenCalled()
    const putArg = putWiFiPortConfigurationServiceSpy.mock.calls[0][0]
    expect(putArg.localProfileSynchronizationEnabled).toBe(0)
    expect(putArg.UEFIWiFiProfileShareEnabled).toBe(0)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith({
      localProfileSync: false,
      uefiProfileSync: false,
      uefiProfileSyncSupported: true
    })
  })

  it('should default missing sync fields and fall back to the request when the PUT echoes no resource', async () => {
    req.body = { localProfileSync: true }
    // Current config has no sync fields set -> they default to disabled.
    getWiFiPortConfigurationServiceSpy.mockResolvedValueOnce({
      Body: { AMT_WiFiPortConfigurationService: { ElementName: 'Intel(r) AMT WiFi Port Configuration Service' } }
    } as any)
    getPowerCapabilitiesSpy.mockResolvedValueOnce(powerCaps(true))
    // PUT succeeds (200) but the body does not echo AMT_WiFiPortConfigurationService.
    putWiFiPortConfigurationServiceSpy.mockResolvedValueOnce({ Body: {}, statusCode: 200 } as any)
    await setWirelessProfileSync(req, resSpy)
    const putArg = putWiFiPortConfigurationServiceSpy.mock.calls[0][0]
    expect(putArg.localProfileSynchronizationEnabled).toBe(3)
    expect(putArg.UEFIWiFiProfileShareEnabled).toBe(0)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith({
      localProfileSync: true,
      uefiProfileSync: false,
      uefiProfileSyncSupported: true
    })
  })

  it('should return 404 when no WiFi port is found', async () => {
    req.body = { localProfileSync: true }
    getWiFiPortStateSpy.mockReset()
    getWiFiPortStateSpy.mockResolvedValueOnce({ Body: { PullResponse: { Items: {} } } } as any)
    await setWirelessProfileSync(req, resSpy)
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

  it('should return 500 when the configuration service cannot be read', async () => {
    req.body = { localProfileSync: true }
    getWiFiPortConfigurationServiceSpy.mockResolvedValueOnce({ Body: {} } as any)
    await setWirelessProfileSync(req, resSpy)
    expect(putWiFiPortConfigurationServiceSpy).not.toHaveBeenCalled()
    expect(resSpy.status).toHaveBeenCalledWith(500)
    const body = resSpy.json.mock.calls[0][0]
    expect(typeof body.error).toBe('string')
    expect(body).toEqual(
      expect.objectContaining({
        error: expect.any(String),
        errorDescription: expect.any(String)
      })
    )
  })

  it('should return 500 on unexpected exception', async () => {
    req.body = { localProfileSync: true }
    getWiFiPortConfigurationServiceSpy.mockImplementation(() => {
      throw new Error()
    })
    getPowerCapabilitiesSpy.mockResolvedValueOnce(powerCaps(true))
    await setWirelessProfileSync(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(500)
  })
})
