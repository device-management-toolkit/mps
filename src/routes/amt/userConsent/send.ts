/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type Response, type Request } from 'express'
import { logger, messages } from '../../../logging/index.js'
import { ErrorResponse } from '../../../utils/amtHelper.js'
import { MqttProvider } from '../../../utils/MqttProvider.js'
import { AMTStatusCodes } from '../../../utils/constants.js'
import { mapAMTReturnValueToHttpStatus, getDetailedErrorMessage } from './statusMapper.js'

export async function send(req: Request, res: Response): Promise<void> {
  const userConsentCode: number = req.body.consentCode
  const guid: string = req.params.guid
  try {
    // Send in the consent code obtained from Client as verification
    const response = await req.deviceAction.sendUserConsentCode(userConsentCode)
    if (response != null) {
      const result = {
        Header: response.Header,
        Body: response.Body.SendOptInCode_OUTPUT
      }
      result.Body.ReturnValueStr = AMTStatusCodes[result.Body.ReturnValue]
      
      if (result.Body?.ReturnValue.toString() === '0') {
        MqttProvider.publishEvent('success', ['Send_User_Consent_Code'], messages.USER_CONSENT_SENT_SUCCESS, guid)
        res.status(200).json(result)
      } else {
        // Map AMT return value to appropriate HTTP status code
        const httpStatus = mapAMTReturnValueToHttpStatus(result.Body.ReturnValueStr)
        const errorDetail = getDetailedErrorMessage(result.Body.ReturnValue, result.Body.ReturnValueStr, 'send')
        
        logger.error(`${messages.USER_CONSENT_SENT_FAILED} for guid : ${guid}. ReturnValue: ${result.Body.ReturnValue} (${result.Body.ReturnValueStr})`)
        MqttProvider.publishEvent('fail', ['Send_User_Consent_Code'], messages.USER_CONSENT_SENT_FAILED, guid)
        
        // Return detailed error response with original AMT data
        res.status(httpStatus).json({
          ...errorDetail,
          amtResponse: result
        })
      }
    } else {
      logger.error(`${messages.USER_CONSENT_SENT_FAILED} for guid : ${guid}.`)
      MqttProvider.publishEvent('fail', ['Send_User_Consent_Code'], messages.USER_CONSENT_SENT_FAILED, guid)
      res.status(400).json(ErrorResponse(400, `${messages.USER_CONSENT_SENT_FAILED} for guid : ${guid}.`))
    }
  } catch (error) {
    logger.error(`${messages.USER_CONSENT_SENT_EXCEPTION} for guid ${guid}: ${error}`)
    MqttProvider.publishEvent('fail', ['Send_User_Consent_Code'], messages.INTERNAL_SERVICE_ERROR)
    res.status(500).json(ErrorResponse(500, messages.USER_CONSENT_SENT_EXCEPTION))
  }
}
