/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { vi, type MockInstance } from 'vitest'
import { VaultSecretManagerService } from './index.js'
import { logger } from '../../logging/index.js'
import { config } from '../../test/helper/config.js'
import { Environment } from '../../utils/Environment.js'
import { type Got } from 'got'
import { CertificateStartupError } from '../../utils/certificates.js'

let secretManagerService: VaultSecretManagerService = null
Environment.Config = config
let gotSpy: MockInstance
const secretPath = '4c4c4544-004b-4210-8033-b6c04f504633'
const secretCreds = {
  data: {
    data: {
      AMT_PASSWORD: 'P@ssw0rd',
      MEBX_PASSWORD: 'Intel@123',
      MPS_PASSWORD: 'lLJPJNtU2$8FZTUy'
    }
  }
}

const secretCert = {
  data: {
    mps_tls_config: {
      cert: '-----BEGIN CERTIFICATE-----\r\ncert\r\n-----END CERTIFICATE-----\r\n',
      key: '-----BEGIN RSA PRIVATE KEY-----\r\nkey\r\n-----END RSA PRIVATE KEY-----\r\n',
      minVersion: 'TLSv1',
      rejectUnauthorized: false,
      requestCert: true
    },
    root_key: '-----BEGIN RSA PRIVATE KEY-----\r\nrootkey\r\n-----END RSA PRIVATE KEY-----\r\n',
    web_tls_config: {
      ca: '-----BEGIN CERTIFICATE-----\r\nca\r\n-----END CERTIFICATE-----\r\n',
      cert: '-----BEGIN CERTIFICATE-----\r\ncert\r\n-----END CERTIFICATE-----\r\n',
      key: '-----BEGIN RSA PRIVATE KEY-----\r\nkey\r\n-----END RSA PRIVATE KEY-----\r\n'
    }
  }
}

beforeEach(() => {
  secretManagerService = new VaultSecretManagerService(logger)
  gotSpy = vi.spyOn(secretManagerService.gotClient, 'get').mockImplementation(
    () =>
      ({
        json: vi.fn(() => secretCreds)
      }) as any
  )
})

afterEach(() => {
  vi.clearAllMocks()
})

test('should get a secret for specific given key of a path', async () => {
  const result = await secretManagerService.getSecretFromKey(secretPath, 'AMT_PASSWORD')
  expect(gotSpy).toHaveBeenCalledWith(secretPath)
  expect(result).toBe('P@ssw0rd')
})

test('should get null, if the key does not exists in the path', async () => {
  const result = await secretManagerService.getSecretFromKey(secretPath, 'AMT_PASSWORD1')
  expect(result).toBe(null)
  expect(gotSpy).toHaveBeenCalledWith(secretPath)
})

test('should get null, if path does not exist', async () => {
  const gotFailSpy = vi.spyOn(secretManagerService.gotClient, 'get').mockImplementation(
    () =>
      ({
        json: vi.fn<any>(async () => await Promise.reject(new Error('Not Found')))
      }) as any
  )

  const result = await secretManagerService.getSecretFromKey(secretPath, 'AMT_PASSWORD')
  expect(result).toBe(null)
  expect(gotFailSpy).toHaveBeenCalledWith(secretPath)
})

test('should get a secret from a specific given path', async () => {
  const result = await secretManagerService.getSecretAtPath(secretPath)
  expect(result).toEqual(secretCreds.data)
  expect(gotSpy).toHaveBeenCalledWith(secretPath)
})

test('should throw an exception and return null if given path does not exist', async () => {
  const gotFailSpy = vi.spyOn(secretManagerService.gotClient, 'get').mockImplementation(
    () =>
      ({
        json: vi.fn<any>(async () => await Promise.reject(new Error('Not Found')))
      }) as any
  )
  const result = await secretManagerService.getSecretAtPath('does/not/exist')
  expect(result).toEqual(null)
  expect(gotFailSpy).toHaveBeenCalledWith('does/not/exist')
})

test('should create a secret', async () => {
  const gotPostSpy = vi.spyOn<Got, any>(secretManagerService.gotClient, 'post').mockResolvedValue(null)
  const result = await secretManagerService.writeSecretWithObject('test', secretCert)
  expect(result).toBe(true)
  expect(gotPostSpy).toHaveBeenCalledWith('test', { json: secretCert })
})

test('should return false if the path does not exist', async () => {
  const gotFailSpy = vi.spyOn<Got, 'post'>(secretManagerService.gotClient, 'post').mockRejectedValue('')
  const result = await secretManagerService.writeSecretWithObject('does/not/exist', secretCert)
  expect(result).toBe(false)
  expect(gotFailSpy).toHaveBeenCalledWith('does/not/exist', { json: secretCert })
})

test('should get AMT credentials for a specific device', async () => {
  const data = ['admin', 'P@ssw0rd']
  const secretAtPathSpy = vi.spyOn(secretManagerService, 'getSecretAtPath').mockResolvedValue(secretCreds.data)
  const result = await secretManagerService.getAMTCredentials(secretPath)
  expect(result).toEqual(data)
  expect(secretAtPathSpy).toHaveBeenCalledWith(`devices/${secretPath}`)
})

test('should return null if AMT credentials for a specific device does not exists', async () => {
  const secretAtPathSpy = vi.spyOn(secretManagerService, 'getSecretAtPath').mockResolvedValue(null)
  const result = await secretManagerService.getAMTCredentials(secretPath)
  expect(result).toEqual(null)
  expect(secretAtPathSpy).toHaveBeenCalledWith(`devices/${secretPath}`)
})

