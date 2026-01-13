/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type Db, type Collection, type WithId, type OptionalId } from 'mongodb'
import { type Device } from '../../../models/models.js'
import { type IDeviceTable } from '../../../interfaces/IDeviceTable.js'
import { DefaultSkip, DefaultTop } from '../../../utils/constants.js'

export class MongoDeviceTable implements IDeviceTable {
  private readonly db: Db
  private readonly collectionName: string = 'devices'

  constructor(db: Db) {
    this.db = db
  }

  private get collection(): Collection<Document> {
    return this.db.collection(this.collectionName)
  }

  async getCount(tenantId = ''): Promise<number> {
    const count = await this.collection.countDocuments({ tenantId })
    return count
  }

  async get(
    limit: string = DefaultTop.toString(),
    offset: string = DefaultSkip.toString(),
    tenantId = ''
  ): Promise<Device[]> {
    return this.collection
      .find({ tenantId })
      .skip(parseInt(offset, 10))
      .limit(parseInt(limit, 10))
      .toArray() as unknown as WithId<Device>[]
  }

  async getById(id: string, tenantId = ''): Promise<Device> {
    return this.collection.findOne({ guid: id, tenantId }) as unknown as WithId<Device>
  }

  async delete(id: string, tenantId = ''): Promise<boolean> {
    const result = await this.collection.deleteOne({ guid: id, tenantId })
    return result.deletedCount && result.deletedCount > 0
  }

  async insert(item: Device): Promise<Device> {
    const result = await this.collection.insertOne(item as OptionalId<any>)
    if (!result.acknowledged) {
      throw new Error('Failed to insert')
    }
    return item
  }

  async update(item: Device): Promise<WithId<Device>> {
    const result = await this.collection.findOneAndUpdate(
      { guid: item.guid, tenantId: item.tenantId },
      { $set: item },
      { returnDocument: 'after', includeResultMetadata: false }
    )
    return result as any
  }

  async getConnectedDevices(tenantId = ''): Promise<number> {
    const count = await this.collection.countDocuments({ connectionStatus: true, tenantId })
    return count
  }

  async getDistinctTags(tenantId = ''): Promise<string[]> {
    const tags = await this.collection.distinct('tags', { tenantId })
    return tags
  }

  async getByTags(
    tags: string[],
    method: string,
    top: string = DefaultTop.toString(),
    skip: string = DefaultSkip.toString(),
    tenantId = ''
  ): Promise<WithId<Device>[]> {
    const query = method === 'AND' ? { tags: { $all: tags }, tenantId } : { tags: { $in: tags }, tenantId }
    return this.collection
      .find(query)
      .skip(parseInt(skip, 10))
      .limit(parseInt(top, 10))
      .toArray() as unknown as WithId<Device>[]
  }

  async getByFriendlyName(friendlyName: string, tenantId = ''): Promise<Device[]> {
    return this.collection.find({ friendlyName, tenantId }).toArray() as unknown as WithId<Device>[]
  }

  async getByHostname(hostname: string, tenantId = ''): Promise<Device[]> {
    return this.collection.find({ hostname, tenantId }).toArray() as unknown as WithId<Device>[]
  }

  async clearInstanceStatus(mpsInstance: string, tenantId = ''): Promise<boolean> {
    const result = await this.collection.updateMany(
      { mpsInstance, tenantId },
      { $set: { mpsInstance: null, connectionStatus: false } }
    )
    return result.modifiedCount && result.modifiedCount > 0
  }
}
