/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type CIM } from '@device-management-toolkit/wsman-messages'
import { type Response, type Request } from 'express'
import { logger, messages } from '../../../logging/index.js'
import { ErrorResponse } from '../../../utils/amtHelper.js'
import { MqttProvider } from '../../../utils/MqttProvider.js'
import { mapEnum, mapEnumReverse, WIRELESS_STATE_VALUE_TO_STRING, hasWiFiPort, findWiFiPortEnabledState } from './helper.js'

export async function requestWirelessStateChange(req: Request, res: Response): Promise<void> {
  const guid: string = req.params.guid
  try {
    MqttProvider.publishEvent('request', ['CIM_WiFiPort'], messages.WIRELESS_STATE_CHANGE_REQUESTED, guid)

    const requestedState = mapEnumReverse(req.body?.state, WIRELESS_STATE_VALUE_TO_STRING)
    if (requestedState == null) {
      logger.error(`${messages.WIRELESS_STATE_UNSUPPORTED}: ${req.body?.state} for guid : ${guid}.`)
      res.status(400).json(ErrorResponse(400, `${messages.WIRELESS_STATE_UNSUPPORTED}: ${req.body?.state}`))
      return
    }

    const wifiPortResponse = await req.deviceAction.getWiFiPortState()
    const items = wifiPortResponse?.Body?.PullResponse?.Items
    if (!hasWiFiPort(items)) {
      logger.error(`${messages.WIRELESS_STATE_NOT_FOUND} for guid : ${guid}.`)
      MqttProvider.publishEvent('fail', ['CIM_WiFiPort'], messages.WIRELESS_STATE_NOT_FOUND, guid)
      res.status(404).json({
        error: messages.WIRELESS_STATE_NOT_FOUND,
        errorDescription: `${messages.WIRELESS_STATE_NOT_FOUND} for guid : ${guid}.`
      })
      return
    }

    // Device already in the requested state: skip the WSMAN state-change call (mirrors Console).
    if (findWiFiPortEnabledState(items) === requestedState) {
      MqttProvider.publishEvent('success', ['CIM_WiFiPort'], messages.WIRELESS_STATE_CHANGE_SUCCESS, guid)
      res.status(200).json({ state: mapEnum(requestedState, WIRELESS_STATE_VALUE_TO_STRING) })
      return
    }

    const result = await req.deviceAction.wiFiRequestStateChange(requestedState as CIM.Types.WiFiPort.RequestedState)
    const returnValue = result?.RequestStateChange_OUTPUT?.ReturnValue

    if (returnValue !== 0) {
      logger.error(`${messages.WIRELESS_STATE_CHANGE_FAILED} for guid : ${guid}. ReturnValue: ${returnValue}`)
      MqttProvider.publishEvent('fail', ['CIM_WiFiPort'], messages.WIRELESS_STATE_CHANGE_FAILED, guid)
      res.status(400).json(ErrorResponse(400, `${messages.WIRELESS_STATE_CHANGE_FAILED} for guid : ${guid}.`))
      return
    }

    MqttProvider.publishEvent('success', ['CIM_WiFiPort'], messages.WIRELESS_STATE_CHANGE_SUCCESS, guid)
    res.status(200).json({ state: mapEnum(requestedState, WIRELESS_STATE_VALUE_TO_STRING) })
  } catch (error) {
    logger.error(`${messages.NETWORK_SETTINGS_EXCEPTION}: ${error}`)
    MqttProvider.publishEvent('fail', ['CIM_WiFiPort'], messages.INTERNAL_SERVICE_ERROR, guid)
    res.status(500).json(ErrorResponse(500, messages.NETWORK_SETTINGS_EXCEPTION))
  }
}
