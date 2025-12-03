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
import { setLinkPreference } from './setLinkPreference.js'

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
    setEthernetLinkPreferenceSpy = spyOn(device, 'setEthernetLinkPreference').mockResolvedValue(0)
  })

  it('should set link preference to ME (1) with timeout', async () => {
    req.body.linkPreference = 1
    req.body.timeout = 300

    await setLinkPreference(req as any, resSpy)

    expect(setEthernetLinkPreferenceSpy).toHaveBeenCalledWith(1, 300)
    expect(mqttSpy).toHaveBeenCalledWith('success', ['AMT_LinkPreference'], 'Link Preference set to ME')
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith({
      ReturnValue: 0,
      ReturnValueStr: 'SUCCESS'
    })
  })

  it('should set link preference to HOST (2) with timeout', async () => {
    req.body.linkPreference = 2
    req.body.timeout = 600

    setEthernetLinkPreferenceSpy.mockResolvedValue(0)
    await setLinkPreference(req as any, resSpy)

    expect(setEthernetLinkPreferenceSpy).toHaveBeenCalledWith(2, 600)
    expect(mqttSpy).toHaveBeenCalledWith('success', ['AMT_LinkPreference'], 'Link Preference set to HOST')
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith({
      ReturnValue: 0,
      ReturnValueStr: 'SUCCESS'
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

  it('should return 400 when no WiFi port found', async () => {
    setEthernetLinkPreferenceSpy.mockResolvedValue(null)

    await setLinkPreference(req as any, resSpy)

    const guid = '123456'
    const errMsg = `Set Link Preference failed: No WiFi port found for guid : ${guid}.`

    expect(resSpy.status).toHaveBeenCalledWith(404)
    expect(resSpy.json).toHaveBeenCalledWith(ErrorResponse(404, `${errMsg} for guid : ${guid}.`))
    expect(mqttSpy).toHaveBeenCalledWith('fail', ['AMT_LinkPreference'], errMsg)
  })

  it('should return 400 when no WiFi port found during auto-detection', async () => {
    setEthernetLinkPreferenceSpy.mockResolvedValue(2)

    await setLinkPreference(req as any, resSpy)

    expect(resSpy.status).toHaveBeenCalledWith(400)
  })
})
