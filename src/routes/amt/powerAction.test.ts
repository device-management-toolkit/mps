/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type CIM } from '@device-management-toolkit/wsman-messages'
import { type SpyInstance, spyOn } from 'jest-mock'
import { CIRAHandler } from '../../amt/CIRAHandler.js'
import { DeviceAction } from '../../amt/DeviceAction.js'
import { HttpHandler } from '../../amt/HttpHandler.js'
import { messages } from '../../logging/index.js'
import { createSpyObj } from '../../test/helper/jest.js'
import { ErrorResponse } from '../../utils/amtHelper.js'
import { MqttProvider } from '../../utils/MqttProvider.js'
import { powerAction } from './powerAction.js'

describe('Power Capabilities', () => {
  let req: Express.Request
  let resSpy
  let mqttSpy: SpyInstance<any>
  let powerActionFromDevice: CIM.Models.PowerActionResponse
  let osPowerActionFromDevice
  let getBootOptionsSpy: SpyInstance<any>
  let setBootConfigurationSpy: SpyInstance<any>
  let osPowerStateChangeSpy: SpyInstance<any>
  let osPowerStateGetSpy: SpyInstance<any>
  let device: DeviceAction

  beforeEach(() => {
    const handler = new CIRAHandler(new HttpHandler(), 'admin', 'P@ssw0rd')
    device = new DeviceAction(handler, null)
    req = {
      params: {
        guid: '123456'
      },
      body: {
        action: 8
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
    powerActionFromDevice = { Body: { RequestPowerStateChange_OUTPUT: { ReturnValue: 0 } } } as any
    getBootOptionsSpy = spyOn(device, 'getBootOptions').mockResolvedValue({ AMT_BootSettingData: {} } as any)
    setBootConfigurationSpy = spyOn(device, 'setBootConfiguration').mockResolvedValue({} as any)

    osPowerStateGetSpy = spyOn(device, 'getOSPowerSavingState').mockResolvedValue({
      Body: {
        CreationClassName: 'IPS_PowerManagementService',
        ElementName: 'Intel(r) AMT Power Management Service',
        EnabledState: '5',
        Name: 'Intel(r) AMT Power Management Service',
        OSPowerSavingState: '3',
        RequestedState: '12',
        SystemCreationClassName: 'CIM_ComputerSystem',
        SystemName: 'Intel(r) AMT'
      }
    } as any)
    osPowerActionFromDevice = { Body: { RequestOSPowerSavingStateChange_OUTPUT: { ReturnValue: 0 } } }
    osPowerStateChangeSpy = spyOn(device, 'requestOSPowerSavingStateChange').mockResolvedValue(
      osPowerActionFromDevice as any
    )
  })
  it('Should send power action', async () => {
    const expectedResponse = {
      Body: {
        ReturnValue: 0,
        ReturnValueStr: 'SUCCESS'
      }
    }
    spyOn(device, 'sendPowerAction').mockResolvedValue(powerActionFromDevice)
    await powerAction(req as any, resSpy)
    expect(getBootOptionsSpy).toHaveBeenCalled()
    expect(setBootConfigurationSpy).toHaveBeenCalled()
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith(expectedResponse)
    expect(resSpy.end).toHaveBeenCalled()
    expect(mqttSpy).toHaveBeenCalled()
  })

  it('Should send power action with unknown error', async () => {
    const expectedResponse = {
      Body: {
        ReturnValue: -1,
        ReturnValueStr: 'UNKNOWN_ERROR'
      }
    }
    const powerActionErrorFromDevice: CIM.Models.PowerActionResponse = {
      Body: { RequestPowerStateChange_OUTPUT: { ReturnValue: -1 } }
    } as any
    spyOn(device, 'sendPowerAction').mockResolvedValue(powerActionErrorFromDevice)

    await powerAction(req as any, resSpy)
    expect(getBootOptionsSpy).toHaveBeenCalled()
    expect(setBootConfigurationSpy).toHaveBeenCalled()
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith(expectedResponse)
    expect(resSpy.end).toHaveBeenCalled()
    expect(mqttSpy).toHaveBeenCalled()
  })

  it('Should handle error', async () => {
    spyOn(device, 'sendPowerAction').mockResolvedValue(null)
    await powerAction(req as any, resSpy)
    expect(getBootOptionsSpy).toHaveBeenCalled()
    expect(setBootConfigurationSpy).toHaveBeenCalled()
    expect(resSpy.status).toHaveBeenCalledWith(500)
    expect(resSpy.json).toHaveBeenCalledWith(ErrorResponse(500, messages.POWER_ACTION_EXCEPTION))
    expect(resSpy.end).toHaveBeenCalled()
    expect(mqttSpy).toHaveBeenCalled()
  })

  it('Should send a Success OS Power Action (500 - From OS Power Saving Mode to OS Full Power Mode)', async () => {
    req = {
      params: {
        guid: '123456'
      },
      body: {
        action: 500
      },
      deviceAction: device
    }

    const expectedResponse = {
      Body: {
        ReturnValue: 0,
        ReturnValueStr: 'COMPLETED_WITH_NO_ERROR'
      }
    }

    spyOn(device, 'sendPowerAction').mockResolvedValue(osPowerActionFromDevice)
    spyOn(device, 'getOSPowerSavingState').mockResolvedValue({
      Body: { IPS_PowerManagementService: { OSPowerSavingState: '3' } }
    } as any)
    await powerAction(req as any, resSpy)
    expect(osPowerStateGetSpy).toHaveBeenCalled()
    expect(osPowerStateChangeSpy).toHaveBeenCalled()
    expect(getBootOptionsSpy).toHaveBeenCalled()
    expect(setBootConfigurationSpy).toHaveBeenCalled()
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith(expectedResponse)
    expect(resSpy.end).toHaveBeenCalled()
  })

  it('Should send OS Power Action (501 - From OS Full Power to OS Power Saving Mode)', async () => {
    req = {
      params: {
        guid: '123456'
      },
      body: {
        action: 501
      },
      deviceAction: device
    }

    const expectedResponse = {
      Body: {
        ReturnValue: 0,
        ReturnValueStr: 'COMPLETED_WITH_NO_ERROR'
      }
    }
    spyOn(device, 'sendPowerAction').mockResolvedValue(osPowerActionFromDevice)
    spyOn(device, 'getOSPowerSavingState').mockResolvedValue({
      Body: { IPS_PowerManagementService: { OSPowerSavingState: '2' } }
    } as any)
    await powerAction(req as any, resSpy)
    expect(getBootOptionsSpy).toHaveBeenCalled()
    expect(setBootConfigurationSpy).toHaveBeenCalled()
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith(expectedResponse)
    expect(resSpy.end).toHaveBeenCalled()
  })
})
