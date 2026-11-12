/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type Response, type Request } from 'express'
import { logger, messages } from '../../logging/index.js'
import { ErrorResponse } from '../../utils/amtHelper.js'
import { MqttProvider } from '../../utils/MqttProvider.js'

export async function version(req: Request<{ guid: string }>, res: Response): Promise<void> {
  try {
    const guid: string = req.params.guid
    MqttProvider.publishEvent('request', ['AMT_Version'], messages.POWER_STATE_GET_REQUESTED, guid)
    const response = await getVersion(guid, req)
    if (response == null) {
      logger.error(`${messages.VERSION_REQUEST_FAILED} for guid : ${guid}.`)
      res.status(400).json(ErrorResponse(400, `${messages.VERSION_REQUEST_FAILED} for guid : ${guid}.`))
    } else {
      res.status(200).json(response)
    }
  } catch (error) {
    logger.error(`${messages.VERSION_EXCEPTION} : ${error}`)
    res.status(500).json(ErrorResponse(500, messages.VERSION_EXCEPTION))
  }
}

// matches version 2.x API for Open AMT
export async function getVersion(guid: string, req: Request): Promise<any> {
  const response: Record<string, any> = {}
  response.CIM_SoftwareIdentity = await req.deviceAction.getSoftwareIdentity()
  response.AMT_SetupAndConfigurationService = await req.deviceAction.getSetupAndConfigurationService()
  if (Object.values(response).some((item) => item == null)) {
    return null
  } else {
    return {
      CIM_SoftwareIdentity: {
        responses: response.CIM_SoftwareIdentity?.PullResponse?.Items?.CIM_SoftwareIdentity,
        status: 200
      },
      AMT_SetupAndConfigurationService: {
        response: response.AMT_SetupAndConfigurationService?.Body?.AMT_SetupAndConfigurationService,
        responses: {
          Header: response.AMT_SetupAndConfigurationService?.Header,
          Body: response.AMT_SetupAndConfigurationService.Body?.AMT_SetupAndConfigurationService
        },
        status: 200
      }
    }
  }
}
