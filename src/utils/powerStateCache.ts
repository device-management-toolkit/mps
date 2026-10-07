/*********************************************************************
 * Copyright (c) Intel Corporation 2026
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type Request } from 'express'
import { logger, messages } from '../logging/index.js'
import { operationWithTimeout, TIMEOUT_MS_DEFAULT } from './timeoutOpManagement.js'

// write a live reading through to the cached power state; never throws
export async function cachePowerState(
  req: Request,
  guid: string,
  powerState: number,
  osPowerSavingState: number,
  readStartedAt: Date
): Promise<void> {
  try {
    await req.db.devices.updatePowerState(guid, powerState, osPowerSavingState, readStartedAt, req.tenantId)
  } catch (error) {
    logger.warn(`${messages.POWER_STATE_CACHE_UPDATE_FAILED} for guid : ${guid}. ${error}`)
  }
}

// read the device's current power state and cache it; used after a power action
export async function refreshCachedPowerState(req: Request, guid: string): Promise<void> {
  try {
    const readStartedAt = new Date()
    const response = await operationWithTimeout(req.deviceAction.getPowerState(), TIMEOUT_MS_DEFAULT)
    const rawPowerState = response?.PullResponse?.Items?.CIM_AssociatedPowerManagementService?.PowerState
    if (rawPowerState == null) {
      logger.warn(`${messages.POWER_STATE_CACHE_UPDATE_FAILED} for guid : ${guid}. ${messages.POWER_STATE_REQUEST_FAILED}`)
      return
    }

    let osPowerSavingState = 0
    try {
      const osResponse = await operationWithTimeout(req.deviceAction.getOSPowerSavingState(), TIMEOUT_MS_DEFAULT)
      const rawOsPowerSavingState = osResponse?.Body?.IPS_PowerManagementService?.OSPowerSavingState
      if (rawOsPowerSavingState != null) {
        osPowerSavingState = Number(rawOsPowerSavingState)
      }
    } catch (error) {
      logger.silly(`${messages.OS_POWER_SAVING_STATE_GET_FAILED} : ${error}`)
    }

    await cachePowerState(req, guid, Number(rawPowerState), osPowerSavingState, readStartedAt)
  } catch (error) {
    logger.warn(`${messages.POWER_STATE_CACHE_UPDATE_FAILED} for guid : ${guid}. ${error}`)
  }
}
