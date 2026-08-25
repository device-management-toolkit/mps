/*********************************************************************
 * Copyright (c) Intel Corporation 2026
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import Bottleneck from 'bottleneck'
import { logger, messages } from '../logging/index.js'
import { Environment } from '../utils/Environment.js'
import { type IDB } from '../interfaces/IDb.js'
import { operationWithTimeout, TIMEOUT_MS_DEFAULT } from '../utils/timeoutOpManagement.js'
import { MAX_POWER_STATE_REFRESH_INTERVAL } from '../utils/constants.js'
import { CIRAHandler } from './CIRAHandler.js'
import { DeviceAction } from './DeviceAction.js'
import { type ConnectedDevice } from './ConnectedDevice.js'

interface RefreshState {
  nextEligible: number
  failures: number
  inFlight: boolean
}

/**
 * @description Keeps the cached power state on the devices table reasonably fresh.
 * Each CIRA keepalive offers a device for refresh, but a read only happens once the
 * cached value is older than power_state_refresh_interval. The gate is in memory so
 * the heartbeat path stays off the database.
 */
export class PowerStateRefresher {
  db: IDB
  state: Map<string, RefreshState>
  private limiterInstance: Bottleneck

  constructor(db: IDB, limiter?: Bottleneck) {
    this.db = db
    this.state = new Map<string, RefreshState>()
    this.limiterInstance = limiter
  }

  // built on first use so config does not have to be loaded before MPSServer is constructed
  get limiter(): Bottleneck {
    if (this.limiterInstance == null) {
      this.limiterInstance = new Bottleneck({
        maxConcurrent: Environment.Config.power_state_max_concurrent
      })
    }
    return this.limiterInstance
  }

  get enabled(): boolean {
    return Environment.Config?.power_state_refresh_interval > 0
  }

  /**
   * @description Seed a device when its CIRA connection is established. The first read is
   * jittered so a mass reconnect does not put the whole fleet on the wire at once.
   */
  onConnect(guid: string): void {
    if (!this.enabled) return
    const jitter = Math.floor(Math.random() * Environment.Config.power_state_refresh_jitter * 1000)
    this.state.set(guid, { nextEligible: Date.now() + jitter, failures: 0, inFlight: false })
  }

  onDisconnect(guid: string): void {
    this.state.delete(guid)
  }

  /**
   * @description Offer a device for refresh. Returns true when a read was actually performed.
   */
  async maybeRefresh(guid: string, device: ConnectedDevice): Promise<boolean> {
    if (!this.enabled) return false
    if (device?.ciraSocket?.readyState !== 'open') return false

    const entry = this.state.get(guid) ?? { nextEligible: 0, failures: 0, inFlight: false }
    if (entry.inFlight || Date.now() < entry.nextEligible) return false

    entry.inFlight = true
    this.state.set(guid, entry)
    try {
      const reading = await this.limiter.schedule(async () => await this.read(device))
      await this.db.devices.updatePowerState(
        guid,
        reading.powerState,
        reading.osPowerSavingState,
        new Date(),
        device.tenantId
      )
      entry.failures = 0
      entry.nextEligible = Date.now() + Environment.Config.power_state_refresh_interval * 1000
      return true
    } catch (error) {
      // leave the cached value alone; its timestamp is what tells callers it went stale
      entry.failures++
      entry.nextEligible = Date.now() + this.backoffMs(entry.failures)
      logger.warn(`${messages.POWER_STATE_REQUEST_FAILED} for guid : ${guid}. ${error}`)
      return false
    } finally {
      entry.inFlight = false
      this.state.set(guid, entry)
    }
  }

  /**
   * @description Read power state and OS power saving state from a connected device.
   * OS power saving state is best effort, matching GET /amt/power/state/:guid.
   */
  async read(device: ConnectedDevice): Promise<{ powerState: number; osPowerSavingState: number }> {
    const ciraHandler = new CIRAHandler(device.httpHandler, device.username, device.password, device.limiter)
    const deviceAction = new DeviceAction(ciraHandler, device.ciraSocket)

    const response = await operationWithTimeout(deviceAction.getPowerState(), TIMEOUT_MS_DEFAULT)
    const rawPowerState = response?.PullResponse?.Items?.CIM_AssociatedPowerManagementService?.PowerState
    if (rawPowerState == null) {
      throw new Error(messages.ENUMERATION_RESPONSE_NULL)
    }

    let osPowerSavingState = 0
    try {
      const osResponse = await operationWithTimeout(deviceAction.getOSPowerSavingState(), TIMEOUT_MS_DEFAULT)
      const rawOsPowerSavingState = osResponse?.Body?.IPS_PowerManagementService?.OSPowerSavingState
      if (rawOsPowerSavingState != null) {
        osPowerSavingState = Number(rawOsPowerSavingState)
      }
    } catch (error) {
      logger.silly(`${messages.OS_POWER_SAVING_STATE_GET_FAILED} : ${error}`)
    }

    // WSMAN returns these as numeric strings
    return { powerState: Number(rawPowerState), osPowerSavingState }
  }

  backoffMs(failures: number): number {
    const interval = Environment.Config.power_state_refresh_interval
    const backoff = interval * Math.pow(2, Math.min(failures, 6))
    return Math.min(backoff, MAX_POWER_STATE_REFRESH_INTERVAL) * 1000
  }
}
