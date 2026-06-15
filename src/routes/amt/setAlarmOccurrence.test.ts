/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { vi } from 'vitest'
import { setAlarmOccurrence } from './setAlarmOccurrence.js'
import { createSpyObj } from '../../test/helper/vitest.js'
import {
  addAlarmClockOccurrenceResponse,
  addAlarmClockOccurrenceQuotaLimitResponse,
  addAlarmClockOccurrenceDuplicateResponse
} from '../../test/helper/wsmanResponses.js'
import { DeviceAction } from '../../amt/DeviceAction.js'
import { CIRAHandler } from '../../amt/CIRAHandler.js'
import { HttpHandler } from '../../amt/HttpHandler.js'
import { messages } from '../../logging/index.js'
describe('ADD Alarm Clock Occurrence', () => {
  let resSpy
  let req
  let badReq
  // const setSpy = vi.spyOn(setAlarm, 'setAlarm')
  let AlarmClockOccurrenceSpy

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
      body: {
        ElementName: 'Alarm Instance Name',
        StartTime: '2022-12-31T23:59:00Z'
      },
      deviceAction: device
    }
    badReq = {
      params: { guid: '4c4c4544-004b-4210-8033-b6c04f504633' },
      deviceAction: device
    }
    resSpy.status.mockReturnThis()
    resSpy.json.mockReturnThis()
    resSpy.send.mockReturnThis()
    AlarmClockOccurrenceSpy = vi.spyOn(device, 'addAlarmClockOccurrence')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should handle error 400', async () => {
    AlarmClockOccurrenceSpy.mockResolvedValueOnce(null)

    await setAlarmOccurrence(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(400)
    expect(resSpy.json).toHaveBeenCalledWith({
      error: 'Incorrect URI or Bad Request',
      errorDescription: `${messages.ALARM_ADD_REQUEST_FAILED} for guid : 4c4c4544-004b-4210-8033-b6c04f504633.`
    })
  })
  it('should require a body in the request', async () => {
    AlarmClockOccurrenceSpy.mockResolvedValueOnce(null)

    await setAlarmOccurrence(badReq, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(400)
    expect(resSpy.json).toHaveBeenCalledWith({
      error: 'Incorrect URI or Bad Request',
      errorDescription: `${messages.ALARM_ADD_INVALID_PARAMETERS} for guid : 4c4c4544-004b-4210-8033-b6c04f504633.`
    })
  })
  it('should require ElementName in the request', async () => {
    AlarmClockOccurrenceSpy.mockResolvedValueOnce(null)

    badReq.body = { ElementName: 'Alarm Instance Name' }
    await setAlarmOccurrence(badReq, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(400)
    expect(resSpy.json).toHaveBeenCalledWith({
      error: 'Incorrect URI or Bad Request',
      errorDescription: `${messages.ALARM_ADD_INVALID_PARAMETERS} for guid : 4c4c4544-004b-4210-8033-b6c04f504633.`
    })
  })
  it('should require StartTime in the request', async () => {
    AlarmClockOccurrenceSpy.mockResolvedValueOnce(null)

    badReq.body = { StartTime: '2022-12-31T23:59:00Z' }
    await setAlarmOccurrence(badReq, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(400)
    expect(resSpy.json).toHaveBeenCalledWith({
      error: 'Incorrect URI or Bad Request',
      errorDescription: `${messages.ALARM_ADD_INVALID_PARAMETERS} for guid : 4c4c4544-004b-4210-8033-b6c04f504633.`
    })
  })
  it('should fail if the alarm is already present', async () => {
    AlarmClockOccurrenceSpy.mockResolvedValueOnce(addAlarmClockOccurrenceDuplicateResponse.Envelope)

    await setAlarmOccurrence(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(400)
    expect(resSpy.json).toHaveBeenCalledWith({
      error: 'Incorrect URI or Bad Request',
      errorDescription: `${messages.ALARM_ADD_INVALID_PARAMETERS} for guid : 4c4c4544-004b-4210-8033-b6c04f504633.`
    })
  })
  it('should fail if there are too many alarms', async () => {
    AlarmClockOccurrenceSpy.mockResolvedValueOnce(addAlarmClockOccurrenceQuotaLimitResponse.Envelope)

    await setAlarmOccurrence(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(400)
    expect(resSpy.json).toHaveBeenCalledWith({
      error: 'Incorrect URI or Bad Request',
      errorDescription: `${messages.ALARM_ADD_QUOTA_LIMIT} for guid : 4c4c4544-004b-4210-8033-b6c04f504633.`
    })
  })
  it('should handle error 500', async () => {
    // setSpy.mockImplementation(() => {
    //   throw new Error()
    // })
    await setAlarmOccurrence(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(500)
    expect(resSpy.json).toHaveBeenCalledWith({
      error: 'Internal Server Error',
      errorDescription: messages.ALARM_OCCURRENCES_EXCEPTION
    })
  })
  it('should add an alarm clock occurrence (using defaults)', async () => {
    AlarmClockOccurrenceSpy.mockResolvedValueOnce(addAlarmClockOccurrenceResponse.Envelope)

    await setAlarmOccurrence(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith({ status: 'SUCCESS', ReturnValue: '0' })
  })
  it('should add an alarm clock occurrence', async () => {
    AlarmClockOccurrenceSpy.mockResolvedValueOnce(addAlarmClockOccurrenceResponse.Envelope)

    req.body.InstanceID = 'Instance ID'
    req.body.Interval = 'P1DT23H59M'
    req.body.DeleteOnCompletion = true
    await setAlarmOccurrence(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith({ status: 'SUCCESS', ReturnValue: '0' })
  })
})
