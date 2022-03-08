/*********************************************************************
 * Copyright (c) Intel Corporation 2021
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/
import { MqttProvider } from '../../utils/MqttProvider'
import { createSpyObj } from '../../test/helper/jest'
import { setAMTFeatures } from './setAMTFeatures'
import { AMT_REDIRECTION_SERVICE_ENABLE_STATE } from '@open-amt-cloud-toolkit/wsman-messages/models/common'
import { DeviceAction } from '../../amt/DeviceAction'
import { CIRAHandler } from '../../amt/CIRAHandler'
import { HttpHandler } from '../../amt/HttpHandler'

describe('set amt features', () => {
  let resSpy
  let req
  let redirectionSpy: jest.SpyInstance
  let optInServiceSpy: jest.SpyInstance
  let kvmRedirectionSpy: jest.SpyInstance
  let setRedirectionServiceSpy: jest.SpyInstance
  let setKvmRedirectionSapSpy: jest.SpyInstance
  let putRedirectionServiceSpy: jest.SpyInstance
  let putIpsOptInServiceSpy: jest.SpyInstance
  let mqttSpy: jest.SpyInstance

  beforeEach(() => {
    const handler = new CIRAHandler(new HttpHandler(), 'admin', 'P@ssw0rd')
    const device = new DeviceAction(handler, null)
    resSpy = createSpyObj('Response', ['status', 'json', 'end', 'send'])
    req = {
      params: {
        guid: '4c4c4544-004b-4210-8033-b6c04f504633'
      },
      body: {
        userConsent: 'all',
        enableSOL: true,
        enableIDER: false,
        enableKVM: true
      },
      deviceAction: device
    }
    resSpy.status.mockReturnThis()
    resSpy.json.mockReturnThis()
    resSpy.send.mockReturnThis()

    redirectionSpy = jest.spyOn(device, 'getRedirectionService')
    optInServiceSpy = jest.spyOn(device, 'getIpsOptInService')
    kvmRedirectionSpy = jest.spyOn(device, 'getKvmRedirectionSap')
    setRedirectionServiceSpy = jest.spyOn(device, 'setRedirectionService')
    setKvmRedirectionSapSpy = jest.spyOn(device, 'setKvmRedirectionSap')
    putRedirectionServiceSpy = jest.spyOn(device, 'putRedirectionService')
    putIpsOptInServiceSpy = jest.spyOn(device, 'putIpsOptInService')

    mqttSpy = jest.spyOn(MqttProvider, 'publishEvent')

    redirectionSpy.mockResolvedValue({ AMT_RedirectionService: { EnabledState: AMT_REDIRECTION_SERVICE_ENABLE_STATE.Enabled, ListenerEnabled: 'true' } })
    optInServiceSpy.mockResolvedValue({ IPS_OptInService: { OptInRequired: 4294967295 } })
    kvmRedirectionSpy.mockResolvedValue({
      CIM_KVMRedirectionSAP: {
        RequestedState: 2,
        EnabledState: 2
      }
    })
    setRedirectionServiceSpy.mockResolvedValue({})
    setKvmRedirectionSapSpy.mockResolvedValue({})
    putIpsOptInServiceSpy.mockResolvedValue({})
    putRedirectionServiceSpy.mockResolvedValue({})
  })
  it('should set amt features - no change', async () => {
    await setAMTFeatures(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalled()
    expect(mqttSpy).toHaveBeenCalled()
    expect(putIpsOptInServiceSpy).not.toHaveBeenCalled()
    expect(setRedirectionServiceSpy).not.toHaveBeenCalled()
    expect(setKvmRedirectionSapSpy).not.toHaveBeenCalled()
    expect(putRedirectionServiceSpy).not.toHaveBeenCalled()
  })
  it('should set amt features - change user consent from all to kvm', async () => {
    req.body.userConsent = 'kvm'
    await setAMTFeatures(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalled()
    expect(mqttSpy).toHaveBeenCalled()
    expect(putRedirectionServiceSpy).not.toHaveBeenCalled()
    expect(setRedirectionServiceSpy).not.toHaveBeenCalled()
    expect(setKvmRedirectionSapSpy).not.toHaveBeenCalled()
    expect(putIpsOptInServiceSpy).toHaveBeenCalled()
  })
  it('should set amt features - disable KVM', async () => {
    req.body.enableKVM = false

    await setAMTFeatures(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalled()
    expect(mqttSpy).toHaveBeenCalled()
    expect(putRedirectionServiceSpy).toHaveBeenCalled()
    expect(setRedirectionServiceSpy).toHaveBeenCalledWith(32770)
    expect(setKvmRedirectionSapSpy).toHaveBeenCalledWith(AMT_REDIRECTION_SERVICE_ENABLE_STATE.Disabled)
    expect(putIpsOptInServiceSpy).not.toHaveBeenCalled()
  })
  it('should set amt features - disable SOL', async () => {
    req.body.enableSOL = false

    await setAMTFeatures(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalled()
    expect(mqttSpy).toHaveBeenCalled()
    expect(putRedirectionServiceSpy).toHaveBeenCalled()
    expect(setRedirectionServiceSpy).toHaveBeenCalledWith(32768)
    expect(setKvmRedirectionSapSpy).toHaveBeenCalledWith(AMT_REDIRECTION_SERVICE_ENABLE_STATE.Enabled)
    expect(putIpsOptInServiceSpy).not.toHaveBeenCalled()
  })
  it('should set amt features - enable IDER', async () => {
    req.body.enableIDER = true

    await setAMTFeatures(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalled()
    expect(mqttSpy).toHaveBeenCalled()
    expect(putRedirectionServiceSpy).toHaveBeenCalled()
    expect(setRedirectionServiceSpy).toHaveBeenCalledWith(32771)
    expect(setKvmRedirectionSapSpy).toHaveBeenCalledWith(AMT_REDIRECTION_SERVICE_ENABLE_STATE.Enabled)
    expect(putIpsOptInServiceSpy).not.toHaveBeenCalled()
  })
  it('should set amt features - disable IDER', async () => {
    redirectionSpy.mockResolvedValue({ AMT_RedirectionService: { EnabledState: AMT_REDIRECTION_SERVICE_ENABLE_STATE.Other, ListenerEnabled: 'false' } })

    await setAMTFeatures(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalled()
    expect(mqttSpy).toHaveBeenCalled()
    expect(putRedirectionServiceSpy).toHaveBeenCalled()
    expect(setRedirectionServiceSpy).toHaveBeenCalledWith(32770)
    expect(setKvmRedirectionSapSpy).toHaveBeenCalledWith(AMT_REDIRECTION_SERVICE_ENABLE_STATE.Enabled)
    expect(putIpsOptInServiceSpy).not.toHaveBeenCalled()
  })
  it('should set amt features - disable all', async () => {
    redirectionSpy.mockResolvedValue({ AMT_RedirectionService: { EnabledState: AMT_REDIRECTION_SERVICE_ENABLE_STATE.Disabled, ListenerEnabled: 'false' } })

    req.body.enableIDER = false
    req.body.enableSOL = false
    req.body.enableKVM = false

    await setAMTFeatures(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalled()
    expect(mqttSpy).toHaveBeenCalled()
    expect(putRedirectionServiceSpy).toHaveBeenCalled()
    expect(setRedirectionServiceSpy).toHaveBeenCalledWith(32768)
    expect(setKvmRedirectionSapSpy).toHaveBeenCalledWith(AMT_REDIRECTION_SERVICE_ENABLE_STATE.Disabled)
    expect(putIpsOptInServiceSpy).not.toHaveBeenCalled()
  })
  it('should set amt features - and fail', async () => {
    redirectionSpy.mockRejectedValue({})
    await setAMTFeatures(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(500)
    expect(resSpy.json).toHaveBeenCalled()
    expect(mqttSpy).toHaveBeenCalled()
  })
})
