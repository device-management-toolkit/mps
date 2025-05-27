/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type Response, type Request } from 'express'
import { logger, messages } from '../../logging/index.js'
import { ErrorResponse } from '../../utils/amtHelper.js'
import { MqttProvider } from '../../utils/MqttProvider.js'
import { type DeviceAction } from '../../amt/DeviceAction.js'
import { type IPS } from '@device-management-toolkit/wsman-messages'

export async function setAlarmOccurrence(req: Request, res: Response): Promise<void> {
  try {
    const payload = req.body
    const guid: string = req.params.guid

    MqttProvider.publishEvent('request', ['AMT_AddAlarm'], messages.ALARM_ADD_REQUESTED, guid)

    if (payload?.ElementName == null || payload.StartTime == null) {
      logger.error(`${messages.ALARM_ADD_INVALID_PARAMETERS} for guid : ${guid}.`)
      if (payload != null) {
        logger.info('Add alarm invalid body: ' + JSON.stringify(payload, null, '\t'))
      } else {
        logger.info('Add alarm missing body')
      }
      MqttProvider.publishEvent('fail', ['AMT_AddAlarm'], messages.ALARM_ADD_REQUEST_FAILED, guid)
      res.status(400).json(ErrorResponse(400, `${messages.ALARM_ADD_INVALID_PARAMETERS} for guid : ${guid}.`))
    } else {
      const alarm: IPS.Models.AlarmClockOccurrence = {
        ElementName: payload.ElementName,
        InstanceID: payload.InstanceID ?? payload.ElementName,
        StartTime: new Date(payload.StartTime),
        Interval: payload.Interval ?? 0,
        DeleteOnCompletion: payload.DeleteOnCompletion ?? true
      }
      const response = await setAlarm(req.deviceAction, alarm, guid)
      if (response == null) {
        logger.error(`${messages.ALARM_ADD_REQUEST_FAILED} for guid : ${guid}.`)
        MqttProvider.publishEvent('fail', ['AMT_AddAlarm'], messages.ALARM_ADD_REQUEST_FAILED, guid)
        res.status(400).json(ErrorResponse(400, `${messages.ALARM_ADD_REQUEST_FAILED} for guid : ${guid}.`))
      } else {
        if (
          response.Header.Action === 'http://intel.com/wbem/wscim/1/amt-schema/1/AMT_AlarmClockService/AddAlarmResponse'
        ) {
          MqttProvider.publishEvent('success', ['AMT_AddAlarm'], messages.ALARM_OCCURRENCES_GET_SUCCESS, guid)
          logger.info(JSON.stringify(response, null, '\t'))
          res.status(200).json({ status: 'SUCCESS', ReturnValue: response.Body.AddAlarm_OUTPUT.ReturnValue })
        } else {
          logger.error(`${messages.ALARM_ADD_REQUEST_FAILED} for guid : ${guid}.`)
          logger.info(JSON.stringify(response, null, '\t'))
          MqttProvider.publishEvent('fail', ['AMT_AddAlarm'], messages.ALARM_ADD_REQUEST_FAILED, guid)
          const subcodeValue = response.Body.Fault.Code.Subcode.Value
          if (subcodeValue.includes('QuotaLimit')) {
            res.status(400).json(ErrorResponse(400, `${messages.ALARM_ADD_QUOTA_LIMIT} for guid : ${guid}.`))
          } else {
            res.status(400).json(ErrorResponse(400, `${messages.ALARM_ADD_INVALID_PARAMETERS} for guid : ${guid}.`))
          }
        }
      }
    }
  } catch (error) {
    logger.error(`${messages.ALARM_OCCURRENCES_EXCEPTION} : ${error}`)
    MqttProvider.publishEvent('fail', ['AMT_AddAlarm'], messages.INTERNAL_SERVICE_ERROR)
    res.status(500).json(ErrorResponse(500, messages.ALARM_OCCURRENCES_EXCEPTION))
  }
}

export async function setAlarm(
  device: DeviceAction,
  alarm: IPS.Models.AlarmClockOccurrence,
  guid: string
): Promise<any> {
  return await device.addAlarmClockOccurrence(alarm)
}
