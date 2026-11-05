/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { vi, type MockInstance } from 'vitest'
import { type CIM } from '@device-management-toolkit/wsman-messages'
import { CIRAHandler } from '../../amt/CIRAHandler.js'
import { DeviceAction } from '../../amt/DeviceAction.js'
import { HttpHandler } from '../../amt/HttpHandler.js'
import { messages } from '../../logging/index.js'
import { createSpyObj } from '../../test/helper/vitest.js'
import { ErrorResponse } from '../../utils/amtHelper.js'
import { MqttProvider } from '../../utils/MqttProvider.js'
import { powerAction } from './powerAction.js'

describe('Power Capabilities', () => {
  let req: Express.Request
  let resSpy
  let mqttSpy: MockInstance
  let powerActionFromDevice: CIM.Models.PowerActionResponse
  let osPowerActionFromDevice
  let getBootOptionsSpy: MockInstance
  let setBootConfigurationSpy: MockInstance
  let osPowerStateChangeSpy: MockInstance
  let osPowerStateGetSpy: MockInstance
  let powerStateSpy: MockInstance
  let updatePowerStateSpy: MockInstance
  let device: DeviceAction

  beforeEach(() => {
    const handler = new CIRAHandler(new HttpHandler(), 'admin', 'P@ssw0rd')
    device = new DeviceAction(handler, null)
    updatePowerStateSpy = vi.fn().mockResolvedValue(true)
    req = {
      params: {
        guid: '123456'
      },
      body: {
        action: 8
      },
      deviceAction: device,
      db: { devices: { updatePowerState: updatePowerStateSpy } },
      tenantId: ''
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
    powerActionFromDevice = { Body: { RequestPowerStateChange_OUTPUT: { ReturnValue: 0 } } } as any
    getBootOptionsSpy = vi.spyOn(device, 'getBootOptions').mockResolvedValue({ AMT_BootSettingData: {} } as any)
    setBootConfigurationSpy = vi.spyOn(device, 'setBootConfiguration').mockResolvedValue({} as any)

    osPowerStateGetSpy = vi.spyOn(device, 'getOSPowerSavingState').mockResolvedValue({
      Body: {
        IPS_PowerManagementService: {
          CreationClassName: 'IPS_PowerManagementService',
          ElementName: 'Intel(r) AMT Power Management Service',
          EnabledState: '5',
          Name: 'Intel(r) AMT Power Management Service',
          OSPowerSavingState: '3',
          RequestedState: '12',
          SystemCreationClassName: 'CIM_ComputerSystem',
          SystemName: 'Intel(r) AMT'
        }
      }
    } as any)
    powerStateSpy = vi.spyOn(device, 'getPowerState').mockResolvedValue({
      PullResponse: { Items: { CIM_AssociatedPowerManagementService: { PowerState: '8' } } }
    } as any)
    osPowerActionFromDevice = { Body: { RequestOSPowerSavingStateChange_OUTPUT: { ReturnValue: 0 } } }
    osPowerStateChangeSpy = vi
      .spyOn(device, 'requestOSPowerSavingStateChange')
      .mockResolvedValue(osPowerActionFromDevice as any)
  })
  it('Should send power action', async () => {
    const expectedResponse = {
      Body: {
        ReturnValue: 0,
        ReturnValueStr: 'SUCCESS'
      }
    }
    vi.spyOn(device, 'sendPowerAction').mockResolvedValue(powerActionFromDevice)
    await powerAction(req as any, resSpy)
    expect(getBootOptionsSpy).toHaveBeenCalled()
    expect(setBootConfigurationSpy).toHaveBeenCalled()
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith(expectedResponse)
    expect(resSpy.end).toHaveBeenCalled()
    expect(mqttSpy).toHaveBeenCalled()
    expect(powerStateSpy).toHaveBeenCalled()
    expect(updatePowerStateSpy).toHaveBeenCalledWith('123456', 8, 3, expect.any(Date), '')
  })

  it('Should still respond when the cache refresh after the action fails', async () => {
    vi.spyOn(device, 'sendPowerAction').mockResolvedValue(powerActionFromDevice)
    powerStateSpy.mockRejectedValueOnce(new Error('read failed'))
    await powerAction(req as any, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(updatePowerStateSpy).not.toHaveBeenCalled()
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
    vi.spyOn(device, 'sendPowerAction').mockResolvedValue(powerActionErrorFromDevice)

    await powerAction(req as any, resSpy)
    expect(getBootOptionsSpy).toHaveBeenCalled()
    expect(setBootConfigurationSpy).toHaveBeenCalled()
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith(expectedResponse)
    expect(resSpy.end).toHaveBeenCalled()
    expect(mqttSpy).toHaveBeenCalled()
    expect(updatePowerStateSpy).not.toHaveBeenCalled()
  })

  it('Should handle error', async () => {
    vi.spyOn(device, 'sendPowerAction').mockResolvedValue(null)
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
      deviceAction: device,
      db: { devices: { updatePowerState: updatePowerStateSpy } },
      tenantId: ''
    }

    const expectedResponse = {
      Body: {
        ReturnValue: 0,
        ReturnValueStr: 'COMPLETED_WITH_NO_ERROR'
      }
    }

    vi.spyOn(device, 'sendPowerAction').mockResolvedValue(osPowerActionFromDevice)
    vi.spyOn(device, 'getOSPowerSavingState').mockResolvedValue({
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
    expect(updatePowerStateSpy).toHaveBeenCalledWith('123456', 8, 3, expect.any(Date), '')
  })

  it('Should send OS Power Action (501 - From OS Full Power to OS Power Saving Mode)', async () => {
    req = {
      params: {
        guid: '123456'
      },
      body: {
        action: 501
      },
      deviceAction: device,
      db: { devices: { updatePowerState: updatePowerStateSpy } },
      tenantId: ''
    }

    const expectedResponse = {
      Body: {
        ReturnValue: 0,
        ReturnValueStr: 'COMPLETED_WITH_NO_ERROR'
      }
    }
    vi.spyOn(device, 'sendPowerAction').mockResolvedValue(osPowerActionFromDevice)
    vi.spyOn(device, 'getOSPowerSavingState').mockResolvedValue({
      Body: { IPS_PowerManagementService: { OSPowerSavingState: '2' } }
    } as any)
    await powerAction(req as any, resSpy)
    expect(getBootOptionsSpy).toHaveBeenCalled()
    expect(setBootConfigurationSpy).toHaveBeenCalled()
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith(expectedResponse)
    expect(resSpy.end).toHaveBeenCalled()
    expect(updatePowerStateSpy).toHaveBeenCalledWith('123456', 8, 2, expect.any(Date), '')
  })
})
