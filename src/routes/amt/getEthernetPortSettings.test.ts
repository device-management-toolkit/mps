/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type SpyInstance, spyOn } from 'jest-mock'
import { CIRAHandler } from '../../amt/CIRAHandler.js'
import { DeviceAction } from '../../amt/DeviceAction.js'
import { HttpHandler } from '../../amt/HttpHandler.js'
import { messages } from '../../logging/index.js'
import { createSpyObj } from '../../test/helper/jest.js'
import { ErrorResponse } from '../../utils/amtHelper.js'
import { MqttProvider } from '../../utils/MqttProvider.js'
import { getEthernetPortSettings } from './getEthernetPortSettings.js'

describe('Get Ethernet Port Settings', () => {
  let req
  let resSpy
  let mqttSpy: SpyInstance<any>
  let getEthernetPortSettingsSpy: SpyInstance<any>
  let device: DeviceAction
  let mockEthernetPortSettings

  beforeEach(() => {
    const handler = new CIRAHandler(new HttpHandler(), 'admin', 'P@ssw0rd')
    device = new DeviceAction(handler, null)
    
    mockEthernetPortSettings = {
      AMT_EthernetPortSettings: {
        InstanceID: 'Intel(r) AMT Ethernet Port Settings 0',
        ElementName: 'Intel(r) AMT Ethernet Port Settings',
        MACAddress: 'a4-ae-11-1c-02-4d',
        LinkIsUp: true,
        LinkPolicy: [1, 14, 16],
        LinkPreference: 2,
        LinkControl: 2,
        SharedMAC: true,
        SharedStaticIp: false,
        SharedDynamicIP: true,
        IpSyncEnabled: true,
        DHCPEnabled: true,
        PhysicalConnectionType: 0
      }
    }

    req = {
      params: {
        guid: '123456'
      },
      query: {},
      deviceAction: device
    }
    resSpy = createSpyObj('Response', [
      'status',
      'json',
      'end',
      'send'
    ])
    resSpy.status.mockReturnThis()
    resSpy.json.mockReturnThis()
    resSpy.send.mockReturnThis()
    mqttSpy = spyOn(MqttProvider, 'publishEvent')
    getEthernetPortSettingsSpy = spyOn(device, 'getEthernetPortSettings').mockResolvedValue(mockEthernetPortSettings as any)
  })

  it('should get ethernet port settings with default instanceID', async () => {
    await getEthernetPortSettings(req as any, resSpy)

    expect(getEthernetPortSettingsSpy).toHaveBeenCalledWith(undefined)
    expect(mqttSpy).toHaveBeenCalledWith('success', ['AMT_EthernetPortSettings'], 'Ethernet Port Settings retrieved')
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith(mockEthernetPortSettings)
  })

  it('should get ethernet port settings with custom instanceID', async () => {
    req.query.instanceID = 'Intel(r) AMT Ethernet Port Settings 1'

    await getEthernetPortSettings(req as any, resSpy)

    expect(getEthernetPortSettingsSpy).toHaveBeenCalledWith('Intel(r) AMT Ethernet Port Settings 1')
    expect(resSpy.status).toHaveBeenCalledWith(200)
  })

  it('should handle errors gracefully', async () => {
    const errorMessage = 'Failed to get ethernet port settings'
    getEthernetPortSettingsSpy.mockRejectedValue(new Error(errorMessage))

    await getEthernetPortSettings(req as any, resSpy)

    expect(mqttSpy).toHaveBeenCalledWith('fail', ['AMT_EthernetPortSettings'], messages.INTERNAL_SERVICE_ERROR)
    expect(resSpy.status).toHaveBeenCalledWith(500)
    expect(resSpy.json).toHaveBeenCalledWith(ErrorResponse(500, 'Exception during Get Ethernet Port Settings'))
  })
})
