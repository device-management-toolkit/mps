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
    const linkPreference: number = Number(req.body.linkPreference)
    const timeout: number = Number(req.body.timeout)
    const instanceID: string | undefined = req.query.instanceID as string
    const deviceAction: DeviceAction = req.deviceAction as DeviceAction

    const linkPrefName = linkPreference === 1 ? 'ME' : 'HOST'
    logger.debug(`Set Link Preference to ${linkPrefName} for ${guid} with timeout ${timeout}s, instanceID: ${instanceID ?? 'default'}`)
    await deviceAction.setEthernetLinkPreference(linkPreference as 1 | 2, timeout, instanceID)
    MqttProvider.publishEvent('success', ['AMT_LinkPreference'], `Link Preference set to ${linkPrefName}`)
    res.status(200).json({ 
      status: `Link Preference set to ${linkPrefName}`, 
      linkPreference,
      timeout, 
      instanceID: instanceID ?? 'Intel(r) AMT Ethernet Port Settings 0' 
    }).end()
  } catch (error) {
    logger.error(`Exception during Set Link Preference: ${error}`)
    MqttProvider.publishEvent('fail', ['AMT_LinkPreference'], messages.INTERNAL_SERVICE_ERROR)
    res.status(500).json(ErrorResponse(500, 'Exception during Set Link Preference')).end()
  }
}
