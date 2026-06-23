/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type Response, type Request } from 'express'
import { logger, messages } from '../../logging/index.js'
import { ErrorResponse } from '../../utils/amtHelper.js'
import { MqttProvider } from '../../utils/MqttProvider.js'
import { type DeviceAction } from '../../amt/DeviceAction.js'

export async function getOpaqueManagementDataOwner(req: Request, res: Response): Promise<void> {
  try {
    const guid: string = req.params.guid

    MqttProvider.publishEvent(
      'request',
      ['CIM_OpaqueManagementDataOwner'],
      messages.OPAQUE_MANAGEMENT_DATA_OWNER_GET_REQUESTED,
      guid
    )
    const response = await get(req.deviceAction, guid)
    if (response == null) {
      logger.error(`${messages.OPAQUE_MANAGEMENT_DATA_OWNER_GET_REQUEST_FAILED} for guid : ${guid}.`)
      MqttProvider.publishEvent(
        'fail',
        ['CIM_OpaqueManagementDataOwner'],
        messages.OPAQUE_MANAGEMENT_DATA_OWNER_GET_REQUEST_FAILED,
        guid
      )
      res
        .status(400)
        .json(ErrorResponse(400, `${messages.OPAQUE_MANAGEMENT_DATA_OWNER_GET_REQUEST_FAILED} for guid : ${guid}.`))
    } else {
      let data = []
      const items = response.Body?.PullResponse?.Items?.CIM_OpaqueManagementDataOwner
      if (items != null) {
        data = Array.isArray(items) ? items : [items]
      }
      MqttProvider.publishEvent(
        'success',
        ['CIM_OpaqueManagementDataOwner'],
        messages.OPAQUE_MANAGEMENT_DATA_OWNER_GET_SUCCESS,
        guid
      )
      logger.info(JSON.stringify(data, null, '\t'))
      res.status(200).json(data)
    }
  } catch (error) {
    logger.error(`${messages.OPAQUE_MANAGEMENT_DATA_OWNER_EXCEPTION} : ${error}`)
    MqttProvider.publishEvent('fail', ['CIM_OpaqueManagementDataOwner'], messages.INTERNAL_SERVICE_ERROR)
    res.status(500).json(ErrorResponse(500, messages.OPAQUE_MANAGEMENT_DATA_OWNER_EXCEPTION))
  }
}

// device.getOpaqueManagementDataOwner() is separated out for the tests with the side effect of casting the result to any
export async function get(device: DeviceAction, guid: string): Promise<any> {
  return await device.getOpaqueManagementDataOwner()
}
