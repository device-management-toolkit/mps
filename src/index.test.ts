/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { vi } from 'vitest'
import { logger } from './logging/logger.js'
import VaultSecretManagerService from './secrets/vault/index.js'
import { Environment } from './utils/Environment.js'
import { type IDB } from './interfaces/IDb.js'
import { type ISecretManagerService } from './interfaces/ISecretManagerService.js'
import { Certificates, getRootKeySize } from './utils/certificates.js'
import { connect, createServer } from 'node:tls'
import { once } from 'node:events'
import { generateKeyPairSync } from 'node:crypto'
import forge from 'node-forge'
const backOffSpy = vi.fn()
const processServiceConfigsSpy = vi.fn().mockReturnValue(Promise.resolve())
const waitForServiceManagerSpy = vi.fn().mockReturnValue(Promise.resolve(true))
vi.mock('exponential-backoff', () => ({
  backOff: backOffSpy
}))
vi.mock('./consul/serviceManager.js', () => ({
  processServiceConfigs: processServiceConfigsSpy,
  waitForServiceManager: waitForServiceManagerSpy
}))
const indexFile = await import('./index.js')

describe('Index', () => {
  describe('loadConfig', () => {
    afterEach(() => {
      vi.clearAllMocks()
      vi.restoreAllMocks()
      vi.resetAllMocks()
    })
    let config

    beforeEach(() => {
      process.env.NODE_ENV = 'test'
      config = {
        common_name: 'localhost',
        port: 4433,
        country: 'US',
        company: 'NoCorp',
        listen_any: true,
        tls_offload: false,
        web_port: 3000,
        generate_certificates: true,
        web_admin_user: 'admin',
        web_admin_password: 'password',
        web_auth_enabled: true,
        vault_address: 'http://localhost:8200',
        vault_token: 'myroot',
        mqtt_address: '',
        secrets_path: 'secret/data/',
        cert_format: 'file',
        data_path: '../private/data.json',
        cert_path: '../private',
        jwt_secret: 'secret',
        jwt_issuer: '9EmRJTbIiIb4bIeSsmgcWIjrR6HyETqc',
        jwt_expiration: '1440',
        cors_origin: '*',
        cors_headers: '*',
        cors_methods: '*',
        db_provider: 'postgres',
        connection_string: 'postgresql://<USERNAME>:<PASSWORD>@localhost:5432/mpsdb?sslmode=no-verify',
        instance_name: 'localhost',
        mps_tls_config: {
          key: '../private/mpsserver-cert-private.key',
          cert: '../private/mpsserver-cert-public.crt',
          requestCert: true,
          rejectUnauthorized: false,
          minVersion: 'TLSv1',
          ciphers: null,
          secureOptions: ['SSL_OP_NO_SSLv2', 'SSL_OP_NO_SSLv3']
        },
        web_tls_config: {
          key: '../private/mpsserver-cert-private.key',
          cert: '../private/mpsserver-cert-public.crt',
          ca: ['../private/root-cert-public.crt'],
          secureOptions: [
            'SSL_OP_NO_SSLv2',
            'SSL_OP_NO_SSLv3',
            'SSL_OP_NO_COMPRESSION',
            'SSL_OP_CIPHER_SERVER_PREFERENCE',
            'SSL_OP_NO_TLSv1',
            'SSL_OP_NO_TLSv11'
          ]
        },
        consul_enabled: true,
        consul_host: 'localhost',
        consul_port: '8500',
        consul_key_prefix: 'MPS'
      }
      Environment.Config = config
    })
    it('Should exit setupServiceManager', async () => {
      // const waitSpy = vi.spyOn(svcMngr, 'waitForServiceManager')
      waitForServiceManagerSpy.mockImplementation(() => {
        throw new Error('Test error')
      })
      const mockExit = vi.spyOn(process, 'exit').mockImplementation((code) => code as never)
      await indexFile.setupServiceManager(config)
      expect(mockExit).toHaveBeenCalledWith(0)
      expect(waitForServiceManagerSpy).toHaveBeenCalled()
    })
    it('should pass setupServiceManager', async () => {
      await indexFile.setupServiceManager(config)
      expect(processServiceConfigsSpy).toHaveBeenCalled()
      expect(waitForServiceManagerSpy).toHaveBeenCalled()
    })

    it('should pass with config', () => {
      const result = indexFile.loadConfig(config)
      expect(result.web_tls_config).toEqual(config.web_tls_config)
    })

    it('Should fail with no jwt secret', () => {
      config.jwt_secret = ''
      const mockExit = vi.spyOn(process, 'exit').mockImplementation((number) => {
        throw new Error('process.exit: ' + number)
      })
      expect(() => {
        indexFile.loadConfig(config)
      }).toThrow()
      expect(mockExit).toHaveBeenCalledWith(1)
    })
    it('Should fail with no username or password if web_auth_enabled is set to true', () => {
      config.web_auth_enabled = true
      config.web_admin_user = 'admin'
      config.web_admin_password = ''
      config.jwt_secret = 'secret'
      const mockExit = vi.spyOn(process, 'exit').mockImplementation((number) => {
        throw new Error('process.exit: ' + number)
      })
      expect(() => {
        indexFile.loadConfig(config)
      }).toThrow()
      expect(mockExit).toHaveBeenCalledWith(1)
    })

    it('should accept valid mps_tls_config.mps_cert_key_size of 3072', () => {
      config.mps_tls_config = { mps_cert_key_size: 3072 }
      const result = indexFile.loadConfig(config)
      expect(result.mps_tls_config.mps_cert_key_size).toEqual(3072)
    })

    it('should accept valid mps_tls_config.mps_cert_key_size of 2048', () => {
      config.mps_tls_config = { mps_cert_key_size: 2048 }
      const result = indexFile.loadConfig(config)
      expect(result.mps_tls_config.mps_cert_key_size).toEqual(2048)
    })

    it('should use default 2048 for invalid mps_tls_config.mps_cert_key_size', () => {
      config.mps_tls_config = { mps_cert_key_size: 4096 }
      const result = indexFile.loadConfig(config)
      expect(result.mps_tls_config.mps_cert_key_size).toEqual(2048)
    })

    it('should use default 2048 when mps_tls_config.mps_cert_key_size is not provided', () => {
      config.mps_tls_config = {}
      const result = indexFile.loadConfig(config)
      expect(result.mps_tls_config.mps_cert_key_size).toEqual(2048)
    })

    it('defaults legacy ciphers to true and accepts a false environment value', () => {
      config.mps_tls_config = {}
      expect(indexFile.loadConfig(config).mps_tls_config.legacy_compatible_ciphers).toBe(true)
      config.mps_tls_config.legacy_compatible_ciphers = 'false'
      expect(indexFile.loadConfig(config).mps_tls_config.legacy_compatible_ciphers).toBe(false)
      config.mps_tls_config.legacy_compatible_ciphers = 'invalid'
      expect(() => indexFile.loadConfig(config)).toThrow('legacy_compatible_ciphers must be true or false')
    })
  })

  describe('setupSignalHandling', () => {
    let secretManagerService: VaultSecretManagerService = null
    let config

    beforeEach(() => {
      vi.clearAllMocks()
      config = {
        common_name: 'localhost',
        port: 4433,
        country: 'US',
        company: 'NoCorp',
        listen_any: true,
        tls_offload: false,
        web_port: 3000,
        generate_certificates: false,
        web_admin_user: 'admin',
        web_admin_password: 'password',
        web_auth_enabled: true,
        vault_address: 'http://localhost:8200',
        vault_token: 'myroot',
        mqtt_address: '',
        secrets_path: 'secret/data/',
        cert_format: 'raw',
        data_path: '../private/data.json',
        cert_path: '../private',
        jwt_secret: 'secret',
        jwt_issuer: '9EmRJTbIiIb4bIeSsmgcWIjrR6HyETqc',
        jwt_expiration: '1440',
        cors_origin: '*',
        cors_headers: '*',
        cors_methods: '*',
        db_provider: 'postgres',
        connection_string: '',
        instance_name: 'localhost',
        mps_tls_config: {
          key: '../private/mpsserver-cert-private.key',
          cert: '../private/mpsserver-cert-public.crt',
          requestCert: true,
          rejectUnauthorized: false,
          minVersion: 'TLSv1',
          ciphers: null,
          secureOptions: ['SSL_OP_NO_SSLv2', 'SSL_OP_NO_SSLv3']
        },
        web_tls_config: {
          key: '../private/mpsserver-cert-private.key',
          cert: '../private/mpsserver-cert-public.crt',
          ca: ['../private/root-cert-public.crt'],
          secureOptions: [
            'SSL_OP_NO_SSLv2',
            'SSL_OP_NO_SSLv3',
            'SSL_OP_NO_COMPRESSION',
            'SSL_OP_CIPHER_SERVER_PREFERENCE',
            'SSL_OP_NO_TLSv1',
            'SSL_OP_NO_TLSv11'
          ]
        }
      }
      Environment.Config = config
      secretManagerService = new VaultSecretManagerService(logger)
      vi.spyOn(secretManagerService.gotClient, 'get').mockImplementation(
        () =>
          ({
            json: vi.fn(() => null)
          }) as any
      )
    })
    it('should pass with config', async () => {
      const result = await indexFile.loadCertificates(secretManagerService)
      expect(result.mps_tls_config.requestCert).toEqual(true)
    })
  })

  describe('CIRA TLS policy', () => {
    let stored
    let secretManager: ISecretManagerService

    beforeAll(() => {
      const config = {
        common_name: 'localhost',
        country: 'US',
        organization: 'Test',
        mps_tls_config: { minVersion: 'TLSv1.2' }
      }
      stored = new Certificates(config as any, {} as ISecretManagerService).generateCertificates()
      stored.mps_tls_config.minVersion = 'TLSv1'
      stored.mps_tls_config.ciphers = 'ECDHE-RSA-AES256-GCM-SHA384'
    })

    beforeEach(() => {
      Environment.Config = {
        generate_certificates: true,
        mps_tls_config: { minVersion: 'TLSv1.2', legacy_compatible_ciphers: true }
      } as any
      secretManager = { getMPSCerts: vi.fn().mockResolvedValue(stored) } as any
    })

    it('applies the policy to stored certificates without modifying them and logs their actual sizes', async () => {
      const infoSpy = vi.spyOn(logger, 'info')
      const result = await indexFile.loadCertificates(secretManager)
      expect(result.mps_tls_config.minVersion).toBe('TLSv1.2')
      expect(result.mps_tls_config.ciphers).toBe('ECDHE-RSA-AES256-GCM-SHA384:-AES128-GCM-SHA256:AES128-GCM-SHA256')
      expect(stored.mps_tls_config.minVersion).toBe('TLSv1')
      expect(stored.mps_tls_config.ciphers).toBe('ECDHE-RSA-AES256-GCM-SHA384')
      expect(result.web_tls_config.ca).toBe(stored.web_tls_config.ca)
      expect(result.root_key).toBe(stored.root_key)
      expect(infoSpy).toHaveBeenCalledWith('MPS certificate key sizes: leaf=2048 bits, root=3072 bits')
      infoSpy.mockRestore()
    })

    it.each([3072, 4096])('reports the actual size of a stored %i-bit leaf', async (size) => {
      const { publicKey } = generateKeyPairSync('rsa', { modulusLength: size })
      const cert = forge.pki.createCertificate()
      cert.publicKey = forge.pki.publicKeyFromPem(publicKey.export({ type: 'spki', format: 'pem' }))
      cert.serialNumber = '01'
      cert.validity.notBefore = new Date()
      cert.validity.notAfter = new Date(Date.now() + 86400000)
      cert.setSubject([{ name: 'commonName', value: 'localhost' }])
      cert.setIssuer(forge.pki.certificateFromPem(stored.web_tls_config.ca).subject.attributes)
      cert.sign(forge.pki.privateKeyFromPem(stored.root_key), forge.md.sha384.create())
      secretManager.getMPSCerts = vi.fn().mockResolvedValue({
        ...stored,
        mps_tls_config: { ...stored.mps_tls_config, cert: forge.pki.certificateToPem(cert) }
      })
      const infoSpy = vi.spyOn(logger, 'info')
      try {
        await indexFile.loadCertificates(secretManager)
        expect(infoSpy).toHaveBeenCalledWith(`MPS certificate key sizes: leaf=${size} bits, root=3072 bits`)
      } finally {
        infoSpy.mockRestore()
      }
    })

    it('reports an unknown CIRA root for an unrelated web CA with the same subject', async () => {
      const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
      const unrelatedRoot = forge.pki.createCertificate()
      unrelatedRoot.publicKey = forge.pki.publicKeyFromPem(publicKey.export({ type: 'spki', format: 'pem' }))
      const subject = forge.pki.certificateFromPem(stored.web_tls_config.ca).subject.attributes
      unrelatedRoot.setSubject(subject)
      unrelatedRoot.setIssuer(subject)
      unrelatedRoot.setExtensions([{ name: 'basicConstraints', cA: true }])
      unrelatedRoot.sign(
        forge.pki.privateKeyFromPem(privateKey.export({ type: 'pkcs8', format: 'pem' })),
        forge.md.sha384.create()
      )
      secretManager.getMPSCerts = vi.fn().mockResolvedValue({
        ...stored,
        web_tls_config: { ...stored.web_tls_config, ca: forge.pki.certificateToPem(unrelatedRoot) }
      })
      const infoSpy = vi.spyOn(logger, 'info')
      try {
        await indexFile.loadCertificates(secretManager)
        expect(infoSpy).toHaveBeenCalledWith('MPS certificate key sizes: leaf=2048 bits, root=unknown bits')
      } finally {
        infoSpy.mockRestore()
      }
    })

    it('finds the CIRA root through an intermediate and reports unknown for an incomplete chain', () => {
      const root = forge.pki.certificateFromPem(stored.web_tls_config.ca)
      const rootKey = forge.pki.privateKeyFromPem(stored.root_key)
      const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
      const intermediate = forge.pki.createCertificate()
      intermediate.publicKey = forge.pki.publicKeyFromPem(publicKey.export({ type: 'spki', format: 'pem' }))
      intermediate.setSubject([{ name: 'commonName', value: 'Intermediate CA' }])
      intermediate.setIssuer(root.subject.attributes)
      intermediate.setExtensions([{ name: 'basicConstraints', cA: true }])
      intermediate.sign(rootKey, forge.md.sha384.create())
      const leaf = forge.pki.certificateFromPem(stored.mps_tls_config.cert)
      leaf.setIssuer(intermediate.subject.attributes)
      leaf.sign(
        forge.pki.privateKeyFromPem(privateKey.export({ type: 'pkcs8', format: 'pem' })),
        forge.md.sha384.create()
      )
      const leafPem = forge.pki.certificateToPem(leaf)
      const intermediatePem = forge.pki.certificateToPem(intermediate)
      const rootPem = forge.pki.certificateToPem(root)
      expect(getRootKeySize(rootPem, leafPem)).toBeNull()
      expect(getRootKeySize(rootPem, leafPem + intermediatePem)).toBe(3072)
      expect(getRootKeySize([intermediatePem, rootPem], leafPem)).toBe(3072)
      expect(getRootKeySize(undefined, leafPem + intermediatePem + rootPem)).toBe(3072)
      expect(getRootKeySize(rootPem, 'invalid certificate')).toBeNull()
    })

    it('preserves cipher lists when disabled and retains a TLS 1.3 minimum', async () => {
      Environment.Config.mps_tls_config.legacy_compatible_ciphers = false
      Environment.Config.mps_tls_config.minVersion = 'TLSv1.3'
      const result = await indexFile.loadCertificates(secretManager)
      expect(result.mps_tls_config.minVersion).toBe('TLSv1.3')
      expect(result.mps_tls_config.ciphers).toBe(stored.mps_tls_config.ciphers)
    })

    it('applies the policy to freshly generated certificates without storing runtime changes', async () => {
      const generateSpy = vi.spyOn(Certificates.prototype, 'generateCertificates').mockReturnValue(stored)
      const writeSpy = vi.fn().mockResolvedValue(true)
      secretManager.getMPSCerts = vi.fn().mockResolvedValue(null)
      secretManager.writeSecretWithObject = writeSpy
      try {
        const result = await indexFile.loadCertificates(secretManager)
        expect(result.mps_tls_config.ciphers).toMatch(/:AES128-GCM-SHA256$/)
        expect(writeSpy).toHaveBeenCalledWith('MPSCerts', { data: stored })
        expect(stored.mps_tls_config.ciphers).toBe('ECDHE-RSA-AES256-GCM-SHA384')
      } finally {
        generateSpy.mockRestore()
      }
    })

    it('applies the same policy to raw certificates', async () => {
      Environment.Config.generate_certificates = false
      Environment.Config.cert_format = 'raw'
      Environment.Config.tls_cert = stored.mps_tls_config.cert
      Environment.Config.tls_cert_key = stored.mps_tls_config.key
      Environment.Config.web_tls_cert = stored.web_tls_config.cert
      Environment.Config.web_tls_cert_key = stored.web_tls_config.key
      Environment.Config.web_tls_cert_ca = stored.web_tls_config.ca
      Environment.Config.web_tls_config = {}
      Environment.Config.mps_tls_config.ciphers = 'ECDHE-RSA-AES256-GCM-SHA384'
      const result = await indexFile.loadCertificates(secretManager)
      expect(result.mps_tls_config.ciphers).toMatch(/:AES128-GCM-SHA256$/)
      expect(result.mps_tls_config.cert).toBe(stored.mps_tls_config.cert)
      expect(secretManager.getMPSCerts).not.toHaveBeenCalled()
    })

    it('negotiates the legacy TLS 1.2 cipher only when added to a list that excludes it', async () => {
      async function negotiate(enabled: boolean): Promise<string> {
        Environment.Config.mps_tls_config.legacy_compatible_ciphers = enabled
        const certs = await indexFile.loadCertificates(secretManager)
        const server = createServer(certs.mps_tls_config, (socket) => socket.end())
        server.on('tlsClientError', () => {})
        server.listen(0, '127.0.0.1')
        await once(server, 'listening')
        const address = server.address()
        if (typeof address === 'string' || address == null) throw new Error('Missing TLS server address')
        try {
          return await new Promise<string>((resolve, reject) => {
            const client = connect({
              host: '127.0.0.1',
              port: address.port,
              servername: 'localhost',
              minVersion: 'TLSv1.2',
              maxVersion: 'TLSv1.2',
              ciphers: 'AES128-GCM-SHA256',
              rejectUnauthorized: true,
              ca: certs.web_tls_config.ca
            })
            client.once('secureConnect', () => {
              const cipher = client.getCipher().name
              client.end()
              resolve(cipher)
            })
            client.once('error', reject)
          })
        } finally {
          await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
        }
      }

      expect(await negotiate(true)).toBe('AES128-GCM-SHA256')
      await expect(negotiate(false)).rejects.toThrow()
    })
  })

  it('should wait for db', async () => {
    let shouldBeOk = false
    const dbMock: IDB = {
      query: vi.fn(() => {
        if (shouldBeOk) return null
        shouldBeOk = true
        throw new Error('error')
      })
    } as any
    await indexFile.waitForDB(dbMock)
    expect(backOffSpy).toHaveBeenCalled()
  })

  it('should wait for secret provider', async () => {
    let shouldBeOk = false
    const secretMock: ISecretManagerService = {
      health: vi.fn(() => {
        if (shouldBeOk) return null
        shouldBeOk = true
        throw new Error('error')
      })
    } as any
    await indexFile.waitForSecretProvider(secretMock)
    expect(backOffSpy).toHaveBeenCalled()
  })
})
