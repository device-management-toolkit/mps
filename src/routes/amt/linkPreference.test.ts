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
import { setLinkPreference } from './linkPreference.js'

describe('Link Preference', () => {
  let req
  let resSpy
  let mqttSpy: SpyInstance<any>
  let setEthernetLinkPreferenceSpy: SpyInstance<any>
  let device: DeviceAction

  beforeEach(() => {
    const handler = new CIRAHandler(new HttpHandler(), 'admin', 'P@ssw0rd')
    device = new DeviceAction(handler, null)
    req = {
      params: {
        guid: '123456'
      },
      body: {
        linkPreference: 1,
        timeout: 300
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
    // Mock with _detectedInstanceID and _wifiPortSettings to simulate auto-detection
    setEthernetLinkPreferenceSpy = spyOn(device, 'setEthernetLinkPreference').mockResolvedValue({
      _detectedInstanceID: 'Intel(r) AMT Ethernet Port Settings 0',
      _wifiPortSettings: {
        InstanceID: 'Intel(r) AMT Ethernet Port Settings 0',
        PhysicalConnectionType: '3',
        ElementName: 'Intel(r) WiFi Link',
        MACAddress: '00:11:22:33:44:55'
      }
    } as any)
  })

  it('should set link preference to ME (1) with timeout', async () => {
    req.body.linkPreference = 1
    req.body.timeout = 300

    await setLinkPreference(req as any, resSpy)

    expect(setEthernetLinkPreferenceSpy).toHaveBeenCalledWith(1, 300)
    expect(mqttSpy).toHaveBeenCalledWith('success', ['AMT_LinkPreference'], 'Link Preference set to ME')
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith({
      status: 'Link Preference set to ME',
      linkPreference: 1,
      timeout: 300,
      instanceID: 'Intel(r) AMT Ethernet Port Settings 0',
      wifiPort: {
        InstanceID: 'Intel(r) AMT Ethernet Port Settings 0',
        PhysicalConnectionType: '3',
        ElementName: 'Intel(r) WiFi Link',
        MACAddress: '00:11:22:33:44:55'
      }
    })
  })

  it('should set link preference to HOST (2) with timeout', async () => {
    req.body.linkPreference = 2
    req.body.timeout = 600

    await setLinkPreference(req as any, resSpy)

    expect(setEthernetLinkPreferenceSpy).toHaveBeenCalledWith(2, 600)
    expect(mqttSpy).toHaveBeenCalledWith('success', ['AMT_LinkPreference'], 'Link Preference set to HOST')
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith({
      status: 'Link Preference set to HOST',
      linkPreference: 2,
      timeout: 600,
      instanceID: 'Intel(r) AMT Ethernet Port Settings 0',
      wifiPort: {
        InstanceID: 'Intel(r) AMT Ethernet Port Settings 0',
        PhysicalConnectionType: '3',
        ElementName: 'Intel(r) WiFi Link',
        MACAddress: '00:11:22:33:44:55'
      }
    })
  })

  it('should handle errors gracefully', async () => {
    const errorMessage = 'Failed to set link preference'
    setEthernetLinkPreferenceSpy.mockRejectedValue(new Error(errorMessage))

    await setLinkPreference(req as any, resSpy)

    expect(mqttSpy).toHaveBeenCalledWith('fail', ['AMT_LinkPreference'], messages.INTERNAL_SERVICE_ERROR)
    expect(resSpy.status).toHaveBeenCalledWith(500)
    expect(resSpy.json).toHaveBeenCalledWith(ErrorResponse(500, 'Exception during Set Link Preference'))
  })

  it('should return 400 when attempting to set link preference on non-WiFi port', async () => {
    // Mock a validation failure response - the exact message depends on actual port type
    const mockFaultResponse = {
      Header: {},
      Body: {
        Fault: {
          Code: { Value: 'ValidationError' },
          Reason: { Text: 'SetLinkPreference is only applicable for WiFi ports' }
        }
      }
    }
    setEthernetLinkPreferenceSpy.mockResolvedValue(mockFaultResponse)

    await setLinkPreference(req as any, resSpy)

    // Verify 400 response with the fault message
    expect(resSpy.status).toHaveBeenCalledWith(400)
    expect(resSpy.json).toHaveBeenCalledWith({ error: mockFaultResponse.Body.Fault.Reason.Text })
    expect(mqttSpy).toHaveBeenCalledWith('fail', ['AMT_LinkPreference'], mockFaultResponse.Body.Fault.Reason.Text)
  })

  it('should return 500 when port validation returns null', async () => {
    setEthernetLinkPreferenceSpy.mockResolvedValue(null)

    await setLinkPreference(req as any, resSpy)

    expect(mqttSpy).toHaveBeenCalledWith('fail', ['AMT_LinkPreference'], 'Unexpected error')
    expect(resSpy.status).toHaveBeenCalledWith(500)
    expect(resSpy.json).toHaveBeenCalledWith(ErrorResponse(500, 'Failed to set link preference'))
  })

  it('should auto-detect WiFi port when instanceID not provided', async () => {
    req.query.instanceID = undefined
    const mockResponse = {
      Body: { SetLinkPreference_OUTPUT: { ReturnValue: '0' } },
      _detectedInstanceID: 'Intel(r) AMT Ethernet Port Settings 1',
      _wifiPortSettings: {
        InstanceID: 'Intel(r) AMT Ethernet Port Settings 1',
        PhysicalConnectionType: '3',
        ElementName: 'WiFi Port',
        MACAddress: 'AA:BB:CC:DD:EE:FF'
      }
    }
    setEthernetLinkPreferenceSpy.mockResolvedValue(mockResponse)

    await setLinkPreference(req as any, resSpy)

    expect(setEthernetLinkPreferenceSpy).toHaveBeenCalledWith(1, 300)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith({
      status: 'Link Preference set to ME',
      linkPreference: 1,
      timeout: 300,
      instanceID: 'Intel(r) AMT Ethernet Port Settings 1',
      wifiPort: {
        InstanceID: 'Intel(r) AMT Ethernet Port Settings 1',
        PhysicalConnectionType: '3',
        ElementName: 'WiFi Port',
        MACAddress: 'AA:BB:CC:DD:EE:FF'
      }
    })
  })

  it('should return 400 when no WiFi port found during auto-detection', async () => {
    req.query.instanceID = undefined
    const mockFaultResponse = {
      Body: {
        Fault: {
          Code: { Value: 'NoWiFiPort' },
          Reason: { Text: 'No WiFi port found on this device. SetLinkPreference requires a WiFi interface (PhysicalConnectionType=3).' }
        }
      }
    }
    setEthernetLinkPreferenceSpy.mockResolvedValue(mockFaultResponse)

    await setLinkPreference(req as any, resSpy)

    expect(resSpy.status).toHaveBeenCalledWith(400)
    expect(resSpy.json).toHaveBeenCalledWith({ 
      error: 'No WiFi port found on this device. SetLinkPreference requires a WiFi interface (PhysicalConnectionType=3).' 
    })
  })
})
