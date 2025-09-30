/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/
import { getScreenSettingData } from './get.js'
import { mapScreenSettingDataToKVMScreenSettings } from './kvmScreenSettingsMapper.js'
import { jest } from '@jest/globals'

let req
let res
let statusSpy
let jsonSpy
let endSpy

beforeEach(() => {
  req = {
    params: { guid: 'test-guid' },
    deviceAction: {
      getScreenSettingData: jest.fn(),
      getKVMRedirectionSettingData: jest.fn()
    }
  }
  res = {
    status: function () {
      return this
    },
    json: function () {
      return this
    },
    end: function () {
      return this
    }
  }
  statusSpy = jest.spyOn(res, 'status')
  jsonSpy = jest.spyOn(res, 'json')
  endSpy = jest.spyOn(res, 'end')
})

describe('getScreenSettingData', () => {
  it('should return 404 and error response if no KVM data', async () => {
    req.deviceAction.getScreenSettingData.mockResolvedValue(null)
    req.deviceAction.getKVMRedirectionSettingData.mockResolvedValue({})
    await getScreenSettingData(req, res)
    expect(statusSpy).toHaveBeenCalledWith(404)
    expect(jsonSpy).toHaveBeenCalledWith({
      error: expect.objectContaining({
        alarm: expect.any(String),
        device: expect.any(String),
        method: expect.any(String),
        noMethod: expect.any(String),
        payload: expect.any(String),
        guid: expect.any(String),
        action: expect.any(String),
        invalidGuid: expect.any(String)
      }),
      errorDescription: 'KVM Screen Setting Data not found'
    })
  })

  it('should return mapped settings if KVM data exists', async () => {
    const screenData = {
      IPS_ScreenSettingDataItems: [
        { IsActive: [true], UpperLeftX: [1], UpperLeftY: [2], ResolutionX: [3], ResolutionY: [4] }]
    }
    const kvmData = { IPS_KVMRedirectionSettingData: { DefaultScreen: 0 } }
    req.deviceAction.getScreenSettingData.mockResolvedValue(screenData)
    req.deviceAction.getKVMRedirectionSettingData.mockResolvedValue(kvmData)
    await getScreenSettingData(req, res)
    expect(statusSpy).toHaveBeenCalledWith(200)
    expect(jsonSpy).toHaveBeenCalledWith({
      displays: [
        {
          displayIndex: 0,
          isActive: true,
          upperLeftX: 1,
          upperLeftY: 2,
          resolutionX: 3,
          resolutionY: 4,
          isDefault: true
        }
      ]
    })
  })

  it('should handle errors and return 500 with error response', async () => {
    req.deviceAction.getScreenSettingData.mockRejectedValue(new Error('fail'))
    req.deviceAction.getKVMRedirectionSettingData.mockResolvedValue({})
    await getScreenSettingData(req, res)
    expect(statusSpy).toHaveBeenCalledWith(500)
    expect(jsonSpy).toHaveBeenCalledWith({
      error: 'Internal Server Error',
      errorDescription: expect.stringContaining('Exception during get KVM display setting data')
    })
  })
})
