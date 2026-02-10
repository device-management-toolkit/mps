/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type Response, type Request } from 'express'
import { logger, messages } from '../../logging/index.js'
import { ErrorResponse } from '../../utils/amtHelper.js'
import { MqttProvider } from '../../utils/MqttProvider.js'
import { AMTStatusCodes } from '../../utils/constants.js'
import { type AMT, type CIM } from '@device-management-toolkit/wsman-messages'
import {
  ParameterType,
  TLVParameter,
  ValidationUseCaseError,
  createTLVBuffer,
  newBoolParameter,
  newStringParameter,
  newUint16Parameter,
  validateParameters
} from './bootOptionsValidator.js'

const BootActions = {
  HTTPSBoot: 105,
  PowerOnHTTPSBoot: 106,
  PBABoot: 107,
  PowerOnPBABoot: 108,
  WinREBoot: 109,
  PowerOnWinREBoot: 110,
  ResetToIDERCDROM: 202,
  PowerOnIDERCDROM: 203,
  ResetToBIOS: 101,
  ResetToPXE: 400,
  PowerOnToPXE: 401,
  ResetToDiag: 301,
  ResetToIDERFloppy: 200,
  OsToFullPower: 500,
  OsToPowerSaving: 501,
  CIMPMSPowerOn: 2 // CIM > Power Management Service > Power On
}

// Result interface for validateBootParams
interface BootParamsResult {
  buffer: Uint8Array
  paramCount?: number
}

