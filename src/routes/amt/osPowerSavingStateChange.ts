/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type IPS } from '@open-amt-cloud-toolkit/wsman-messages'
import { type Request, type Response } from 'express'
import { logger, messages } from '../../logging/index.js'
import { ErrorResponse } from '../../utils/amtHelper.js'
import { MqttProvider } from '../../utils/MqttProvider.js'

export async function osPowerSavingStateChange(req: Request, res: Response): Promise<void> {
    try {
      const guid: string = req.params.guid
      const payload = req.body      

      MqttProvider.publishEvent('request', ['IPS_OSPowerSavingStateChange'], messages.OS_POWER_SAVING_STATE_CHANGE_REQUESTED, guid)    

      if(payload?.RequestOSPowerSavingStateChange_INPUT?.OSPowerSavingState == null)      
        {
            MqttProvider.publishEvent('fail', ['IPS_OSPowerSavingStateChange'], messages.OS_POWER_SAVING_STATE_CHANGE_FAILED, guid)
            logger.error(`${messages.OS_POWER_SAVING_STATE_CHANGE_FAILED} for guid : ${guid}. Malformed Input(RequestOSPowerSavingStateChange_INPUT.OSPowerSavingState is missing): ${JSON.stringify(payload)}`)
            res.status(400).json(ErrorResponse(400, `${messages.OS_POWER_SAVING_STATE_CHANGE_REQUESTED} for guid : ${guid}.`))
        } 
      else 
      {
        const response = await req.deviceAction.requestOSPowerSavingStateChange(
            payload.RequestOSPowerSavingStateChange_INPUT.OSPowerSavingState as IPS.Types.PowerManagementService.OSPowerSavingState)
        
        if (response?.Body?.RequestOSPowerSavingStateChange_OUTPUT?.ReturnValue != null)
        {
        res.status(200).send({Body:{RequestOSPowerSavingStateChange_OUTPUT:{ ReturnValue: response.Body.RequestOSPowerSavingStateChange_OUTPUT.ReturnValue}}})
        } else {
            MqttProvider.publishEvent('fail', ['IPS_OSPowerSavingStateChange'], messages.OS_POWER_SAVING_STATE_CHANGE_FAILED, guid)
            logger.error(`${messages.OS_POWER_SAVING_STATE_CHANGE_FAILED} for guid : ${guid}. Response: ${JSON.stringify(response)}`)
            res.status(400).json(ErrorResponse(400, `${messages.OS_POWER_SAVING_STATE_CHANGE_FAILED} for guid : ${guid}.`))
        }
      }
    } catch (error) {
      logger.error(`${messages.OS_POWER_SAVING_STATE_EXCEPTION} : ${error}`)
      MqttProvider.publishEvent('fail', ['IPS_OSPowerSavingStateChange'], messages.INTERNAL_SERVICE_ERROR)
      res.status(500).json(ErrorResponse(500, messages.OS_POWER_SAVING_STATE_EXCEPTION))
    }
  }
  