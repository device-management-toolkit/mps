/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/
import { spyOn } from 'jest-mock'
import { CIRAHandler } from '../../amt/CIRAHandler.js'
import { DeviceAction } from '../../amt/DeviceAction.js'
import { HttpHandler } from '../../amt/HttpHandler.js'
import { messages } from '../../logging/index.js'
import { createSpyObj } from '../../test/helper/jest.js'
import {
    osPowerSavingStateChangeGetResponse
} from '../../test/helper/wsmanResponses.js'
import {
    osPowerSavingState
} from './getOSPowerSavingState.js'

describe('os power saving state', () => {
  let resSpy
  let req
  let osPowerSavingStateSpy
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

    osPowerSavingStateSpy = spyOn(device, 'getOSPowerSavingState')
  })

  it('should get os power saving state', async () => {
    osPowerSavingStateSpy.mockResolvedValueOnce(osPowerSavingStateChangeGetResponse.Envelope.Body)
    await osPowerSavingState(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.send).toHaveBeenCalledWith({ OSPowerSavingState: '3' })
  })
  it('should get an error os with  savingstatus code 400, when get os power saving state is null', async () => {
    osPowerSavingStateSpy.mockResolvedValueOnce(null)
    await osPowerSavingState(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(400)
    expect(resSpy.json).toHaveBeenCalledWith({
      error: 'Incorrect URI or Bad Request',
      errorDescription: `${messages.OS_POWER_SAVING_STATE_GET_FAILED} for guid : 4c4c4544-004b-4210-8033-b6c04f504633.`
    })
  })
  it('should get an error with status code 500 for an unexpected exception', async () => {
    osPowerSavingStateSpy.mockImplementation(() => {
      throw new Error()
    })
    await osPowerSavingState(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(500)
    expect(resSpy.json).toHaveBeenCalledWith({
      error: 'Internal Server Error',
      errorDescription: messages.OS_POWER_SAVING_STATE_EXCEPTION
    })
  })

})