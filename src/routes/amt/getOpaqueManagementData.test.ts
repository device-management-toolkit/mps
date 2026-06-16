/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { vi } from 'vitest'
import { getOpaqueManagementData } from './getOpaqueManagementData.js'
import { createSpyObj } from '../../test/helper/vitest.js'
import { DeviceAction } from '../../amt/DeviceAction.js'
import { CIRAHandler } from '../../amt/CIRAHandler.js'
import { HttpHandler } from '../../amt/HttpHandler.js'
import { messages } from '../../logging/index.js'

const singleItem = {
  Body: {
    PullResponse: {
      Items: {
        CIM_OpaqueManagementData: {
          InstanceID: 'Intel(r) AMT:OPAQUE_MANAGEMENT_DATA 0',
          DataFormat: '0',
          DataSize: '16',
          MaxSize: '4096'
        }
      }
    }
  }
}

const manyItems = {
  Body: {
    PullResponse: {
      Items: {
        CIM_OpaqueManagementData: [
          { InstanceID: 'Intel(r) AMT:OPAQUE_MANAGEMENT_DATA 0', DataSize: '16' },
          { InstanceID: 'Intel(r) AMT:OPAQUE_MANAGEMENT_DATA 1', DataSize: '32' }
        ]
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

describe('Opaque Management Data', () => {
  let resSpy
  let req
  let opaqueManagementDataSpy

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
    opaqueManagementDataSpy = vi.spyOn(device, 'getOpaqueManagementData')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should get a single opaque management data item', async () => {
    const expectedResult = [singleItem.Body.PullResponse.Items.CIM_OpaqueManagementData]
    opaqueManagementDataSpy.mockResolvedValueOnce(singleItem as any)
    await getOpaqueManagementData(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith(expectedResult)
  })

  it('should get many opaque management data items', async () => {
    const expectedResult = manyItems.Body.PullResponse.Items.CIM_OpaqueManagementData
    opaqueManagementDataSpy.mockResolvedValueOnce(manyItems as any)
    await getOpaqueManagementData(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith(expectedResult)
  })

  it('should get empty array if no opaque management data items', async () => {
    const expectedResult = []
    opaqueManagementDataSpy.mockResolvedValueOnce(noItems as any)
    await getOpaqueManagementData(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith(expectedResult)
  })

  it('should handle error 400', async () => {
    opaqueManagementDataSpy.mockResolvedValueOnce(null)
    await getOpaqueManagementData(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(400)
    expect(resSpy.json).toHaveBeenCalledWith({
      error: 'Incorrect URI or Bad Request',
      errorDescription: `${messages.OPAQUE_MANAGEMENT_DATA_GET_REQUEST_FAILED} for guid : 4c4c4544-004b-4210-8033-b6c04f504633.`
    })
  })

  it('should handle error 500', async () => {
    await getOpaqueManagementData(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(500)
    expect(resSpy.json).toHaveBeenCalledWith({
      error: 'Internal Server Error',
      errorDescription: messages.OPAQUE_MANAGEMENT_DATA_EXCEPTION
    })
  })
})
