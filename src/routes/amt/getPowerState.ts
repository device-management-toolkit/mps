/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type Request, type Response } from 'express'
import { logger, messages } from '../../logging/index.js'
import { ErrorResponse } from '../../utils/amtHelper.js'
import { MqttProvider } from '../../utils/MqttProvider.js'

export async function powerState(req: Request, res: Response): Promise<void> {
  try {
    const guid: string = req.params.guid
    MqttProvider.publishEvent('request', ['AMT_PowerState'], messages.POWER_STATE_GET_REQUESTED, guid)

    let osresponse
    try {
      logger.info(messages.OS_POWER_SAVING_STATE_GET_REQUESTED)
      osresponse = await req.deviceAction.getOSPowerSavingState()
      if (!osresponse?.Body?.IPS_PowerManagementService?.OSPowerSavingState) {
        logger.error(messages.OS_POWER_SAVING_STATE_GET_FAILED)
      }
    } catch (osError) {
      logger.error(`${messages.OS_POWER_SAVING_STATE_EXCEPTION} : ${osError}`)
      osresponse = null
    }

    const response = await req.deviceAction.getPowerState()

    if (
      response?.PullResponse?.Items?.CIM_AssociatedPowerManagementService?.PowerState &&
      osresponse?.Body?.IPS_PowerManagementService?.OSPowerSavingState
    ) {
      res.status(200).send({
        powerstate: response.PullResponse.Items.CIM_AssociatedPowerManagementService.PowerState,
        OSPowerSavingState: osresponse.Body?.IPS_PowerManagementService?.OSPowerSavingState
      })
    } else {
      MqttProvider.publishEvent('fail', ['AMT_PowerState'], messages.POWER_STATE_REQUEST_FAILED, guid)
      logger.error(`${messages.POWER_STATE_REQUEST_FAILED} for guid : ${guid}.`)
      res.status(400).json(ErrorResponse(400, `${messages.POWER_STATE_REQUEST_FAILED} for guid : ${guid}.`))
    }
  } catch (error) {
    logger.error(`${messages.POWER_STATE_EXCEPTION} : ${error}`)
    MqttProvider.publishEvent('fail', ['AMT_PowerState'], messages.INTERNAL_SERVICE_ERROR)
    res.status(500).json(ErrorResponse(500, messages.POWER_STATE_EXCEPTION))
  }
}
