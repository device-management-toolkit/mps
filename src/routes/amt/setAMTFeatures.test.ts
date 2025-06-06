/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { AMT_REDIRECTION_SERVICE_ENABLE_STATE } from '@device-management-toolkit/wsman-messages/models/common.js'
import { type SpyInstance, spyOn } from 'jest-mock'
import { CIRAHandler } from '../../amt/CIRAHandler.js'
import { DeviceAction } from '../../amt/DeviceAction.js'
import { HttpHandler } from '../../amt/HttpHandler.js'
import { createSpyObj } from '../../test/helper/jest.js'
import { MqttProvider } from '../../utils/MqttProvider.js'
import { setAMTFeatures } from './setAMTFeatures.js'

describe('set amt features', () => {
  let resSpy
  let req
  let redirectionSpy: SpyInstance<any>
  let optInServiceSpy: SpyInstance<any>
  let kvmRedirectionSpy: SpyInstance<any>
  let setRedirectionServiceSpy: SpyInstance<any>
  let setKvmRedirectionSapSpy: SpyInstance<any>
  let putRedirectionServiceSpy: SpyInstance<any>
  let putIpsOptInServiceSpy: SpyInstance<any>
  let mqttSpy: SpyInstance<any>
  let ocrSpy: SpyInstance<any>
  let setOcrBootServiceStateChange: SpyInstance<any>

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

    redirectionSpy = spyOn(device, 'getRedirectionService')
    optInServiceSpy = spyOn(device, 'getIpsOptInService')
    kvmRedirectionSpy = spyOn(device, 'getKvmRedirectionSap')
    setRedirectionServiceSpy = spyOn(device, 'setRedirectionService')
    setKvmRedirectionSapSpy = spyOn(device, 'setKvmRedirectionSap')
    putRedirectionServiceSpy = spyOn(device, 'putRedirectionService')
    putIpsOptInServiceSpy = spyOn(device, 'putIpsOptInService')
    ocrSpy = spyOn(device,'getOneClickRecoverySettings')
    setOcrBootServiceStateChange = spyOn(device, 'requestBootServiceStateChange')

    mqttSpy = spyOn(MqttProvider, 'publishEvent')

    redirectionSpy.mockResolvedValue({
      AMT_RedirectionService: { EnabledState: AMT_REDIRECTION_SERVICE_ENABLE_STATE.Enabled, ListenerEnabled: 'true' }
    })
    optInServiceSpy.mockResolvedValue({ IPS_OptInService: { OptInRequired: 4294967295 } })
    kvmRedirectionSpy.mockResolvedValue({
      CIM_KVMRedirectionSAP: {
        RequestedState: 2,
        EnabledState: 2
      }
    })
    ocrSpy.mockResolvedValue({
      OCR: true,
      HTTPSBootSupported: true,
      WinREBootSupported: true,
      LocalPBABootSupported: false
    })
    setRedirectionServiceSpy.mockResolvedValue({})
    setKvmRedirectionSapSpy.mockResolvedValue({})
    putIpsOptInServiceSpy.mockResolvedValue({})
    putRedirectionServiceSpy.mockResolvedValue({})
    setOcrBootServiceStateChange.mockResolvedValue({})
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
    redirectionSpy.mockResolvedValue({
      AMT_RedirectionService: { EnabledState: AMT_REDIRECTION_SERVICE_ENABLE_STATE.Other, ListenerEnabled: 'false' }
    })

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
    redirectionSpy.mockResolvedValue({
      AMT_RedirectionService: { EnabledState: AMT_REDIRECTION_SERVICE_ENABLE_STATE.Disabled, ListenerEnabled: 'false' }
    })

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
