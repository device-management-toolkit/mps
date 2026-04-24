/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import got, { type Got, HTTPError } from 'got'
import { logger } from './../logging/index.js'
import { type configType } from './../models/Config.js'
import type { IServiceManager } from './../interfaces/IServiceManager.js'
import { Environment } from './../utils/Environment.js'

export interface ConsulKVEntry {
  Key: string
  Value: string | null
}

export class ConsulService implements IServiceManager {
  gotClient: Got
  constructor(host: string, port: number) {
    this.gotClient = got.extend({
      prefixUrl: `http://${host}:${port}/v1/`
    })
  }

  async health(serviceName: string): Promise<any> {
    return await this.gotClient.get(`health/service/${serviceName}`, { searchParams: { passing: true } }).json()
  }

  async seed(prefix: string, config: configType): Promise<boolean> {
    try {
      await this.gotClient.put(`kv/${prefix}/config`, {
        body: JSON.stringify(config, null, 2)
      })
      logger.info('Wrote configuration settings to Consul.')
      return true
    } catch (e) {
      return false
    }
  }

  async get(prefix: string): Promise<ConsulKVEntry[] | null> {
    try {
      const entries: ConsulKVEntry[] = await this.gotClient
        .get(`kv/${prefix}/`, { searchParams: { recurse: true } })
        .json()
      return entries.map((entry) => ({
        ...entry,
        Value: entry.Value != null ? Buffer.from(entry.Value, 'base64').toString('utf8') : entry.Value
      }))
    } catch (e) {
      if (e instanceof HTTPError && e.response.statusCode === 404) {
        return null
      }
      throw e
    }
  }

  process(consulValues: object): string {
    let value: string
    for (const consulKey in consulValues) {
      value = consulValues[consulKey].Value
      Environment.Config = JSON.parse(value)
    }
    return value
  }
}
