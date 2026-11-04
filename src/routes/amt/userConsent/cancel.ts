/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type Response, type Request } from 'express'
import { logger, messages } from '../../../logging/index.js'
import { ErrorResponse } from '../../../utils/amtHelper.js'
import { MqttProvider } from '../../../utils/MqttProvider.js'
import { AMTStatusCodes } from '../../../utils/constants.js'

export async function cancel(req: Request<{ guid: string }>, res: Response): Promise<void> {
  try {
    const guid: string = req.params.guid
    // Cancel a previous opt-in code request.
    const response = await req.deviceAction.cancelUserConsentCode()
    if (response != null) {
      const result = {
        Header: response.Header,
        Body: response.Body.CancelOptIn_OUTPUT
      }
      result.Body.ReturnValueStr = AMTStatusCodes[result.Body.ReturnValue]
      if (result.Body?.ReturnValue.toString() === '0') {
        MqttProvider.publishEvent('success', ['Cancel_User_Consent_Code'], messages.USER_CONSENT_CANCEL_SUCCESS, guid)
        res.status(200).json(result)
      } else if (result.Body?.ReturnValue.toString() !== '0') {
        logger.error(`${messages.USER_CONSENT_CANCEL_FAILED} : ${guid}.`)
        MqttProvider.publishEvent('fail', ['Cancel_User_Consent_Code'], messages.USER_CONSENT_CANCEL_FAILED, guid)
        res.status(400).json(result)
      }
    } else {
      logger.error(`${messages.USER_CONSENT_CANCEL_FAILED} for guid : ${guid}.`)
      MqttProvider.publishEvent('fail', ['Cancel_User_Consent_Code'], messages.USER_CONSENT_CANCEL_FAILED, guid)
      res.status(400).json(ErrorResponse(400, `${messages.USER_CONSENT_CANCEL_FAILED} for guid : ${guid}.`))
    }
  } catch (error) {
    logger.error(`${messages.USER_CONSENT_CANCEL_EXCEPTION} : ${error}`)
    MqttProvider.publishEvent('fail', ['Cancel_User_Consent_Code'], messages.INTERNAL_SERVICE_ERROR)
    res.status(500).json(ErrorResponse(500, messages.USER_CONSENT_CANCEL_EXCEPTION))
  }
}
