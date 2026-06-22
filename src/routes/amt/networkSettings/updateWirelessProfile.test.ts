/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { vi } from 'vitest'
import { updateWirelessProfile } from './updateWirelessProfile.js'
import { createSpyObj } from '../../../test/helper/vitest.js'
import { CIRAHandler } from '../../../amt/CIRAHandler.js'
import { DeviceAction } from '../../../amt/DeviceAction.js'
import { HttpHandler } from '../../../amt/HttpHandler.js'

const wifiPort = { Body: { PullResponse: { Items: { CIM_WiFiPort: { InstanceID: 'WiFi Endpoint 0' } } } } }

const existingSettings = {
  Body: {
    PullResponse: {
      Items: {
        CIM_WiFiEndpointSettings: {
          InstanceID: 'Intel(r) AMT:WiFi Endpoint Settings home',
          ElementName: 'home',
          Priority: 1
        }
      }
    }
  }
}

const validPSKProfile = {
  profileName: 'home',
  ssid: 'homeSsid',
  priority: 1,
  authenticationMethod: 'WPA2PSK',
  encryptionMethod: 'CCMP',
  password: 'superSecret'
}

describe('wireless profiles - update', () => {
  let resSpy
  let req
  let device
  let portSpy
  let wifiSpy
  let updateSpy

  beforeEach(() => {
    const handler = new CIRAHandler(new HttpHandler(), 'admin', 'P@ssw0rd')
    device = new DeviceAction(handler, null)
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

    portSpy = vi.spyOn(device, 'getWiFiPortState')
    wifiSpy = vi.spyOn(device, 'getWiFiEndpointSettings')
    updateSpy = vi.spyOn(device, 'updateWiFiSettings')
  })

  it('updates an existing profile and returns 204', async () => {
    req.body = { ...validPSKProfile }
    portSpy.mockResolvedValueOnce(wifiPort as any)
    wifiSpy.mockResolvedValueOnce(existingSettings as any)
    updateSpy.mockResolvedValueOnce(0)

    await updateWirelessProfile(req, resSpy)

    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ InstanceID: 'Intel(r) AMT:WiFi Endpoint Settings home', ElementName: 'home' }),
      undefined,
      undefined,
      undefined
    )
    expect(resSpy.status).toHaveBeenCalledWith(204)
  })

  it('returns 400 on validation error', async () => {
    req.body = { ...validPSKProfile, ssid: '' }
    await updateWirelessProfile(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(400)
  })

  it('returns 404 when no WiFi port', async () => {
    req.body = { ...validPSKProfile }
    portSpy.mockResolvedValueOnce(null as any)
    await updateWirelessProfile(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(404)
    expect(resSpy.json).toHaveBeenCalledWith({
      error: 'No WiFi port found on the device',
      errorDescription: `No WiFi port found on the device for guid : ${req.params.guid}.`
    })
  })

  it('returns 404 when profile not found', async () => {
    req.body = { ...validPSKProfile, profileName: 'missing' }
    portSpy.mockResolvedValueOnce(wifiPort as any)
    wifiSpy.mockResolvedValueOnce(existingSettings as any)
    await updateWirelessProfile(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(404)
    expect(resSpy.json).toHaveBeenCalledWith({
      error: 'Wireless Profile not found',
      errorDescription: `Wireless Profile not found: ${req.body.profileName}.`
    })
    expect(updateSpy).not.toHaveBeenCalled()
  })

  it('returns 409 when priority owned by another profile', async () => {
    req.body = { ...validPSKProfile, priority: 2 }
    portSpy.mockResolvedValueOnce(wifiPort as any)
    wifiSpy.mockResolvedValueOnce({
      Body: {
        PullResponse: {
          Items: {
            CIM_WiFiEndpointSettings: [
              { InstanceID: 'Intel(r) AMT:WiFi Endpoint Settings home', ElementName: 'home', Priority: 1 },
              { InstanceID: 'Intel(r) AMT:WiFi Endpoint Settings other', ElementName: 'other', Priority: 2 }
            ]
          }
        }
      }
    } as any)
    await updateWirelessProfile(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(409)
    expect(updateSpy).not.toHaveBeenCalled()
  })

  it('returns 400 when UpdateWiFiSettings returns null', async () => {
    req.body = { ...validPSKProfile }
    portSpy.mockResolvedValueOnce(wifiPort as any)
    wifiSpy.mockResolvedValueOnce(existingSettings as any)
    updateSpy.mockResolvedValueOnce(null)
    await updateWirelessProfile(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(400)
  })

  it('returns 400 when UpdateWiFiSettings returns a non-zero ReturnValue', async () => {
    req.body = { ...validPSKProfile }
    portSpy.mockResolvedValueOnce(wifiPort as any)
    wifiSpy.mockResolvedValueOnce(existingSettings as any)
    updateSpy.mockResolvedValueOnce(1)
    await updateWirelessProfile(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(400)
    expect(resSpy.status).not.toHaveBeenCalledWith(204)
  })

  it('returns 500 on error', async () => {
    req.body = { ...validPSKProfile }
    portSpy.mockRejectedValueOnce(new Error('boom'))
    await updateWirelessProfile(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(500)
  })
})
