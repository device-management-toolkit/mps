/*********************************************************************
 * Copyright (c) Intel Corporation 2026
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { vi } from 'vitest'
import { CIRAHandler } from '../amt/CIRAHandler.js'
import { DeviceAction } from '../amt/DeviceAction.js'
import { HttpHandler } from '../amt/HttpHandler.js'
import { serviceAvailableToElement } from '../test/helper/wsmanResponses.js'
import { TIMEOUT_MESSAGE, TimeoutError } from './timeoutOpManagement.js'
import { cachePowerState, refreshCachedPowerState } from './powerStateCache.js'

describe('power state cache', () => {
  const guid = '4c4c4544-004b-4210-8033-b6c04f504633'
  let req
  let updatePowerStateSpy
  let powerStateSpy
  let osPowerStateGetSpy

  beforeEach(() => {
    const device = new DeviceAction(new CIRAHandler(new HttpHandler(), 'admin', 'P@ssw0rd'), null)
    updatePowerStateSpy = vi.fn().mockResolvedValue(true)
    req = { deviceAction: device, db: { devices: { updatePowerState: updatePowerStateSpy } }, tenantId: 't1' }
    powerStateSpy = vi.spyOn(device, 'getPowerState').mockResolvedValue(serviceAvailableToElement.Envelope.Body as any)
    osPowerStateGetSpy = vi.spyOn(device, 'getOSPowerSavingState').mockResolvedValue({
      Body: { IPS_PowerManagementService: { OSPowerSavingState: '3' } }
    } as any)
  })

  describe('cachePowerState', () => {
    it('writes the reading with the tenant', async () => {
      const at = new Date()
      await cachePowerState(req, guid, 2, 3, at)
      expect(updatePowerStateSpy).toHaveBeenCalledWith(guid, 2, 3, at, 't1')
    })
    it('does not throw when the write fails', async () => {
      updatePowerStateSpy.mockRejectedValueOnce(new Error('db down'))
      await expect(cachePowerState(req, guid, 2, 3, new Date())).resolves.toBeUndefined()
    })
  })

  describe('refreshCachedPowerState', () => {
    it('reads both values and caches them', async () => {
      const before = new Date()
      await refreshCachedPowerState(req, guid)
      expect(powerStateSpy).toHaveBeenCalled()
      expect(osPowerStateGetSpy).toHaveBeenCalled()
      const [g, powerState, osPowerSavingState, readStartedAt, tenantId] = updatePowerStateSpy.mock.calls[0]
      expect(g).toBe(guid)
      expect(powerState).toBe(4)
      expect(osPowerSavingState).toBe(3)
      expect(readStartedAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(tenantId).toBe('t1')
    })
    it('caches OS power saving state as 0 when that read fails', async () => {
      osPowerStateGetSpy.mockRejectedValueOnce(new Error('boom'))
      await refreshCachedPowerState(req, guid)
      expect(updatePowerStateSpy).toHaveBeenCalledWith(guid, 4, 0, expect.any(Date), 't1')
    })
    it('writes nothing when the power state is missing', async () => {
      powerStateSpy.mockResolvedValueOnce(null)
      await refreshCachedPowerState(req, guid)
      expect(updatePowerStateSpy).not.toHaveBeenCalled()
    })
    it('writes nothing and does not throw when the power state read times out', async () => {
      powerStateSpy.mockRejectedValueOnce(new TimeoutError(TIMEOUT_MESSAGE))
      await expect(refreshCachedPowerState(req, guid)).resolves.toBeUndefined()
      expect(updatePowerStateSpy).not.toHaveBeenCalled()
    })
  })
})
