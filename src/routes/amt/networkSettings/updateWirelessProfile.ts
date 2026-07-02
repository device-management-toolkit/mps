/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type Response, type Request } from 'express'
import { logger, messages } from '../../../logging/index.js'
import { ErrorResponse } from '../../../utils/amtHelper.js'
import { MqttProvider } from '../../../utils/MqttProvider.js'
import { hasWiFiPort, extractWirelessSettings } from './helper.js'
import {
  findWirelessSettingByPriority,
  findWirelessSettingByProfileName,
  prepareWirelessProfileForApply,
  validateWirelessProfileConfig,
  wait,
  type WirelessProfileConfigRequest
} from './wirelessProfileHelper.js'

export async function updateWirelessProfile(req: Request, res: Response): Promise<void> {
  const guid: string = req.params.guid
  try {
    MqttProvider.publishEvent('request', ['AMT_WiFiProfiles'], messages.WIRELESS_PROFILE_UPDATE_REQUESTED, guid)

    const profile: WirelessProfileConfigRequest = req.body ?? {}

    const validationError = validateWirelessProfileConfig(profile)
    if (validationError != null) {
      logger.error(`${messages.WIRELESS_PROFILE_UPDATE_FAILED}: ${validationError}`)
      res.status(400).json(ErrorResponse(400, validationError))
      return
    }

    const wifiPortResponse = await req.deviceAction.getWiFiPortState()
    if (!hasWiFiPort(wifiPortResponse?.Body?.PullResponse?.Items)) {
      logger.error(`${messages.WIRELESS_PORT_NOT_FOUND} for guid : ${guid}.`)
      MqttProvider.publishEvent('fail', ['AMT_WiFiProfiles'], messages.WIRELESS_PORT_NOT_FOUND, guid)
      res.status(404).json({
        error: messages.WIRELESS_PORT_NOT_FOUND,
        errorDescription: `${messages.WIRELESS_PORT_NOT_FOUND} for guid : ${guid}.`
      })
      return
    }

    const wifiResponse = await req.deviceAction.getWiFiEndpointSettings()
    const settings = extractWirelessSettings(wifiResponse?.Body?.PullResponse?.Items)

    const current = findWirelessSettingByProfileName(settings, profile.profileName)
    if (current == null) {
      logger.error(`${messages.WIRELESS_PROFILE_NOT_FOUND}: ${profile.profileName} for guid : ${guid}.`)
      MqttProvider.publishEvent('fail', ['AMT_WiFiProfiles'], messages.WIRELESS_PROFILE_NOT_FOUND, guid)
      res.status(404).json({
        error: messages.WIRELESS_PROFILE_NOT_FOUND,
        errorDescription: `${messages.WIRELESS_PROFILE_NOT_FOUND}: ${profile.profileName}.`
      })
      return
    }

    const priorityOwner = findWirelessSettingByPriority(settings, profile.priority)
    if (priorityOwner != null && priorityOwner.InstanceID !== current.InstanceID) {
      MqttProvider.publishEvent('fail', ['AMT_WiFiProfiles'], messages.WIRELESS_PROFILE_PRIORITY_EXISTS, guid)
      res.status(409).json(ErrorResponse(409, `${messages.WIRELESS_PROFILE_PRIORITY_EXISTS}: ${profile.priority}.`))
      return
    }

    const prepared = await prepareWirelessProfileForApply(req.deviceAction, profile)
    prepared.wifiRequest.InstanceID = current.InstanceID

    if (prepared.needsPauseBeforeApply) {
      await wait(1000)
    }

    const returnValue = await req.deviceAction.updateWiFiSettings(
      prepared.wifiRequest,
      profile.ieee8021x != null ? prepared.ieee8021xRequest : undefined,
      prepared.certHandles.clientCertHandle || undefined,
      prepared.certHandles.rootCertHandle || undefined
    )

    if (returnValue !== 0) {
      logger.error(`${messages.WIRELESS_PROFILE_UPDATE_FAILED} for guid : ${guid}.`)
      MqttProvider.publishEvent('fail', ['AMT_WiFiProfiles'], messages.WIRELESS_PROFILE_UPDATE_FAILED, guid)
      res.status(400).json(ErrorResponse(400, `${messages.WIRELESS_PROFILE_UPDATE_FAILED} for guid : ${guid}.`))
      return
    }

    MqttProvider.publishEvent('success', ['AMT_WiFiProfiles'], messages.WIRELESS_PROFILE_UPDATE_SUCCESS, guid)
    res.status(204).end()
  } catch (error) {
    logger.error(`${messages.NETWORK_SETTINGS_EXCEPTION}: ${error}`)
    MqttProvider.publishEvent('fail', ['AMT_WiFiProfiles'], messages.INTERNAL_SERVICE_ERROR, guid)
    res.status(500).json(ErrorResponse(500, messages.NETWORK_SETTINGS_EXCEPTION))
  }
}
