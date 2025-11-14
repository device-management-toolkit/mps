/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type Response, type Request } from 'express'
import { logger, messages } from '../../logging/index.js'
import { ErrorResponse } from '../../utils/amtHelper.js'
import { MqttProvider } from '../../utils/MqttProvider.js'
import { type DeviceAction } from '../../amt/DeviceAction.js'

export async function getEthernetPortSettings(req: Request, res: Response): Promise<void> {
  try {
    const guid: string = req.params.guid
    const instanceID: string | undefined = req.query.instanceID as string
    const deviceAction: DeviceAction = req.deviceAction as DeviceAction

    logger.debug(`Get Ethernet Port Settings for ${guid}, instanceID: ${instanceID ?? 'default'}`)
    const result = await deviceAction.getEthernetPortSettings(instanceID)
    MqttProvider.publishEvent('success', ['AMT_EthernetPortSettings'], 'Ethernet Port Settings retrieved')
    res.status(200).json(result).end()
  } catch (error) {
    logger.error(`Exception during Get Ethernet Port Settings: ${error}`)
    MqttProvider.publishEvent('fail', ['AMT_EthernetPortSettings'], messages.INTERNAL_SERVICE_ERROR)
    res.status(500).json(ErrorResponse(500, 'Exception during Get Ethernet Port Settings')).end()
  }
}
