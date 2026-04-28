/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { vi } from 'vitest'
import { deleteAlarmOccurrence } from './deleteAlarmOccurrence.js'
import { createSpyObj } from '../../test/helper/vitest.js'
import { deleteAlarmClockOccurrence, deleteAlarmClockOccurrenceNotFound } from '../../test/helper/wsmanResponses.js'
import { DeviceAction } from '../../amt/DeviceAction.js'
import { CIRAHandler } from '../../amt/CIRAHandler.js'
import { HttpHandler } from '../../amt/HttpHandler.js'
import { messages } from '../../logging/index.js'
describe('Delete Alarm Clock Occurrence', () => {
  let resSpy
  let req
  let badReq
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
      body: { Name: 'Alarm Instance Name' },
      deviceAction: device
    }
    badReq = { params: { guid: '4c4c4544-004b-4210-8033-b6c04f504633' }, deviceAction: device }
    resSpy.status.mockReturnThis()
    resSpy.json.mockReturnThis()
    resSpy.send.mockReturnThis()
    AlarmClockOccurrenceSpy = vi.spyOn(device, 'deleteAlarmClockOccurrence')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should delete an alarm clock occurrence', async () => {
    const expectedResult = {
      status: 'SUCCESS'
    }
    AlarmClockOccurrenceSpy.mockResolvedValueOnce(deleteAlarmClockOccurrence.Envelope)
    await deleteAlarmOccurrence(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith(expectedResult)
  })
  it('should handle error 400', async () => {
    AlarmClockOccurrenceSpy.mockResolvedValueOnce(null)
    await deleteAlarmOccurrence(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(400)
    expect(resSpy.json).toHaveBeenCalledWith({
      error: 'Incorrect URI or Bad Request',
      errorDescription: `${messages.ALARM_OCCURRENCES_DELETE_REQUEST_FAILED} for guid : 4c4c4544-004b-4210-8033-b6c04f504633.`
    })
  })
  it('should require Name in the request', async () => {
    await deleteAlarmOccurrence(badReq, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(400)
    expect(resSpy.json).toHaveBeenCalledWith({
      error: 'Incorrect URI or Bad Request',
      errorDescription: `${messages.ALARM_OCCURRENCES_INVALID_REQUEST} for guid : 4c4c4544-004b-4210-8033-b6c04f504633.`
    })
  })
  it('should handle error 404', async () => {
    AlarmClockOccurrenceSpy.mockResolvedValueOnce(deleteAlarmClockOccurrenceNotFound.Envelope)

    await deleteAlarmOccurrence(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(404)
    expect(resSpy.json).toHaveBeenCalledWith({
      error: 'Alarm instance not found',
      errorDescription: `${messages.ALARM_OCCURRENCES_DELETE_REQUEST_FAILED} for guid : 4c4c4544-004b-4210-8033-b6c04f504633.`
    })
  })
  it('should handle error 500', async () => {
    // deleteSpy.mockImplementation(() => {
    //   throw new Error()
    // })
    await deleteAlarmOccurrence(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(500)
    expect(resSpy.json).toHaveBeenCalledWith({
      error: 'Internal Server Error',
      errorDescription: messages.ALARM_OCCURRENCES_EXCEPTION
    })
  })
})
