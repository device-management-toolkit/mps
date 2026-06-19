/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type Response, type Request } from 'express'
import { logger, messages } from '../../../logging/index.js'
import { ErrorResponse } from '../../../utils/amtHelper.js'
import { MqttProvider } from '../../../utils/MqttProvider.js'
import {
  buildWiredSettingsRequest,
  findEthernetPort,
  validateWiredNetworkConfig,
  type WiredNetworkConfigRequest,
  WIRED_ETHERNET_INSTANCE_ID
} from './helper.js'

export async function patchWiredNetworkSettings(req: Request, res: Response): Promise<void> {
  const guid: string = req.params.guid
  try {
    MqttProvider.publishEvent(
      'request',
      ['AMT_EthernetPortSettings'],
      messages.WIRED_NETWORK_SETTINGS_UPDATE_REQUESTED,
      guid
    )

    const config: WiredNetworkConfigRequest = req.body ?? {}

    // 802.1X configuration parity is not yet implemented (planned for a later phase).
    if (config.ieee8021x != null) {
      res.status(501).json(ErrorResponse(501, messages.WIRED_8021X_NOT_SUPPORTED))
      return
    }

    const validationError = validateWiredNetworkConfig(config)
    if (validationError != null) {
      logger.error(`${messages.WIRED_NETWORK_SETTINGS_UPDATE_FAILED}: ${validationError}`)
      res.status(400).json(ErrorResponse(400, validationError))
      return
    }

    const ethernetResponse = await req.deviceAction.getEthernetPortSettings()
    const wiredPort = findEthernetPort(ethernetResponse?.Body?.PullResponse?.Items, WIRED_ETHERNET_INSTANCE_ID)

    if (wiredPort == null) {
      logger.error(`${messages.WIRED_NETWORK_SETTINGS_NOT_FOUND} for guid : ${guid}.`)
      MqttProvider.publishEvent('fail', ['AMT_EthernetPortSettings'], messages.WIRED_NETWORK_SETTINGS_NOT_FOUND, guid)
      res.status(404).json({
        error: messages.WIRED_NETWORK_SETTINGS_NOT_FOUND,
        errorDescription: `${messages.WIRED_NETWORK_SETTINGS_NOT_FOUND} for guid : ${guid}.`
      })
      return
    }

    const settingsRequest = buildWiredSettingsRequest(wiredPort, config)
    const putResponse = await req.deviceAction.putEthernetPortSettings(settingsRequest)

    // A WSMAN PUT echoes the resource on success (HTTP 200) but returns a SOAP
    // Fault envelope with a non-200 status when AMT rejects the change. Treat
    // anything other than a clean 200 / fault-free body as a failure so an
    // AMT-level rejection is not reported as success.
    const putBody = putResponse?.Body as any
    const putFault = putBody?.Fault
    const putStatusCode = putResponse?.statusCode
    const putSucceeded = putResponse != null && putFault == null && (putStatusCode == null || putStatusCode === 200)

    if (!putSucceeded) {
      const faultReason: string = putFault?.Reason?.Text ?? putFault?.Code?.Subcode?.Value ?? ''
      const failureMessage =
        `${messages.WIRED_NETWORK_SETTINGS_UPDATE_FAILED} for guid : ${guid}.` +
        (faultReason !== '' ? ` ${faultReason}` : '')
      logger.error(failureMessage)
      MqttProvider.publishEvent(
        'fail',
        ['AMT_EthernetPortSettings'],
        messages.WIRED_NETWORK_SETTINGS_UPDATE_FAILED,
        guid
      )
      res.status(400).json(ErrorResponse(400, failureMessage))
      return
    }

    MqttProvider.publishEvent(
      'success',
      ['AMT_EthernetPortSettings'],
      messages.WIRED_NETWORK_SETTINGS_UPDATE_SUCCESS,
      guid
    )
    res.status(204).end()
  } catch (error) {
    logger.error(`${messages.NETWORK_SETTINGS_EXCEPTION}: ${error}`)
    MqttProvider.publishEvent('fail', ['AMT_EthernetPortSettings'], messages.INTERNAL_SERVICE_ERROR, guid)
    res.status(500).json(ErrorResponse(500, messages.NETWORK_SETTINGS_EXCEPTION))
  }
}
