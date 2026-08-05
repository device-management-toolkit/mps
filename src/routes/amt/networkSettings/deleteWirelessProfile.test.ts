/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { vi } from 'vitest'
import { deleteWirelessProfile } from './deleteWirelessProfile.js'
import { createSpyObj } from '../../../test/helper/vitest.js'
import { CIRAHandler } from '../../../amt/CIRAHandler.js'
import { DeviceAction } from '../../../amt/DeviceAction.js'
import { HttpHandler } from '../../../amt/HttpHandler.js'

const wifiSettings = {
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

describe('wireless profiles - delete', () => {
  let resSpy
  let req
  let device
  let wifiSpy
  let deleteSpy

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
      params: { guid: '4c4c4544-004b-4210-8033-b6c04f504633', profileName: 'home' },
      deviceAction: device
    }
    resSpy.status.mockReturnThis()
    resSpy.json.mockReturnThis()
    resSpy.send.mockReturnThis()
    resSpy.end.mockReturnThis()

    wifiSpy = vi.spyOn(device, 'getWiFiEndpointSettings')
    deleteSpy = vi.spyOn(device, 'deleteWiFiEndpointSettings')
  })

  it('deletes an existing profile and returns 204', async () => {
    wifiSpy.mockResolvedValueOnce(wifiSettings as any)
    deleteSpy.mockResolvedValueOnce(true)
    await deleteWirelessProfile(req, resSpy)
    expect(deleteSpy).toHaveBeenCalledWith('Intel(r) AMT:WiFi Endpoint Settings home')
    expect(resSpy.status).toHaveBeenCalledWith(204)
  })

  it('returns 404 when profile not found', async () => {
    req.params.profileName = 'missing'
    wifiSpy.mockResolvedValueOnce(wifiSettings as any)
    await deleteWirelessProfile(req, resSpy)
    expect(deleteSpy).not.toHaveBeenCalled()
    expect(resSpy.status).toHaveBeenCalledWith(404)
    expect(resSpy.json).toHaveBeenCalledWith({
      error: 'Wireless Profile not found',
      errorDescription: `Wireless Profile not found: ${req.params.profileName}.`
    })
  })

  it('returns 400 when delete fails', async () => {
    wifiSpy.mockResolvedValueOnce(wifiSettings as any)
    deleteSpy.mockResolvedValueOnce(false)
    await deleteWirelessProfile(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(400)
  })

  it('returns 500 on error', async () => {
    wifiSpy.mockRejectedValueOnce(new Error('boom'))
    await deleteWirelessProfile(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(500)
  })
})
