/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { ErrorResponse } from '../../utils/amtHelper.js'
import { MqttProvider } from '../../utils/MqttProvider.js'
import { getBootCapabilities } from './getBootCapabilities.js'
import { createSpyObj } from '../../test/helper/jest.js'
import { DeviceAction } from '../../amt/DeviceAction.js'
import { CIRAHandler } from '../../amt/CIRAHandler.js'
import { HttpHandler } from '../../amt/HttpHandler.js'
import { messages } from '../../logging/index.js'
import { type Spied, spyOn } from 'jest-mock'

describe('Get Boot Capabilities', () => {
  let req: any
  let resSpy: any
  let mqttSpy: Spied<any>
  let bootCapsSpy: Spied<any>
  let device: DeviceAction

  beforeEach(() => {
    const handler = new CIRAHandler(new HttpHandler(), 'admin', 'P@ssw0rd')
    device = new DeviceAction(handler, null)
    req = {
      params: { guid: '4c4c4544-004b-4210-8033-b6c04f504633' },
      deviceAction: device
    }
    resSpy = createSpyObj('Response', ['status', 'json', 'end', 'send'])
    resSpy.status.mockReturnThis()
    resSpy.json.mockReturnThis()
    resSpy.send.mockReturnThis()

    mqttSpy = spyOn(MqttProvider, 'publishEvent')
    bootCapsSpy = spyOn(device, 'getBootCapabilities')
  })

  it('should return boot capabilities', async () => {
    const bootCaps = {
      IDER: true,
      SOL: true,
      BIOSSetup: true,
      PlatformErase: 3
    }
    bootCapsSpy.mockResolvedValue({
      Body: { AMT_BootCapabilities: bootCaps }
    })

    await getBootCapabilities(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith(bootCaps)
    expect(resSpy.end).toHaveBeenCalled()
    expect(mqttSpy).toHaveBeenCalledTimes(2)
  })

  it('should return 500 on error', async () => {
    bootCapsSpy.mockRejectedValue(new Error('AMT error'))

    await getBootCapabilities(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(500)
    expect(resSpy.json).toHaveBeenCalledWith(ErrorResponse(500, messages.POWER_CAPABILITIES_EXCEPTION))
    expect(resSpy.end).toHaveBeenCalled()
  })
})
