/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type Response, type Request } from 'express'
import { logger, messages } from '../../logging/index.js'
import { ErrorResponse } from '../../utils/amtHelper.js'
import { MqttProvider } from '../../utils/MqttProvider.js'

export async function generalSettings(req: Request<{ guid: string }>, res: Response): Promise<void> {
  try {
    const guid: string = req.params.guid
    MqttProvider.publishEvent('request', ['AMT_GeneralSettings'], messages.GENERAL_SETTINGS_GET_REQUESTED, guid)
    const response = await req.deviceAction.getGeneralSettings()

    if (response != null) {
      MqttProvider.publishEvent('success', ['AMT_GeneralSettings'], messages.GENERAL_SETTINGS_GET_SUCCESS, guid)
      // matches version 2.x API for Open AMT
      const result = {
        Header: response.Header,
        Body: response.Body.AMT_GeneralSettings
      }
      res.status(200).json(result)
    } else {
      logger.error(`${messages.GENERAL_SETTINGS_REQUEST_FAILED} for guid : ${guid}.`)
      MqttProvider.publishEvent('fail', ['AMT_GeneralSettings'], messages.GENERAL_SETTINGS_REQUEST_FAILED, guid)
      res.status(400).json(ErrorResponse(400, `${messages.GENERAL_SETTINGS_REQUEST_FAILED} for guid : ${guid}.`))
    }
  } catch (error) {
    logger.error(`${messages.GENERAL_SETTINGS_EXCEPTION}: ${error}`)
    MqttProvider.publishEvent('fail', ['AMT_GeneralSettings'], messages.INTERNAL_SERVICE_ERROR)
    res.status(500).json(ErrorResponse(500, messages.GENERAL_SETTINGS_EXCEPTION))
  }
}
