/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type Response, type Request } from 'express'
import { logger, messages } from '../../../logging/index.js'
import { ErrorResponse } from '../../../utils/amtHelper.js'
import { MqttProvider } from '../../../utils/MqttProvider.js'
import { buildProfileSyncResponse, hasWiFiPort } from './helper.js'

export async function getWirelessProfileSync(req: Request, res: Response): Promise<void> {
  const guid: string = req.params.guid
  try {
    MqttProvider.publishEvent(
      'request',
      ['AMT_WiFiPortConfigurationService'],
      messages.WIRELESS_PROFILE_SYNC_GET_REQUESTED,
      guid
    )

    const wifiPortResponse = await req.deviceAction.getWiFiPortState()
    if (!hasWiFiPort(wifiPortResponse?.Body?.PullResponse?.Items)) {
      logger.error(`${messages.WIRELESS_PROFILE_SYNC_NOT_FOUND} for guid : ${guid}.`)
      MqttProvider.publishEvent(
        'fail',
        ['AMT_WiFiPortConfigurationService'],
        messages.WIRELESS_PROFILE_SYNC_NOT_FOUND,
        guid
      )
      res.status(404).json({
        error: messages.WIRELESS_PROFILE_SYNC_NOT_FOUND,
        errorDescription: `${messages.WIRELESS_PROFILE_SYNC_NOT_FOUND} for guid : ${guid}.`
      })
      return
    }

    const configResponse = await req.deviceAction.getWiFiPortConfigurationService()
    const config = configResponse?.Body?.AMT_WiFiPortConfigurationService ?? null

    const capabilities = await req.deviceAction.getBootCapabilities()
    const uefiSupported = Boolean(capabilities?.Body?.AMT_BootCapabilities?.UEFIWiFiCoExistenceAndProfileShare)

    MqttProvider.publishEvent(
      'success',
      ['AMT_WiFiPortConfigurationService'],
      messages.WIRELESS_PROFILE_SYNC_GET_SUCCESS,
      guid
    )
    res.status(200).json(buildProfileSyncResponse(config, uefiSupported))
  } catch (error) {
    logger.error(`${messages.NETWORK_SETTINGS_EXCEPTION}: ${error}`)
    MqttProvider.publishEvent('fail', ['AMT_WiFiPortConfigurationService'], messages.INTERNAL_SERVICE_ERROR, guid)
    res.status(500).json(ErrorResponse(500, messages.NETWORK_SETTINGS_EXCEPTION))
  }
}
