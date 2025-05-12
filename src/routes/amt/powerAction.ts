/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { IPS, type AMT, type CIM } from '@open-amt-cloud-toolkit/wsman-messages'
import { type Request, type Response } from 'express'
import { logger, messages } from '../../logging/index.js'
import { ErrorResponse } from '../../utils/amtHelper.js'
import { AMTStatusCodes, DMTFPowerStates, OSPowerSavingStateStatusCodes } from '../../utils/constants.js'
import { MqttProvider } from '../../utils/MqttProvider.js'

const UNKNOWN: IPS.Types.PowerManagementService.OSPowerSavingState = 0
const UNSUPPORTED: IPS.Types.PowerManagementService.OSPowerSavingState = 1
const FULL_POWER: IPS.Types.PowerManagementService.OSPowerSavingState = 2
const OS_POWER_SAVING: IPS.Types.PowerManagementService.OSPowerSavingState = 3

// OS Power Action Types
const OS_TO_FULL_POWER = 500
const OS_TO_POWER_SAVING = 501

export async function powerAction(req: Request, res: Response): Promise<void> {
  try {
    const payload = req.body
    const results = await req.deviceAction.getBootOptions()
    const bootData = setBootData(payload.action as number, false, results.AMT_BootSettingData)
    await req.deviceAction.setBootConfiguration(bootData)

    const paction = payload?.action as number

    // Handle OS power saving state changes
    if (paction === OS_TO_FULL_POWER || paction === OS_TO_POWER_SAVING) {
      await handleOSPowerSavingStateChange(req, res, paction)
      return
    }

    if (paction == 2) {
      await ensureFullPowerBeforeReset(req)
    }

    if (!(paction in DMTFPowerStates)) {
      // Stop when paction is not a valid DMTF Power State
      const powerActionOSResponse = {
        Body: { RequestPowerStateChange_OUTPUT: { ReturnValue: 0x0024, ReturnValueStr: AMTStatusToString(0x0024) } }
      } as any
      res.status(200).json(powerActionOSResponse).end() //Invalid Parameter
      return
    }

    //It will continue with the power action only when paction is included in DM
    const powerAction = await req.deviceAction.sendPowerAction(
      payload.action as CIM.Types.PowerManagementService.PowerState
    )
    powerAction.Body.RequestPowerStateChange_OUTPUT.ReturnValueStr = AMTStatusToString(
      powerAction.Body.RequestPowerStateChange_OUTPUT.ReturnValue as number
    )
    powerAction.Body = powerAction.Body.RequestPowerStateChange_OUTPUT
    MqttProvider.publishEvent('success', ['AMT_PowerAction'], messages.POWER_ACTION_REQUESTED)
    res.status(200).json(powerAction).end()
  } catch (error) {
    logger.error(`${messages.POWER_ACTION_EXCEPTION} : ${error}`)
    MqttProvider.publishEvent('fail', ['AMT_PowerAction'], messages.INTERNAL_SERVICE_ERROR)
    res.status(500).json(ErrorResponse(500, messages.POWER_ACTION_EXCEPTION)).end()
  }
}

async function getOSPowerSavingState(req: Request): Promise<IPS.Types.PowerManagementService.OSPowerSavingState> {
  const status = await req.deviceAction.getOSPowerSavingState()

  if (status?.Body?.IPS_PowerManagementService?.OSPowerSavingState !== undefined) {
    return status.Body.IPS_PowerManagementService
      .OSPowerSavingState as IPS.Types.PowerManagementService.OSPowerSavingState
  }

  return 0
}

async function changeOSPowerSavingState(
  req: Request,
  targetState: IPS.Types.PowerManagementService.OSPowerSavingState
): Promise<number> {
  try {
    const response = await req.deviceAction.requestOSPowerSavingStateChange(targetState)
    return response?.Body?.RequestOSPowerSavingStateChange_OUTPUT?.ReturnValue
  } catch (error) {
    logger.error(`${messages.OS_POWER_SAVING_STATE_EXCEPTION} : ${error}`)
    return -1
  }
}

