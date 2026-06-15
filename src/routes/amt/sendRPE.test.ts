/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { ErrorResponse } from '../../utils/amtHelper.js'
import { MqttProvider } from '../../utils/MqttProvider.js'
import { sendRPE } from './sendRPE.js'
import { createSpyObj } from '../../test/helper/vitest.js'
import { DeviceAction } from '../../amt/DeviceAction.js'
import { CIRAHandler } from '../../amt/CIRAHandler.js'
import { HttpHandler } from '../../amt/HttpHandler.js'
import { messages } from '../../logging/index.js'
import { vi, type MockInstance } from 'vitest'

describe('Send Remote Erase', () => {
  let req: any
  let resSpy: any
  let mqttSpy: MockInstance
  let bootCapsSpy: MockInstance
  let sendEraseSpy: MockInstance
  let device: DeviceAction

  beforeEach(() => {
    const handler = new CIRAHandler(new HttpHandler(), 'admin', 'P@ssw0rd')
    device = new DeviceAction(handler, null)
    req = {
      params: { guid: '4c4c4544-004b-4210-8033-b6c04f504633' },
      body: { secureEraseAllSSDs: true, tpmClear: false, restoreBIOSToEOM: false, unconfigureCSME: false },
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

    mqttSpy = vi.spyOn(MqttProvider, 'publishEvent')
    bootCapsSpy = vi.spyOn(device, 'getBootCapabilities')
    sendEraseSpy = vi.spyOn(device, 'sendRPE')
  })

  it('should send remote erase when device supports the requested mask', async () => {
    bootCapsSpy.mockResolvedValue({ Body: { AMT_BootCapabilities: { PlatformErase: 0x44 } } })
    sendEraseSpy.mockResolvedValue(undefined)

    await sendRPE(req, resSpy)
    expect(sendEraseSpy).toHaveBeenCalledWith(0x4)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith({ status: 'success' })
  })

  it('should send remote erase with zero mask (no specific capability check)', async () => {
    req.body = { secureEraseAllSSDs: false, tpmClear: false, restoreBIOSToEOM: false, unconfigureCSME: false }
    bootCapsSpy.mockResolvedValue({ Body: { AMT_BootCapabilities: { PlatformErase: 0x44 } } })
    sendEraseSpy.mockResolvedValue(undefined)

    await sendRPE(req, resSpy)
    expect(sendEraseSpy).toHaveBeenCalledWith(0)
    expect(resSpy.status).toHaveBeenCalledWith(200)
  })

  it('should return 400 when device does not support platform erase', async () => {
    bootCapsSpy.mockResolvedValue({ Body: { AMT_BootCapabilities: { PlatformErase: 0 } } })

    await sendRPE(req, resSpy)
    expect(sendEraseSpy).not.toHaveBeenCalled()
    expect(resSpy.status).toHaveBeenCalledWith(400)
    expect(resSpy.json).toHaveBeenCalledWith(ErrorResponse(400, 'Device does not support Remote Platform Erase'))
  })

  it('should return 400 when requested mask is not supported by device', async () => {
    req.body = { secureEraseAllSSDs: false, tpmClear: true, restoreBIOSToEOM: false, unconfigureCSME: false }
    bootCapsSpy.mockResolvedValue({ Body: { AMT_BootCapabilities: { PlatformErase: 0x4 } } })

    await sendRPE(req, resSpy)
    expect(sendEraseSpy).not.toHaveBeenCalled()
    expect(resSpy.status).toHaveBeenCalledWith(400)
    expect(resSpy.json).toHaveBeenCalledWith(
      ErrorResponse(400, 'Requested erase capabilities are not supported by this device')
    )
  })

  it('should return 400 when CSME is combined with hardware erase bits', async () => {
    req.body = { secureEraseAllSSDs: true, tpmClear: false, restoreBIOSToEOM: false, unconfigureCSME: true }
    bootCapsSpy.mockResolvedValue({ Body: { AMT_BootCapabilities: { PlatformErase: 0x4 } } })

    await sendRPE(req, resSpy)
    expect(sendEraseSpy).not.toHaveBeenCalled()
    expect(resSpy.status).toHaveBeenCalledWith(400)
    expect(resSpy.json).toHaveBeenCalledWith(
      ErrorResponse(400, 'CSME unconfigure cannot be combined with other erase operations')
    )
  })

  it('should return 500 on unexpected error', async () => {
    bootCapsSpy.mockRejectedValue(new Error('AMT error'))

    await sendRPE(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(500)
    expect(resSpy.json).toHaveBeenCalledWith(ErrorResponse(500, messages.AMT_FEATURES_SET_EXCEPTION))
  })
})
