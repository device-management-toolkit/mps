/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type Db, type Collection } from 'mongodb'
import { MongoDeviceTable } from './device'

jest.mock('mongodb')

describe('MongoDeviceTable', () => {
  let db: jest.Mocked<Db>
  let collection: jest.Mocked<Collection>
  let mongoDeviceTable: MongoDeviceTable

  beforeEach(() => {
    collection = {
      countDocuments: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      deleteOne: jest.fn(),
      insertOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      distinct: jest.fn(),
      updateMany: jest.fn()
    } as any

    db = {
      collection: jest.fn().mockReturnValue(collection)
    } as any

    mongoDeviceTable = new MongoDeviceTable(db)
  })

  it('should return count of documents matching tenantId', async () => {
    collection.countDocuments.mockResolvedValue(10)

    const result = await mongoDeviceTable.getCount('someTenantId')

    expect(result).toBe(10)
    expect(collection.countDocuments).toHaveBeenCalledWith({ tenantId: 'someTenantId' })
  })

  it('should fetch documents based on limit, offset and tenantId', async () => {
    const mockData = [{ some: 'data' }]
    collection.find.mockReturnValue({
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      toArray: jest.fn().mockResolvedValue(mockData)
    } as any)

    const result = await mongoDeviceTable.get('5', '10', 'someTenantId')

    expect(result).toEqual(mockData)
  })

  it('should fetch document by id and tenantId', async () => {
    const mockData = { guid: 'someId', some: 'data' }
    collection.findOne.mockResolvedValue(mockData)

    const result = await mongoDeviceTable.getById('someId', 'someTenantId')

    expect(result).toEqual(mockData)
    expect(collection.findOne).toHaveBeenCalledWith({ guid: 'someId', tenantId: 'someTenantId' })
  })

  it('should delete document by guid and tenantId', async () => {
    collection.deleteOne.mockResolvedValue({ deletedCount: 1 } as any)

    const result = await mongoDeviceTable.delete('someGuid', 'someTenantId')

    expect(result).toBe(true)
    expect(collection.deleteOne).toHaveBeenCalledWith({ guid: 'someGuid', tenantId: 'someTenantId' })
  })

  it('should insert a device', async () => {
    const mockDevice = { some: 'device' } as any
    collection.insertOne.mockResolvedValue({ acknowledged: true } as any)

    const result = await mongoDeviceTable.insert(mockDevice)

    expect(result).toEqual(mockDevice)
    expect(collection.insertOne).toHaveBeenCalledWith(mockDevice)
  })

  it('should throw error when insertion is not acknowledged', async () => {
    const mockDevice = { some: 'device' } as any
    collection.insertOne.mockResolvedValue({ acknowledged: false } as any)

    await expect(mongoDeviceTable.insert(mockDevice)).rejects.toThrow('Failed to insert')
  })

  it('should update a device', async () => {
    const mockDevice = { _id: 'someId', tenantId: 'someTenantId', some: 'device' } as any
    collection.findOneAndUpdate.mockResolvedValue(mockDevice)

    const result = await mongoDeviceTable.update(mockDevice)

    expect(result).toEqual(mockDevice)
    expect(collection.findOneAndUpdate).toHaveBeenCalled()
  })

  it('should return count of connected devices', async () => {
    collection.countDocuments.mockResolvedValue(5)

    const result = await mongoDeviceTable.getConnectedDevices('someTenantId')

    expect(result).toBe(5)
    expect(collection.countDocuments).toHaveBeenCalledWith({ connectionStatus: true, tenantId: 'someTenantId' })
  })

  it('should return distinct tags', async () => {
    const mockTags = ['tag1', 'tag2']
    collection.distinct.mockResolvedValue(mockTags)

    const result = await mongoDeviceTable.getDistinctTags('someTenantId')

    expect(result).toEqual(mockTags)
    expect(collection.distinct).toHaveBeenCalledWith('tags', { tenantId: 'someTenantId' })
  })

  it('should fetch documents based on tags and method AND', async () => {
    const mockData = [{ some: 'data' }]
    const mockTags = ['tag1', 'tag2']
    collection.find.mockReturnValue({
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      toArray: jest.fn().mockResolvedValue(mockData)
    } as any)

    const result = await mongoDeviceTable.getByTags(mockTags, 'AND', '5', '10', 'someTenantId')

    expect(result).toEqual(mockData)
    expect(collection.find).toHaveBeenCalledWith(
      { tags: { $all: mockTags }, tenantId: 'someTenantId' }
    )
  })

  it('should fetch documents by friendly name', async () => {
    const mockData = [{ friendlyName: 'someName' }]
    collection.find.mockReturnValue({
      toArray: jest.fn().mockResolvedValue(mockData)
    } as any)

    const result = await mongoDeviceTable.getByFriendlyName('someName', 'someTenantId')

    expect(result).toEqual(mockData)
  })

  it('should fetch documents by hostname', async () => {
    const mockData = [{ hostname: 'someHostname' }]
    collection.find.mockReturnValue({
      toArray: jest.fn().mockResolvedValue(mockData)
    } as any)

    const result = await mongoDeviceTable.getByHostname('someHostname', 'someTenantId')

    expect(result).toEqual(mockData)
  })

  it('should clear instance status', async () => {
    collection.updateMany.mockResolvedValue({ modifiedCount: 5 } as any)

    const result = await mongoDeviceTable.clearInstanceStatus('someMpsInstance', 'someTenantId')

    expect(result).toBe(true)
    expect(collection.updateMany).toHaveBeenCalledWith(
      { mpsInstance: 'someMpsInstance', tenantId: 'someTenantId' },
      { $set: { mpsInstance: null, connectionStatus: false } }
    )
  })
})
