/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type Device } from '../models/models.js'
import { type ITable } from './ITable.js'

export interface IDeviceTable extends ITable<Device> {
  getConnectedDevices: (tenantId?: string) => Promise<number>
  getDistinctTags: (tenantId?: string) => Promise<string[]>
  getByTags: (
    tags: string[],
    method: string,
    limit: number | string,
    offset: number | string,
    tenantId?: string
  ) => Promise<Device[]>
  getByFriendlyName: (hostname: string, tenantId?: string) => Promise<Device[]>
  getByHostname: (hostname: string, tenantId?: string) => Promise<Device[]>
  clearInstanceStatus: (mpsInstance: string) => Promise<boolean>
}
