/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { vi } from 'vitest'
import { getAlarmOccurrences, parseInterval } from './getAlarmOccurrences.js'
import { createSpyObj } from '../../test/helper/vitest.js'
import {
  alarmClockOccurrences,
  alarmClockNoOccurrences,
  alarmClockManyOccurrences
} from '../../test/helper/wsmanResponses.js'
import { DeviceAction } from '../../amt/DeviceAction.js'
import { CIRAHandler } from '../../amt/CIRAHandler.js'
import { HttpHandler } from '../../amt/HttpHandler.js'
import { messages } from '../../logging/index.js'
describe('Alarm Clock Occurrences', () => {
  let resSpy
  let req
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
    req = { params: { guid: '4c4c4544-004b-4210-8033-b6c04f504633' }, deviceAction: device }
    resSpy.status.mockReturnThis()
    resSpy.json.mockReturnThis()
    resSpy.send.mockReturnThis()
    AlarmClockOccurrenceSpy = vi.spyOn(device, 'getAlarmClockOccurrences')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should get a single alarm clock occurrence', async () => {
    const expectedResult = [alarmClockOccurrences.Envelope.Body.PullResponse.Items.IPS_AlarmClockOccurrence]
    AlarmClockOccurrenceSpy.mockResolvedValueOnce(alarmClockOccurrences.Envelope)
    await getAlarmOccurrences(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith(expectedResult)
  })

  it('should get many alarm clock occurrences', async () => {
    const expectedResult = alarmClockManyOccurrences.Envelope.Body.PullResponse.Items.IPS_AlarmClockOccurrence
    AlarmClockOccurrenceSpy.mockResolvedValueOnce(alarmClockManyOccurrences.Envelope)
    await getAlarmOccurrences(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith(expectedResult)
  })

  it('should get empty array if no alarm clock occurrences', async () => {
    const expectedResult = []
    AlarmClockOccurrenceSpy.mockResolvedValueOnce(alarmClockNoOccurrences.Envelope)
    await getAlarmOccurrences(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith(expectedResult)
  })

  it('should handle error 400', async () => {
    AlarmClockOccurrenceSpy.mockResolvedValueOnce(null)
    await getAlarmOccurrences(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(400)
    expect(resSpy.json).toHaveBeenCalledWith({
      error: 'Incorrect URI or Bad Request',
      errorDescription: `${messages.ALARM_OCCURRENCES_GET_REQUEST_FAILED} for guid : 4c4c4544-004b-4210-8033-b6c04f504633.`
    })
  })
  it('should handle error 500', async () => {
    await getAlarmOccurrences(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(500)
    expect(resSpy.json).toHaveBeenCalledWith({
      error: 'Internal Server Error',
      errorDescription: messages.ALARM_OCCURRENCES_EXCEPTION
    })
  })
})

describe('parseInterval function', () => {
  it('should return 0 for empty string', () => {
    expect(parseInterval('')).toBe(0)
  })

  it('should parse days correctly', () => {
    expect(parseInterval('P2D')).toBe(2880)
  })

  it('should parse hours correctly', () => {
    expect(parseInterval('PT3H')).toBe(180)
  })

  it('should parse minutes correctly', () => {
    expect(parseInterval('PT30M')).toBe(30)
  })

  it('should parse complex duration correctly', () => {
    expect(parseInterval('P1DT2H30M45S')).toBe(1590)
  })

  it('should handle fractional seconds', () => {
    expect(parseInterval('PT1M30.5S')).toBe(1)
  })
})
