/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { ErrorResponse } from '../../utils/amtHelper.js'
import { MqttProvider } from '../../utils/MqttProvider.js'
import { setRPEEnabled } from './setRPEEnabled.js'
import { createSpyObj } from '../../test/helper/jest.js'
import { DeviceAction } from '../../amt/DeviceAction.js'
import { CIRAHandler } from '../../amt/CIRAHandler.js'
import { HttpHandler } from '../../amt/HttpHandler.js'
import { messages } from '../../logging/index.js'
import { type Spied, spyOn } from 'jest-mock'

describe('Set RPE Enabled', () => {
  let req: any
  let resSpy: any
  let mqttSpy: Spied<any>
  let bootCapsSpy: Spied<any>
  let setRPESpy: Spied<any>
  let device: DeviceAction

  beforeEach(() => {
    const handler = new CIRAHandler(new HttpHandler(), 'admin', 'P@ssw0rd')
    device = new DeviceAction(handler, null)
    req = {
      params: { guid: '4c4c4544-004b-4210-8033-b6c04f504633' },
      body: { enabled: true },
      deviceAction: device
    }
    resSpy = createSpyObj('Response', ['status', 'json', 'end', 'send'])
    resSpy.status.mockReturnThis()
    resSpy.json.mockReturnThis()
    resSpy.send.mockReturnThis()

    mqttSpy = spyOn(MqttProvider, 'publishEvent')
    bootCapsSpy = spyOn(device, 'getBootCapabilities')
    setRPESpy = spyOn(device, 'setRPEEnabled')
  })

  it('should enable RPE when device supports platform erase', async () => {
    bootCapsSpy.mockResolvedValue({ Body: { AMT_BootCapabilities: { PlatformErase: 3 } } })
    setRPESpy.mockResolvedValue(undefined)

    await setRPEEnabled(req, resSpy)
    expect(setRPESpy).toHaveBeenCalledWith(true)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith({ status: 'success' })
  })

  it('should return 400 when device does not support platform erase', async () => {
    bootCapsSpy.mockResolvedValue({ Body: { AMT_BootCapabilities: { PlatformErase: 0 } } })

    await setRPEEnabled(req, resSpy)
    expect(setRPESpy).not.toHaveBeenCalled()
    expect(resSpy.status).toHaveBeenCalledWith(400)
    expect(resSpy.json).toHaveBeenCalledWith(ErrorResponse(400, 'Device does not support Remote Platform Erase'))
  })

  it('should return 500 on unexpected error', async () => {
    bootCapsSpy.mockRejectedValue(new Error('AMT error'))

    await setRPEEnabled(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(500)
    expect(resSpy.json).toHaveBeenCalledWith(ErrorResponse(500, messages.AMT_FEATURES_SET_EXCEPTION))
  })
})
