/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { ErrorResponse } from '../../utils/amtHelper.js'
import { MqttProvider } from '../../utils/MqttProvider.js'
import { sendRemoteErase } from './sendRemoteErase.js'
import { createSpyObj } from '../../test/helper/jest.js'
import { DeviceAction } from '../../amt/DeviceAction.js'
import { CIRAHandler } from '../../amt/CIRAHandler.js'
import { HttpHandler } from '../../amt/HttpHandler.js'
import { messages } from '../../logging/index.js'
import { type Spied, spyOn } from 'jest-mock'

describe('Send Remote Erase', () => {
  let req: any
  let resSpy: any
  let mqttSpy: Spied<any>
  let bootCapsSpy: Spied<any>
  let sendEraseSpy: Spied<any>
  let device: DeviceAction

  beforeEach(() => {
    const handler = new CIRAHandler(new HttpHandler(), 'admin', 'P@ssw0rd')
    device = new DeviceAction(handler, null)
    req = {
      params: { guid: '4c4c4544-004b-4210-8033-b6c04f504633' },
      body: { eraseMask: 3 },
      deviceAction: device
    }
    resSpy = createSpyObj('Response', ['status', 'json', 'end', 'send'])
    resSpy.status.mockReturnThis()
    resSpy.json.mockReturnThis()
    resSpy.send.mockReturnThis()

    mqttSpy = spyOn(MqttProvider, 'publishEvent')
    bootCapsSpy = spyOn(device, 'getBootCapabilities')
    sendEraseSpy = spyOn(device, 'sendRemoteErase')
  })

  it('should send remote erase when device supports the requested mask', async () => {
    bootCapsSpy.mockResolvedValue({ Body: { AMT_BootCapabilities: { PlatformErase: 3 } } })
    sendEraseSpy.mockResolvedValue(undefined)

    await sendRemoteErase(req, resSpy)
    expect(sendEraseSpy).toHaveBeenCalledWith(3)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith({ status: 'success' })
  })

  it('should send remote erase with zero mask (no specific capability check)', async () => {
    req.body.eraseMask = 0
    bootCapsSpy.mockResolvedValue({ Body: { AMT_BootCapabilities: { PlatformErase: 3 } } })
    sendEraseSpy.mockResolvedValue(undefined)

    await sendRemoteErase(req, resSpy)
    expect(sendEraseSpy).toHaveBeenCalledWith(0)
    expect(resSpy.status).toHaveBeenCalledWith(200)
  })

  it('should return 400 when device does not support platform erase', async () => {
    bootCapsSpy.mockResolvedValue({ Body: { AMT_BootCapabilities: { PlatformErase: 0 } } })

    await sendRemoteErase(req, resSpy)
    expect(sendEraseSpy).not.toHaveBeenCalled()
    expect(resSpy.status).toHaveBeenCalledWith(400)
    expect(resSpy.json).toHaveBeenCalledWith(ErrorResponse(400, 'Device does not support Remote Platform Erase'))
  })

  it('should return 400 when requested mask is not supported by device', async () => {
    req.body.eraseMask = 4
    bootCapsSpy.mockResolvedValue({ Body: { AMT_BootCapabilities: { PlatformErase: 3 } } })

    await sendRemoteErase(req, resSpy)
    expect(sendEraseSpy).not.toHaveBeenCalled()
    expect(resSpy.status).toHaveBeenCalledWith(400)
    expect(resSpy.json).toHaveBeenCalledWith(ErrorResponse(400, 'Requested erase capabilities are not supported by this device'))
  })

  it('should return 400 when CSME is combined with hardware erase bits', async () => {
    req.body.eraseMask = 0x10001 // CSME + hardware bit
    bootCapsSpy.mockResolvedValue({ Body: { AMT_BootCapabilities: { PlatformErase: 0x10001 } } })

    await sendRemoteErase(req, resSpy)
    expect(sendEraseSpy).not.toHaveBeenCalled()
    expect(resSpy.status).toHaveBeenCalledWith(400)
    expect(resSpy.json).toHaveBeenCalledWith(ErrorResponse(400, 'CSME unconfigure cannot be combined with other erase operations'))
  })

  it('should return 500 on unexpected error', async () => {
    bootCapsSpy.mockRejectedValue(new Error('AMT error'))

    await sendRemoteErase(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(500)
    expect(resSpy.json).toHaveBeenCalledWith(ErrorResponse(500, messages.AMT_FEATURES_SET_EXCEPTION))
  })
})
