/*********************************************************************
 * Copyright (c) Intel Corporation 2026
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { Environment } from './Environment.js'
import { deviceSecretPath, isTenantPartitionEnabled, tenantSegment } from './secretPaths.js'

describe('secretPaths', () => {
  const guid = '4c4c4544-004b-4210-8033-b6c04f504633'

  describe('with tenant partitioning enabled', () => {
    beforeEach(() => {
      Environment.Config = { secrets_tenant_partition: true } as any
    })

    it('reports partitioning as enabled', () => {
      expect(isTenantPartitionEnabled()).toBe(true)
    })

    it.each([
      '',
      null,
      undefined
    ])('keeps the legacy device path for the empty tenant: %s', (tenantId) => {
      expect(deviceSecretPath(guid, tenantId)).toBe(`devices/${guid}`)
    })

    it('prefixes a non-empty tenant', () => {
      expect(deviceSecretPath(guid, 'tenant-a')).toBe(`tenants/tenant-a/devices/${guid}`)
    })

    it('gives two tenants with the same device guid distinct paths', () => {
      expect(deviceSecretPath(guid, 'tenant-a')).not.toBe(deviceSecretPath(guid, 'tenant-b'))
      expect(deviceSecretPath(guid, 'tenant-a')).not.toBe(deviceSecretPath(guid, ''))
    })

    it('cannot escape the tenant prefix with a crafted tenant id', () => {
      expect(deviceSecretPath(guid, '../other')).toBe(`tenants/.2E.2E.2Fother/devices/${guid}`)
    })
  })

  describe('with tenant partitioning disabled', () => {
    it.each([
      { secrets_tenant_partition: false },
      { secrets_tenant_partition: 'true' },
      {},
      null
    ])('keeps the legacy device path for every tenant when config is %o', (config) => {
      Environment.Config = config as any
      expect(isTenantPartitionEnabled()).toBe(false)
      expect(deviceSecretPath(guid, 'tenant-a')).toBe(`devices/${guid}`)
      expect(deviceSecretPath(guid, '')).toBe(`devices/${guid}`)
    })
  })

  describe('tenantSegment', () => {
    it('returns a UUID tenant id unchanged', () => {
      expect(tenantSegment(guid)).toBe(guid)
    })

    it('returns an id made of letters, digits, underscore and dash unchanged', () => {
      expect(tenantSegment('Acme_Corp-01')).toBe('Acme_Corp-01')
    })

    it('keeps a tenant id with path characters inside one segment', () => {
      const segment = tenantSegment('a b/c%d_e')
      expect(segment).toBe('a.20b.2Fc.25d_e')
      expect(segment).not.toContain('/')
      expect(segment).not.toContain('%')
    })

    it('is reversible so distinct tenant ids never collide', () => {
      const decode = (s: string): string => decodeURIComponent(s.replace(/\./g, '%'))
      for (const tenantId of [
        'a/b',
        'a_b',
        'a%2Fb',
        'a.2Fb',
        'a.b',
        'tenant-ä'
      ]) {
        expect(decode(tenantSegment(tenantId))).toBe(tenantId)
      }
      expect(tenantSegment('a/b')).not.toBe(tenantSegment('a.2Fb'))
    })
  })
})
