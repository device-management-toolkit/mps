/*********************************************************************
 * Copyright (c) Intel Corporation 2026
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { vi } from 'vitest'
import { logger } from '../logging/index.js'
import { Environment } from '../utils/Environment.js'
import { migrateTenantSecrets } from './tenantMigration.js'

describe('tenant secret migration', () => {
  const guid = '4c4c4544-004b-4210-8033-b6c04f504633'
  let store: Record<string, any>
  let rows: { guid: string; tenantId: string }[]
  let db: any
  let secrets: any

  beforeEach(() => {
    Environment.Config = { secrets_tenant_partition: true, db_provider: 'postgres' } as any
    store = {}
    rows = []
    db = { query: vi.fn(async () => ({ rows })) }
    secrets = {
      // mirrors the vault provider: { data, metadata } or null
      getSecretAtPath: vi.fn(async (path: string) => (store[path] ? { data: store[path], metadata: {} } : null)),
      // mirrors the vault provider: the caller supplies the KV v2 { data } wrapper
      writeSecretWithObject: vi.fn(async (path: string, body: any) => {
        store[path] = body.data
        return true
      }),
      deleteSecretAtPath: vi.fn(async (path: string) => {
        delete store[path]
      })
    }
    vi.spyOn(logger, 'debug').mockImplementation(() => logger)
    vi.spyOn(logger, 'info').mockImplementation(() => logger)
    vi.spyOn(logger, 'warn').mockImplementation(() => logger)
    vi.spyOn(logger, 'error').mockImplementation(() => logger)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does nothing when partitioning is off', async () => {
    Environment.Config = { secrets_tenant_partition: false, db_provider: 'postgres' } as any
    const result = await migrateTenantSecrets(db, secrets)
    expect(result).toEqual({ migrated: 0, skipped: 0, errors: 0 })
    expect(db.query).not.toHaveBeenCalled()
  })

  it('does nothing for an unsupported db provider', async () => {
    Environment.Config = { secrets_tenant_partition: true, db_provider: 'mongo' } as any
    const result = await migrateTenantSecrets(db, secrets)
    expect(result).toEqual({ migrated: 0, skipped: 0, errors: 0 })
    expect(db.query).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalled()
  })

  it('moves a legacy device secret to the tenant path', async () => {
    rows = [{ guid, tenantId: 'tenant-a' }]
    store[`devices/${guid}`] = { AMT_PASSWORD: 'amt', MPS_PASSWORD: 'mps' }

    const result = await migrateTenantSecrets(db, secrets)

    expect(result).toEqual({ migrated: 1, skipped: 0, errors: 0 })
    expect(store[`tenants/tenant-a/devices/${guid}`]).toEqual({ AMT_PASSWORD: 'amt', MPS_PASSWORD: 'mps' })
    expect(secrets.writeSecretWithObject).toHaveBeenCalledWith(`tenants/tenant-a/devices/${guid}`, {
      data: { AMT_PASSWORD: 'amt', MPS_PASSWORD: 'mps' }
    })
    expect(store[`devices/${guid}`]).toBeUndefined()
  })

  it('skips a secret that already exists at the tenant path', async () => {
    rows = [{ guid, tenantId: 'tenant-a' }]
    store[`tenants/tenant-a/devices/${guid}`] = { AMT_PASSWORD: 'new' }
    store[`devices/${guid}`] = { AMT_PASSWORD: 'old' }

    const result = await migrateTenantSecrets(db, secrets)

    expect(result).toEqual({ migrated: 0, skipped: 1, errors: 0 })
    expect(secrets.writeSecretWithObject).not.toHaveBeenCalled()
    expect(store[`devices/${guid}`]).toEqual({ AMT_PASSWORD: 'old' })
  })

  it('skips a device with no legacy secret', async () => {
    rows = [{ guid, tenantId: 'tenant-a' }]

    const result = await migrateTenantSecrets(db, secrets)

    expect(result).toEqual({ migrated: 0, skipped: 1, errors: 0 })
    expect(secrets.writeSecretWithObject).not.toHaveBeenCalled()
  })

  it('is idempotent', async () => {
    rows = [{ guid, tenantId: 'tenant-a' }]
    store[`devices/${guid}`] = { AMT_PASSWORD: 'amt' }

    const first = await migrateTenantSecrets(db, secrets)
    const second = await migrateTenantSecrets(db, secrets)

    expect(first.migrated).toBe(1)
    expect(second).toEqual({ migrated: 0, skipped: 1, errors: 0 })
  })

  it('keeps the legacy secret when the tenant write fails', async () => {
    rows = [{ guid, tenantId: 'tenant-a' }]
    store[`devices/${guid}`] = { AMT_PASSWORD: 'amt' }
    secrets.writeSecretWithObject.mockResolvedValue(false)

    const result = await migrateTenantSecrets(db, secrets)

    expect(result).toEqual({ migrated: 0, skipped: 0, errors: 1 })
    expect(secrets.deleteSecretAtPath).not.toHaveBeenCalled()
    expect(store[`devices/${guid}`]).toBeDefined()
  })

  it('counts the move when the legacy delete throws and warns', async () => {
    rows = [{ guid, tenantId: 'tenant-a' }]
    store[`devices/${guid}`] = { AMT_PASSWORD: 'amt' }
    secrets.deleteSecretAtPath.mockRejectedValue(new Error('403'))

    const result = await migrateTenantSecrets(db, secrets)

    expect(result.migrated).toBe(1)
    expect(store[`tenants/tenant-a/devices/${guid}`]).toBeDefined()
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('could not delete'))
  })

  it('counts a secret store error and continues with the next device', async () => {
    rows = [
      { guid: 'bad', tenantId: 'tenant-a' },
      { guid, tenantId: 'tenant-a' }
    ]
    store[`devices/${guid}`] = { AMT_PASSWORD: 'amt' }
    secrets.getSecretAtPath.mockImplementation(async (path: string) => {
      if (path.endsWith('/bad')) throw new Error('boom')
      return store[path] ? { data: store[path], metadata: {} } : null
    })

    const result = await migrateTenantSecrets(db, secrets)

    expect(result).toEqual({ migrated: 1, skipped: 0, errors: 1 })
  })

  it('never throws when the database is unavailable', async () => {
    db.query.mockRejectedValue(new Error('down'))
    await expect(migrateTenantSecrets(db, secrets)).resolves.toEqual({ migrated: 0, skipped: 0, errors: 1 })
  })
})
