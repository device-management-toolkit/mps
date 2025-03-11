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
import {
  osPowerSavingStateChangeBadResponse,
  osPowerSavingStateChangeResponse
} from '../../test/helper/wsmanResponses.js'
import { osPowerSavingStateChange } from './osPowerSavingStateChange.js'

describe('os power saving state change', () => {
  let resSpy
  let req
  let badreq
  let osPowerSavingStateChangeSpy
  let osPowerSavingStateChangeRequestFromDevice
  let osPowerSavingStateChangeBadRequestFromDevice
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
      body: {
        RequestOSPowerSavingStateChange_INPUT: {
          OSPowerSavingState: '3',
          ManagedElement: {
            Address: 'http://schemas.xmlsoap.org/ws/2004/08/addressing',
          },
          ReferenceParameters: {
            ResourceURI: 'http://schemas.dmtf.org/wbem/wscim/1/cim-schema/2/CIM_ComputerSystem',
            SelectorSet: {
              Selector: [
                {
                  Name: 'CreationClassName',
                  Value: 'CIM_ComputerSystem'
                },
                {
                  Name: 'Name',
                  Value: 'ManagedSystem'
                }
              ]
            }
          }
        }
      },
      deviceAction: device
    }
    badreq = {
      params: { guid: '4c4c4544-004b-4210-8033-b6c04f504633' },
      body: {
        RequestOSPowerSavingStateChange_INPUT: {
          OSPowerSavingState: '',
          ManagedElement: {
            Address: 'http://schemas.xmlsoap.org/ws/2004/08/addressing',
          },
          ReferenceParameters: {
            ResourceURI: 'http://schemas.dmtf.org/wbem/wscim/1/cim-schema/2/CIM_ComputerSystem',
            SelectorSet: {
              Selector: [
                {
                  Name: 'CreationClassName',
                  Value: 'CIM_ComputerSystem'
                },
                {
                  Name: 'Name',
                  Value: 'ManagedSystem'
                }
              ]
            }
          }
        }
      },
      deviceAction: device
    }
    resSpy.status.mockReturnThis()
    resSpy.json.mockReturnThis()
    resSpy.send.mockReturnThis()

    osPowerSavingStateChangeRequestFromDevice = { Body: { RequestOSPowerSavingStateChange_OUTPUT: { ReturnValue: 0 } } } as any
    osPowerSavingStateChangeBadRequestFromDevice = { Body: { RequestOSPowerSavingStateChange_OUTPUT: { ReturnValue: 5 } } } as any
    osPowerSavingStateChangeSpy = spyOn(device, 'requestOSPowerSavingStateChange')
  })

  it('should request os power saving state change', async () => {
    osPowerSavingStateChangeSpy.mockResolvedValueOnce(osPowerSavingStateChangeResponse.Envelope)
    await osPowerSavingStateChange(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.send).toHaveBeenCalledWith(osPowerSavingStateChangeRequestFromDevice)
  })
  it('should get an error return code (Invalid Parameters) for os power saving code with status code 200, when  os power saving state is not defined (without a value)', async () => {
    osPowerSavingStateChangeSpy.mockResolvedValueOnce(osPowerSavingStateChangeBadResponse.Envelope)
    await osPowerSavingStateChange(badreq, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.send).toHaveBeenCalledWith(osPowerSavingStateChangeBadRequestFromDevice)
  })
  it('should get an error os power saving status code 400, when  os power saving stat input is null', async () => {
    osPowerSavingStateChangeSpy.mockResolvedValueOnce(null)
    await osPowerSavingStateChange(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(400)
    expect(resSpy.json).toHaveBeenCalledWith({
      error: 'Incorrect URI or Bad Request',
      errorDescription: `${messages.OS_POWER_SAVING_STATE_CHANGE_FAILED} for guid : 4c4c4544-004b-4210-8033-b6c04f504633.`
    })
  })
  it('should get an error with status code 500 for an unexpected exception', async () => {
    osPowerSavingStateChangeSpy.mockImplementation(() => {
      throw new Error()
    })
    await osPowerSavingStateChange(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(500)
    expect(resSpy.json).toHaveBeenCalledWith({
      error: 'Internal Server Error',
      errorDescription: messages.OS_POWER_SAVING_STATE_EXCEPTION
    })
  })

})
