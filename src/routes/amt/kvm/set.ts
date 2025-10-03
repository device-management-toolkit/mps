/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/
import { type Response, type Request } from 'express'
import { logger, messages } from '../../../logging/index.js'
import { ErrorResponse } from '../../../utils/amtHelper.js'
import { MqttProvider } from '../../../utils/MqttProvider.js'
import { type DeviceAction } from '../../../amt/DeviceAction.js'
import { IPS } from '@device-management-toolkit/wsman-messages/index.js'

export async function setKVMRedirectionSettingData(req: Request, res: Response): Promise<void> {
  try {
    const guid: string = req.params.guid
    const displayIndex: number = req.body.displayIndex
    const deviceAction: DeviceAction = req.deviceAction as DeviceAction
    logger.debug(`get KVM Screen Setting Data for ${guid}`)

    const data = await deviceAction.getKVMRedirectionSettingData()
    const kvmData = data?.IPS_KVMRedirectionSettingData
    let kvmRequest: IPS.Models.KVMRedirectionSettingData | undefined

    if (kvmData) {
      kvmRequest = {
        ...kvmData,
        DefaultScreen: displayIndex
      }
    }
    const settings = await deviceAction.putKVMRedirectionSettingData(kvmRequest)
    if (!settings) {
      res.status(500).json(ErrorResponse(500, 'Failed to set KVM Redirection Setting Data'))
    } else {
      res.status(200).json(settings)
    }
  } catch (error) {
    logger.error(`${messages.KVM_SET_EXCEPTION} : ${error}`)
    MqttProvider.publishEvent('fail', ['AMT_KVM'], messages.INTERNAL_SERVICE_ERROR)
    res.status(500).json(ErrorResponse(500, messages.KVM_SET_EXCEPTION))
  }
}
