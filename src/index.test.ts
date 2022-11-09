/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import * as indexFile from './index'
import { logger } from './logging'
import VaultSecretManagerService from './secrets/vault'
import { Environment } from './utils/Environment'
import { SecretManagerCreatorFactory } from './factories/SecretManagerCreatorFactory'
import { DbCreatorFactory } from './factories/DbCreatorFactory'

describe('Index', () => {
  describe('loadConfig', () => {
    afterEach(() => {
      jest.clearAllMocks()
      jest.restoreAllMocks()
      jest.resetAllMocks()
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
        }
      }
    })
    it('should pass with config', () => {
      jest.spyOn(indexFile, 'main').mockResolvedValue(null)
      const result = indexFile.loadConfig(config)
      expect(result.web_tls_config).toEqual(config.web_tls_config)
    })
    it('Should fail with no jwt secret', () => {
      config.jwt_secret = ''
      const mockExit = jest.spyOn(process, 'exit')
        .mockImplementation((number) => { throw new Error('process.exit: ' + number) })
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
      const mockExit = jest.spyOn(process, 'exit')
        .mockImplementation((number) => { throw new Error('process.exit: ' + number) })
      expect(() => {
        indexFile.loadConfig(config)
      }).toThrow()
      expect(mockExit).toHaveBeenCalledWith(1)
    })
  })

  describe('loadCertificates', () => {
    let secretManagerService: VaultSecretManagerService = null
    let config

    beforeEach(() => {
      jest.clearAllMocks()
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
      jest.spyOn(secretManagerService.gotClient, 'get').mockImplementation(() => {
        return {
          json: jest.fn(() => {
            return null
          })
        } as any
      })
    })
    it('should pass with mps_tls_config.requestCert', async () => {
      const result = await indexFile.loadCertificates(secretManagerService)
      expect(result.mps_tls_config.requestCert).toEqual(true)
    })
  })

  describe('initialize database', () => {
    let config
    let mockExit
    let db

    beforeEach(async () => {
      jest.clearAllMocks()
      config = {
        secrets_provider: 'vault',
        vault_address: 'http://bad.test.url:8200',
        vault_token: 'myroot',
        secrets_path: 'secret/data/',
        db_provider: 'postgres',
        connection_string: 'postgresql://<USERNAME>:<PASSWORD>@localhost:5432/mpsdb?sslmode=no-verify',
        startup_retry_limit: 5,
        startup_backoff_limit: 100
      }
      Environment.Config = config
      db = await new DbCreatorFactory().getDb()
      mockExit = jest.spyOn(process, 'exit').mockImplementation((number) => { throw new Error('process.exit: ' + number) })
    })
    it('should succeed', async () => {
      // for testing, just returning without any errors is all
      const dbQuery = jest.spyOn(db, 'query')
      dbQuery.mockResolvedValueOnce({ rows: [0], command: 'SELECT', fields: null, rowCount: 0, oid: 0 })
      const returned = await indexFile.initializeDB()
      expect(returned).not.toBeNull()
    })
    // it('should exit secret manager service error', async () => {
    //   jest.spyOn(vault.gotClient, 'get').mockImplementation(() => {
    //     throw new Error('failed connecting')
    //   })
    //   await expect(indexFile.initializeSecrets())
    //     .rejects
    //     .toThrow(/process.exit/)
    //   expect(mockExit).toHaveBeenCalledWith(1)
    // })
  })

  describe('initialize secrets', () => {
    let config
    let mockExit
    let vault

    beforeEach(async () => {
      jest.clearAllMocks()
      config = {
        secrets_provider: 'vault',
        vault_address: 'http://bad.test.url:8200',
        vault_token: 'myroot',
        secrets_path: 'secret/data/',
        startup_retry_limit: 5,
        startup_backoff_limit: 100
      }
      Environment.Config = config
      vault = await new SecretManagerCreatorFactory().getSecretManager(logger) as VaultSecretManagerService
      mockExit = jest.spyOn(process, 'exit').mockImplementation((number) => { throw new Error('process.exit: ' + number) })
    })
    it('should succeed', async () => {
      // for testing, just returning without any errors is all
      jest.spyOn(vault.gotClient, 'get').mockImplementation(() => {
        return {
          json: jest.fn(() => {
            return {}
          })
        } as any
      })
      const returned = await indexFile.initializeSecrets()
      expect(returned).not.toBeNull()
    })
    it('should exit on secret manager service error', async () => {
      jest.spyOn(vault.gotClient, 'get').mockImplementation(() => {
        throw new Error('failed connecting')
      })
      await expect(indexFile.initializeSecrets())
        .rejects
        .toThrow(/process.exit/)
      expect(mockExit).toHaveBeenCalledWith(1)
    })
  })
})
