/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type AMT, type CIM } from '@open-amt-cloud-toolkit/wsman-messages'
import { type Request, type Response } from 'express'
import { logger, messages } from '../../logging/index.js'
import { ErrorResponse } from '../../utils/amtHelper.js'
import { AMTStatusCodes } from '../../utils/constants.js'
import { MqttProvider } from '../../utils/MqttProvider.js'

export async function bootOptions(req: Request, res: Response): Promise<void> {
  try {
    const payload = req.body // payload.action
    const device = req.deviceAction
    const results = await device.getBootOptions()
    const bootData = setBootData(payload.action as number, payload.useSOL as boolean, results.AMT_BootSettingData)
    await device.setBootConfiguration(bootData)
    const forceBootSource = setBootSource(payload.action as number)
    if (forceBootSource != null) {
      // only if
      await device.forceBootMode()
      await device.changeBootOrder(forceBootSource)
    } else {
      await device.forceBootMode()
      await device.changeBootOrder()
    }
    const newAction = determinePowerAction(payload.action as number)
    const powerActionResult = await device.sendPowerAction(newAction)
    powerActionResult.Body.RequestPowerStateChange_OUTPUT.ReturnValueStr = AMTStatusToString(
      powerActionResult.Body.RequestPowerStateChange_OUTPUT.ReturnValue as number
    )
    powerActionResult.Body = powerActionResult.Body.RequestPowerStateChange_OUTPUT

    res.status(200).json(powerActionResult)
  } catch (error) {
    logger.error(`${messages.BOOT_SETTING_EXCEPTION} : ${error}`)
    MqttProvider.publishEvent('fail', ['AMT_BootSettingData'], messages.INTERNAL_SERVICE_ERROR)
    res.status(500).json(ErrorResponse(500, messages.BOOT_SETTING_EXCEPTION))
  }
}

export function setBootData(
  action: number,
  useSOL: boolean,
  r: AMT.Models.BootSettingData
): AMT.Models.BootSettingData {
  r.BIOSPause = false
  r.BIOSSetup = action < 104
  r.BootMediaIndex = 0
  r.ConfigurationDataReset = false
  r.FirmwareVerbosity = 0
  r.ForcedProgressEvents = false
  r.IDERBootDevice = action === 202 || action === 203 ? 1 : 0 // 0 = Boot on Floppy, 1 = Boot on IDER
  r.LockKeyboard = false
  r.LockPowerButton = false
  r.LockResetButton = false
  r.LockSleepButton = false
  r.ReflashBIOS = false
  r.UseIDER = action > 199 && action < 300
  r.UseSOL = useSOL
  r.UseSafeMode = false
  r.UserPasswordBypass = false
  r.SecureErase = false
  return r
}

const enum BootSources {
  IDER_CD_ROM = 'Intel(r) AMT: Force CD/DVD Boot',
  PXE = 'Intel(r) AMT: Force PXE Boot'
}

export function setBootSource(action: number): CIM.Types.BootConfigSetting.InstanceID {
  let bootSource
  if (action === 400 || action === 401) bootSource = BootSources.PXE
  return bootSource
}

export function determinePowerAction(action: number): CIM.Types.PowerManagementService.PowerState {
  let powerState: CIM.Types.PowerManagementService.PowerState = 2
  if (action === 101 || action === 200 || action === 202 || action === 301 || action === 400) {
    powerState = 10
  } // Reset

  return powerState
}

function AMTStatusToString(code: number): string {
  if (AMTStatusCodes[code]) {
    return AMTStatusCodes[code]
  } else return 'UNKNOWN_ERROR'
}