/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type Response, type Request } from 'express'
import { logger, messages } from '../../logging/index.js'
import { ErrorResponse } from '../../utils/amtHelper.js'
import { MqttProvider } from '../../utils/MqttProvider.js'

export async function getBootCapabilities(req: Request, res: Response): Promise<void> {
  try {
    const guid: string = req.params.guid

    MqttProvider.publishEvent('request', ['AMT_BootCapabilities'], messages.POWER_CAPABILITIES_REQUESTED, guid)

    const result = await req.deviceAction.getBootCapabilities()
    const capabilities = result.Body?.AMT_BootCapabilities

    MqttProvider.publishEvent('success', ['AMT_BootCapabilities'], messages.POWER_CAPABILITIES_SUCCESS, guid)
    res.status(200).json(capabilities).end()
  } catch (error) {
    logger.error(`${messages.POWER_CAPABILITIES_EXCEPTION} : ${error}`)
    MqttProvider.publishEvent('fail', ['AMT_BootCapabilities'], messages.INTERNAL_SERVICE_ERROR)
    res.status(500).json(ErrorResponse(500, messages.POWER_CAPABILITIES_EXCEPTION)).end()
  }
}
