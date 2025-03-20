/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type Request, type Response } from 'express'
import { logger, messages } from '../../logging/index.js'
import { ErrorResponse } from '../../utils/amtHelper.js'
import { MqttProvider } from '../../utils/MqttProvider.js'

export async function osPowerSavingState(req: Request, res: Response): Promise<void> {
  try {
    const guid: string = req.params.guid
    MqttProvider.publishEvent('request', ['IPS_OSPowerSavingState'], messages.OS_POWER_SAVING_STATE_GET_REQUESTED, guid)    
    const response = await req.deviceAction.getOSPowerSavingState()
    
    for(const property in response){
        logger.error(`Property[${property}]: ${response[property]}`);
    }    

    if (response!= null && response['OSPowerSavingState']!= null) {
      res.status(200).send({ OSPowerSavingState: response['OSPowerSavingState']})
    } else {
      MqttProvider.publishEvent('fail', ['IPS_OSPowerSavingState'], messages.OS_POWER_SAVING_STATE_GET_FAILED, guid)
      logger.error(`${messages.OS_POWER_SAVING_STATE_GET_FAILED} for guid : ${guid}. Response: ${JSON.stringify(response)}`)
      res.status(400).json(ErrorResponse(400, `${messages.OS_POWER_SAVING_STATE_GET_FAILED} for guid : ${guid}.`))
    }
  } catch (error) {
    logger.error(`${messages.OS_POWER_SAVING_STATE_EXCEPTION} : ${error}`)
    MqttProvider.publishEvent('fail', ['IPS_OSPowerSavingState'], messages.INTERNAL_SERVICE_ERROR)
    res.status(500).json(ErrorResponse(500, messages.OS_POWER_SAVING_STATE_EXCEPTION))
  }
}