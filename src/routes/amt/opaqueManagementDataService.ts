/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type Response, type Request } from 'express'
import { logger, messages } from '../../logging/index.js'
import { ErrorResponse } from '../../utils/amtHelper.js'
import { MqttProvider } from '../../utils/MqttProvider.js'
import { type DeviceAction } from '../../amt/DeviceAction.js'

// Each CIM_OpaqueManagementDataService method maps to a POST route. The shared
// handler resolves the parsed response Envelope, returns the <Method>_OUTPUT on
// success, and applies the same MQTT / logging / error contract as the other
// /amt routes. `method` is the WSMAN method name (used to read the OUTPUT key).
type ServiceInvoker = (device: DeviceAction, body: any) => Promise<any>

function opaqueServiceHandler(method: string, invoke: ServiceInvoker) {
  return async function (req: Request, res: Response): Promise<void> {
    const guid: string = req.params.guid
    try {
      MqttProvider.publishEvent(
        'request',
        ['CIM_OpaqueManagementDataService'],
        messages.OPAQUE_MANAGEMENT_DATA_SERVICE_REQUESTED,
        guid
      )
      const response = await invoke(req.deviceAction, req.body)
      const output = response?.Body?.[`${method}_OUTPUT`]
      if (output == null) {
        logger.error(`${messages.OPAQUE_MANAGEMENT_DATA_SERVICE_REQUEST_FAILED} (${method}) for guid : ${guid}.`)
        MqttProvider.publishEvent(
          'fail',
          ['CIM_OpaqueManagementDataService'],
          messages.OPAQUE_MANAGEMENT_DATA_SERVICE_REQUEST_FAILED,
          guid
        )
        res
          .status(400)
          .json(ErrorResponse(400, `${messages.OPAQUE_MANAGEMENT_DATA_SERVICE_REQUEST_FAILED} for guid : ${guid}.`))
        return
      }
      MqttProvider.publishEvent(
        'success',
        ['CIM_OpaqueManagementDataService'],
        messages.OPAQUE_MANAGEMENT_DATA_SERVICE_SUCCESS,
        guid
      )
      logger.info(JSON.stringify(output, null, '\t'))
      res.status(200).json(output)
    } catch (error) {
      logger.error(`${messages.OPAQUE_MANAGEMENT_DATA_SERVICE_EXCEPTION} (${method}) : ${error}`)
      MqttProvider.publishEvent('fail', ['CIM_OpaqueManagementDataService'], messages.INTERNAL_SERVICE_ERROR)
      res.status(500).json(ErrorResponse(500, messages.OPAQUE_MANAGEMENT_DATA_SERVICE_EXCEPTION))
    }
  }
}

export const readOpaqueManagementData = opaqueServiceHandler('Read', async (device, body) =>
  device.readOpaqueManagementData(body)
)
export const writeOpaqueManagementData = opaqueServiceHandler('Write', async (device, body) =>
  device.writeOpaqueManagementData(body)
)
export const createOpaqueManagementData = opaqueServiceHandler('Create', async (device, body) =>
  device.createOpaqueManagementData(body)
)
export const lockOpaqueManagementData = opaqueServiceHandler('Lock', async (device, body) =>
  device.lockOpaqueManagementData(body)
)
export const assignAccessOpaqueManagementData = opaqueServiceHandler('AssignAccess', async (device, body) =>
  device.assignAccessOpaqueManagementData(body)
)
export const reassignOwnershipOpaqueManagementData = opaqueServiceHandler('ReassignOwnership', async (device, body) =>
  device.reassignOwnershipOpaqueManagementData(body)
)
export const exportOpaqueManagementDataToURI = opaqueServiceHandler('ExportToURI', async (device, body) =>
  device.exportOpaqueManagementDataToURI(body)
)
export const importOpaqueManagementDataFromURI = opaqueServiceHandler('ImportFromURI', async (device, body) =>
  device.importOpaqueManagementDataFromURI(body)
)
