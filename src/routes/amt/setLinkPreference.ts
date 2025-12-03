/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type Response, type Request } from 'express'
import { logger, messages } from '../../logging/index.js'
import { ErrorResponse } from '../../utils/amtHelper.js'
import { MqttProvider } from '../../utils/MqttProvider.js'
import { type DeviceAction } from '../../amt/DeviceAction.js'
import { AMTStatusCodes } from '#src/utils/constants.js'

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

    if (statusCode === null) {
      const errMsg = `Set Link Preference failed: No WiFi port found for guid : ${guid}.`
      logger.error(errMsg)
      MqttProvider.publishEvent('fail', ['AMT_LinkPreference'], errMsg)
      res.status(404).json(ErrorResponse(404, `${errMsg} for guid : ${guid}.`))
      return
    } else if (statusCode === -1 || statusCode !== 0) {
      const errMsg = `Set Link Preference failed: ${AMTStatusCodes[statusCode] || 'Unknown error'}`
      logger.error(errMsg)
      MqttProvider.publishEvent('fail', ['AMT_LinkPreference'], errMsg)
      res.status(400).json(ErrorResponse(400, `${errMsg} for guid : ${guid}.`))
      return
    }

    MqttProvider.publishEvent('success', ['AMT_LinkPreference'], `Link Preference set to ${linkPrefName}`)
    res.status(200).json({ ReturnValue: statusCode, ReturnValueStr: AMTStatusCodes[statusCode] }).end()
  } catch (error) {
    logger.error(`Exception during Set Link Preference: ${error}`)
    MqttProvider.publishEvent('fail', ['AMT_LinkPreference'], messages.INTERNAL_SERVICE_ERROR)
    res.status(500).json(ErrorResponse(500, 'Exception during Set Link Preference')).end()
  }
}
