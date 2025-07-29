/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type Response, type Request } from 'express'
import { logger, messages } from '../../logging/index.js'
import { UserConsentOptions } from '../../utils/constants.js'
import { ErrorResponse } from '../../utils/amtHelper.js'
import { MPSValidationError } from '../../utils/MPSValidationError.js'
import { MqttProvider } from '../../utils/MqttProvider.js'
import { type AMT, type CIM, type IPS, Common } from '@device-management-toolkit/wsman-messages'
import type { BootSettingResult, OCRData, OCRProcessResult } from '../../models/models.js'

export async function getAMTFeatures(req: Request, res: Response): Promise<void> {
  try {
    const guid: string = req.params.guid
    const amtRedirectionResponse = await req.deviceAction.getRedirectionService()
    const optServiceResponse = await req.deviceAction.getIpsOptInService()
    const kvmRedirectionResponse = await req.deviceAction.getKvmRedirectionSap()
    const OCRData = await req.deviceAction.getOCRData()

    MqttProvider.publishEvent('request', ['AMT_GetFeatures'], messages.AMT_FEATURES_GET_REQUESTED, guid)

    const { redir, sol, ider } = processAmtRedirectionResponse(amtRedirectionResponse.AMT_RedirectionService)
    const { kvm, kvmAvailable } = processKvmRedirectionResponse(kvmRedirectionResponse.CIM_KVMRedirectionSAP)
    const { value, optInState } = processOptServiceResponse(optServiceResponse.IPS_OptInService)
    const userConsent = Object.keys(UserConsentOptions).find((key) => UserConsentOptions[key] === value)
    const ocrProcessResult = processOCRData(OCRData)

    MqttProvider.publishEvent('success', ['AMT_GetFeatures'], messages.AMT_FEATURES_GET_SUCCESS, guid)
    res
      .status(200)
      .json({
        userConsent,
        redirection: redir,
        KVM: kvm,
        SOL: sol,
        IDER: ider,
        optInState,
        kvmAvailable,
        ocr: ocrProcessResult.OCR,
        httpsBootSupported: ocrProcessResult.HTTPSBootSupported,
        winREBootSupported: ocrProcessResult.WinREBootSupported,
        localPBABootSupported: ocrProcessResult.LocalPBABootSupported,
        remoteErase: false
      })
      .end()
  } catch (error) {
    logger.error(`${messages.AMT_FEATURES_EXCEPTION}: ${error}`)
    if (error instanceof MPSValidationError) {
      res.status(error.status ?? 400).json(ErrorResponse(error.status ?? 400, error.message))
    } else {
      MqttProvider.publishEvent('fail', ['AMT_GetFeatures'], messages.INTERNAL_SERVICE_ERROR)
      res.status(500).json(ErrorResponse(500, messages.AMT_FEATURES_EXCEPTION))
    }
  }
}

export function processAmtRedirectionResponse(amtRedirection: AMT.Models.RedirectionService): {
  redir: boolean
  sol: boolean
  ider: boolean
} {
  const redir = amtRedirection.ListenerEnabled
  const sol = (amtRedirection.EnabledState & Common.Models.AMT_REDIRECTION_SERVICE_ENABLE_STATE.Enabled) !== 0
  const ider = (amtRedirection.EnabledState & Common.Models.AMT_REDIRECTION_SERVICE_ENABLE_STATE.Other) !== 0
  return { redir, sol, ider }
}

export function processKvmRedirectionResponse(kvmRedirection: CIM.Models.KVMRedirectionSAP): {
  kvm: boolean
  kvmAvailable: boolean
} {
  if (kvmRedirection == null) return { kvm: false, kvmAvailable: false }
  const kvm =
    kvmRedirection.EnabledState === Common.Models.CIM_KVM_REDIRECTION_SAP_ENABLED_STATE.Enabled ||
    kvmRedirection.EnabledState === Common.Models.CIM_KVM_REDIRECTION_SAP_ENABLED_STATE.EnabledButOffline
  return { kvm, kvmAvailable: true }
}

export function processOptServiceResponse(optService: IPS.Models.OptInService): { value: number; optInState: number } {
  const value = optService.OptInRequired
  const optInState = optService.OptInState
  return { value, optInState }
}

export function processOCRData(ocrData: OCRData): OCRProcessResult {
  const EnabledState = ocrData.bootService?.CIM_BootService?.EnabledState
  const capabilities = ocrData.capabilities?.Body?.AMT_BootCapabilities
  const bootData = ocrData.bootData?.AMT_BootSettingData
  const bootSourceSettings = ocrData.bootSourceSettings

  const isOCR = EnabledState === 32769 || EnabledState === 32771

  const bootSettings = findBootSettingInstances(bootSourceSettings)

  const HTTPSBootSupported =
    bootSettings.isHTTPSBootExists && capabilities?.ForceUEFIHTTPSBoot && bootData?.UEFIHTTPSBootEnabled

  const WinREBootSupported = bootSettings.isPBAWinREExists && bootData?.WinREBootEnabled && capabilities?.ForceWinREBoot

  const LocalPBABootSupported =
    bootSettings.isPBAWinREExists && bootData?.UEFILocalPBABootEnabled && capabilities?.ForceUEFILocalPBABoot

  return {
    WinREBootSupported: !!WinREBootSupported,
    LocalPBABootSupported: !!LocalPBABootSupported,
    HTTPSBootSupported: !!HTTPSBootSupported,
    OCR: !!isOCR
  }
}

export function findBootSettingInstances(bootSourceSettings: OCRData['bootSourceSettings']): BootSettingResult {
  const TARGET_HTTPS_BOOT = 'Intel(r) AMT: Force OCR UEFI HTTPS Boot'
  const TARGET_PBA_WINRE = 'Intel(r) AMT: Force OCR UEFI Boot Option'

  let isHTTPSBootExists = false
  let isPBAWinREExists = false

  const bootItems = bootSourceSettings?.Items?.CIM_BootSourceSetting ?? []

  for (const { InstanceID } of bootItems) {
    if (!isHTTPSBootExists && InstanceID.startsWith(TARGET_HTTPS_BOOT)) {
      isHTTPSBootExists = true
    }

    if (!isPBAWinREExists && InstanceID.startsWith(TARGET_PBA_WINRE)) {
      isPBAWinREExists = true
    }

    if (isHTTPSBootExists && isPBAWinREExists) break
  }

  return { isHTTPSBootExists, isPBAWinREExists }
}
