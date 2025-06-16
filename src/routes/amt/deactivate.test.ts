/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { deactivate } from './deactivate.js'
import { messages } from '../../logging/index.js'
import { createSpyObj } from '../../test/helper/jest.js'
import { spyOn } from 'jest-mock'

describe('deactivate', () => {
  let resSpy: any
  let req: any
  let deleteSpy: jest.Spied<any>
  let deleteSecretAtPathSpy: jest.Spied<any>
  let deprovisionDeviceSpy: jest.Spied<any>

  beforeEach(() => {
    resSpy = createSpyObj('Response', ['status', 'json'])
    req = {
      params: {
        guid: '4c4c4544-004b-4210-8033-b6c04f504633'
      },
      db: {
        devices: {
          delete: () => {}
        }
      },
      secrets: {
        deleteSecretAtPath: () => {}
      },
      deviceAction: {
        unprovisionDevice: () => {}
      }
    }
    resSpy.status.mockReturnThis()
    resSpy.json.mockReturnThis()

    deleteSpy = spyOn(req.db.devices, 'delete').mockResolvedValue({})
    deleteSecretAtPathSpy = spyOn(req.secrets, 'deleteSecretAtPath').mockResolvedValue({})
    deprovisionDeviceSpy = spyOn(req.deviceAction, 'unprovisionDevice').mockResolvedValue({
      Body: { Unprovision_OUTPUT: { ReturnValue: 0 } }
    })
  })

  it('should successfully deactivate a device', async () => {
    await deactivate(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith({ status: 'SUCCESS' })
    expect(deleteSpy).toHaveBeenCalled()
    expect(deleteSecretAtPathSpy).toHaveBeenCalled()
    expect(deprovisionDeviceSpy).toHaveBeenCalled()
  })
  it('should return 200, even if return value is not zero', async () => {
    deprovisionDeviceSpy = spyOn(req.deviceAction, 'unprovisionDevice').mockResolvedValue({
      Body: { Unprovision_OUTPUT: { ReturnValue: 1 } }
    })
    await deactivate(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith({ ReturnValue: 1 })
    expect(deprovisionDeviceSpy).toHaveBeenCalled()
  })
  it('should return 500, even if return value is not zero', async () => {
    deprovisionDeviceSpy = spyOn(req.deviceAction, 'unprovisionDevice').mockImplementation(() => {
      throw new Error()
    })
    await deactivate(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(500)
    expect(resSpy.json).toHaveBeenCalledWith({
      error: 'Internal Server Error',
      errorDescription: messages.UNPROVISION_EXCEPTION
    })
  })
})
