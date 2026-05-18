/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { vi } from 'vitest'
import { eventLog, GetEventDetailStr } from './eventLog.js'
import { createSpyObj } from '../../test/helper/vitest.js'
import { amtMessageLog } from '../../test/helper/wsmanResponses.js'
import { CIRAHandler } from '../../amt/CIRAHandler.js'
import { HttpHandler } from '../../amt/HttpHandler.js'
import { DeviceAction } from '../../amt/DeviceAction.js'
import { messages } from '../../logging/index.js'
describe('event log', () => {
  let resSpy
  let req
  let eventLogSpy
  beforeEach(() => {
    const handler = new CIRAHandler(new HttpHandler(), 'admin', 'P@ssw0rd')
    const device = new DeviceAction(handler, null)
    resSpy = createSpyObj('Response', [
      'status',
      'json',
      'end',
      'send'
    ])
    req = {
      params: { guid: '4c4c4544-004b-4210-8033-b6c04f504633' },
      deviceAction: device
    }
    resSpy.status.mockReturnThis()
    resSpy.json.mockReturnThis()
    resSpy.send.mockReturnThis()

    eventLogSpy = vi.spyOn(device, 'getEventLog')
  })

  it('should get event logs', async () => {
    eventLogSpy.mockResolvedValueOnce(amtMessageLog.Envelope)
    await eventLog(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
  })
  it('should handle error 400', async () => {
    eventLogSpy.mockResolvedValueOnce(null)
    await eventLog(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(400)
    expect(resSpy.json).toHaveBeenCalledWith({
      error: 'Incorrect URI or Bad Request',
      errorDescription: `${messages.EVENT_LOG_REQUEST_FAILED} for guid : 4c4c4544-004b-4210-8033-b6c04f504633.`
    })
  })
  it('should get an error with status code 500 for an unexpected exception', async () => {
    eventLogSpy.mockImplementation(() => {
      throw new Error()
    })
    await eventLog(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(500)
    expect(resSpy.json).toHaveBeenCalledWith({
      error: 'Internal Server Error',
      errorDescription: messages.EVENT_LOG_EXCEPTION
    })
  })
})

describe('event details', () => {
  it('should return authentication failed', () => {
    const result = GetEventDetailStr(
      6,
      2,
      [
        64,
        3,
        0,
        0,
        0,
        0,
        0,
        0
      ]
    )
    expect(result).toEqual('Authentication failed 3 times. The system may be under attack.')
  })
  it('should return system firmware error', () => {
    const result = GetEventDetailStr(
      15,
      0,
      [
        64,
        10,
        0,
        0,
        0,
        0,
        0,
        0
      ]
    )
    expect(result).toEqual('No video device detected.')
  })
  it('should get system watch dog event', () => {
    const result = GetEventDetailStr(
      18,
      0,
      [
        170,
        10,
        0,
        0,
        0,
        0,
        0,
        1
      ]
    )
    expect(result).toEqual('Agent watchdog 0000000A-0000-... changed to Not Started')
  })
  it('should get null', () => {
    const result = GetEventDetailStr(
      18,
      0,
      [
        64,
        10,
        0,
        0,
        0,
        0,
        0,
        1
      ]
    )
    expect(result).toEqual(null)
  })
  it('should get no bootable media', () => {
    const result = GetEventDetailStr(
      30,
      0,
      [
        170,
        10,
        0,
        0,
        0,
        0,
        0,
        0
      ]
    )
    expect(result).toEqual('No bootable media')
  })
  it('should get system OS lockup or power interrupt', () => {
    const result = GetEventDetailStr(
      32,
      0,
      [
        170,
        10,
        0,
        0,
        0,
        0,
        0,
        0
      ]
    )
    expect(result).toEqual('Operating system lockup or power interrupt')
  })
  it('shout get system boot failure', () => {
    const result = GetEventDetailStr(
      35,
      0,
      [
        64,
        10,
        0,
        0,
        0,
        0,
        0,
        0
      ]
    )
    expect(result).toEqual('System boot failure')
  })
  it('should get system firmware started', () => {
    const result = GetEventDetailStr(
      37,
      0,
      [
        64,
        10,
        0,
        0,
        0,
        0,
        0,
        0
      ]
    )
    expect(result).toEqual('System firmware started (at least one CPU is properly executing).')
  })
  it('should get Unknown Sensor Type', () => {
    const result = GetEventDetailStr(
      100,
      0,
      [
        64,
        10,
        0,
        0,
        0,
        0,
        0,
        0
      ]
    )
    expect(result).toEqual('Unknown Sensor Type #100')
  })
})
