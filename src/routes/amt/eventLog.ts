/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type Response, type Request } from 'express'
import { logger, messages } from '../../logging/index.js'
import { ErrorResponse } from '../../utils/amtHelper.js'
import { MqttProvider } from '../../utils/MqttProvider.js'
import {
  SystemEntityTypes,
  SystemFirmwareError,
  SystemFirmwareProgress,
  WatchdogCurrentStates
} from '../../utils/constants.js'
import Common from '../../utils/common.js'
import { type AMT } from '@device-management-toolkit/wsman-messages'

export async function eventLog(req: Request, res: Response): Promise<void> {
  try {
    const guid: string = req.params.guid

    MqttProvider.publishEvent('request', ['AMT_EventLog'], messages.EVENT_LOG_REQUESTED, guid)
    const response = await req.deviceAction.getEventLog()

    if (response != null) {
      MqttProvider.publishEvent('success', ['AMT_EventLog'], messages.EVENT_LOG_SENT, guid)
      const result = parseEventLogs(response)
      res.status(200).json(result)
    } else {
      logger.error(`${messages.EVENT_LOG_REQUEST_FAILED} for guid : ${guid}.`)
      MqttProvider.publishEvent('fail', ['AMT_EventLog'], messages.EVENT_LOG_REQUEST_FAILED, guid)
      res.status(400).json(ErrorResponse(400, `${messages.EVENT_LOG_REQUEST_FAILED} for guid : ${guid}.`))
    }
  } catch (error) {
    logger.error(`${messages.EVENT_LOG_EXCEPTION}: ${error}`)
    MqttProvider.publishEvent('fail', ['AMT_EventLog'], messages.INTERNAL_SERVICE_ERROR)
    res.status(500).json(ErrorResponse(500, messages.EVENT_LOG_EXCEPTION))
  }
}

interface EventLog extends AMT.Models.EVENT_DATA {
  EntityStr?: string
  Desc?: string
}

export function GetEventDetailStr(eventSensorType: number, eventOffset: number, eventDataField: number[]): string {
  switch (eventSensorType) {
    case 6:
      return `Authentication failed ${eventDataField[1] + (eventDataField[2] << 8)} times. The system may be under attack.`
    case 15: {
      if (eventDataField[0] === 235) return 'Invalid Data'
      if (eventOffset === 0) {
        return SystemFirmwareError[eventDataField[1]]
      }
      return SystemFirmwareProgress[eventDataField[1]]
    }
    case 18:
      // System watchdog event
      if (eventDataField[0] === 170) {
        return `Agent watchdog ${Common.Char2hex(eventDataField[4]) + Common.Char2hex(eventDataField[3]) + Common.Char2hex(eventDataField[2]) + Common.Char2hex(eventDataField[1])}-${Common.Char2hex(eventDataField[6]) + Common.Char2hex(eventDataField[5])}-... changed to ${WatchdogCurrentStates[eventDataField[7]]}`
      }
      return null
    case 30:
      return 'No bootable media'
    case 32:
      return 'Operating system lockup or power interrupt'
    case 35:
      return 'System boot failure'
    case 37:
      return 'System firmware started (at least one CPU is properly executing).'
    default:
      return `Unknown Sensor Type #${eventSensorType}`
  }
}

function parseEventLogs(response: any): EventLog[] {
  const recordArray: EventLog[] = []
  if (typeof response.Body.GetRecords_OUTPUT.RecordArray === 'string') {
    response.Body.GetRecords_OUTPUT.RecordArray = [response.Body.GetRecords_OUTPUT.RecordArray]
  }
  response.Body.GetRecords_OUTPUT?.RecordArray?.forEach((record: string) => {
    const eventRecord = Buffer.from(record, 'base64')
    if (eventRecord != null) {
      const log: EventLog = {}
      const TimeStamp = Common.ReadBufferIntX(eventRecord, 0)
      if (TimeStamp > 0 && TimeStamp < 0xffffffff) {
        const t = new Date()
        log.DeviceAddress = eventRecord[4]
        log.EventSensorType = eventRecord[5]
        log.EventType = eventRecord[6]
        log.EventOffset = eventRecord[7]
        log.EventSourceType = eventRecord[8]
        log.EventSeverity = eventRecord[9] as AMT.Types.EVENT_DATA.EventSeverity
        log.SensorNumber = eventRecord[10]
        log.Entity = eventRecord[11]
        log.EntityInstance = eventRecord[12]
        log.EventData = []
        log.TimeStamp = new Date((TimeStamp + t.getTimezoneOffset() * 60) * 1000)
      }
      for (let j = 13; j < 21; j++) {
        log.EventData.push(eventRecord[j])
      }
      log.EntityStr = SystemEntityTypes[log.Entity]
      log.Desc = GetEventDetailStr(log.EventSensorType, log.EventOffset, log.EventData)
      if (log.EntityStr == null) {
        log.EntityStr = 'Unknown'
      }
      recordArray.push(log)
    }
  })
  return recordArray
}
