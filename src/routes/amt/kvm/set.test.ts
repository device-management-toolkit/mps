/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/
import { setKVMRedirectionSettingData } from './set.js'
import { jest } from '@jest/globals'

let req
let res
let statusSpy
let jsonSpy
let endSpy

beforeEach(() => {
  req = {
    params: { guid: 'test-guid' },
    body: { displayIndex: 1 },
    deviceAction: {
      getKVMRedirectionSettingData: jest.fn(),
      putKVMRedirectionSettingData: jest.fn()
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

describe('setKVMRedirectionSettingData', () => {
  it('should set KVM Redirection Setting Data and return 200 on success', async () => {
    const kvmData = { ElementName: 'KVM', InstanceID: 'KVM1' }
    req.deviceAction.getKVMRedirectionSettingData.mockResolvedValue({ IPS_KVMRedirectionSettingData: kvmData })
    req.deviceAction.putKVMRedirectionSettingData.mockResolvedValue('success')
    await setKVMRedirectionSettingData(req, res)
    expect(req.deviceAction.getKVMRedirectionSettingData).toHaveBeenCalled()
    expect(req.deviceAction.putKVMRedirectionSettingData).toHaveBeenCalledWith(
      expect.objectContaining({ ElementName: 'KVM', InstanceID: 'KVM1', DefaultScreen: 1 })
    )
    expect(statusSpy).toHaveBeenCalledWith(200)
    expect(jsonSpy).toHaveBeenCalledWith('success')
  })

  it('should return 500 if putKVMRedirectionSettingData fails', async () => {
    const kvmData = { ElementName: 'KVM', InstanceID: 'KVM1' }
    req.deviceAction.getKVMRedirectionSettingData.mockResolvedValue({ IPS_KVMRedirectionSettingData: kvmData })
    req.deviceAction.putKVMRedirectionSettingData.mockResolvedValue(undefined)
    await setKVMRedirectionSettingData(req, res)
    expect(statusSpy).toHaveBeenCalledWith(500)
    expect(jsonSpy).toHaveBeenCalledWith({
      error: 'Internal Server Error',
      errorDescription: 'Failed to set KVM Redirection Setting Data'
    })
  })

  it('should handle errors and return 500', async () => {
    req.deviceAction.getKVMRedirectionSettingData.mockRejectedValue(new Error('fail'))
    await setKVMRedirectionSettingData(req, res)
    expect(statusSpy).toHaveBeenCalledWith(500)
    expect(jsonSpy).toHaveBeenCalledWith({
      error: 'Internal Server Error',
      errorDescription: expect.stringContaining('Exception during set KVM display setting data')
    })
  })
})
