/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { bootSources } from './bootSources.js'
import { DeviceAction } from '../../amt/DeviceAction.js'
import { type SpyInstance, spyOn } from 'jest-mock'
import { createSpyObj } from '../../test/helper/jest.js'
import { CIRAHandler } from '../../amt/CIRAHandler.js'
import { HttpHandler } from '../../amt/HttpHandler.js'

describe('bootSources', () => {
  let req: any
  let resSpy: any
  let getBootSourceSettingSpy: SpyInstance<any>
  beforeEach(() => {
    const handler = new CIRAHandler(new HttpHandler(), 'admin', 'P@ssw0rd')
    const device = new DeviceAction(handler, null)
    resSpy = createSpyObj('Response', [
      'status',
      'json',
      'send'
    ])
    req = {
      params: { guid: '4c4c4544-004b-4210-8033-b6c04f504633' },
      body: { action: 400, useSOL: false },
      deviceAction: device
    }
    resSpy.status.mockReturnThis()
    resSpy.json.mockReturnThis()
    resSpy.send.mockReturnThis()
    getBootSourceSettingSpy = spyOn(device, 'getBootSourceSetting')
  })

  it('should return mapped boot sources array', async () => {
    getBootSourceSettingSpy.mockResolvedValue({
      Items: [
        {
          BIOSBootString: 'bios',
          BootString: 'boot',
          ElementName: 'Intel® AMT: Boot Source',
          FailThroughSupported: 2,
          InstanceID: 'Intel® AMT: Force Hard-drive Boot',
          StructuredBootString: 'CIM:Hard-Disk:1'
        }
      ]
    })
    await bootSources(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith([
      {
        biosBootString: 'bios',
        bootString: 'boot',
        elementName: 'Intel® AMT: Boot Source',
        failThroughSupported: 2,
        instanceID: 'Intel® AMT: Force Hard-drive Boot',
        structuredBiosBootString: 'CIM:Hard-Disk:1'
      }
    ])
  })

  it('should handle Items as a single object', async () => {
    getBootSourceSettingSpy.mockResolvedValue({
      Items: {
        BIOSBootString: 'bios',
        BootString: 'boot',
        ElementName: 'Intel® AMT: Boot Source',
        FailThroughSupported: 2,
        InstanceID: 'Intel® AMT: Force Hard-drive Boot',
        StructuredBootString: 'CIM:Hard-Disk:1'
      }
    })
    await bootSources(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith([
      {
        biosBootString: 'bios',
        bootString: 'boot',
        elementName: 'Intel® AMT: Boot Source',
        failThroughSupported: 2,
        instanceID: 'Intel® AMT: Force Hard-drive Boot',
        structuredBiosBootString: 'CIM:Hard-Disk:1'
      }
    ])
  })

  it('should return empty array if Items is missing', async () => {
    getBootSourceSettingSpy.mockResolvedValue({})
    await bootSources(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith([])
  })
})
