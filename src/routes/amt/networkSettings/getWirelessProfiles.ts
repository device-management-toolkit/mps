/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type Response, type Request } from 'express'
import { logger, messages } from '../../../logging/index.js'
import { ErrorResponse } from '../../../utils/amtHelper.js'
import { MqttProvider } from '../../../utils/MqttProvider.js'
import { buildWirelessProfileResponses } from './wirelessProfileHelper.js'

export async function getWirelessProfiles(req: Request, res: Response): Promise<void> {
  const guid: string = req.params.guid
  try {
    MqttProvider.publishEvent('request', ['AMT_WiFiProfiles'], messages.WIRELESS_PROFILE_GET_REQUESTED, guid)

    const wifiResponse = await req.deviceAction.getWiFiEndpointSettings()
    const ieee8021xResponse = await req.deviceAction.getCIMIEEE8021xSettings()
    const concreteDependencies = await req.deviceAction.getConcreteDependency()

    const profiles = buildWirelessProfileResponses(
      wifiResponse?.Body?.PullResponse?.Items,
      ieee8021xResponse?.Body?.PullResponse?.Items,
      concreteDependencies
    )

    MqttProvider.publishEvent('success', ['AMT_WiFiProfiles'], messages.WIRELESS_PROFILE_GET_SUCCESS, guid)
    res.status(200).json(profiles)
  } catch (error) {
    logger.error(`${messages.WIRELESS_PROFILE_GET_FAILED}: ${error}`)
    MqttProvider.publishEvent('fail', ['AMT_WiFiProfiles'], messages.WIRELESS_PROFILE_GET_FAILED, guid)
    res.status(500).json(ErrorResponse(500, messages.WIRELESS_PROFILE_GET_FAILED))
  }
}
