/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type Request, type Response } from 'express'
import { logger, messages } from '../../logging/index.js'
import { ErrorResponse } from '../../utils/amtHelper.js'
import { MqttProvider } from '../../utils/MqttProvider.js'
import { operationWithTimeout, TIMEOUT_MS_DEFAULT, TimeoutError } from '../../utils/timeoutOpManagement.js'

export async function powerState(req: Request, res: Response): Promise<void> {
  try {
    const guid: string = req.params.guid
    let osPowerSavingState = 0
    MqttProvider.publishEvent('request', ['AMT_PowerState'], messages.POWER_STATE_GET_REQUESTED, guid)

    try {
      logger.info(messages.OS_POWER_SAVING_STATE_GET_REQUESTED)
      const osresponse = await operationWithTimeout(req.deviceAction.getOSPowerSavingState(), TIMEOUT_MS_DEFAULT)
      const osPowerSavingStateValue = osresponse?.Body?.IPS_PowerManagementService?.OSPowerSavingState
      if (osPowerSavingStateValue != null) {
        osPowerSavingState = osPowerSavingStateValue
      } else {
        logger.error(messages.OS_POWER_SAVING_STATE_GET_FAILED)
      }
    } catch (osError) {
      logger.error(`${messages.OS_POWER_SAVING_STATE_EXCEPTION} : ${osError}`)
    }

    const response = await operationWithTimeout(req.deviceAction.getPowerState(), TIMEOUT_MS_DEFAULT)

    if (response?.PullResponse?.Items?.CIM_AssociatedPowerManagementService?.PowerState) {
      res.status(200).send({
        powerstate: response.PullResponse.Items.CIM_AssociatedPowerManagementService.PowerState,
        OSPowerSavingState: osPowerSavingState
      })
    } else {
      MqttProvider.publishEvent('fail', ['AMT_PowerState'], messages.POWER_STATE_REQUEST_FAILED, guid)
      logger.error(`${messages.POWER_STATE_REQUEST_FAILED} for guid : ${guid}.`)
      res.status(400).json(ErrorResponse(400, `${messages.POWER_STATE_REQUEST_FAILED} for guid : ${guid}.`))
    }
  } catch (error) {
    logger.error(`${messages.POWER_STATE_EXCEPTION} : ${error}`)
    MqttProvider.publishEvent('fail', ['AMT_PowerState'], messages.INTERNAL_SERVICE_ERROR)

    if (error instanceof TimeoutError) {
      res.status(404).json(ErrorResponse(404, messages.POWER_STATE_EXCEPTION))
    } else {
      res.status(500).json(ErrorResponse(500, messages.POWER_STATE_EXCEPTION))
    }
  }
}
