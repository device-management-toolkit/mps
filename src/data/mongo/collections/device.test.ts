/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { vi, type Mocked } from 'vitest'
import { type Db, type Collection } from 'mongodb'
import { MongoDeviceTable } from './device.js'
vi.mock('mongodb')

describe('MongoDeviceTable', () => {
  let db: Mocked<Db>
  let collection: Mocked<Collection>
  let mongoDeviceTable: MongoDeviceTable

  beforeEach(() => {
    collection = {
      countDocuments: vi.fn(),
      find: vi.fn(),
      findOne: vi.fn(),
      deleteOne: vi.fn(),
      insertOne: vi.fn(),
      findOneAndUpdate: vi.fn(),
      distinct: vi.fn(),
      updateOne: vi.fn(),
      updateMany: vi.fn()
    } as any

    db = {
      collection: vi.fn().mockReturnValue(collection)
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
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      toArray: vi.fn<any>().mockResolvedValue(mockData)
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
    const mockDevice = { _id: 1, tenantId: 'someTenantId', some: 'device' } as any
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
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      toArray: vi.fn<any>().mockResolvedValue(mockData)
    } as any)

    const result = await mongoDeviceTable.getByTags(mockTags, 'AND', '5', '10', 'someTenantId')

    expect(result).toEqual(mockData)
    expect(collection.find).toHaveBeenCalledWith({ tags: { $all: mockTags }, tenantId: 'someTenantId' })
  })

  it('should fetch documents by friendly name', async () => {
    const mockData = [{ friendlyName: 'someName' }]
    collection.find.mockReturnValue({
      toArray: vi.fn<any>().mockResolvedValue(mockData)
    } as any)

    const result = await mongoDeviceTable.getByFriendlyName('someName', 'someTenantId')

    expect(result).toEqual(mockData)
  })

  it('should fetch documents by hostname', async () => {
    const mockData = [{ hostname: 'someHostname' }]
    collection.find.mockReturnValue({
      toArray: vi.fn<any>().mockResolvedValue(mockData)
    } as any)

    const result = await mongoDeviceTable.getByHostname('someHostname', 'someTenantId')

    expect(result).toEqual(mockData)
  })

  it('should update the power state for a device', async () => {
    const updatedAt = new Date('2026-08-25T17:00:00.000Z')
    collection.updateOne.mockResolvedValue({ matchedCount: 1 } as any)

    const result = await mongoDeviceTable.updatePowerState('someGuid', 4, 2, updatedAt, 'someTenantId')

    expect(result).toBe(true)
    expect(collection.updateOne).toHaveBeenCalledWith(
      { guid: 'someGuid', tenantId: 'someTenantId' },
      { $set: { powerState: 4, osPowerSavingState: 2, powerStateUpdatedAt: updatedAt } }
    )
  })

  it('should default to an empty tenantId when the power state update omits it', async () => {
    const updatedAt = new Date('2026-08-25T17:00:00.000Z')
    collection.updateOne.mockResolvedValue({ matchedCount: 1 } as any)

    await mongoDeviceTable.updatePowerState('someGuid', 4, 2, updatedAt)

    expect(collection.updateOne).toHaveBeenCalledWith(
      { guid: 'someGuid', tenantId: '' },
      { $set: { powerState: 4, osPowerSavingState: 2, powerStateUpdatedAt: updatedAt } }
    )
  })

  it('should return false when no device matches the power state update', async () => {
    collection.updateOne.mockResolvedValue({ matchedCount: 0 } as any)

    const result = await mongoDeviceTable.updatePowerState('someGuid', 4, 2, new Date(), 'someTenantId')

    expect(result).toBe(false)
  })

  it('should reject when the power state update fails so the caller can back off', async () => {
    collection.updateOne.mockRejectedValue(new Error('mongo is down'))

    await expect(mongoDeviceTable.updatePowerState('someGuid', 4, 2, new Date(), 'someTenantId')).rejects.toThrow(
      'mongo is down'
    )
  })

  it('should clear instance status', async () => {
    collection.updateMany.mockResolvedValue({ modifiedCount: 5 } as any)

    const result = await mongoDeviceTable.clearInstanceStatus('someMpsInstance')

    expect(result).toBe(true)
    expect(collection.updateMany).toHaveBeenCalledWith(
      { mpsInstance: 'someMpsInstance' },
      { $set: { mpsInstance: null, connectionStatus: false } }
    )
  })
})
