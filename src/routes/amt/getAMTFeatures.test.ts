/*********************************************************************
 * Copyright (c) Intel Corporation 2021
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/
import { ConnectedDevice } from '../../amt/ConnectedDevice'
import { devices } from '../../server/mpsserver'
import { createSpyObj } from '../../test/helper/jest'
import { ErrorResponse } from '../../utils/amtHelper'
import { MqttProvider } from '../../utils/MqttProvider'
import * as amtFeatures from './getAMTFeatures'

describe('get amt features', () => {
  let resSpy
  let req
  let redirectionSpy: jest.SpyInstance
  let optInServiceSpy: jest.SpyInstance
  let kvmRedirectionSpy: jest.SpyInstance
  let mqttSpy: jest.SpyInstance

  let processAmtRedirectionResponse
  let processKvmRedirectionResponse
  let processOptServiceResponse

  beforeEach(() => {
    resSpy = createSpyObj('Response', ['status', 'json', 'end', 'send'])
    req = { params: { guid: '4c4c4544-004b-4210-8033-b6c04f504633' } }
    resSpy.status.mockReturnThis()
    resSpy.json.mockReturnThis()
    resSpy.send.mockReturnThis()

    devices['4c4c4544-004b-4210-8033-b6c04f504633'] = new ConnectedDevice(null, 'admin', 'P@ssw0rd')
    redirectionSpy = jest.spyOn(devices['4c4c4544-004b-4210-8033-b6c04f504633'], 'getRedirectionService')
    optInServiceSpy = jest.spyOn(devices['4c4c4544-004b-4210-8033-b6c04f504633'], 'getIpsOptInService')
    kvmRedirectionSpy = jest.spyOn(devices['4c4c4544-004b-4210-8033-b6c04f504633'], 'getKvmRedirectionSap')
    mqttSpy = jest.spyOn(MqttProvider, 'publishEvent')

    processAmtRedirectionResponse = jest.spyOn(amtFeatures, 'processAmtRedirectionResponse')
    processKvmRedirectionResponse = jest.spyOn(amtFeatures, 'processKvmRedirectionResponse')
    processOptServiceResponse = jest.spyOn(amtFeatures, 'processOptServiceResponse')
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

    processAmtRedirectionResponse.mockReturnValueOnce({ redir: false, sol: false, ider: false })
    processKvmRedirectionResponse.mockReturnValueOnce(false)
    processOptServiceResponse.mockReturnValueOnce({ value: 4294967295, optInState: 0 })
    await amtFeatures.getAMTFeatures(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalled()
    expect(mqttSpy).toHaveBeenCalled()
  })

  it('should handle error when get feature', async () => {
    redirectionSpy.mockRejectedValueOnce({})
    await amtFeatures.getAMTFeatures(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(500)
    expect(resSpy.json).toHaveBeenCalledWith(ErrorResponse(500, 'Request failed during get AMT Features.'))
    expect(mqttSpy).toHaveBeenCalled()
  })
})
