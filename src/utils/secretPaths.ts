/*********************************************************************
 * Copyright (c) Intel Corporation 2026
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { Environment } from './Environment.js'

/**
 * Builds the secret-store path for a device's credentials, scoped to a tenant.
 *
 * Partitioning is opt-in through the `secrets_tenant_partition` setting. When
 * it is off (the default), or for the empty tenant, the historical
 * `devices/<guid>` path is used unchanged. When it is on, a non-empty tenant is
 * placed under `tenants/<tenant>/`.
 *
 * RPS writes device credentials with the same rule (see secretPaths.ts in
 * RPS), so the setting must match in both services. Paths stay plain strings
 * so any ISecretManagerService implementation keeps working.
 */

export type TenantId = string | null | undefined

/** True when secrets are partitioned by tenant (see `secrets_tenant_partition`). */
export function isTenantPartitionEnabled(): boolean {
  return Environment.Config?.secrets_tenant_partition === true
}

/**
 * Encodes a tenant id as a single, reversible path segment made only of
 * `[A-Za-z0-9-_.!~*'()]`, so a tenant id containing `/`, `%` or whitespace
 * cannot produce extra path segments or collide with another tenant.
 * UUID-style tenant ids, and any id made of letters, digits, `_` and `-`, are
 * returned unchanged; `.` is the escape character.
 */
export function tenantSegment(tenantId: string): string {
  return encodeURIComponent(tenantId).replace(/\./g, '%2E').replace(/%/g, '.')
}

function tenantPrefix(tenantId: TenantId): string {
  const tenant = tenantId ?? ''
  if (tenant === '' || !isTenantPartitionEnabled()) {
    return ''
  }
  return `tenants/${tenantSegment(tenant)}/`
}

/** AMT, MEBx and MPS credentials for a device. */
export function deviceSecretPath(guid: string, tenantId: TenantId): string {
  return `${tenantPrefix(tenantId)}devices/${guid}`
}
