/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type Response, type Request } from 'express'
import { logger, messages } from '../../../logging/index.js'
import { ErrorResponse } from '../../../utils/amtHelper.js'
import { MqttProvider } from '../../../utils/MqttProvider.js'
import { extractWirelessSettings } from './helper.js'
import { findWirelessSettingByProfileName } from './wirelessProfileHelper.js'

export async function deleteWirelessProfile(req: Request, res: Response): Promise<void> {
  const guid: string = req.params.guid
  const profileName: string = req.params.profileName
  try {
    MqttProvider.publishEvent('request', ['AMT_WiFiProfiles'], messages.WIRELESS_PROFILE_DELETE_REQUESTED, guid)

    const wifiResponse = await req.deviceAction.getWiFiEndpointSettings()
    const settings = extractWirelessSettings(wifiResponse?.Body?.PullResponse?.Items)

    const setting = findWirelessSettingByProfileName(settings, profileName)
    if (setting == null) {
      logger.error(`${messages.WIRELESS_PROFILE_NOT_FOUND}: ${profileName} for guid : ${guid}.`)
      MqttProvider.publishEvent('fail', ['AMT_WiFiProfiles'], messages.WIRELESS_PROFILE_NOT_FOUND, guid)
      res.status(404).json({
        error: messages.WIRELESS_PROFILE_NOT_FOUND,
        errorDescription: `${messages.WIRELESS_PROFILE_NOT_FOUND}: ${profileName}.`
      })
      return
    }

    const deleted = await req.deviceAction.deleteWiFiEndpointSettings(setting.InstanceID)
    if (!deleted) {
      logger.error(`${messages.WIRELESS_PROFILE_DELETE_FAILED}: ${profileName} for guid : ${guid}.`)
      MqttProvider.publishEvent('fail', ['AMT_WiFiProfiles'], messages.WIRELESS_PROFILE_DELETE_FAILED, guid)
      res.status(400).json(ErrorResponse(400, `${messages.WIRELESS_PROFILE_DELETE_FAILED}: ${profileName}.`))
      return
    }

    MqttProvider.publishEvent('success', ['AMT_WiFiProfiles'], messages.WIRELESS_PROFILE_DELETE_SUCCESS, guid)
    res.status(204).end()
  } catch (error) {
    logger.error(`${messages.NETWORK_SETTINGS_EXCEPTION}: ${error}`)
    MqttProvider.publishEvent('fail', ['AMT_WiFiProfiles'], messages.INTERNAL_SERVICE_ERROR, guid)
    res.status(500).json(ErrorResponse(500, messages.NETWORK_SETTINGS_EXCEPTION))
  }
}
