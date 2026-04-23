/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { vi } from 'vitest'
import { type IServiceManager } from '../interfaces/IServiceManager.js'
import { ConsulService } from './consul.js'
import { Environment } from '../utils/Environment.js'
const backOffSpy = vi.fn()
vi.mock('exponential-backoff', () => ({
  backOff: backOffSpy
}))

const svcMngr = await import('./serviceManager.js')

const consul: IServiceManager = new ConsulService('consul', 8500)
let componentName: string
let config: any

describe('Index', () => {
  componentName = 'MPS'
  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    vi.resetAllMocks()
  })
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    vi.resetAllMocks()
    vi.resetModules()

    config = {
      consul_enabled: false,
      consul_host: 'localhost',
      consul_port: '8500',
      consul_key_prefix: 'MPS'
    } as any
    Environment.Config = config
  })

  it('should wait for service provider', async () => {
    let shouldBeOk = false
    const secretMock: IServiceManager = {
      health: vi.fn(() => {
        if (shouldBeOk) return null
        shouldBeOk = true
        throw new Error('error')
      })
    } as any
    await svcMngr.waitForServiceManager(secretMock, 'consul')
    expect(backOffSpy).toHaveBeenCalled()
  })

  it('should pass processServiceConfigs empty Consul', async () => {
    consul.get = vi.fn(() => null)
    consul.seed = vi.fn(async () => await Promise.resolve(true))
    await svcMngr.processServiceConfigs(consul, config)
    expect(consul.get).toHaveBeenCalledWith(config.consul_key_prefix)
    expect(consul.seed).toHaveBeenCalledWith(config.consul_key_prefix, config)
  })
  it('should pass processServiceConfigs seeded Consul', async () => {
    const consulValues: { Key: string; Value: string }[] = [
      {
        Key: componentName + '/config',
        Value: '{"web_port": 8081, "delay_timer": 12}'
      }
    ]
    consul.get = vi.fn(async () => await Promise.resolve(consulValues))
    consul.process = vi.fn(() => JSON.stringify(consulValues, null, 2))
    await svcMngr.processServiceConfigs(consul, config)
    expect(consul.get).toHaveBeenCalledWith(config.consul_key_prefix)
    expect(consul.process).toHaveBeenCalledWith(consulValues)
  })
})
