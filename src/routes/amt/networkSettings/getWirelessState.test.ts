/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { vi } from 'vitest'
import { getWirelessState } from './getWirelessState.js'
import { createSpyObj } from '../../../test/helper/vitest.js'
import { CIRAHandler } from '../../../amt/CIRAHandler.js'
import { DeviceAction } from '../../../amt/DeviceAction.js'
import { HttpHandler } from '../../../amt/HttpHandler.js'

const wifiPortResponse = (enabledState: number): any => ({
  Body: {
    PullResponse: {
      Items: {
        CIM_WiFiPort: {
          InstanceID: 'Intel(r) AMT:WiFi Endpoint 0',
          ElementName: 'Intel(r) AMT:WiFi Endpoint 0',
          EnabledState: enabledState
        }
      }
    }
  }
})

describe('wireless state - get', () => {
  let resSpy
  let req
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
      deviceAction: device
    }
    resSpy.status.mockReturnThis()
    resSpy.json.mockReturnThis()
    resSpy.send.mockReturnThis()

    getWiFiPortStateSpy = vi.spyOn(device, 'getWiFiPortState')
  })

  it('should return WifiEnabledS0SxAC with status 200', async () => {
    getWiFiPortStateSpy.mockResolvedValueOnce(wifiPortResponse(32769))
    await getWirelessState(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith({ state: 'WifiEnabledS0SxAC' })
  })

  it('should return WifiDisabled with status 200', async () => {
    getWiFiPortStateSpy.mockResolvedValueOnce(wifiPortResponse(3))
    await getWirelessState(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith({ state: 'WifiDisabled' })
  })

  it('should handle a single WiFi port returned as an array', async () => {
    const response = wifiPortResponse(32768)
    response.Body.PullResponse.Items.CIM_WiFiPort = [response.Body.PullResponse.Items.CIM_WiFiPort]
    getWiFiPortStateSpy.mockResolvedValueOnce(response)
    await getWirelessState(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith({ state: 'WifiEnabledS0' })
  })

  it('should return 404 when no WiFi port is found', async () => {
    getWiFiPortStateSpy.mockResolvedValueOnce({ Body: { PullResponse: { Items: {} } } } as any)
    await getWirelessState(req, resSpy)
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

  it('should return 500 when the EnabledState is unsupported', async () => {
    getWiFiPortStateSpy.mockResolvedValueOnce(wifiPortResponse(7))
    await getWirelessState(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(500)
  })

  it('should return 500 on unexpected exception', async () => {
    getWiFiPortStateSpy.mockImplementation(() => {
      throw new Error()
    })
    await getWirelessState(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(500)
  })
})
