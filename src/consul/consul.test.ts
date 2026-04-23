/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { vi } from 'vitest'
import type Consul from 'consul'
import { ConsulService } from './consul.js'
import { config } from './../test/helper/config.js'
const consulService: ConsulService = new ConsulService('localhost', 8500)
let componentName: string
let serviceName: string

describe('consul', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    vi.resetAllMocks()
    vi.resetModules()

    componentName = 'RPS'
    serviceName = 'consul'

    consulService.consul.kv = {
      set: vi.fn(),
      get: vi.fn()
    } as any
    consulService.consul.health = {
      service: vi.fn().mockResolvedValue([])
    } as any
  })

  describe('ConsulService', () => {
    it('get Consul health', async () => {
      const spyHealth = vi.spyOn(consulService, 'health')
      await consulService.health(serviceName)
      expect(spyHealth).toHaveBeenCalledWith('consul')
      expect(consulService.consul.health.service).toHaveBeenCalledWith({ service: 'consul', passing: true })
    })
    it('seed Consul success', async () => {
      const result = await consulService.seed(componentName, config)
      expect(result).toBe(true)
      expect(consulService.consul.kv.set).toHaveBeenCalledWith(
        componentName + '/config',
        JSON.stringify(config, null, 2)
      )
    })
    it('seed Consul failure', async () => {
      vi.spyOn(consulService.consul.kv, 'set').mockRejectedValue(new Error())
      let result
      try {
        result = await consulService.seed(componentName, config)
      } catch (err) {
        expect(result).toBe(false)
      }
    })

    it('get from Consul success', async () => {
      await consulService.get(componentName)
      expect(consulService.consul.kv.get).toHaveBeenCalledWith({ key: componentName + '/', recurse: true })
    })

    it('process Consul', () => {
      const consulValues: { Key: string; Value: string }[] = [
        {
          Key: componentName + '/config',
          Value: '{"web_port": 8081, "delay_timer": 12}'
        }
      ]
      const result = consulService.process(consulValues)
      expect(result).toBe('{"web_port": 8081, "delay_timer": 12}')
    })
  })
})
