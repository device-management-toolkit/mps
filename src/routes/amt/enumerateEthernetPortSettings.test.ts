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
import { enumerateEthernetPortSettings } from './enumerateEthernetPortSettings.js'

describe('Enumerate Ethernet Port Settings', () => {
  let req: Express.Request
  let resSpy
  let mqttSpy: SpyInstance<any>
  let enumerateEthernetPortSettingsSpy: SpyInstance<any>
  let device: DeviceAction
  let mockEnumerateResponse

  beforeEach(() => {
    const handler = new CIRAHandler(new HttpHandler(), 'admin', 'P@ssw0rd')
    device = new DeviceAction(handler, null)
    
    mockEnumerateResponse = {
      Body: {
        PullResponse: {
          Items: {
            AMT_EthernetPortSettings: [
              {
                InstanceID: 'Intel(r) AMT Ethernet Port Settings 0',
                ElementName: 'Intel(r) AMT Ethernet Port Settings',
                MACAddress: 'a4-ae-11-1c-02-4d',
                LinkIsUp: true,
                LinkPolicy: [1, 14, 16],
                LinkPreference: 2,
                LinkControl: 2
              },
              {
                InstanceID: 'Intel(r) AMT Ethernet Port Settings 1',
                ElementName: 'Intel(r) AMT Ethernet Port Settings',
                MACAddress: 'a4-ae-11-1c-02-4e',
                LinkIsUp: false,
                LinkPolicy: [1, 14],
                LinkPreference: 1,
                LinkControl: 1
              }
            ]
          }
        }
      }
    }

    req = {
      params: {
        guid: '123456'
      },
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
    enumerateEthernetPortSettingsSpy = spyOn(device, 'enumerateEthernetPortSettings').mockResolvedValue(mockEnumerateResponse as any)
  })

  it('should enumerate all ethernet port settings', async () => {
    await enumerateEthernetPortSettings(req as any, resSpy)

    expect(enumerateEthernetPortSettingsSpy).toHaveBeenCalled()
    expect(mqttSpy).toHaveBeenCalledWith('success', ['AMT_EthernetPortSettings'], 'Ethernet Port Settings enumerated')
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith(mockEnumerateResponse.Body.PullResponse.Items.AMT_EthernetPortSettings)
  })

  it('should handle single port in enumerate response', async () => {
    const singlePortResponse = {
      Body: {
        PullResponse: {
          Items: {
            AMT_EthernetPortSettings: {
              InstanceID: 'Intel(r) AMT Ethernet Port Settings 0',
              ElementName: 'Intel(r) AMT Ethernet Port Settings',
              MACAddress: 'a4-ae-11-1c-02-4d'
            }
          }
        }
      }
    }
    enumerateEthernetPortSettingsSpy.mockResolvedValue(singlePortResponse as any)

    await enumerateEthernetPortSettings(req as any, resSpy)

    expect(resSpy.status).toHaveBeenCalledWith(200)
    // Should wrap single object in array
    expect(resSpy.json).toHaveBeenCalled()
  })

  it('should handle errors gracefully', async () => {
    const errorMessage = 'Failed to enumerate ethernet port settings'
    enumerateEthernetPortSettingsSpy.mockRejectedValue(new Error(errorMessage))

    await enumerateEthernetPortSettings(req as any, resSpy)

    expect(mqttSpy).toHaveBeenCalledWith('fail', ['AMT_EthernetPortSettings'], messages.INTERNAL_SERVICE_ERROR)
    expect(resSpy.status).toHaveBeenCalledWith(500)
    expect(resSpy.json).toHaveBeenCalledWith(ErrorResponse(500, 'Exception during Enumerate Ethernet Port Settings'))
  })
})
