/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type Response, type Request } from 'express'
import { logger, messages } from '../../../logging/index.js'
import { ErrorResponse } from '../../../utils/amtHelper.js'
import { MqttProvider } from '../../../utils/MqttProvider.js'
import {
  buildProfileSyncResponse,
  buildWiFiPortConfigRequest,
  hasWiFiPort,
  LOCAL_PROFILE_SYNC_ENABLED,
  LOCAL_SYNC_DISABLED
} from './helper.js'

export async function setWirelessProfileSync(req: Request, res: Response): Promise<void> {
  const guid: string = req.params.guid
  try {
    MqttProvider.publishEvent(
      'request',
      ['AMT_WiFiPortConfigurationService'],
      messages.WIRELESS_PROFILE_SYNC_UPDATE_REQUESTED,
      guid
    )

    const localProfileSync: boolean | null | undefined = req.body?.localProfileSync
    const uefiProfileSync: boolean | null | undefined = req.body?.uefiProfileSync

    const wifiPortResponse = await req.deviceAction.getWiFiPortState()
    if (!hasWiFiPort(wifiPortResponse?.Body?.PullResponse?.Items)) {
      logger.error(`${messages.WIRELESS_PROFILE_SYNC_NOT_FOUND} for guid : ${guid}.`)
      MqttProvider.publishEvent(
        'fail',
        ['AMT_WiFiPortConfigurationService'],
        messages.WIRELESS_PROFILE_SYNC_NOT_FOUND,
        guid
      )
      res.status(404).json({
        error: messages.WIRELESS_PROFILE_SYNC_NOT_FOUND,
        errorDescription: `${messages.WIRELESS_PROFILE_SYNC_NOT_FOUND} for guid : ${guid}.`
      })
      return
    }

    const configResponse = await req.deviceAction.getWiFiPortConfigurationService()
    const current = configResponse?.Body?.AMT_WiFiPortConfigurationService ?? null

    // Fail fast: without the current config we cannot build a valid PUT payload.
    if (current == null) {
      logger.error(`${messages.WIRELESS_PROFILE_SYNC_UPDATE_FAILED} for guid : ${guid}.`)
      MqttProvider.publishEvent(
        'fail',
        ['AMT_WiFiPortConfigurationService'],
        messages.WIRELESS_PROFILE_SYNC_UPDATE_FAILED,
        guid
      )
      res.status(500).json({
        error: messages.WIRELESS_PROFILE_SYNC_UPDATE_FAILED,
        errorDescription: `${messages.WIRELESS_PROFILE_SYNC_UPDATE_FAILED} for guid : ${guid}.`
      })
      return
    }

    const capabilities = await req.deviceAction.getPowerCapabilities()
    const uefiSupported = Boolean(capabilities?.Body?.AMT_BootCapabilities?.UEFIWiFiCoExistenceAndProfileShare)

    // Reject the whole request when UEFI profile sync is requested but unsupported.
    if (uefiProfileSync === true && !uefiSupported) {
      logger.error(`${messages.WIRELESS_PROFILE_SYNC_UEFI_NOT_SUPPORTED} for guid : ${guid}.`)
      MqttProvider.publishEvent(
        'fail',
        ['AMT_WiFiPortConfigurationService'],
        messages.WIRELESS_PROFILE_SYNC_UEFI_NOT_SUPPORTED,
        guid
      )
      res.status(409).json({
        error: messages.WIRELESS_PROFILE_SYNC_UEFI_NOT_SUPPORTED,
        errorDescription: `${messages.WIRELESS_PROFILE_SYNC_UEFI_NOT_SUPPORTED} for guid : ${guid}.`
      })
      return
    }

    const currentLocalSync = current?.localProfileSynchronizationEnabled ?? LOCAL_SYNC_DISABLED
    const currentUefiSync = current?.UEFIWiFiProfileShareEnabled ?? 0

    // null or undefined means the field was omitted (parity with Console's *bool pointer) -> keep current.
    const localSyncState =
      localProfileSync == null ? currentLocalSync : localProfileSync ? LOCAL_PROFILE_SYNC_ENABLED : LOCAL_SYNC_DISABLED
    const uefiSyncState = uefiProfileSync == null ? currentUefiSync : uefiProfileSync ? 1 : 0

    if (localSyncState !== currentLocalSync || uefiSyncState !== currentUefiSync) {
      const putRequest = buildWiFiPortConfigRequest(current ?? {}, localSyncState, uefiSyncState)
      const putResponse = await req.deviceAction.putWiFiPortConfigurationService(putRequest)

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
          `${messages.WIRELESS_PROFILE_SYNC_UPDATE_FAILED} for guid : ${guid}.` +
          (faultReason !== '' ? ` ${faultReason}` : '')
        logger.error(failureMessage)
        MqttProvider.publishEvent(
          'fail',
          ['AMT_WiFiPortConfigurationService'],
          messages.WIRELESS_PROFILE_SYNC_UPDATE_FAILED,
          guid
        )
        res.status(400).json({
          error: messages.WIRELESS_PROFILE_SYNC_UPDATE_FAILED,
          errorDescription: failureMessage
        })
        return
      }

      const updated = putBody?.AMT_WiFiPortConfigurationService ?? putRequest

      MqttProvider.publishEvent(
        'success',
        ['AMT_WiFiPortConfigurationService'],
        messages.WIRELESS_PROFILE_SYNC_UPDATE_SUCCESS,
        guid
      )
      res.status(200).json(buildProfileSyncResponse(updated, uefiSupported))
      return
    }

    MqttProvider.publishEvent(
      'success',
      ['AMT_WiFiPortConfigurationService'],
      messages.WIRELESS_PROFILE_SYNC_UPDATE_SUCCESS,
      guid
    )
    res.status(200).json(buildProfileSyncResponse(current, uefiSupported))
  } catch (error) {
    logger.error(`${messages.NETWORK_SETTINGS_EXCEPTION}: ${error}`)
    MqttProvider.publishEvent('fail', ['AMT_WiFiPortConfigurationService'], messages.INTERNAL_SERVICE_ERROR, guid)
    res.status(500).json(ErrorResponse(500, messages.NETWORK_SETTINGS_EXCEPTION))
  }
}
