/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { vi } from 'vitest'
import { getOpaqueManagementDataOwner } from './getOpaqueManagementDataOwner.js'
import { createSpyObj } from '../../test/helper/vitest.js'
import { DeviceAction } from '../../amt/DeviceAction.js'
import { CIRAHandler } from '../../amt/CIRAHandler.js'
import { HttpHandler } from '../../amt/HttpHandler.js'
import { messages } from '../../logging/index.js'

const singleItem = {
  Body: {
    PullResponse: {
      Items: {
        CIM_OpaqueManagementDataOwner: {
          PrivilegeGranted: 'true',
          Activities: '5'
        }
      }
    }
  }
}

const manyItems = {
  Body: {
    PullResponse: {
      Items: {
        CIM_OpaqueManagementDataOwner: [{ PrivilegeGranted: 'true' }, { PrivilegeGranted: 'false' }]
      }
    }
  }
}

const noItems = {
  Body: {
    PullResponse: {
      Items: {}
    }
  }
}

describe('Opaque Management Data Owner', () => {
  let resSpy
  let req
  let opaqueManagementDataOwnerSpy

  beforeEach(() => {
    const handler = new CIRAHandler(new HttpHandler(), 'admin', 'P@ssw0rd')
    const device = new DeviceAction(handler, null)
    resSpy = createSpyObj('Response', [
      'status',
      'json',
      'end',
      'send'
    ])
    req = { params: { guid: '4c4c4544-004b-4210-8033-b6c04f504633' }, deviceAction: device }
    resSpy.status.mockReturnThis()
    resSpy.json.mockReturnThis()
    resSpy.send.mockReturnThis()
    opaqueManagementDataOwnerSpy = vi.spyOn(device, 'getOpaqueManagementDataOwner')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should get a single opaque management data owner item', async () => {
    const expectedResult = [singleItem.Body.PullResponse.Items.CIM_OpaqueManagementDataOwner]
    opaqueManagementDataOwnerSpy.mockResolvedValueOnce(singleItem as any)
    await getOpaqueManagementDataOwner(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith(expectedResult)
  })

  it('should get many opaque management data owner items', async () => {
    const expectedResult = manyItems.Body.PullResponse.Items.CIM_OpaqueManagementDataOwner
    opaqueManagementDataOwnerSpy.mockResolvedValueOnce(manyItems as any)
    await getOpaqueManagementDataOwner(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith(expectedResult)
  })

  it('should get empty array if no opaque management data owner items', async () => {
    const expectedResult = []
    opaqueManagementDataOwnerSpy.mockResolvedValueOnce(noItems as any)
    await getOpaqueManagementDataOwner(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith(expectedResult)
  })

  it('should handle error 400', async () => {
    opaqueManagementDataOwnerSpy.mockResolvedValueOnce(null)
    await getOpaqueManagementDataOwner(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(400)
    expect(resSpy.json).toHaveBeenCalledWith({
      error: 'Incorrect URI or Bad Request',
      errorDescription: `${messages.OPAQUE_MANAGEMENT_DATA_OWNER_GET_REQUEST_FAILED} for guid : 4c4c4544-004b-4210-8033-b6c04f504633.`
    })
  })

  it('should handle error 500', async () => {
    await getOpaqueManagementDataOwner(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(500)
    expect(resSpy.json).toHaveBeenCalledWith({
      error: 'Internal Server Error',
      errorDescription: messages.OPAQUE_MANAGEMENT_DATA_OWNER_EXCEPTION
    })
  })
})
