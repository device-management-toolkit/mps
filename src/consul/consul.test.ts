/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { ConsulService } from './consul.js'
import { config } from './../test/helper/config.js'
import { jest } from '@jest/globals'
import { spyOn } from 'jest-mock'
import { HTTPError } from 'got'

const consulService: ConsulService = new ConsulService('localhost', 8500)
let componentName: string
let serviceName: string

describe('consul', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.restoreAllMocks()
    jest.resetAllMocks()
    jest.resetModules()

    componentName = 'RPS'
    serviceName = 'consul'
  })

  describe('ConsulService', () => {
    it('get Consul health', async () => {
      const getSpy = spyOn(consulService.gotClient, 'get').mockImplementation(
        () =>
          ({
            json: jest.fn(async () => await Promise.resolve([]))
          }) as any
      )
      await consulService.health(serviceName)
      expect(getSpy).toHaveBeenCalledWith(`health/service/${serviceName}`, { searchParams: { passing: true } })
    })

    it('seed Consul success', async () => {
      const putSpy = spyOn(consulService.gotClient, 'put').mockResolvedValue({} as any)
      const result = await consulService.seed(componentName, config)
      expect(result).toBe(true)
      expect(putSpy).toHaveBeenCalledWith(`kv/${componentName}/config`, {
        body: JSON.stringify(config, null, 2)
      })
    })

    it('seed Consul failure', async () => {
      spyOn(consulService.gotClient, 'put').mockRejectedValue(new Error('boom'))
      const result = await consulService.seed(componentName, config)
      expect(result).toBe(false)
    })

    it('get from Consul success', async () => {
      const encoded = Buffer.from('{"web_port": 8081}').toString('base64')
      const getSpy = spyOn(consulService.gotClient, 'get').mockImplementation(
        () =>
          ({
            json: jest.fn(async () => await Promise.resolve([{ Key: `${componentName}/config`, Value: encoded }]))
          }) as any
      )
      const result = await consulService.get(componentName)
      expect(getSpy).toHaveBeenCalledWith(`kv/${componentName}/`, { searchParams: { recurse: true } })
      expect(result).toEqual([{ Key: `${componentName}/config`, Value: '{"web_port": 8081}' }])
    })

    it('get from Consul returns null on 404', async () => {
      const error = Object.create(HTTPError.prototype) as HTTPError
      ;(error as any).response = { statusCode: 404 }
      spyOn(consulService.gotClient, 'get').mockImplementation(
        () =>
          ({
            json: jest.fn(async () => await Promise.reject(error))
          }) as any
      )
      const result = await consulService.get(componentName)
      expect(result).toBeNull()
    })

    it('get from Consul rethrows non-404 errors', async () => {
      const error = Object.create(HTTPError.prototype) as HTTPError
      ;(error as any).response = { statusCode: 500 }
      spyOn(consulService.gotClient, 'get').mockImplementation(
        () =>
          ({
            json: jest.fn(async () => await Promise.reject(error))
          }) as any
      )
      await expect(consulService.get(componentName)).rejects.toBe(error)
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
