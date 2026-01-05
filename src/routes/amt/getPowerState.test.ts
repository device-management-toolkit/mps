/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { spyOn } from 'jest-mock'
import { CIRAHandler } from '../../amt/CIRAHandler.js'
import { DeviceAction } from '../../amt/DeviceAction.js'
import { HttpHandler } from '../../amt/HttpHandler.js'
import { messages } from '../../logging/index.js'
import { createSpyObj } from '../../test/helper/jest.js'
import { serviceAvailableToElement } from '../../test/helper/wsmanResponses.js'
import { TIMEOUT_MESSAGE, TimeoutError } from '../../utils/timeoutOpManagement.js'
import { powerState } from './getPowerState.js'

describe('power state', () => {
  let resSpy
  let req
  let powerStateSpy
  let osPowerStateGetSpy
  beforeEach(() => {
    const handler = new CIRAHandler(new HttpHandler(), 'admin', 'P@ssw0rd')
    const device = new DeviceAction(handler, null)
    resSpy = createSpyObj('Response', [
      'status',
      'json',
      'end',
      'send'
    ])
    req = {
      params: { guid: '4c4c4544-004b-4210-8033-b6c04f504633' },
      deviceAction: device
    }
    resSpy.status.mockReturnThis()
    resSpy.json.mockReturnThis()
    resSpy.send.mockReturnThis()

    osPowerStateGetSpy = spyOn(device, 'getOSPowerSavingState').mockResolvedValue({
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

    powerStateSpy = spyOn(device, 'getPowerState')
  })

  it('should get power state', async () => {
    powerStateSpy.mockResolvedValueOnce(serviceAvailableToElement.Envelope.Body)
    await powerState(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.send).toHaveBeenCalledWith({ powerstate: '4', OSPowerSavingState: '3' })
  })
  it('should get power state with OSPowerSavingState as 0 when getOSPowerSavingState throws an error', async () => {
    osPowerStateGetSpy.mockRejectedValueOnce(new Error('OS power saving state error'))
    powerStateSpy.mockResolvedValueOnce(serviceAvailableToElement.Envelope.Body)
    await powerState(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.send).toHaveBeenCalledWith({ powerstate: '4', OSPowerSavingState: 0 })
  })
  it('should get power state with OSPowerSavingState as 0 when getOSPowerSavingState returns null', async () => {
    osPowerStateGetSpy.mockResolvedValueOnce(null)
    powerStateSpy.mockResolvedValueOnce(serviceAvailableToElement.Envelope.Body)
    await powerState(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.send).toHaveBeenCalledWith({ powerstate: '4', OSPowerSavingState: 0 })
  })
  it('should get power state with OSPowerSavingState as 0 when OSPowerSavingState is missing in response', async () => {
    osPowerStateGetSpy.mockResolvedValueOnce({
      Body: {
        IPS_PowerManagementService: {
          CreationClassName: 'IPS_PowerManagementService',
          ElementName: 'Intel(r) AMT Power Management Service'
          // OSPowerSavingState is missing
        }
      }
    })
    powerStateSpy.mockResolvedValueOnce(serviceAvailableToElement.Envelope.Body)
    await powerState(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.send).toHaveBeenCalledWith({ powerstate: '4', OSPowerSavingState: 0 })
  })
  it('should get power state with OSPowerSavingState as 0 when getOSPowerSavingState times out', async () => {
    osPowerStateGetSpy.mockRejectedValueOnce(new TimeoutError(TIMEOUT_MESSAGE))
    powerStateSpy.mockResolvedValueOnce(serviceAvailableToElement.Envelope.Body)
    await powerState(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.send).toHaveBeenCalledWith({ powerstate: '4', OSPowerSavingState: 0 })
  })
  it('should get an error with status code 400, when get power state is null', async () => {
    powerStateSpy.mockResolvedValueOnce(null)
    await powerState(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(400)
    expect(resSpy.json).toHaveBeenCalledWith({
      error: 'Incorrect URI or Bad Request',
      errorDescription: `${messages.POWER_STATE_REQUEST_FAILED} for guid : 4c4c4544-004b-4210-8033-b6c04f504633.`
    })
  })
  it('should get an error with status code 500 for an unexpected exception', async () => {
    powerStateSpy.mockImplementation(() => {
      throw new Error()
    })
    await powerState(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(500)
    expect(resSpy.json).toHaveBeenCalledWith({
      error: 'Internal Server Error',
      errorDescription: messages.POWER_STATE_EXCEPTION
    })
  })
  it('should get an error with status code 404, when get power state is timeout', async () => {
    powerStateSpy.mockImplementation(() => {
      throw new TimeoutError(TIMEOUT_MESSAGE)
    })
    await powerState(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(404)
    expect(resSpy.json).toHaveBeenCalledWith({
      error: {
        action: 'Power action type does not exist',
        alarm: 'Alarm instance not found',
        device: 'Device not found/connected. Please connect again using CIRA.',
        guid: 'GUID does not exist in the payload',
        invalidGuid: 'GUID empty/invalid',
        method: 'Request does not contain method',
        noMethod: 'Requested method does not exists',
        payload: 'Request does not contain payload'
      },
      errorDescription: messages.POWER_STATE_EXCEPTION
    })
  })
})
