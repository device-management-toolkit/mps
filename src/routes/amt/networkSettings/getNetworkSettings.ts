/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type Response, type Request } from 'express'
import { logger, messages } from '../../../logging/index.js'
import { ErrorResponse } from '../../../utils/amtHelper.js'
import { MqttProvider } from '../../../utils/MqttProvider.js'
import {
  findEthernetPort,
  toWiFiNetworks,
  toWiFiPortConfigService,
  toWiredNetworkInfo,
  toWirelessIEEE8021xSettings,
  toWirelessNetworkInfo,
  WIRED_ETHERNET_INSTANCE_ID,
  WIRELESS_ETHERNET_INSTANCE_ID,
  type NetworkSettings,
  type WiredNetworkInfo,
  type WirelessNetworkInfo
} from './helper.js'

/**
 * Returns the combined wired + wireless AMT network settings for a device,
 * matching Console's GET /api/v1/amt/networkSettings/:guid response.
 */
export async function getNetworkSettings(req: Request, res: Response): Promise<void> {
  const guid: string = req.params.guid
  try {
    MqttProvider.publishEvent(
      'request',
      ['AMT_EthernetPortSettings'],
      messages.WIRED_NETWORK_SETTINGS_GET_REQUESTED,
      guid
    )

    const ethernetResponse = await req.deviceAction.getEthernetPortSettings()
    const items = ethernetResponse?.Body?.PullResponse?.Items
    const wiredPort = findEthernetPort(items, WIRED_ETHERNET_INSTANCE_ID)
    const wirelessPort = findEthernetPort(items, WIRELESS_ETHERNET_INSTANCE_ID)

    if (wiredPort == null && wirelessPort == null) {
      logger.error(`${messages.NETWORK_SETTINGS_NOT_FOUND} for guid : ${guid}.`)
      MqttProvider.publishEvent('fail', ['AMT_EthernetPortSettings'], messages.NETWORK_SETTINGS_NOT_FOUND, guid)
      res.status(404).json(ErrorResponse(404, `${messages.NETWORK_SETTINGS_NOT_FOUND} for guid : ${guid}.`))
      return
    }

    let wired: WiredNetworkInfo | null = null
    if (wiredPort != null) {
      const ieee8021xResponse = await req.deviceAction.getIPSIEEE8021xSettings()
      const ieee8021x = ieee8021xResponse?.Body?.IPS_IEEE8021xSettings ?? null
      wired = toWiredNetworkInfo(wiredPort, ieee8021x)
    }

    let wireless: WirelessNetworkInfo | null = null
    if (wirelessPort != null) {
      const wifiEndpointResponse = await req.deviceAction.getWiFiEndpointSettings()
      const cimIeee8021xResponse = await req.deviceAction.getCIMIEEE8021xSettings()
      const wifiPortConfigResponse = await req.deviceAction.getWiFiPortConfigurationService()

      const wifiNetworks = toWiFiNetworks(wifiEndpointResponse?.Body?.PullResponse?.Items)
      const ieee8021xSettings = toWirelessIEEE8021xSettings(cimIeee8021xResponse?.Body?.PullResponse?.Items)
      const wifiPortConfigService = toWiFiPortConfigService(
        wifiPortConfigResponse?.Body?.AMT_WiFiPortConfigurationService ?? null
      )
      wireless = toWirelessNetworkInfo(wirelessPort, wifiNetworks, ieee8021xSettings, wifiPortConfigService)
    }

    const response: NetworkSettings = { wired, wireless }

    MqttProvider.publishEvent(
      'success',
      ['AMT_EthernetPortSettings'],
      messages.WIRED_NETWORK_SETTINGS_GET_SUCCESS,
      guid
    )
    res.status(200).json(response)
  } catch (error) {
    logger.error(`${messages.NETWORK_SETTINGS_EXCEPTION}: ${error}`)
    MqttProvider.publishEvent('fail', ['AMT_EthernetPortSettings'], messages.INTERNAL_SERVICE_ERROR, guid)
    res.status(500).json(ErrorResponse(500, messages.NETWORK_SETTINGS_EXCEPTION))
  }
}
