/*********************************************************************
 * Copyright (c) Intel Corporation 2026
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type IDB } from '../interfaces/IDb.js'
import { type ISecretManagerService } from '../interfaces/ISecretManagerService.js'
import { logger } from '../logging/index.js'
import { Environment } from '../utils/Environment.js'
import { deviceSecretPath, isTenantPartitionEnabled } from '../utils/secretPaths.js'

/**
 * One-time, idempotent move of tenant-owned device credentials from the legacy
 * `devices/{guid}` path to their tenant partition. Runs at startup when
 * `secrets_tenant_partition` is on and does nothing otherwise.
 *
 * The devices table decides ownership. A device GUID is unique across tenants,
 * so every legacy device secret has exactly one owner and can be moved safely.
 * Profile, domain, CIRA and wireless secrets are migrated by RPS, which owns
 * those tables.
 */

interface DeviceRow {
  guid: string
  tenantId: string
}

export interface TenantSecretMigrationResult {
  migrated: number
  skipped: number
  errors: number
}

const TENANT_DEVICES_QUERY = `SELECT guid, tenantid AS "tenantId" FROM devices WHERE tenantid <> ''`

export async function migrateTenantSecrets(
  db: IDB,
  secrets: ISecretManagerService
): Promise<TenantSecretMigrationResult> {
  const result: TenantSecretMigrationResult = { migrated: 0, skipped: 0, errors: 0 }
  if (!isTenantPartitionEnabled()) {
    logger.debug('tenant secret partitioning is off; no secret migration needed')
    return result
  }
  if (Environment.Config.db_provider !== 'postgres') {
    logger.warn(
      `tenant secret migration supports the postgres db_provider only (configured: ${Environment.Config.db_provider}); migrate secrets manually`
    )
    return result
  }

  let rows: DeviceRow[]
  try {
    rows = (await db.query(TENANT_DEVICES_QUERY)).rows ?? []
  } catch (error) {
    logger.error(`tenant secret migration: failed to list devices: ${error}`)
    result.errors++
    return result
  }

  for (const row of rows) {
    await migrateOne(secrets, row, result)
  }

  logger.info(`tenant secret migration: migrated=${result.migrated} skipped=${result.skipped} errors=${result.errors}`)
  return result
}

async function migrateOne(
  secrets: ISecretManagerService,
  row: DeviceRow,
  result: TenantSecretMigrationResult
): Promise<void> {
  const tenantPath = deviceSecretPath(row.guid, row.tenantId)
  const legacyPath = deviceSecretPath(row.guid, '')
  try {
    // The vault provider returns null for both "absent" and "unreachable"; either
    // way nothing is written or deleted, so an outage can only postpone the move.
    const existing = await secrets.getSecretAtPath(tenantPath)
    if (existing?.data != null) {
      result.skipped++
      return
    }
    const legacy = await secrets.getSecretAtPath(legacyPath)
    if (legacy?.data == null) {
      result.skipped++
      return
    }
    // The vault provider posts the body as-is, so the KV v2 { data } wrapper is the caller's job.
    const written = await secrets.writeSecretWithObject(tenantPath, { data: legacy.data })
    if (!written) {
      logger.error(`tenant secret migration: failed to write ${tenantPath}; legacy secret left in place`)
      result.errors++
      return
    }
    try {
      await secrets.deleteSecretAtPath(legacyPath)
    } catch (error) {
      logger.warn(
        `tenant secret migration: copied ${legacyPath} to ${tenantPath} but could not delete the legacy secret: ${error}`
      )
    }
    logger.info(`tenant secret migration: moved ${legacyPath} to ${tenantPath}`)
    result.migrated++
  } catch (error) {
    logger.error(`tenant secret migration: ${legacyPath} -> ${tenantPath} failed: ${error}`)
    result.errors++
  }
}
