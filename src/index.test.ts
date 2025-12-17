/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { logger } from './logging/logger.js'
import VaultSecretManagerService from './secrets/vault/index.js'
import { Environment } from './utils/Environment.js'
import { type IDB } from './interfaces/IDb.js'
import { type ISecretManagerService } from './interfaces/ISecretManagerService.js'
import { spyOn } from 'jest-mock'
import { jest } from '@jest/globals'

const backOffSpy = jest.fn()
const processServiceConfigsSpy = jest.fn().mockReturnValue(Promise.resolve())
const waitForServiceManagerSpy = jest.fn().mockReturnValue(Promise.resolve(true))
jest.unstable_mockModule('exponential-backoff', () => ({
  backOff: backOffSpy
}))
jest.unstable_mockModule('./consul/serviceManager.js', () => ({
  processServiceConfigs: processServiceConfigsSpy,
  waitForServiceManager: waitForServiceManagerSpy
}))
const indexFile = await import('./index.js')

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
        },
        consul_enabled: true,
        consul_host: 'localhost',
        consul_port: '8500',
        consul_key_prefix: 'MPS'
      }
      Environment.Config = config
    })
    it('Should exit setupServiceManager', async () => {
      // const waitSpy = spyOn(svcMngr, 'waitForServiceManager')
      waitForServiceManagerSpy.mockImplementation(() => {
        throw new Error('Test error')
      })
      const mockExit = spyOn(process, 'exit').mockImplementation((code) => code as never)
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
      const mockExit = spyOn(process, 'exit').mockImplementation((number) => {
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
      const mockExit = spyOn(process, 'exit').mockImplementation((number) => {
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
  })

  describe('setupSignalHandling', () => {
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
      spyOn(secretManagerService.gotClient, 'get').mockImplementation(
        () =>
          ({
            json: jest.fn(() => null)
          }) as any
      )
    })
    it('should pass with config', async () => {
      const result = await indexFile.loadCertificates(secretManagerService)
      expect(result.mps_tls_config.requestCert).toEqual(true)
    })
  })

  it('should wait for db', async () => {
    let shouldBeOk = false
    const dbMock: IDB = {
      query: jest.fn(() => {
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
      health: jest.fn(() => {
        if (shouldBeOk) return null
        shouldBeOk = true
        throw new Error('error')
      })
    } as any
    await indexFile.waitForSecretProvider(secretMock)
    expect(backOffSpy).toHaveBeenCalled()
  })
})