test('should return null if AMT_Password for a specific device does not exists', async () => {
  const noCredential = {
    data: {
      data: {
        MEBX_PASSWORD: 'Intel@123',
        MPS_PASSWORD: 'lLJPJNtU2$8FZTUy'
      }
    }
  }
  const secretAtPathSpy = vi.spyOn(secretManagerService, 'getSecretAtPath').mockResolvedValue(noCredential.data)
  const result = await secretManagerService.getAMTCredentials(secretPath)
  expect(result).toEqual(null)
  expect(secretAtPathSpy).toHaveBeenCalledWith(`devices/${secretPath}`)
})

test('should return null if secret data for a specific device does not exists', async () => {
  const noCredential = {
    data: {}
  }
  const secretAtPathSpy = vi.spyOn(secretManagerService, 'getSecretAtPath').mockResolvedValue(noCredential.data)
  const result = await secretManagerService.getAMTCredentials(secretPath)
  expect(result).toEqual(null)
  expect(secretAtPathSpy).toHaveBeenCalledWith(`devices/${secretPath}`)
})

test('should get MPS certs', async () => {
  const getSpy = vi
    .spyOn(secretManagerService.gotClient, 'get')
    .mockImplementation(() => ({ json: vi.fn(async () => ({ data: secretCert }) as any) }) as any)
  const result = await secretManagerService.getMPSCerts()
  expect(result).toEqual(secretCert.data)
  expect(getSpy).toHaveBeenCalledWith('MPSCerts')
})

test('should return null if MPS certs does not exist (404, fresh installation)', async () => {
  vi.spyOn(secretManagerService.gotClient, 'get').mockImplementation(
    () =>
      ({
        json: vi.fn<any>(
          async () => await Promise.reject(Object.assign(new Error('Not Found'), { response: { statusCode: 404 } }))
        )
      }) as any
  )
  const result = await secretManagerService.getMPSCerts()
  expect(result).toEqual(null)
})

const reject404 = (body: unknown): void => {
  vi.spyOn(secretManagerService.gotClient, 'get').mockImplementation(
    () =>
      ({
        json: vi.fn<any>(
          async () =>
            await Promise.reject(Object.assign(new Error('Not Found'), { response: { statusCode: 404, body } }))
        )
      }) as any
  )
}

test.each([
  ['a string', '{"errors":[]}'],
  ['an object', { errors: [] }],
  ['not JSON', 'not json']
])('should return null for a 404 without version metadata (body as %s)', async (_label, body) => {
  reject404(body)
  expect(await secretManagerService.getMPSCerts()).toEqual(null)
})

test.each([
  [
    'soft-deleted (string body)',
    '{"data":{"data":null,"metadata":{"deletion_time":"2026-11-11T06:21:14Z","destroyed":false,"version":1}}}',
    'version 1 deleted at 2026-11-11T06:21:14Z'
  ],
  [
    'soft-deleted (buffer body)',
    Buffer.from(
      '{"data":{"data":null,"metadata":{"deletion_time":"2026-11-11T06:21:14Z","destroyed":false,"version":2}}}'
    ),
    'version 2 deleted at 2026-11-11T06:21:14Z'
  ],
  [
    'destroyed (object body)',
    { data: { data: null, metadata: { deletion_time: '2026-11-11T06:21:14Z', destroyed: true, version: 3 } } },
    'version 3 destroyed'
  ]
])('should stop startup instead of bootstrapping when MPSCerts is %s', async (_label, body, detail) => {
  reject404(body)
  await expect(secretManagerService.getMPSCerts()).rejects.toBeInstanceOf(CertificateStartupError)
  await expect(secretManagerService.getMPSCerts()).rejects.toThrow(detail)
})

test.each([
  ['a 500 response', Object.assign(new Error('Internal Server Error'), { response: { statusCode: 500 } })],
  ['a 403 response', Object.assign(new Error('Forbidden'), { response: { statusCode: 403 } })],
  ['a network error', new Error('connect ECONNREFUSED')]
])('should stop startup instead of reporting no MPS certs on %s', async (_label, failure) => {
  vi.spyOn(secretManagerService.gotClient, 'get').mockImplementation(
    () => ({ json: vi.fn<any>(async () => await Promise.reject(failure)) }) as any
  )
  await expect(secretManagerService.getMPSCerts()).rejects.toBeInstanceOf(CertificateStartupError)
  await expect(secretManagerService.getMPSCerts()).rejects.toThrow(failure.message)
})

test('should return an empty object, not null, when the MPSCerts secret exists without data', async () => {
  vi.spyOn(secretManagerService.gotClient, 'get').mockImplementation(
    () => ({ json: vi.fn(async () => ({ data: { data: null } }) as any) }) as any
  )
  const result = await secretManagerService.getMPSCerts()
  expect(result).toEqual({})
})

test('should get health of vault', async () => {
  const data = {
    initialized: true,
    sealed: false,
    standby: false,
    performance_standby: false,
    replication_performance_mode: 'disabled',
    replication_dr_mode: 'disabled',
    server_time_utc: 1638201913,
    version: '1.8.5',
    cluster_name: 'vault-cluster-426a5cd4',
    cluster_id: '3f02d0f2-4048-cdcd-7e4d-7d2905c52995'
  }
  const gothealthSpy = vi.spyOn(secretManagerService.gotClient, 'get').mockImplementation(
    () =>
      ({
        json: vi.fn(() => data)
      }) as any
  )
  const result = await secretManagerService.health()
  expect(result).toEqual(data)
  expect(gothealthSpy).toHaveBeenCalledWith('sys/health?standbyok=true', {
    prefixUrl: `${Environment.Config.vault_address}/v1/`
  })
})
