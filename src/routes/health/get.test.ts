/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { getHealthCheck, getDBHealth, getSecretStoreHealth } from './get.js'
import { Environment } from '../../utils/Environment.js'
import { createSpyObj } from '../../test/helper/jest.js'
import { MqttProvider } from '../../utils/MqttProvider.js'
import { ErrorResponse } from '../../utils/amtHelper.js'
import { messages } from '../../logging/index.js'
import { spyOn } from 'jest-mock'

describe('Checks health of dependent services', () => {
  describe('getHealthCheck tests', () => {
    let resSpy
    let req
    let mqttSpy: jest.Spied<any>
    beforeEach(() => {
      resSpy = createSpyObj('Response', [
        'status',
        'json',
        'end',
        'send'
      ])
      req = {
        mpsService: {
          secrets: createSpyObj('SecretProvider', ['health'])
        },
        db: createSpyObj('DB', ['query'])
      }
      resSpy.status.mockReturnThis()
      resSpy.json.mockReturnThis()
      resSpy.send.mockReturnThis()
      mqttSpy = spyOn(MqttProvider, 'publishEvent')
    })
    it('should handle health check failed', async () => {
      await getHealthCheck(null, resSpy)
      expect(resSpy.status).toHaveBeenCalledWith(500)
      expect(resSpy.json).toHaveBeenCalledWith(ErrorResponse(500, messages.HEALTH_CHECK_FAILED))
      expect(mqttSpy).toHaveBeenCalled()
    })
    it('should be healthy when database is ready and vault is unsealed', async () => {
      Environment.Config = { db_provider: 'POSTGRES' } as any

      req.mpsService.secrets.health.mockReturnValue({ initialized: true, sealed: false })
      await getHealthCheck(req, resSpy)
      expect(resSpy.status).toHaveBeenCalledWith(200)
    })
    it('should not be healthy when db error', async () => {
      req.mpsService.secrets.health.mockReturnValue({ initialized: true, sealed: false })
      req.db.query.mockRejectedValue({ code: '28P01' })
      await getHealthCheck(req, resSpy)
      expect(resSpy.status).toHaveBeenCalledWith(503)
    })
    it('should not be healthy when vault sealed', async () => {
      req.mpsService.secrets.health.mockReturnValue({ initialized: true, sealed: true })
      await getHealthCheck(req, resSpy)
      expect(resSpy.status).toHaveBeenCalledWith(503)
    })
    it('should not be healthy when vault is not ready', async () => {
      req.mpsService.secrets.health.mockRejectedValue({ error: { code: 'ECONNREFUSED' } })
      await getHealthCheck(req, resSpy)
      expect(resSpy.status).toHaveBeenCalledWith(503)
    })
  })
  describe('getDBHealth tests', () => {
    let dbSpy
    beforeEach(() => {
      dbSpy = createSpyObj('DB', ['query'])
      dbSpy.query.mockReturnThis()
    })
    it('should return OK on DB successful response', async () => {
      const response = await getDBHealth(dbSpy)
      expect(response).toBe('OK')
    })
    it('should return DB error invalid_password', async () => {
      dbSpy.query.mockRejectedValue({ code: '28P01' })
      const response = await getDBHealth(dbSpy)
      expect(response).toBe('invalid_password')
    })
    it('should return DB error unknown error', async () => {
      dbSpy.query.mockRejectedValue({ code: '1' })
      const response = await getDBHealth(dbSpy)
      expect(response).toBe('unknown error')
    })
    it('should return DB error unknown error', async () => {
      dbSpy.query.mockRejectedValue({ code: null })
      const response = await getDBHealth(dbSpy)
      expect(response).toBe('statusCode null')
    })
  })
  describe('getSecretStoreHealth tests', () => {
    let secretProviderSpy
    let secretProviderValidResponse
    beforeEach(() => {
      secretProviderSpy = createSpyObj('SecretProvider', ['health'])
      secretProviderValidResponse = {
        initialized: true,
        sealed: false
      }
      secretProviderSpy.health.mockReturnThis()
    })
    it('should return Vault initialized and sealed values on successful response', async () => {
      secretProviderSpy.health.mockReturnValue(secretProviderValidResponse)
      const response = await getSecretStoreHealth(secretProviderSpy)
      expect(response.initialized).toBe(true)
      expect(response.sealed).toBe(false)
    })
    it('should return Secret Store error code 429', async () => {
      secretProviderSpy.health.mockRejectedValue({ error: { code: 429 } })
      const response = await getSecretStoreHealth(secretProviderSpy)
      expect(response).toBe('unsealed and standby')
    })
    it('should return Secret Store error code 472', async () => {
      secretProviderSpy.health.mockRejectedValue({ error: { code: 472 } })
      const response = await getSecretStoreHealth(secretProviderSpy)
      expect(response).toBe('disaster recovery mode replication secondary and active')
    })
    it('should return Secret Store error code 473', async () => {
      secretProviderSpy.health.mockRejectedValue({ error: { code: 473 } })
      const response = await getSecretStoreHealth(secretProviderSpy)
      expect(response).toBe('performance standby')
    })
    it('should return Secret Store error code 501', async () => {
      secretProviderSpy.health.mockRejectedValue({ error: { code: 501 } })
      const response = await getSecretStoreHealth(secretProviderSpy)
      expect(response).toBe('not initialized')
    })
    it('should return Secret Store error code 503', async () => {
      secretProviderSpy.health.mockRejectedValue({ error: { code: 503 } })
      const response = await getSecretStoreHealth(secretProviderSpy)
      expect(response).toBe('sealed')
    })
    it('should return Secret Store error code unknown', async () => {
      secretProviderSpy.health.mockRejectedValue({ error: { code: 505 } })
      const response = await getSecretStoreHealth(secretProviderSpy)
      expect(response).toBe('unknown error')
    })
    it('should return Secret Store error statusCode null', async () => {
      secretProviderSpy.health.mockRejectedValue({ error: { code: null } })
      const response = await getSecretStoreHealth(secretProviderSpy)
      expect(response).toBe('statusCode null')
    })
  })
})
