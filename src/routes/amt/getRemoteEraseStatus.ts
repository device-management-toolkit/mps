/*********************************************************************
 * Copyright (c) Intel Corporation 2026
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type Request, type Response } from 'express'
import { logger, messages } from '../../logging/index.js'
import { ErrorResponse } from '../../utils/amtHelper.js'
import { MqttProvider } from '../../utils/MqttProvider.js'

interface RemoteEraseStatus {
  status: 'pending' | 'succeeded' | 'failed' | 'unknown'
  message: string
}

export async function getRemoteEraseStatus(req: Request, res: Response): Promise<void> {
  try {
    const guid: string = req.params.guid
    MqttProvider.publishEvent('request', ['AMT_BootSettingData'], messages.REMOTE_ERASE_STATUS_REQUESTED, guid)

    const result = await req.deviceAction.getBootOptions()
    if (result?.AMT_BootSettingData == null) {
      throw new Error('AMT_BootSettingData response is missing')
    }
    const status = parseBIOSLastStatus(result.AMT_BootSettingData.BIOSLastStatus)

    MqttProvider.publishEvent('success', ['AMT_BootSettingData'], messages.REMOTE_ERASE_STATUS_SUCCESS, guid)
    res.status(200).json(status).end()
  } catch (error) {
    logger.error(`${messages.REMOTE_ERASE_STATUS_EXCEPTION} : ${error}`)
    MqttProvider.publishEvent('fail', ['AMT_BootSettingData'], messages.INTERNAL_SERVICE_ERROR, req.params.guid)
    res.status(500).json(ErrorResponse(500, messages.REMOTE_ERASE_STATUS_EXCEPTION)).end()
  }
}

function parseBIOSLastStatus(value: unknown): RemoteEraseStatus {
  if (Array.isArray(value) && value.length >= 2) {
    const [status, detail] = value
    switch (status) {
      case 0:
        if (detail === 0) {
          return { status: 'succeeded', message: 'BIOS reported that the erase completed successfully.' }
        }
        break
      case 1:
      case 2:
        return { status: 'pending', message: 'Waiting for the BIOS erase result.' }
      case 0xffff:
        switch (detail) {
          case 1:
            return { status: 'failed', message: 'BIOS erase failed: general drive failure.' }
          case 2:
            return { status: 'failed', message: 'BIOS erase failed: drive password/authentication failure.' }
          case 3:
            return { status: 'failed', message: 'BIOS erase failed: feature is not supported.' }
          default:
            return { status: 'failed', message: 'BIOS reported that the erase failed.' }
        }
    }
  }
  return { status: 'unknown', message: 'BIOS erase outcome is unconfirmed.' }
}
