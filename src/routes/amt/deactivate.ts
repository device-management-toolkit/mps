/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { deviceSecretPath } from '../../utils/secretPaths.js'

import { type Response, type Request } from 'express'
import { logger, messages } from '../../logging/index.js'
import { ErrorResponse } from '../../utils/amtHelper.js'
import { MqttProvider } from '../../utils/MqttProvider.js'

export async function deactivate(req: Request, res: Response): Promise<void> {
  try {
    const guid: string = req.params.guid

    const result = await req.deviceAction.unprovisionDevice()
    if (result.Body?.Unprovision_OUTPUT?.ReturnValue === 0) {
      await req.db.devices.delete(guid, req.tenantId)
      await req.secrets.deleteSecretAtPath(deviceSecretPath(guid, req.tenantId))
      res.status(200).json({ status: 'SUCCESS' })
    } else {
      res.status(200).json(result.Body?.Unprovision_OUTPUT)
    }
  } catch (error) {
    logger.error(`${messages.UNPROVISION_EXCEPTION} : ${error}`)
    MqttProvider.publishEvent('fail', ['AMT_Unprovision'], messages.INTERNAL_SERVICE_ERROR)
    res.status(500).json(ErrorResponse(500, messages.UNPROVISION_EXCEPTION))
  }
}
