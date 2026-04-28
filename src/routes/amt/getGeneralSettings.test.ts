/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { vi } from 'vitest'
import { generalSettings } from './getGeneralSettings.js'
import { createSpyObj } from '../../test/helper/vitest.js'
import { CIRAHandler } from '../../amt/CIRAHandler.js'
import { DeviceAction } from '../../amt/DeviceAction.js'
import { HttpHandler } from '../../amt/HttpHandler.js'
import { messages } from '../../logging/index.js'
const response = {
  Envelope: {
    Header: {
      To: 'http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous',
      RelatesTo: '0',
      Action: 'http://schemas.xmlsoap.org/ws/2004/09/transfer/GetResponse',
      MessageID: 'uuid:00000000-8086-8086-8086-000000000001',
      ResourceURI: 'http://intel.com/wbem/wscim/1/amt-schema/1/AMT_GeneralSettings'
    },
    Body: {
      AMT_GeneralSettings: {
        AMTNetworkEnabled: '1',
        DDNSPeriodicUpdateInterval: '1440',
        DDNSTTL: '900',
        DDNSUpdateByDHCPServerEnabled: 'true',
        DDNSUpdateEnabled: 'false',
        DHCPv6ConfigurationTimeout: '0',
        DigestRealm: 'Digest:A3829B3827DE4D33D4449B366831FD01',
        DomainName: '',
        ElementName: 'Intel(r) AMT: General Settings',
        HostName: '',
        HostOSFQDN: 'DESKTOP-9CC12U7',
        IdleWakeTimeout: '1',
        InstanceID: 'Intel(r) AMT: General Settings',
        NetworkInterfaceEnabled: 'true',
        PingResponseEnabled: 'true',
        PowerSource: '0',
        PreferredAddressFamily: '0',
        PresenceNotificationInterval: '0',
        PrivacyLevel: '0',
        RmcpPingResponseEnabled: 'true',
        SharedFQDN: 'true',
        ThunderboltDockEnabled: '0',
        WsmanOnlyMode: 'false'
      }
    }
  }
}

describe('general settings', () => {
  let resSpy
  let req
  let generalSettingsSpy
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

    generalSettingsSpy = vi.spyOn(device, 'getGeneralSettings')
  })

  it('should get version', async () => {
    const expectedResult = {
      Header: response.Envelope.Header,
      Body: response.Envelope.Body.AMT_GeneralSettings
    }
    generalSettingsSpy.mockResolvedValueOnce(response.Envelope)
    await generalSettings(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith(expectedResult)
  })
  it('should get an error with status code 400, when get version is null', async () => {
    generalSettingsSpy.mockResolvedValueOnce(null)
    await generalSettings(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(400)
    expect(resSpy.json).toHaveBeenCalledWith({
      error: 'Incorrect URI or Bad Request',
      errorDescription: `${messages.GENERAL_SETTINGS_REQUEST_FAILED} for guid : 4c4c4544-004b-4210-8033-b6c04f504633.`
    })
  })
  it('should get an error with status code 500 for an unexpected exception', async () => {
    generalSettingsSpy.mockImplementation(() => {
      throw new Error()
    })
    await generalSettings(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(500)
    expect(resSpy.json).toHaveBeenCalledWith({
      error: 'Internal Server Error',
      errorDescription: messages.GENERAL_SETTINGS_EXCEPTION
    })
  })
})
