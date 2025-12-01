/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type Response, type Request } from 'express'
import { logger, messages } from '../../logging/index.js'
import { ErrorResponse } from '../../utils/amtHelper.js'
import { MqttProvider } from '../../utils/MqttProvider.js'
import { type DeviceAction } from '../../amt/DeviceAction.js'

export async function setLinkPreference(req: Request, res: Response): Promise<void> {
  try {
    const guid: string = req.params.guid
    const linkPreference = Number(req.body.linkPreference)
    const timeout = Number(req.body.timeout)
    const deviceAction: DeviceAction = req.deviceAction as DeviceAction

    const linkPrefName = linkPreference === 1 ? 'ME' : 'HOST'
    logger.debug(
      `Set Link Preference to ${linkPrefName} for ${guid} with timeout ${timeout}s (WiFi port auto-detected)`
    )

    const statusCode = await deviceAction.setEthernetLinkPreference(linkPreference as 1 | 2, timeout)

    if (statusCode === -1) {
      logger.error('Set Link Preference failed: No WiFi port found or unexpected error')
      MqttProvider.publishEvent('fail', ['AMT_LinkPreference'], 'No WiFi port found or unexpected error')
      res.status(400).json({ error: 'No WiFi port found or unexpected error' }).end()
      return
    }

    if (statusCode !== 0) {
      logger.error(`Set Link Preference failed: AMT returned status ${statusCode}`)
      MqttProvider.publishEvent('fail', ['AMT_LinkPreference'], `AMT returned status ${statusCode}`)
      res
        .status(500)
        .json(ErrorResponse(500, `Failed to set link preference, status: ${statusCode}`))
        .end()
      return
    }

    MqttProvider.publishEvent('success', ['AMT_LinkPreference'], `Link Preference set to ${linkPrefName}`)
    res.status(200).json({ ReturnValue: statusCode }).end()
  } catch (error) {
    logger.error(`Exception during Set Link Preference: ${error}`)
    MqttProvider.publishEvent('fail', ['AMT_LinkPreference'], messages.INTERNAL_SERVICE_ERROR)
    res.status(500).json(ErrorResponse(500, 'Exception during Set Link Preference')).end()
  }
}
