/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type Response, type Request } from 'express'
import { logger, messages } from '../../logging/index.js'
import { ErrorResponse } from '../../utils/amtHelper.js'
import { MqttProvider } from '../../utils/MqttProvider.js'
import {
  PLATFORM_ERASE_ALL_SSDS,
  PLATFORM_ERASE_TPM_CLEAR,
  PLATFORM_ERASE_CSME_UNCONFIGURE,
  PLATFORM_ERASE_BIOS_TO_EOM
} from './rpeConstants.js'

export async function getBootCapabilities(req: Request, res: Response): Promise<void> {
  try {
    const guid: string = req.params.guid

    MqttProvider.publishEvent('request', ['AMT_BootCapabilities'], messages.BOOT_CAPABILITIES_REQUESTED, guid)

    const result = await req.deviceAction.getBootCapabilities()
    const capabilities = parsePlatformEraseCapabilities(result.Body?.AMT_BootCapabilities?.PlatformErase ?? 0)

    MqttProvider.publishEvent('success', ['AMT_BootCapabilities'], messages.BOOT_CAPABILITIES_SUCCESS, guid)
    res.status(200).json(capabilities).end()
  } catch (error) {
    logger.error(`${messages.BOOT_CAPABILITIES_EXCEPTION} : ${error}`)
    MqttProvider.publishEvent('fail', ['AMT_BootCapabilities'], messages.INTERNAL_SERVICE_ERROR)
    res.status(500).json(ErrorResponse(500, messages.BOOT_CAPABILITIES_EXCEPTION)).end()
  }
}

function parsePlatformEraseCapabilities(platformEraseMask: number): {
  secureEraseAllSSDs: boolean
  tpmClear: boolean
  restoreBIOSToEOM: boolean
  unconfigureCSME: boolean
} {
  return {
    secureEraseAllSSDs: (platformEraseMask & PLATFORM_ERASE_ALL_SSDS) !== 0,
    tpmClear: (platformEraseMask & PLATFORM_ERASE_TPM_CLEAR) !== 0,
    restoreBIOSToEOM: (platformEraseMask & PLATFORM_ERASE_BIOS_TO_EOM) !== 0,
    unconfigureCSME: (platformEraseMask & PLATFORM_ERASE_CSME_UNCONFIGURE) !== 0
  }
}
