/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/
import { type Response, type Request } from 'express'
import { logger, messages } from '../../../logging/index.js'
import { ErrorResponse } from '../../../utils/amtHelper.js'
import { MqttProvider } from '../../../utils/MqttProvider.js'
import { mapScreenSettingDataToKVMScreenSettings } from './kvmScreenSettingsMapper.js'
import { type DeviceAction } from '../../../amt/DeviceAction.js'

export async function getScreenSettingData(req: Request, res: Response): Promise<void> {
  try {
    const guid: string = req.params.guid
    const deviceAction: DeviceAction = req.deviceAction as DeviceAction
    logger.debug(`get KVM Screen Setting Data for ${guid}`)

    const screenData = await deviceAction.getScreenSettingData()
    if (!screenData) {
      res.status(404).json(ErrorResponse(404, 'KVM Screen Setting Data not found'))
      return
    }

    const kvmData = await deviceAction.getKVMRedirectionSettingData()
    if (!kvmData) {
      res.status(404).json(ErrorResponse(404, 'KVM Redirection Setting Data not found'))
      return
    }

    const settings = mapScreenSettingDataToKVMScreenSettings(screenData, kvmData)
    res.status(200).json(settings)
  } catch (error) {
    logger.error(`${messages.KVM_GET_EXCEPTION} : ${error}`)
    MqttProvider.publishEvent('fail', ['AMT_KVM'], messages.INTERNAL_SERVICE_ERROR)
    res.status(500).json(ErrorResponse(500, messages.KVM_GET_EXCEPTION))
  }
}
