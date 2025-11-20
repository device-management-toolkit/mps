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
    logger.debug(`Set Link Preference to ${linkPrefName} for ${guid} with timeout ${timeout}s (WiFi port auto-detected)`)
    
    const result = await deviceAction.setEthernetLinkPreference(linkPreference as 1 | 2, timeout)
    
    // Check if no WiFi port found
    if (result?.Body?.Fault != null) {
      const errorMsg = result.Body.Fault.Reason?.Text ?? 'WiFi port not found'
      logger.error(`Set Link Preference failed: ${errorMsg}`)
      MqttProvider.publishEvent('fail', ['AMT_LinkPreference'], errorMsg)
      res.status(400).json({ error: errorMsg }).end()
      return
    }

    // Check if result is null (other error)
    if (result == null) {
      logger.error('Set Link Preference failed: unexpected error')
      MqttProvider.publishEvent('fail', ['AMT_LinkPreference'], 'Unexpected error')
      res.status(500).json(ErrorResponse(500, 'Failed to set link preference')).end()
      return
    }

    // Extract the detected instanceID and WiFi port settings
    const detectedInstanceID = (result as any)._detectedInstanceID ?? 'Unknown'
    const wifiPortSettings = (result as any)._wifiPortSettings

    MqttProvider.publishEvent('success', ['AMT_LinkPreference'], `Link Preference set to ${linkPrefName}`)
    res.status(200).json({ 
      status: `Link Preference set to ${linkPrefName}`, 
      linkPreference,
      timeout, 
      instanceID: detectedInstanceID,
      wifiPort: wifiPortSettings
    }).end()
  } catch (error) {
    logger.error(`Exception during Set Link Preference: ${error}`)
    MqttProvider.publishEvent('fail', ['AMT_LinkPreference'], messages.INTERNAL_SERVICE_ERROR)
    res.status(500).json(ErrorResponse(500, 'Exception during Set Link Preference')).end()
  }
}
