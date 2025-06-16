/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { CIRAHandler } from '../../amt/CIRAHandler.js'
import { DeviceAction } from '../../amt/DeviceAction.js'
import { HttpHandler } from '../../amt/HttpHandler.js'
import { messages } from '../../logging/index.js'
import { createSpyObj } from '../../test/helper/jest.js'
import { ErrorResponse } from '../../utils/amtHelper.js'
import { MqttProvider } from '../../utils/MqttProvider.js'
import { getAMTFeatures } from './getAMTFeatures.js'
import { spyOn } from 'jest-mock'

describe('get amt features', () => {
  let resSpy
  let req
  let redirectionSpy: jest.Spied<any>
  let optInServiceSpy: jest.Spied<any>
  let kvmRedirectionSpy: jest.Spied<any>
  let mqttSpy: jest.Spied<any>

  // let processAmtRedirectionResponse
  // let processKvmRedirectionResponse
  // let processOptServiceResponse

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

    redirectionSpy = spyOn(device, 'getRedirectionService')
    optInServiceSpy = spyOn(device, 'getIpsOptInService')
    kvmRedirectionSpy = spyOn(device, 'getKvmRedirectionSap')
    mqttSpy = spyOn(MqttProvider, 'publishEvent')

    // processAmtRedirectionResponse = spyOn(amtFeatures, 'processAmtRedirectionResponse')
    // processKvmRedirectionResponse = spyOn(amtFeatures, 'processKvmRedirectionResponse')
    // processOptServiceResponse = spyOn(amtFeatures, 'processOptServiceResponse')
  })

  it('should get feature', async () => {
    redirectionSpy.mockResolvedValue({
      AMT_RedirectionService: {
        CreationClassName: 'AMT_RedirectionService',
        ElementName: 'Intel(r) AMT Redirection Service',
        EnabledState: 32771,
        ListenerEnabled: false,
        Name: 'Intel(r) AMT Redirection Service',
        SystemCreationClassName: 'CIM_ComputerSystem',
        SystemName: 'Intel(r) AMT'
      }
    })

    optInServiceSpy.mockResolvedValue({
      IPS_OptInService: {
        CanModifyOptInPolicy: 0,
        CreationClassName: 'IPS_OptInService',
        ElementName: 'Intel(r) AMT OptIn Service',
        Name: 'Intel(r) AMT OptIn Service',
        OptInCodeTimeout: 120,
        OptInDisplayTimeout: 300,
        OptInRequired: 4294967295,
        OptInState: 0,
        SystemCreationClassName: 'CIM_ComputerSystem',
        SystemName: 'Intel(r) AMT'
      }
    })

    kvmRedirectionSpy.mockResolvedValue({
      CIM_KVMRedirectionSAP: {
        CreationClassName: 'CIM_KVMRedirectionSAP',
        ElementName: 'KVM Redirection Service Access Point',
        EnabledState: 3,
        KVMProtocol: 4,
        Name: 'KVM Redirection Service Access Point',
        RequestedState: 5,
        SystemCreationClassName: 'CIM_ComputerSystem'
      }
    })

    // processAmtRedirectionResponse.mockReturnValueOnce({ redir: false, sol: false, ider: false })
    // processKvmRedirectionResponse.mockReturnValueOnce(false)
    // processOptServiceResponse.mockReturnValueOnce({ value: 4294967295, optInState: 0 })
    await getAMTFeatures(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalled()
    expect(mqttSpy).toHaveBeenCalled()
  })

  it('should handle error when get feature', async () => {
    redirectionSpy.mockRejectedValueOnce({})
    await getAMTFeatures(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(500)
    expect(resSpy.json).toHaveBeenCalledWith(ErrorResponse(500, messages.AMT_FEATURES_EXCEPTION))
    expect(mqttSpy).toHaveBeenCalled()
  })
})
