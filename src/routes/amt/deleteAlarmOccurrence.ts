/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type Response, type Request } from 'express'
import { logger, messages } from '../../logging/index.js'
import { ErrorResponse } from '../../utils/amtHelper.js'
import { MqttProvider } from '../../utils/MqttProvider.js'
import { type DeviceAction } from '../../amt/DeviceAction.js'
import { type Selector } from '@device-management-toolkit/wsman-messages/WSMan.js'

export async function deleteAlarmOccurrence(req: Request, res: Response): Promise<void> {
  try {
    const payload = req.body
    const guid: string = req.params.guid

    MqttProvider.publishEvent('request', ['AMT_DeleteAlarm'], messages.ALARM_OCCURRENCES_DELETE_REQUESTED, guid)

    if (payload == null || !('Name' in payload)) {
      logger.error(`${messages.ALARM_OCCURRENCES_INVALID_REQUEST} for guid : ${guid}.`)
      MqttProvider.publishEvent('fail', ['AMT_AlarmOccurrences'], messages.ALARM_OCCURRENCES_INVALID_REQUEST, guid)
      res.status(400).json(ErrorResponse(400, `${messages.ALARM_OCCURRENCES_INVALID_REQUEST} for guid : ${guid}.`))
    } else {
      const selector: Selector = {
        name: 'InstanceID',
        value: payload.Name
      }
      const response = await deleteAlarm(req.deviceAction, selector, guid)
      if (response == null) {
        logger.error(`${messages.ALARM_OCCURRENCES_DELETE_REQUEST_FAILED} for guid : ${guid}.`)
        MqttProvider.publishEvent(
          'fail',
          ['AMT_AlarmOccurrences'],
          messages.ALARM_OCCURRENCES_DELETE_REQUEST_FAILED,
          guid
        )
        res
          .status(400)
          .json(ErrorResponse(400, `${messages.ALARM_OCCURRENCES_DELETE_REQUEST_FAILED} for guid : ${guid}.`))
      } else {
        if (response.Header.Action === 'http://schemas.xmlsoap.org/ws/2004/09/transfer/DeleteResponse') {
          MqttProvider.publishEvent(
            'success',
            ['AMT_AlarmOccurrences'],
            messages.ALARM_OCCURRENCES_DELETE_SUCCESS,
            guid
          )
          res.status(200).json({ status: 'SUCCESS' })
        } else {
          logger.error(`${messages.ALARM_OCCURRENCES_DELETE_REQUEST_NOT_FOUND} for guid : ${guid}.`)
          // The Body isn't particularly useful, so just log it for now
          logger.info('Alarm delete failed:' + JSON.stringify(response.Body, null, '\t'))
          MqttProvider.publishEvent(
            'fail',
            ['AMT_AlarmOccurrences'],
            messages.ALARM_OCCURRENCES_DELETE_REQUEST_NOT_FOUND,
            guid
          )
          // Use 404 for the http status
          res
            .status(404)
            .json(
              ErrorResponse(404, `${messages.ALARM_OCCURRENCES_DELETE_REQUEST_FAILED} for guid : ${guid}.`, 'alarm')
            )
        }
      }
    }
  } catch (error) {
    logger.error(`${messages.ALARM_OCCURRENCES_EXCEPTION} : ${error}`)
    MqttProvider.publishEvent('fail', ['AMT_AlarmOccurrences'], messages.INTERNAL_SERVICE_ERROR)
    res.status(500).json(ErrorResponse(500, messages.ALARM_OCCURRENCES_EXCEPTION))
  }
}

// device.getAlarmClockOccurrences() is separated out for the tests with the side effect of casting the result to any
export async function deleteAlarm(device: DeviceAction, selector: Selector, guid: string): Promise<any> {
  return await device.deleteAlarmClockOccurrence(selector)
}
