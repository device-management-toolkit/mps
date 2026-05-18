/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { vi, type MockInstance } from 'vitest'
import { MqttProvider } from '../../utils/MqttProvider.js'
import { createSpyObj } from '../../test/helper/vitest.js'
import { setAMTFeatures } from './setAMTFeatures.js'
import { AMT_REDIRECTION_SERVICE_ENABLE_STATE } from '@device-management-toolkit/wsman-messages/models/common.js'
import { DeviceAction } from '../../amt/DeviceAction.js'
import { CIRAHandler } from '../../amt/CIRAHandler.js'
import { HttpHandler } from '../../amt/HttpHandler.js'
describe('set amt features', () => {
  let resSpy
  let req
  let redirectionSpy: MockInstance
  let optInServiceSpy: MockInstance
  let kvmRedirectionSpy: MockInstance
  let setRedirectionServiceSpy: MockInstance
  let setKvmRedirectionSapSpy: MockInstance
  let putRedirectionServiceSpy: MockInstance
  let putIpsOptInServiceSpy: MockInstance
  let bootServiceStateChangeSpy: MockInstance
  let mqttSpy: MockInstance

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
        enableKVM: true,
        ocr: false
      },
      deviceAction: device
    }
    resSpy.status.mockReturnThis()
    resSpy.json.mockReturnThis()
    resSpy.send.mockReturnThis()

    redirectionSpy = vi.spyOn(device, 'getRedirectionService')
    optInServiceSpy = vi.spyOn(device, 'getIpsOptInService')
    kvmRedirectionSpy = vi.spyOn(device, 'getKvmRedirectionSap')
    setRedirectionServiceSpy = vi.spyOn(device, 'setRedirectionService')
    setKvmRedirectionSapSpy = vi.spyOn(device, 'setKvmRedirectionSap')
    putRedirectionServiceSpy = vi.spyOn(device, 'putRedirectionService')
    putIpsOptInServiceSpy = vi.spyOn(device, 'putIpsOptInService')
    bootServiceStateChangeSpy = vi.spyOn(device, 'BootServiceStateChange')

    mqttSpy = vi.spyOn(MqttProvider, 'publishEvent')

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
    setRedirectionServiceSpy.mockResolvedValue({})
    setKvmRedirectionSapSpy.mockResolvedValue({})
    putIpsOptInServiceSpy.mockResolvedValue({})
    putRedirectionServiceSpy.mockResolvedValue({})
    bootServiceStateChangeSpy.mockResolvedValue({})
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
    expect(bootServiceStateChangeSpy).toHaveBeenCalledWith(32768)
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
    expect(bootServiceStateChangeSpy).toHaveBeenCalledWith(32768)
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
    expect(bootServiceStateChangeSpy).toHaveBeenCalledWith(32768)
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
    expect(bootServiceStateChangeSpy).toHaveBeenCalledWith(32768)
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
    expect(bootServiceStateChangeSpy).toHaveBeenCalledWith(32768)
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
    expect(bootServiceStateChangeSpy).toHaveBeenCalledWith(32768)
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
    expect(bootServiceStateChangeSpy).toHaveBeenCalledWith(32768)
  })

  it('should set amt features - enable HTTPS boot support', async () => {
    req.body.ocr = true

    await setAMTFeatures(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalled()
    expect(mqttSpy).toHaveBeenCalled()
    expect(bootServiceStateChangeSpy).toHaveBeenCalledWith(32769)
  })

  it('should set amt features - disable HTTPS boot support', async () => {
    req.body.ocr = false

    await setAMTFeatures(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalled()
    expect(mqttSpy).toHaveBeenCalled()
    expect(bootServiceStateChangeSpy).toHaveBeenCalledWith(32768)
  })

  it('should set amt features - and fail', async () => {
    redirectionSpy.mockRejectedValue({})
    await setAMTFeatures(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(500)
    expect(resSpy.json).toHaveBeenCalled()
    expect(mqttSpy).toHaveBeenCalled()
  })
})
