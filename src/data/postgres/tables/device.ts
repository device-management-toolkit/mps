/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { logger, messages } from '../../../logging/index.js'
import { type PostgresDb } from '../index.js'
import { type IDeviceTable } from '../../../interfaces/IDeviceTable.js'
import { type Device } from '../../../models/models.js'
import { MPSValidationError } from '../../../utils/MPSValidationError.js'
import { DefaultSkip, DefaultTop } from '../../../utils/constants.js'

export class DeviceTable implements IDeviceTable {
  db: PostgresDb
  constructor(db: PostgresDb) {
    this.db = db
  }

  async getCount(tenantId = ''): Promise<number> {
    const result = await this.db.query<{ total_count: number }>(
      `
    SELECT count(*) OVER() AS total_count 
    FROM devices
    WHERE tenantid = $1`,
      [tenantId]
    )
    let count = 0
    if (result != null && result.rows.length > 0) {
      count = Number(result.rows[0]?.total_count)
    }
    return count
  }

  /**
   * @description Get all devices from DB
   * @returns {Device[]} returns an array of objects
   */
  async get(limit: number = DefaultTop, offset: number = DefaultSkip, tenantId = ''): Promise<Device[]> {
    const results = await this.db.query<Device>(
      `
    SELECT 
      guid as "guid",
      hostname as "hostname",
      tags as "tags",
      mpsinstance as "mpsInstance",
      connectionstatus as "connectionStatus",
      mpsusername as "mpsusername",
      tenantid as "tenantId",
      friendlyname as "friendlyName",
      dnssuffix as "dnsSuffix",
      deviceinfo as "deviceInfo"
    FROM devices
    WHERE tenantid = $3 
    ORDER BY guid 
    LIMIT $1 OFFSET $2`,
      [
        limit,
        offset,
        tenantId
      ]
    )
    return results.rows
  }

  /**
   * @description Get all devices from DB
   * @returns {Device[]} returns an array of objects
   */
  async getConnectedDevices(tenantId = ''): Promise<number> {
    const result = await this.db.query<{ connected_count: number }>(
      `
      SELECT count(*) OVER() AS connected_count 
      FROM devices
      WHERE tenantid = $1 and connectionstatus = true`,
      [tenantId]
    )
    let count = 0
    if (result != null && result.rows.length > 0) {
      count = Number(result.rows[0]?.connected_count)
    }
    return count
  }

  /**
   * @description Get a device from DB by guid
   * @param {string} guid
   * @returns {Device} Device object
   */
  async getById(id: string, tenantId?: string): Promise<Device> {
    let query = `SELECT
    guid as "guid",
    hostname as "hostname",
    tags as "tags",
    mpsinstance as "mpsInstance",
    connectionstatus as "connectionStatus",
    mpsusername as "mpsusername",
    tenantid as "tenantId",
    friendlyname as "friendlyName",
    dnssuffix as "dnsSuffix",
    lastconnected as "lastConnected",
    lastseen as "lastSeen",
    lastdisconnected as "lastDisconnected",
    deviceinfo as "deviceInfo"
    FROM devices 
    WHERE guid = $1 and tenantid = $2`
    let params = [id, tenantId]
    if (tenantId == null) {
      query = `SELECT
      guid as "guid",
      hostname as "hostname",
      tags as "tags",
      mpsinstance as "mpsInstance",
      connectionstatus as "connectionStatus",
      mpsusername as "mpsusername",
      tenantid as "tenantId",
      friendlyname as "friendlyName",
      dnssuffix as "dnsSuffix",
      lastconnected as "lastConnected",
      lastseen as "lastSeen",
      lastdisconnected as "lastDisconnected",
      deviceinfo as "deviceInfo"
      FROM devices 
      WHERE guid = $1`
      params = [id]
    }
    const results = await this.db.query<Device>(query, params)
    return results.rowCount > 0 ? results.rows[0] : null
  }

  async getByColumn(columnName: string, queryValue: string, tenantId: string): Promise<Device[]> {
    const results = await this.db.query<Device>(
      `
    SELECT
      guid as "guid",
      hostname as "hostname",
      tags as "tags",
      mpsinstance as "mpsInstance",
      connectionstatus as "connectionStatus",
      mpsusername as "mpsusername",
      tenantid as "tenantId",
      friendlyname as "friendlyName",
      dnssuffix as "dnsSuffix",
      deviceinfo as "deviceInfo"
    FROM devices 
    WHERE ${columnName} = $1 and tenantid = $2`,
      [queryValue, tenantId]
    )

    return results.rowCount > 0 ? results.rows : []
  }

  async getByHostname(hostname: string, tenantId = ''): Promise<Device[]> {
    return await this.getByColumn('hostname', hostname, tenantId)
  }

  async getByFriendlyName(friendlyName: string, tenantId = ''): Promise<Device[]> {
    return await this.getByColumn('friendlyname', friendlyName, tenantId)
  }

