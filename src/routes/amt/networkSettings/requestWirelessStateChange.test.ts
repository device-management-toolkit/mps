/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { vi } from 'vitest'
import { requestWirelessStateChange } from './requestWirelessStateChange.js'
import { createSpyObj } from '../../../test/helper/vitest.js'
import { CIRAHandler } from '../../../amt/CIRAHandler.js'
import { DeviceAction } from '../../../amt/DeviceAction.js'
import { HttpHandler } from '../../../amt/HttpHandler.js'

describe('wireless state - change', () => {
  let resSpy
  let req
  let wiFiRequestStateChangeSpy
  let getWiFiPortStateSpy

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
      body: { state: 'WifiEnabledS0SxAC' },
      deviceAction: device
    }
    resSpy.status.mockReturnThis()
    resSpy.json.mockReturnThis()
    resSpy.send.mockReturnThis()

    wiFiRequestStateChangeSpy = vi.spyOn(device, 'wiFiRequestStateChange')
    getWiFiPortStateSpy = vi.spyOn(device, 'getWiFiPortState')
    getWiFiPortStateSpy.mockResolvedValue({
      Body: { PullResponse: { Items: { CIM_WiFiPort: { InstanceID: 'Intel(r) AMT:WiFi Endpoint 0' } } } }
    } as any)
  })

  it('should change the state and echo it with status 200', async () => {
    wiFiRequestStateChangeSpy.mockResolvedValueOnce({ RequestStateChange_OUTPUT: { ReturnValue: 0 } })
    await requestWirelessStateChange(req, resSpy)
    expect(wiFiRequestStateChangeSpy).toHaveBeenCalledWith(32769)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith({ state: 'WifiEnabledS0SxAC' })
  })

  it('should accept a case-insensitive state string', async () => {
    req.body.state = 'wifidisabled'
    wiFiRequestStateChangeSpy.mockResolvedValueOnce({ RequestStateChange_OUTPUT: { ReturnValue: 0 } })
    await requestWirelessStateChange(req, resSpy)
    expect(wiFiRequestStateChangeSpy).toHaveBeenCalledWith(3)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith({ state: 'WifiDisabled' })
  })

  it('should return 400 for an unsupported state', async () => {
    req.body.state = 'not-valid'
    await requestWirelessStateChange(req, resSpy)
    expect(wiFiRequestStateChangeSpy).not.toHaveBeenCalled()
    expect(resSpy.status).toHaveBeenCalledWith(400)
  })

  it('should return 404 when no WiFi port is found', async () => {
    getWiFiPortStateSpy.mockReset()
    getWiFiPortStateSpy.mockResolvedValueOnce({ Body: { PullResponse: { Items: {} } } } as any)
    await requestWirelessStateChange(req, resSpy)
    expect(wiFiRequestStateChangeSpy).not.toHaveBeenCalled()
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

  it('should skip the state-change call and echo the state when already in the requested state', async () => {
    getWiFiPortStateSpy.mockReset()
    getWiFiPortStateSpy.mockResolvedValueOnce({
      Body: { PullResponse: { Items: { CIM_WiFiPort: { EnabledState: 32769 } } } }
    } as any)
    await requestWirelessStateChange(req, resSpy)
    expect(wiFiRequestStateChangeSpy).not.toHaveBeenCalled()
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith({ state: 'WifiEnabledS0SxAC' })
  })

  it('should return 400 when the device returns a non-zero ReturnValue', async () => {
    wiFiRequestStateChangeSpy.mockResolvedValueOnce({ RequestStateChange_OUTPUT: { ReturnValue: 1 } })
    await requestWirelessStateChange(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(400)
  })

  it('should return 400 when the device returns no result', async () => {
    wiFiRequestStateChangeSpy.mockResolvedValueOnce(null)
    await requestWirelessStateChange(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(400)
  })

  it('should return 500 on unexpected exception', async () => {
    wiFiRequestStateChangeSpy.mockImplementation(() => {
      throw new Error()
    })
    await requestWirelessStateChange(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(500)
  })
})
