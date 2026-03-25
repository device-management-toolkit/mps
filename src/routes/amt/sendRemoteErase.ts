/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type Response, type Request } from 'express'
import { logger, messages } from '../../logging/index.js'
import { ErrorResponse } from '../../utils/amtHelper.js'
import { MqttProvider } from '../../utils/MqttProvider.js'
import { MPSValidationError } from '../../utils/MPSValidationError.js'

export async function sendRemoteErase(req: Request, res: Response): Promise<void> {
  try {
    const guid: string = req.params.guid
    const { eraseMask } = req.body
    const mask: number = eraseMask ?? 0

    MqttProvider.publishEvent('request', ['AMT_BootSettingData'], messages.AMT_FEATURES_SET_REQUESTED, guid)

    const bootCaps = await req.deviceAction.getBootCapabilities()
    const platformEraseCaps = bootCaps.Body?.AMT_BootCapabilities?.PlatformErase ?? 0

    if (platformEraseCaps === 0) {
      throw new MPSValidationError('Device does not support Remote Platform Erase', 400)
    }

    if (mask !== 0 && (platformEraseCaps & mask) === 0) {
      throw new MPSValidationError('Requested erase capabilities are not supported by this device', 400)
    }

    await req.deviceAction.sendRemoteErase(mask)

    MqttProvider.publishEvent('success', ['AMT_BootSettingData'], messages.AMT_FEATURES_SET_SUCCESS, guid)
    res.status(200).json({ status: 'success' }).end()
  } catch (error) {
    logger.error(`sendRemoteErase failed: ${error}`)
    if (error instanceof MPSValidationError) {
      res.status(error.status ?? 400).json(ErrorResponse(error.status ?? 400, error.message))
    } else {
      MqttProvider.publishEvent('fail', ['AMT_BootSettingData'], messages.INTERNAL_SERVICE_ERROR)
      res.status(500).json(ErrorResponse(500, messages.AMT_FEATURES_SET_EXCEPTION)).end()
    }
  }
}
