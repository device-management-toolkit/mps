/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { vi } from 'vitest'
import { getWirelessProfiles } from './getWirelessProfiles.js'
import { createSpyObj } from '../../../test/helper/vitest.js'
import { CIRAHandler } from '../../../amt/CIRAHandler.js'
import { DeviceAction } from '../../../amt/DeviceAction.js'
import { HttpHandler } from '../../../amt/HttpHandler.js'

describe('wireless profiles - get', () => {
  let resSpy
  let req
  let device
  let wifiSpy
  let ieee8021xSpy
  let concreteSpy

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
      deviceAction: device
    }
    resSpy.status.mockReturnThis()
    resSpy.json.mockReturnThis()
    resSpy.send.mockReturnThis()
    resSpy.end.mockReturnThis()

    wifiSpy = vi.spyOn(device, 'getWiFiEndpointSettings')
    ieee8021xSpy = vi.spyOn(device, 'getCIMIEEE8021xSettings')
    concreteSpy = vi.spyOn(device, 'getConcreteDependency')
  })

  it('returns 200 with sanitized profiles', async () => {
    wifiSpy.mockResolvedValueOnce({
      Body: {
        PullResponse: {
          Items: {
            CIM_WiFiEndpointSettings: {
              InstanceID: 'Intel(r) AMT:WiFi Endpoint Settings home',
              ElementName: 'home',
              Priority: 1,
              SSID: 'homeSsid',
              AuthenticationMethod: 6,
              EncryptionMethod: 4,
              PSKPassPhrase: 'secret'
            }
          }
        }
      }
    } as any)
    ieee8021xSpy.mockResolvedValueOnce({ Body: { PullResponse: { Items: '' } } } as any)
    concreteSpy.mockResolvedValueOnce(null)

    await getWirelessProfiles(req, resSpy)

    expect(resSpy.status).toHaveBeenCalledWith(200)
    const payload = resSpy.json.mock.calls[0][0]
    expect(payload).toEqual([
      { profileName: 'home', ssid: 'homeSsid', authenticationMethod: 'WPA2PSK', encryptionMethod: 'CCMP', priority: 1 }
    ])
    expect(JSON.stringify(payload)).not.toContain('secret')
  })

  it('returns 500 on error', async () => {
    wifiSpy.mockRejectedValueOnce(new Error('boom'))
    await getWirelessProfiles(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(500)
  })
})
