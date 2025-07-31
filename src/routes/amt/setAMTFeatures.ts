/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type Response, type Request } from 'express'
import { logger, messages } from '../../logging/index.js'
import { ErrorResponse } from '../../utils/amtHelper.js'
import { MqttProvider } from '../../utils/MqttProvider.js'
import { UserConsentOptions } from '../../utils/constants.js'
import { type AMT, type IPS, Common } from '@device-management-toolkit/wsman-messages'
import { type DeviceAction } from '../../amt/DeviceAction.js'

export async function setAMTFeatures(req: Request, res: Response): Promise<void> {
  try {
    const payload = req.body
    const guid: string = req.params.guid
    payload.guid = guid

    MqttProvider.publishEvent('request', ['AMT_SetFeatures'], messages.AMT_FEATURES_SET_REQUESTED, guid)

    const amtRedirectionResponse = await req.deviceAction.getRedirectionService()
    const optServiceResponse = await req.deviceAction.getIpsOptInService()
    const kvmRedirectionResponse = await req.deviceAction.getKvmRedirectionSap()

    let isRedirectionChanged = false
    let redir = amtRedirectionResponse.AMT_RedirectionService.ListenerEnabled
    let sol =
      (amtRedirectionResponse.AMT_RedirectionService.EnabledState &
        Common.Models.AMT_REDIRECTION_SERVICE_ENABLE_STATE.Enabled) !==
      0
    let ider =
      (amtRedirectionResponse.AMT_RedirectionService.EnabledState &
        Common.Models.AMT_REDIRECTION_SERVICE_ENABLE_STATE.Other) !==
      0
    let kvm =
      kvmRedirectionResponse.CIM_KVMRedirectionSAP != null &&
      (kvmRedirectionResponse.CIM_KVMRedirectionSAP.EnabledState ===
        Common.Models.CIM_KVM_REDIRECTION_SAP_ENABLED_STATE.Enabled ||
        kvmRedirectionResponse.CIM_KVMRedirectionSAP.EnabledState ===
          Common.Models.CIM_KVM_REDIRECTION_SAP_ENABLED_STATE.EnabledButOffline)

    if (payload.enableSOL !== sol) {
      sol = payload.enableSOL
      isRedirectionChanged = true
    }

    if (payload.enableIDER !== ider) {
      ider = payload.enableIDER
      isRedirectionChanged = true
    }

    if ((sol || ider) && !redir) {
      isRedirectionChanged = true
    }

    if (payload.enableKVM !== kvm) {
      kvm = payload.enableKVM
      isRedirectionChanged = true
    }

    if (isRedirectionChanged && (sol || ider || kvm)) {
      redir = true
    } else if (isRedirectionChanged && !sol && !ider && !kvm) {
      redir = false
    }

    if (isRedirectionChanged) {
      amtRedirectionResponse.AMT_RedirectionService.EnabledState = (32768 +
        ((ider ? 1 : 0) + (sol ? 2 : 0))) as AMT.Types.RedirectionService.EnabledState
      amtRedirectionResponse.AMT_RedirectionService.ListenerEnabled = redir
      await setRedirectionService(req.deviceAction, amtRedirectionResponse, kvm, payload.guid as string)
    }

    const optResponse = optServiceResponse.IPS_OptInService
    const key = payload.userConsent.toLowerCase()
    const optInRequiredValue = UserConsentOptions[key]
    if (optResponse.OptInRequired !== optInRequiredValue) {
      optResponse.OptInRequired = optInRequiredValue
      await setUserConsent(req.deviceAction, optServiceResponse, payload.guid as string)
    }

    // Configure OCR settings
    let requestedState = 0
    if (payload.httpsBootSupported) {
      requestedState = 32769
    } else {
      requestedState = 32768
    }

    await req.deviceAction.BootServiceStateChange(requestedState)

    MqttProvider.publishEvent('success', ['AMT_SetFeatures'], messages.AMT_FEATURES_SET_SUCCESS, guid)
    res.status(200).json({ status: messages.AMT_FEATURES_SET_SUCCESS }).end()
  } catch (error) {
    logger.error(`${messages.AMT_FEATURES_SET_EXCEPTION}: ${error}`)
    MqttProvider.publishEvent('fail', ['AMT_SetFeatures'], messages.INTERNAL_SERVICE_ERROR)
    res.status(500).json(ErrorResponse(500, messages.AMT_FEATURES_SET_EXCEPTION)).end()
  }
}
export async function setRedirectionService(
  device: DeviceAction,
  amtRedirResponse: AMT.Models.RedirectionResponse,
  kvm: boolean,
  guid: string
): Promise<void> {
  // TODO: check statuses
  // for SOL and IDER
  await device.setRedirectionService(
    amtRedirResponse.AMT_RedirectionService.EnabledState as AMT.Types.RedirectionService.RequestedState
  )
  // for kvm
  await device.setKvmRedirectionSap(
    kvm
      ? Common.Models.AMT_REDIRECTION_SERVICE_ENABLE_STATE.Enabled
      : Common.Models.AMT_REDIRECTION_SERVICE_ENABLE_STATE.Disabled
  )

  await device.putRedirectionService(amtRedirResponse.AMT_RedirectionService)
}

export async function setUserConsent(
  device: DeviceAction,
  optServiceRes: IPS.Models.OptInServiceResponse,
  guid: string
): Promise<void> {
  await device.putIpsOptInService(optServiceRes)
}
