/*********************************************************************
* Copyright (c) Intel Corporation 2019
* SPDX-License-Identifier: Apache-2.0
**********************************************************************/

import { configType, certificatesType } from './models/Config'
import { WebServer } from './server/webserver'
import { MPSServer } from './server/mpsserver'
import { logger as log } from './utils/logger'
import { IDbProvider } from './models/IDbProvider'
import { DeviceDb } from './db/device'
import { Device } from './models/models'
import { Environment } from './utils/Environment'
export class MPSMicroservice {
  mpsserver: MPSServer
  webserver: WebServer
  config: configType
  certs: certificatesType
  debugLevel: number = 1
  mpsComputerList = {}
  db: IDbProvider
  deviceDb: DeviceDb
  constructor (config: configType, db: IDbProvider, certs: certificatesType) {
    try {
      this.config = config
      this.debugLevel = config.debug_level
      this.db = db
      this.certs = certs
    } catch (e) {
      log.error(`Exception in MPS Microservice: ${e}`)
    }
  }

  start (): void {
    this.deviceDb = new DeviceDb()
    this.webserver = new WebServer(this)
    this.mpsserver = new MPSServer(this)
  }

  async CIRAConnected (guid: string): Promise<void> {
    if (this.deviceDb != null) {
      const device: Device = await this.deviceDb.getById(guid)
      device.connectionStatus = true
      const instanceName = Environment.Config.instance_name
      device.mpsInstance = instanceName === '{{.Task.Name}}' ? 'mps' : instanceName
      const results = await this.deviceDb.update(device)
      if (results) {
        log.info(`CIRA connection established for ${guid}`)
      } else {
        log.info(`Failed to update CIRA Connection established status in DB ${guid}`)
      }
    }
    if (this.webserver) {
      this.webserver.notifyUsers({ host: guid, event: 'node_connection', status: 'connected' })
    }
  }

  async CIRADisconnected (guid: string): Promise<void> {
    if (this.deviceDb != null) {
      const device: Device = await this.deviceDb.getById(guid)
      if (device != null) {
        device.connectionStatus = false
        device.mpsInstance = null
        const results = await this.deviceDb.update(device)
        if (results) {
          log.info(`Device connection status updated in db : ${guid}`)
        }
      }
    }
    if (guid && this.mpsComputerList[guid]) {
      log.silly(`delete mpsComputerList[${guid}]`)
      delete this.mpsComputerList[guid]
      if (this.webserver) {
        this.webserver.notifyUsers({
          host: guid,
          event: 'node_connection',
          status: 'disconnected'
        })
      }
      log.info(`CIRA connection disconnected for device : ${guid}`)
    }
  }
}