export async function bootOptions(req: Request, res: Response): Promise<void> {
  try {
    const payload = req.body // payload.action
    const device = req.deviceAction

    // Check EnforceSecureBoot requirement in CCM mode
    if (payload.bootDetails?.enforceSecureBoot === false) {
      const setupAndConfigService = await device.getSetupAndConfigurationService()
      const provisioningMode = setupAndConfigService?.Body?.AMT_SetupAndConfigurationService?.ProvisioningMode
      const CCM_MODE: AMT.Types.SetupAndConfigurationService.ProvisioningMode = 4
      const isCCM = Number(provisioningMode) === CCM_MODE
      if (isCCM) {
        logger.error(`${messages.BOOT_SETTING_EXCEPTION} : ${messages.BOOT_SETTING_ENFORCE_SECURE_BOOT_CCM}`)
        MqttProvider.publishEvent('fail', ['AMT_BootSettingData'], messages.BOOT_SETTING_ENFORCE_SECURE_BOOT_CCM)
        res.status(400).json(ErrorResponse(400, messages.BOOT_SETTING_ENFORCE_SECURE_BOOT_CCM))
        return
      }
    }

    // Use new async getBootSource
    const guid = req.params?.guid || ''
    const bootSource = await getBootSource(guid, payload, device)

    const results = await device.getBootOptions()
    const bootData = setBootData(payload.action as number, payload.useSOL as boolean, results.AMT_BootSettingData)

    await determineBootDevice(payload, bootData)

    await device.changeBootOrder(null)

    await device.setBootConfiguration(bootData)

    // set boot config role
    await device.forceBootMode(1)

    await device.changeBootOrder(bootSource as unknown as CIM.Types.BootConfigSetting.InstanceID)

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

export function determinePowerAction(action: number): CIM.Types.PowerManagementService.PowerState {
  let powerState: CIM.Types.PowerManagementService.PowerState = 2
  if (
    action === 101 ||
    action === 200 ||
    action === 202 ||
    action === 301 ||
    action === 400 ||
    action === 105 ||
    action === 107 ||
    action === 109
  ) {
    powerState = 10
  } // Reset

  return powerState
}

// Enhanced getBootSource logic based on Go code
// Requires: deviceAction, guid, and bootSetting (payload)
export async function getBootSource(guid: string, bootSetting: any, deviceAction: any): Promise<string> {
  switch (bootSetting.action) {
    case BootActions.ResetToPXE:
    case BootActions.PowerOnToPXE:
      return 'Intel(r) AMT: Force PXE Boot'
    case BootActions.ResetToIDERCDROM:
    case BootActions.PowerOnIDERCDROM:
      return 'Intel(r) AMT: Force CD/DVD Boot'
    case BootActions.HTTPSBoot:
    case BootActions.PowerOnHTTPSBoot:
      return 'Intel(r) AMT: Force OCR UEFI HTTPS Boot'
    case BootActions.PBABoot:
    case BootActions.PowerOnPBABoot:
      return await getPbaBootSource(guid, bootSetting, deviceAction)
    case BootActions.WinREBoot:
    case BootActions.PowerOnWinREBoot:
      return await getWinReBootSource(guid, bootSetting, deviceAction)
    default:
      return ''
  }
}

// Helper for PBA boot source
async function getPbaBootSource(guid: string, bootSetting: any, deviceAction: any): Promise<string> {
  try {
    const result = await deviceAction.getBootSourceSetting()
    const items = result?.Items?.CIM_BootSourceSetting ?? result?.Items
    const sources = Array.isArray(items) ? items : items ? [items] : []
    for (const src of sources) {
      if (src.BootString === bootSetting.bootDetails?.bootPath) {
        return src.InstanceID
      }
    }
    return ''
  } catch (err) {
    return ''
  }
}

// Helper for WinRE boot source
async function getWinReBootSource(guid: string, bootSetting: any, deviceAction: any): Promise<string> {
  const TARGET_PBA_WINRE = 'Intel(r) AMT: Force OCR UEFI Boot Option'
  try {
    const result = await deviceAction.getBootSourceSetting()
    const items = result?.Items?.CIM_BootSourceSetting ?? result?.Items
    const sources = Array.isArray(items) ? items : items ? [items] : []
    if (bootSetting.bootDetails?.bootPath) {
      for (const src of sources) {
        if (src.BootString === bootSetting.bootDetails.bootPath) {
          return src.InstanceID
        }
      }
    } else {
      for (const src of sources) {
        if (src.BIOSBootString?.includes('WinRe') && src.InstanceID?.startsWith(TARGET_PBA_WINRE)) {
          bootSetting.bootDetails.bootPath = src.BootString
          return src.InstanceID
        }
      }
    }
    return ''
  } catch (err) {
    return ''
  }
}

export function setCommonBootProps(newData: any, enforceSecureBoot: boolean) {
  newData.BIOSLastStatus = null
  newData.UseIDER = false
  newData.BIOSSetup = false
  newData.UseSOL = false
  newData.BootMediaIndex = 0
  newData.EnforceSecureBoot = enforceSecureBoot
  newData.UserPasswordBypass = false
  newData.ForcedProgressEvents = true
}

export function determineBootDevice(bootSetting: any, newData: any): void {
  const action = bootSetting.action as number
  const details = bootSetting.bootDetails || {}

  switch (action) {
    case BootActions.HTTPSBoot:
    case BootActions.PowerOnHTTPSBoot: {
      const httpBootParams = validateHTTPBootParams(details.url, details.username, details.password)
      setCommonBootProps(newData, details.enforceSecureBoot)
      newData.UefiBootNumberOfParams = httpBootParams.paramCount
      newData.UefiBootParametersArray = Buffer.from(httpBootParams.buffer).toString('base64')
      break
    }
    case BootActions.WinREBoot:
    case BootActions.PowerOnWinREBoot:
    case BootActions.PBABoot:
    case BootActions.PowerOnPBABoot: {
      const bootParams = validatePBAWinREBootParams(details.bootPath)
      setCommonBootProps(newData, details.enforceSecureBoot)
      newData.UefiBootNumberOfParams = bootParams.paramCount
      newData.UefiBootParametersArray = Buffer.from(bootParams.buffer).toString('base64')
      break
    }
    case BootActions.ResetToIDERCDROM:
    case BootActions.PowerOnIDERCDROM: {
      newData.IDERBootDevice = 1
      break
    }
    default: {
      newData.IDERBootDevice = 0
      break
    }
  }
}

export function validateHTTPBootParams(url: string, username: string, password: string): BootParamsResult {
  // Create TLV parameters for HTTPS boot
  const parameters: TLVParameter[] = []

  // Create a network device path (URI to HTTPS server)
  const networkPathParam = newStringParameter(ParameterType.OCR_EFI_NETWORK_DEVICE_PATH, url)
  parameters.push(networkPathParam)

  // Set sync Root CA flag to true
  const syncRootCAParam = newBoolParameter(ParameterType.OCR_HTTPS_CERT_SYNC_ROOT_CA, true)
  parameters.push(syncRootCAParam)

  // Add username if provided
  if (username != null && username !== '') {
    const usernameParam = newStringParameter(ParameterType.OCR_HTTPS_USER_NAME, username)
    parameters.push(usernameParam)
  }

  // Add password if provided
  if (password != null && password !== '') {
    const passwordParam = newStringParameter(ParameterType.OCR_HTTPS_PASSWORD, password)
    parameters.push(passwordParam)
  }

  // Validate the parameters before creating the buffer
  const { valid, errors } = validateParameters(parameters)
  if (!valid) {
    const sanitizedErrors = errors.map((error) =>
      error.includes('HTTPS_PASSWORD') ? 'HTTPS_PASSWORD parameter validation failed' : error
    )
    logger.error(`Validation failed for HTTP Boot parameters - ${sanitizedErrors.length} validation error(s) detected`)
    throw new ValidationUseCaseError()
  }

  // Create the TLV buffer
  const tlvBuffer = createTLVBuffer(parameters)

  return {
    buffer: tlvBuffer,
    paramCount: parameters.length
  }
}

export function validatePBAWinREBootParams(file: string): BootParamsResult {
  // Create TLV parameters for PBA/WinRE boot
  const parameters: TLVParameter[] = []

  // Create a network device path (URI to PBA/WinRE boot file)
  const networkPathParam = newStringParameter(ParameterType.OCR_EFI_FILE_DEVICE_PATH, file)
  parameters.push(networkPathParam)

  const fileLen = file.length
  // Create a file path length parameter
  const filePathLengthParam = newUint16Parameter(ParameterType.OCR_EFI_DEVICE_PATH_LEN, fileLen)
  parameters.push(filePathLengthParam)

  // Validate the parameters before creating the buffer
  const { valid, errors } = validateParameters(parameters)

  // Create the TLV buffer
  const tlvBuffer = createTLVBuffer(parameters)

  return {
    buffer: tlvBuffer,
    paramCount: parameters.length
  }
}

function AMTStatusToString(code: number): string {
  if (AMTStatusCodes[code]) {
    return AMTStatusCodes[code]
  } else return 'UNKNOWN_ERROR'
}
