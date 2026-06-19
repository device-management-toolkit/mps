/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type Response, type Request } from 'express'
import { logger, messages } from '../../../logging/index.js'
import { ErrorResponse } from '../../../utils/amtHelper.js'
import { MqttProvider } from '../../../utils/MqttProvider.js'
import { findEthernetPort, toWiredNetworkInfo, WIRED_ETHERNET_INSTANCE_ID } from './helper.js'

export async function getWiredNetworkSettings(req: Request, res: Response): Promise<void> {
  const guid: string = req.params.guid
  try {
    MqttProvider.publishEvent(
      'request',
      ['AMT_EthernetPortSettings'],
      messages.WIRED_NETWORK_SETTINGS_GET_REQUESTED,
      guid
    )

    const ethernetResponse = await req.deviceAction.getEthernetPortSettings()
    const wiredPort = findEthernetPort(ethernetResponse?.Body?.PullResponse?.Items, WIRED_ETHERNET_INSTANCE_ID)

    if (wiredPort == null) {
      logger.error(`${messages.WIRED_NETWORK_SETTINGS_NOT_FOUND} for guid : ${guid}.`)
      MqttProvider.publishEvent('fail', ['AMT_EthernetPortSettings'], messages.WIRED_NETWORK_SETTINGS_NOT_FOUND, guid)
      res.status(404).json(ErrorResponse(404, `${messages.WIRED_NETWORK_SETTINGS_NOT_FOUND} for guid : ${guid}.`))
      return
    }

    const ieee8021xResponse = await req.deviceAction.getIPSIEEE8021xSettings()
    const ieee8021x = ieee8021xResponse?.Body?.IPS_IEEE8021xSettings ?? null

    MqttProvider.publishEvent(
      'success',
      ['AMT_EthernetPortSettings'],
      messages.WIRED_NETWORK_SETTINGS_GET_SUCCESS,
      guid
    )
    res.status(200).json(toWiredNetworkInfo(wiredPort, ieee8021x))
  } catch (error) {
    logger.error(`${messages.NETWORK_SETTINGS_EXCEPTION}: ${error}`)
    MqttProvider.publishEvent('fail', ['AMT_EthernetPortSettings'], messages.INTERNAL_SERVICE_ERROR, guid)
    res.status(500).json(ErrorResponse(500, messages.NETWORK_SETTINGS_EXCEPTION))
  }
}
