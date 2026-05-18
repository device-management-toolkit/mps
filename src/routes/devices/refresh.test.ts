/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { vi, type MockInstance } from 'vitest'
import { logger, messages } from '../../logging/index.js'
import { devices } from '../../server/mpsserver.js'
import { refreshDevice } from './refresh.js'
describe('refresh tests', () => {
  let res: Express.Response
  let statusSpy: MockInstance
  let jsonSpy: MockInstance
  let getCredsSpy: MockInstance
  let req
  beforeEach(() => {
    res = {
      status: () => res,
      json: () => res,
      end: () => res
    }

    statusSpy = vi.spyOn(res as any, 'status')
    jsonSpy = vi.spyOn(res as any, 'json')

    req = {
      params: {
        guid: '00000000-0000-0000-0000-000000000000'
      },
      secrets: {
        getSecretFromKey: async (path: string, key: string) => 'P@ssw0rd',
        getSecretAtPath: async (path: string) => ({}) as any,
        getAMTCredentials: async (path: string) => ['admin', 'P@ssw0rd'],
        getMPSCerts: async () => ({}) as any,
        writeSecretWithObject: async (path: string, data: any) => false,
        health: async () => ({}),
        deleteSecretAtPath: async (path: string) => {}
      }
    } as any
    getCredsSpy = vi.spyOn(req.secrets, 'getAMTCredentials')
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('should refresh device if it is connected', async () => {
    const guid = req.params.guid
    devices[guid] = {
      ciraSocket: {
        destroy: vi.fn()
      },
      httpHandler: { digestChallenge: 'dumy' },
      tenantId: { tenantId: '' },
      kvmConnect: { kvmConnect: false },
      limiter: { limiter: 'dummy' }
    } as any
    await refreshDevice(req, res as any)
    expect(getCredsSpy).toHaveBeenCalledWith(guid)
    expect(jsonSpy).toHaveBeenCalledWith({ success: 200, description: `${messages.DEVICE_REFRESH_SUCCESS} : ${guid}` })
  })

  it('should set status to 404 if error occurs when device is not connected', async () => {
    const guid = req.params.guid
    devices[guid] = null

    await refreshDevice(req, res as any)
    expect(statusSpy).toHaveBeenCalledWith(404)
  })
  it('should set status to 500', async () => {
    req.secrets = {
      getAMTCredentials: async (path: string) => null
    }

    const guid = req.params.guid
    devices[guid] = {
      ciraSocket: {
        destroy: vi.fn()
      },
      httpHandler: { digestChallenge: 'dumy' },
      tenantId: { tenantId: '' },
      kvmConnect: { kvmConnect: false },
      limiter: { limiter: 'dummy' }
    } as any
    const loggerSpy = vi.spyOn(logger, 'error')
    await refreshDevice(req, res as any)
    expect(statusSpy).toHaveBeenCalledWith(500)
    expect(loggerSpy).toHaveBeenCalled()
  })
})
