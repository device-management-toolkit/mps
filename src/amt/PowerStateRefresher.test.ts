/*********************************************************************
 * Copyright (c) Intel Corporation 2026
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { vi } from 'vitest'
import Bottleneck from 'bottleneck'
import { PowerStateRefresher } from './PowerStateRefresher.js'
import { Environment } from '../utils/Environment.js'
import { config } from '../test/helper/config.js'
import { type IDB } from '../interfaces/IDb.js'
import { type ConnectedDevice } from './ConnectedDevice.js'

const wsman = vi.hoisted(() => ({
  getPowerState: vi.fn(),
  getOSPowerSavingState: vi.fn()
}))
vi.mock('./CIRAHandler.js', () => ({ CIRAHandler: class {} }))
vi.mock('./DeviceAction.js', () => ({
  DeviceAction: class {
    getPowerState = wsman.getPowerState
    getOSPowerSavingState = wsman.getOSPowerSavingState
  }
}))

describe('PowerStateRefresher', () => {
  const guid = '4c4c4544-004b-4210-8033-b6c04f504633'
  let db: IDB
  let updatePowerStateSpy: any
  let refresher: PowerStateRefresher
  let device: ConnectedDevice

  const connectedDevice = (readyState = 'open'): ConnectedDevice =>
    ({
      ciraSocket: { readyState } as any,
      httpHandler: {} as any,
      username: 'admin',
      password: 'P@ssw0rd',
      tenantId: 'tenantId',
      limiter: new Bottleneck({ maxConcurrent: 1 })
    }) as any

  beforeEach(() => {
    Environment.Config = { ...config, power_state_refresh_interval: 300, power_state_refresh_jitter: 0 } as any
    updatePowerStateSpy = vi.fn().mockResolvedValue(true)
    db = { devices: { updatePowerState: updatePowerStateSpy } } as any
    // an unlimited limiter so the tests do not depend on config-driven concurrency
    refresher = new PowerStateRefresher(db, new Bottleneck())
    device = connectedDevice()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    Environment.Config = null
  })

  it('should read the device and persist the power state', async () => {
    vi.spyOn(refresher, 'read').mockResolvedValue({ powerState: 4, osPowerSavingState: 2 })

    const refreshed = await refresher.maybeRefresh(guid, device)

    expect(refreshed).toBe(true)
    expect(updatePowerStateSpy).toHaveBeenCalledTimes(1)
    const [
      calledGuid,
      powerState,
      osPowerSavingState,
      updatedAt,
      tenantId
    ] = updatePowerStateSpy.mock.calls[0]
    expect(calledGuid).toBe(guid)
    expect(powerState).toBe(4)
    expect(osPowerSavingState).toBe(2)
    expect(updatedAt).toBeInstanceOf(Date)
    expect(tenantId).toBe('tenantId')
  })

  it('should not read again while the cached value is still fresh', async () => {
    const readSpy = vi.spyOn(refresher, 'read').mockResolvedValue({ powerState: 4, osPowerSavingState: 0 })

    expect(await refresher.maybeRefresh(guid, device)).toBe(true)
    expect(await refresher.maybeRefresh(guid, device)).toBe(false)
    expect(readSpy).toHaveBeenCalledTimes(1)
  })

  it('should read again once the refresh interval has elapsed', async () => {
    const readSpy = vi.spyOn(refresher, 'read').mockResolvedValue({ powerState: 4, osPowerSavingState: 0 })

    expect(await refresher.maybeRefresh(guid, device)).toBe(true)
    // pretend the cached value aged past power_state_refresh_interval
    refresher.state.get(guid).nextEligible = Date.now() - 1
    expect(await refresher.maybeRefresh(guid, device)).toBe(true)
    expect(readSpy).toHaveBeenCalledTimes(2)
  })

  it('should do nothing when the refresh interval is zero', async () => {
    Environment.Config.power_state_refresh_interval = 0
    const readSpy = vi.spyOn(refresher, 'read')

    expect(await refresher.maybeRefresh(guid, device)).toBe(false)
    expect(readSpy).not.toHaveBeenCalled()
    expect(updatePowerStateSpy).not.toHaveBeenCalled()
  })

  it('should skip a device whose CIRA socket is not open', async () => {
    const readSpy = vi.spyOn(refresher, 'read')

    expect(await refresher.maybeRefresh(guid, connectedDevice('closed'))).toBe(false)
    expect(await refresher.maybeRefresh(guid, null)).toBe(false)
    expect(readSpy).not.toHaveBeenCalled()
  })

  it('should not start a second read while one is in flight', async () => {
    let release: (value: any) => void
    const readSpy = vi.spyOn(refresher, 'read').mockReturnValue(new Promise((resolve) => (release = resolve)) as any)

    const first = refresher.maybeRefresh(guid, device)
    const second = await refresher.maybeRefresh(guid, device)
    release({ powerState: 4, osPowerSavingState: 0 })
    await first

    expect(second).toBe(false)
    expect(readSpy).toHaveBeenCalledTimes(1)
  })

  it('should back off and leave the cached value alone when a read fails', async () => {
    vi.spyOn(refresher, 'read').mockRejectedValue(new Error('device did not answer'))

    const refreshed = await refresher.maybeRefresh(guid, device)

    expect(refreshed).toBe(false)
    expect(updatePowerStateSpy).not.toHaveBeenCalled()
    expect(refresher.state.get(guid).failures).toBe(1)
    expect(refresher.state.get(guid).inFlight).toBe(false)
    expect(refresher.state.get(guid).nextEligible).toBeGreaterThan(Date.now())
  })

  it('should grow the backoff with consecutive failures and cap it', () => {
    expect(refresher.backoffMs(1)).toBe(600 * 1000)
    expect(refresher.backoffMs(2)).toBe(1200 * 1000)
    expect(refresher.backoffMs(20)).toBe(19200 * 1000)
  })

  it('should reset the failure count after a successful read', async () => {
    vi.spyOn(refresher, 'read').mockRejectedValueOnce(new Error('device did not answer'))
    await refresher.maybeRefresh(guid, device)
    expect(refresher.state.get(guid).failures).toBe(1)

    vi.spyOn(refresher, 'read').mockResolvedValue({ powerState: 4, osPowerSavingState: 0 })
    refresher.state.get(guid).nextEligible = 0
    await refresher.maybeRefresh(guid, device)

    expect(refresher.state.get(guid).failures).toBe(0)
  })

  it('should seed state on connect and drop it on disconnect', () => {
    refresher.onConnect(guid)
    expect(refresher.state.has(guid)).toBe(true)

    refresher.onDisconnect(guid)
    expect(refresher.state.has(guid)).toBe(false)
  })

  it('should not seed state on connect when refresh is disabled', () => {
    Environment.Config.power_state_refresh_interval = 0
    refresher.onConnect(guid)
    expect(refresher.state.has(guid)).toBe(false)
  })

  describe('read', () => {
    const pullResponse = (powerState: any): any => ({
      PullResponse: { Items: { CIM_AssociatedPowerManagementService: { PowerState: powerState } } }
    })

    it('should convert the numeric strings WSMAN returns into numbers', async () => {
      wsman.getPowerState.mockResolvedValue(pullResponse('4'))
      wsman.getOSPowerSavingState.mockResolvedValue({
        Body: { IPS_PowerManagementService: { OSPowerSavingState: '2' } }
      })

      const reading = await refresher.read(device)

      expect(reading).toEqual({ powerState: 4, osPowerSavingState: 2 })
    })

    it('should default the OS power saving state to 0 when that read fails', async () => {
      wsman.getPowerState.mockResolvedValue(pullResponse('4'))
      wsman.getOSPowerSavingState.mockRejectedValue(new Error('not supported'))

      const reading = await refresher.read(device)

      expect(reading).toEqual({ powerState: 4, osPowerSavingState: 0 })
    })

    it('should throw when the device returns no power state', async () => {
      wsman.getPowerState.mockResolvedValue(pullResponse(null))
      wsman.getOSPowerSavingState.mockResolvedValue({ Body: {} })

      await expect(refresher.read(device)).rejects.toThrow()
    })
  })

  it('should jitter the first read so reconnects do not synchronise', () => {
    Environment.Config.power_state_refresh_jitter = 60
    vi.spyOn(Math, 'random').mockReturnValue(0.5)

    refresher.onConnect(guid)

    // 0.5 * 60s = 30s from now
    const delay = refresher.state.get(guid).nextEligible - Date.now()
    expect(delay).toBeGreaterThan(29000)
    expect(delay).toBeLessThanOrEqual(30000)
  })
})
