/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type Response, type Request } from 'express'
import { logger, messages } from '../../logging/index.js'
import { ErrorResponse } from '../../utils/amtHelper.js'
import { MqttProvider } from '../../utils/MqttProvider.js'
import { type DeviceAction } from '../../amt/DeviceAction.js'

export async function enumerateEthernetPortSettings(req: Request, res: Response): Promise<void> {
  try {
    const guid: string = req.params.guid
    const deviceAction: DeviceAction = req.deviceAction as DeviceAction

    logger.debug(`Enumerate Ethernet Port Settings for ${guid}`)
    const result = await deviceAction.enumerateEthernetPortSettings()
    
    // Extract the AMT_EthernetPortSettings from the response
    const settings = (result?.Body?.PullResponse?.Items as any)?.AMT_EthernetPortSettings
    // Ensure settings is always an array
    const settingsArray = Array.isArray(settings) ? settings : (settings ? [settings] : [])
    
    MqttProvider.publishEvent('success', ['AMT_EthernetPortSettings'], 'Ethernet Port Settings enumerated')
    res.status(200).json(settingsArray).end()
  } catch (error) {
    logger.error(`Exception during Enumerate Ethernet Port Settings: ${error}`)
    MqttProvider.publishEvent('fail', ['AMT_EthernetPortSettings'], messages.INTERNAL_SERVICE_ERROR)
    res.status(500).json(ErrorResponse(500, 'Exception during Enumerate Ethernet Port Settings')).end()
  }
}
