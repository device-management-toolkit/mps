/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type Response, type Request } from 'express'
import { logger, messages } from '../../../logging/index.js'
import { ErrorResponse } from '../../../utils/amtHelper.js'
import { MqttProvider } from '../../../utils/MqttProvider.js'
import { findWiFiPortEnabledState, wirelessStateToString } from './helper.js'

export async function getWirelessState(req: Request, res: Response): Promise<void> {
  const guid: string = req.params.guid
  try {
    MqttProvider.publishEvent('request', ['CIM_WiFiPort'], messages.WIRELESS_STATE_GET_REQUESTED, guid)

    const wifiPortResponse = await req.deviceAction.getWiFiPortState()
    const enabledState = findWiFiPortEnabledState(wifiPortResponse?.Body?.PullResponse?.Items)

    if (enabledState == null) {
      logger.error(`${messages.WIRELESS_STATE_NOT_FOUND} for guid : ${guid}.`)
      MqttProvider.publishEvent('fail', ['CIM_WiFiPort'], messages.WIRELESS_STATE_NOT_FOUND, guid)
      res.status(404).json({
        error: messages.WIRELESS_STATE_NOT_FOUND,
        errorDescription: `${messages.WIRELESS_STATE_NOT_FOUND} for guid : ${guid}.`
      })
      return
    }

    const state = wirelessStateToString(enabledState)
    if (state == null) {
      logger.error(`${messages.WIRELESS_STATE_UNSUPPORTED}: ${enabledState} for guid : ${guid}.`)
      MqttProvider.publishEvent('fail', ['CIM_WiFiPort'], messages.WIRELESS_STATE_UNSUPPORTED, guid)
      res.status(500).json(ErrorResponse(500, messages.WIRELESS_STATE_UNSUPPORTED))
      return
    }

    MqttProvider.publishEvent('success', ['CIM_WiFiPort'], messages.WIRELESS_STATE_GET_SUCCESS, guid)
    res.status(200).json({ state })
  } catch (error) {
    logger.error(`${messages.NETWORK_SETTINGS_EXCEPTION}: ${error}`)
    MqttProvider.publishEvent('fail', ['CIM_WiFiPort'], messages.INTERNAL_SERVICE_ERROR, guid)
    res.status(500).json(ErrorResponse(500, messages.NETWORK_SETTINGS_EXCEPTION))
  }
}