  async getByTags(
    tags: string[],
    method: string,
    top: number = DefaultTop,
    skip: number = DefaultSkip,
    tenantId = ''
  ): Promise<Device[]> {
    let results
    if (method === 'AND') {
      results = await this.db.query(
        `
      SELECT 
        guid as "guid",
        hostname as "hostname",
        tags as "tags",
        mpsinstance as "mpsInstance",
        connectionstatus as "connectionStatus",
        mpsusername as "mpsusername",
        tenantid as "tenantId",
        friendlyname as "friendlyName",
        dnssuffix as "dnsSuffix",
        deviceinfo as "deviceInfo"
      FROM devices 
      WHERE tags @> $1 and tenantId = $4
      ORDER BY guid 
      LIMIT $2 OFFSET $3`,
        [
          tags,
          top,
          skip,
          tenantId
        ]
      )
    } else {
      // assume OR
      results = await this.db.query(
        `
      SELECT 
        guid as "guid",
        hostname as "hostname",
        tags as "tags",
        mpsinstance as "mpsInstance",
        connectionstatus as "connectionStatus",
        mpsusername as "mpsusername",
        tenantid as "tenantId",
        friendlyname as "friendlyName",
        dnssuffix as "dnsSuffix",
        deviceinfo as "deviceInfo"
      FROM devices 
      WHERE tags && $1 and tenantId = $4
      ORDER BY guid 
      LIMIT $2 OFFSET $3`,
        [
          tags,
          top,
          skip,
          tenantId
        ]
      )
    }
    return results.rows
  }

  async getDistinctTags(tenantId = ''): Promise<string[]> {
    const results = await this.db.query<{ tag: string }>(
      `
    SELECT DISTINCT unnest(tags) as tag 
    FROM Devices
    WHERE tenantid = $1`,
      [tenantId]
    )
    return results.rows.map((p) => p.tag)
  }

  /**
   * @description Insert a device into DB
   * @param {Device} device
   * @returns {boolean} Return true on successful insertion
   */
  async insert(device: Device): Promise<Device> {
    try {
      const results = await this.db.query(
        `
      INSERT INTO devices(guid, hostname, tags, mpsinstance, connectionstatus, mpsusername, tenantid, friendlyname, dnssuffix, deviceinfo)
      values($1, $2, ARRAY(SELECT json_array_elements_text($3)), $4, $5, $6, $7, $8, $9, $10)`,
        [
          device.guid,
          device.hostname,
          JSON.stringify(device.tags),
          device.mpsInstance,
          device.connectionStatus,
          device.mpsusername,
          device.tenantId,
          device.friendlyName,
          device.dnsSuffix,
          JSON.stringify(device.deviceInfo)
        ]
      )
      if (results.rowCount > 0) {
        return await this.getById(device.guid)
      }
      return null
    } catch (error) {
      logger.error(`${messages.DATABASE_INSERT_FAILED}: ${device.guid}`, error)
      if (error.code === '23505') {
        // Unique key violation
        throw new MPSValidationError(`Device ID: ${device.guid} already exists`, 400, 'Unique key violation')
      }
      throw new MPSValidationError(`Failed to insert device: ${device.guid}, error: ${error}`, 500)
    }
  }

  /**
   * @description Update into DB
   * @param {Device} deviceMetadata object
   * @returns {boolean} Return true on successful update
   */
  async update(device: Device): Promise<Device> {
    try {
      const results = await this.db.query(
        `
      UPDATE devices 
      SET tags=$2, hostname=$3, mpsinstance=$4, connectionstatus=$5, mpsusername=$6, friendlyname=$8, dnssuffix=$9, lastconnected=$10, lastseen=$11, lastdisconnected=$12, deviceinfo=$13
      WHERE guid=$1 and tenantid = $7`,
        [
          device.guid,
          device.tags,
          device.hostname,
          device.mpsInstance,
          device.connectionStatus,
          device.mpsusername,
          device.tenantId,
          device.friendlyName,
          device.dnsSuffix,
          device.lastConnected,
          device.lastSeen,
          device.lastDisconnected,
          JSON.stringify(device.deviceInfo)
        ]
      )
      if (results.rowCount > 0) {
        return await this.getById(device.guid)
      }
      throw new MPSValidationError(`Failed to update device: ${device.guid}`, 400)
    } catch (error) {
      logger.error(`${messages.DATABASE_UPDATE_FAILED}: ${device.guid}`, error)
      throw new MPSValidationError(`Failed to update device: ${device.guid}, error: ${error}`, 500)
    }
  }

  /**
   * @description Clear the mpsInstance for associated devices before process exit
   * @param {string} mpsInstance
   * @returns {Promise<boolean>} Return true on success, false otherwise
   */
  async clearInstanceStatus(mpsInstance: string): Promise<boolean> {
    try {
      const results = await this.db.query(
        `
      UPDATE devices
      SET mpsinstance=$2, connectionstatus=$3
      WHERE mpsinstance=$1`,
        [
          mpsInstance,
          null,
          false
        ]
      )
      logger.debug('Clean DB instance before exit', results)
      return true
    } catch (error) {
      logger.error(`${messages.DATABASE_UPDATE_FAILED} DB:`, error)
    }
    return false
  }

  /**
   * @description Delete from DB by name
   * @param {string} guid
   * @returns {boolean} Return true on successful deletion
   */
  async delete(guid: string, tenantId = ''): Promise<boolean> {
    const results = await this.db.query(
      `
    DELETE FROM devices 
    WHERE guid = $1 and tenantid = $2`,
      [guid, tenantId]
    )

    return results.rowCount > 0
  }
}
