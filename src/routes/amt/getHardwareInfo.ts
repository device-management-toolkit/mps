/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type Response, type Request } from 'express'
import { logger, messages } from '../../logging/index.js'
import { ErrorResponse } from '../../utils/amtHelper.js'
import { MqttProvider } from '../../utils/MqttProvider.js'
import { type DeviceAction } from '../../amt/DeviceAction.js'

export async function hardwareInfo(req: Request<{ guid: string }>, res: Response): Promise<void> {
  try {
    const guid: string = req.params.guid

    MqttProvider.publishEvent('request', ['AMT_HardwareInfo'], messages.HARDWARE_INFORMATION_GET_REQUESTED, guid)
    const response = await get(req.deviceAction, guid)
    if (Object.values(response).some((item) => item == null)) {
      logger.error(`${messages.HARDWARE_INFORMATION_REQUEST_FAILED} for guid : ${guid}.`)
      MqttProvider.publishEvent('fail', ['AMT_HardwareInfo'], messages.HARDWARE_INFORMATION_REQUEST_FAILED, guid)
      res.status(400).json(ErrorResponse(400, `${messages.HARDWARE_INFORMATION_REQUEST_FAILED} for guid : ${guid}.`))
    } else {
      MqttProvider.publishEvent('success', ['AMT_HardwareInfo'], messages.HARDWARE_INFORMATION_GET_SUCCESS, guid)
      logger.info(JSON.stringify(response, null, '\t'))
      res.status(200).json(formatResponse(response))
    }
  } catch (error) {
    logger.error(`${messages.HARDWARE_INFORMATION_EXCEPTION} : ${error}`)
    MqttProvider.publishEvent('fail', ['AMT_HardwareInfo'], messages.INTERNAL_SERVICE_ERROR)
    res.status(500).json(ErrorResponse(500, messages.HARDWARE_INFORMATION_EXCEPTION))
  }
}

export async function get(device: DeviceAction, guid: string): Promise<Record<string, any>> {
  const response: Record<string, any> = {}
  response.CIM_ComputerSystemPackage = await device.getComputerSystemPackage()
  response.CIM_Chassis = await device.getChassis()
  response.CIM_Card = await device.getCard()
  response.CIM_BIOSElement = await device.getBIOSElement()
  response.CIM_Processor = await device.getProcessor()
  response.CIM_PhysicalMemory = await device.getPhysicalMemory()
  response.CIM_MediaAccessDevice = await device.getMediaAccessDevice()
  response.CIM_PhysicalPackage = await device.getPhysicalPackage()
  response.CIM_SystemPackaging = await device.getSystemPackaging()
  response.CIM_Chip = await device.getChip()

  return response
}

// matches version 2.x API for Open AMT
// To do: CIM_ComputerSystemPackage and CIM_SystemPackaging returns same data, similarly CIM_Card and CIM_PhysicalPackage
export function formatResponse(response: any): any {
  return {
    CIM_ComputerSystemPackage: {
      response: response.CIM_ComputerSystemPackage?.Body?.CIM_ComputerSystemPackage,
      responses: Array.isArray(response.CIM_ComputerSystemPackage)
        ? response.CIM_ComputerSystemPackage
        : [response.CIM_ComputerSystemPackage],
      status: response.CIM_ComputerSystemPackage?.Body?.CIM_ComputerSystemPackage ? 200 : 400
    },
    CIM_SystemPackaging: {
      responses: [response.CIM_SystemPackaging?.Body?.PullResponse?.Items.CIM_ComputerSystemPackage],
      status: response.CIM_SystemPackaging?.Body?.PullResponse?.Items.CIM_ComputerSystemPackage ? 200 : 400
    },
    CIM_Chassis: {
      response: response.CIM_Chassis?.Body?.CIM_Chassis,
      responses: Array.isArray(response.CIM_Chassis) ? response.CIM_Chassis : [response.CIM_Chassis],
      status: response.CIM_Chassis?.Body?.CIM_Chassis ? 200 : 400
    },
    CIM_Chip: {
      responses: [response.CIM_Chip?.Body?.PullResponse?.Items?.CIM_Chip],
      status: response.CIM_Chip?.Body ? 200 : 400
    },
    CIM_Card: {
      response: response.CIM_Card?.Body?.CIM_Card,
      responses: Array.isArray(response.CIM_Card?.Body?.CIM_Card) ? response.CIM_Card : [response.CIM_Card],
      status: response.CIM_Card?.Body ? 200 : 400
    },
    CIM_BIOSElement: {
      response: response.CIM_BIOSElement?.Body?.CIM_BIOSElement,
      responses: Array.isArray(response.CIM_BIOSElement?.Body?.CIM_BIOSElement)
        ? response.CIM_BIOSElement
        : [response.CIM_BIOSElement],
      status: response.CIM_BIOSElement?.Body ? 200 : 400
    },
    CIM_Processor: {
      responses: [response.CIM_Processor?.Body?.PullResponse?.Items?.CIM_Processor],
      status: response.CIM_Processor?.Body?.PullResponse?.Items?.CIM_Processor ? 200 : 400
    },
    CIM_PhysicalMemory: {
      responses: Array.isArray(response.CIM_PhysicalMemory?.Body?.PullResponse?.Items?.CIM_PhysicalMemory)
        ? response.CIM_PhysicalMemory?.Body?.PullResponse?.Items?.CIM_PhysicalMemory
        : [response.CIM_PhysicalMemory?.Body?.PullResponse?.Items?.CIM_PhysicalMemory],
      status: response.CIM_PhysicalMemory?.Body?.PullResponse?.Items?.CIM_PhysicalMemory ? 200 : 400
    },
    CIM_MediaAccessDevice: {
      responses: Array.isArray(response.CIM_MediaAccessDevice?.Body?.PullResponse?.Items?.CIM_MediaAccessDevice)
        ? response.CIM_MediaAccessDevice?.Body?.PullResponse?.Items?.CIM_MediaAccessDevice
        : [response.CIM_MediaAccessDevice?.Body?.PullResponse?.Items?.CIM_MediaAccessDevice],
      status: response.CIM_MediaAccessDevice?.Body?.PullResponse?.Items?.CIM_MediaAccessDevice ? 200 : 400
    },
    CIM_PhysicalPackage: {
      responses: [response.CIM_PhysicalPackage?.Body?.PullResponse?.Items?.CIM_Card],
      status: response.CIM_PhysicalPackage?.Body?.PullResponse?.Items?.CIM_Card ? 200 : 400
    }
  }
}