async function ensureFullPowerBeforeReset(req: Request): Promise<void> {
  const currentState = await getOSPowerSavingState(req)

  if (currentState === OS_POWER_SAVING) {
    logger.info('OS Power Saving State is 3 (Saving Mode). Changing it to 2 (Full Power) before continuing...')

    const success = await changeOSPowerSavingState(req, FULL_POWER)

    if (success === 0) {
      logger.info('OS Power Saving State changed to 2 (Full Power) successfully.')
    } else {
      logger.error('Failed to change OS Power Saving State. Proceeding with power action...')
    }
  }
}

async function handleOSPowerSavingStateChange(req: Request, res: Response, action: number): Promise<void> {
  const targetState = action === OS_TO_FULL_POWER ? FULL_POWER : OS_POWER_SAVING
  const stateName = targetState === FULL_POWER ? 'Full Power' : 'Saving Mode'
  const targetStateValue = targetState === FULL_POWER ? 2 : 3

  // Get current state
  const currentState = await getOSPowerSavingState(req)
  if (currentState === UNKNOWN) {
    logger.error('OS Power Saving State is UNKNOWN. Cannot proceed with state change.')
    sendOSPowerResponse(res, 1, 'OS_POWER_STATE_UNKNOWN')
    return
  }

  if (currentState === UNSUPPORTED) {
    logger.error('OS Power Saving State is UNSUPPORTED. Device does not support this operation.')
    sendOSPowerResponse(res, 2, 'OS_POWER_STATE_UNSUPPORTED')
    return
  }

  // Check if already in target state
  if (currentState === targetState) {
    logger.info(`OS Power Saving State is already ${targetStateValue} (${stateName}). No change needed.`)
    sendOSPowerResponse(res, 0, OSPowerSavingStateStatusCodesToString(0))
    return
  }

  // Change state
  logger.info(messages.OS_POWER_SAVING_STATE_CHANGE_REQUESTED)
  const returnValue = await changeOSPowerSavingState(req, targetState)

  if (returnValue === 0) {
    sendOSPowerResponse(res, 0, OSPowerSavingStateStatusCodesToString(0))
  } else {
    logger.error(messages.OS_POWER_SAVING_STATE_CHANGE_FAILED)
    const result = returnValue || -1
    sendOSPowerResponse(res, result, OSPowerSavingStateStatusCodesToString(result))
  }
}

function sendOSPowerResponse(res: Response, returnValue: number, returnValueStr: string): void {
  const response = {
    Body: {
      ReturnValue: returnValue,
      ReturnValueStr: returnValueStr
    }
  }
  res.status(200).json(response).end()
}

function AMTStatusToString(code: number): string {
  if (AMTStatusCodes[code]) {
    return AMTStatusCodes[code]
  } else return 'UNKNOWN_ERROR'
}

function OSPowerSavingStateStatusCodesToString(code: number): string {
  if (OSPowerSavingStateStatusCodes[code]) {
    return OSPowerSavingStateStatusCodes[code]
  } else return 'UNKNOWN_ERROR'
}

export function setBootData(
  action: number,
  useSOL: boolean,
  r: AMT.Models.BootSettingData
): AMT.Models.BootSettingData {
  r.BIOSPause = false
  r.BIOSSetup = false
  r.BootMediaIndex = 0
  r.ConfigurationDataReset = false
  r.FirmwareVerbosity = 0
  r.ForcedProgressEvents = false
  r.IDERBootDevice = 0
  r.LockKeyboard = false
  r.LockPowerButton = false
  r.LockResetButton = false
  r.LockSleepButton = false
  r.ReflashBIOS = false
  r.UseIDER = false
  r.UseSOL = useSOL
  r.UseSafeMode = false
  r.UserPasswordBypass = false
  r.SecureErase = false
  // if (r.SecureErase) {
  //   r.SecureErase = action === 104 && amtPowerBootCapabilities.SecureErase === true
  // }
  return r
}
