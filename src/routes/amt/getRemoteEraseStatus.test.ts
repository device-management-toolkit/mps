/*********************************************************************
 * Copyright (c) Intel Corporation 2026
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type Request } from 'express'
import { vi } from 'vitest'
import { DeviceAction } from '../../amt/DeviceAction.js'
import { CIRAHandler } from '../../amt/CIRAHandler.js'
import { HttpHandler } from '../../amt/HttpHandler.js'
import { messages } from '../../logging/index.js'
import { createSpyObj } from '../../test/helper/vitest.js'
import { ErrorResponse } from '../../utils/amtHelper.js'
import { MqttProvider } from '../../utils/MqttProvider.js'
import ciraMiddleware from '../../middleware/cira.js'
import router from './index.js'
import { getRemoteEraseStatus } from './getRemoteEraseStatus.js'

describe('Get last BIOS erase status', () => {
  const guid = '4c4c4544-004b-4210-8033-b6c04f504633'
  const handler = new CIRAHandler(new HttpHandler(), 'admin', 'P@ssw0rd')
  const device = new DeviceAction(handler, null)
  const req = { params: { guid }, deviceAction: device } as Request
  const res = createSpyObj('Response', [
    'status',
    'json',
    'end'
  ])

  beforeEach(() => {
    vi.spyOn(MqttProvider, 'publishEvent').mockImplementation(() => {})
    res.status.mockReturnThis()
    res.json.mockReturnThis()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it.each([
    { words: [0, 0], status: 'succeeded', message: 'BIOS reported that the erase completed successfully.' },
    { words: [1, 0], status: 'pending', message: 'Waiting for the BIOS erase result.' },
    { words: [2, 0], status: 'pending', message: 'Waiting for the BIOS erase result.' },
    { words: [0xffff, 0], status: 'failed', message: 'BIOS reported that the erase failed.' },
    { words: [0xffff, 1], status: 'failed', message: 'BIOS erase failed: general drive failure.' },
    { words: [0xffff, 2], status: 'failed', message: 'BIOS erase failed: drive password/authentication failure.' },
    { words: [0xffff, 3], status: 'failed', message: 'BIOS erase failed: feature is not supported.' },
    { words: [0xffff, 99], status: 'failed', message: 'BIOS reported that the erase failed.' }
  ])('maps BIOSLastStatus $words to $status', async ({ words, status, message }) => {
    vi.spyOn(device.ciraHandler, 'Get').mockResolvedValue({
      Envelope: { Body: { AMT_BootSettingData: { BIOSLastStatus: words } } }
    })

    await getRemoteEraseStatus(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ status, message })
    expect(MqttProvider.publishEvent).toHaveBeenCalledWith(
      'success',
      ['AMT_BootSettingData'],
      messages.REMOTE_ERASE_STATUS_SUCCESS,
      guid
    )
  })

  it.each([
    undefined,
    [],
    [0],
    [0, 2],
    [99, 0],
    0,
    '0,0',
    ['0', '0']
  ])('does not report success for missing or unrecognized status (%s)', async (words) => {
    vi.spyOn(device.ciraHandler, 'Get').mockResolvedValue({
      Envelope: { Body: { AMT_BootSettingData: { BIOSLastStatus: words } } }
    })

    await getRemoteEraseStatus(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ status: 'unknown', message: 'BIOS erase outcome is unconfirmed.' })
  })

  it.each([{}, { Fault: { Reason: 'AMT failure' } }])('returns 500 for an invalid WSMAN response', async (body) => {
    vi.spyOn(device.ciraHandler, 'Get').mockResolvedValue({ Envelope: { Body: body } })

    await getRemoteEraseStatus(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(ErrorResponse(500, messages.REMOTE_ERASE_STATUS_EXCEPTION))
  })

  it('returns 500 rather than an erase outcome when the device cannot be queried', async () => {
    vi.spyOn(device, 'getBootOptions').mockRejectedValue(new Error('Device unavailable'))

    await getRemoteEraseStatus(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(ErrorResponse(500, messages.REMOTE_ERASE_STATUS_EXCEPTION))
    expect(MqttProvider.publishEvent).toHaveBeenCalledWith(
      'fail',
      ['AMT_BootSettingData'],
      messages.INTERNAL_SERVICE_ERROR,
      guid
    )
  })

  it('registers the status endpoint behind CIRA middleware', () => {
    const route = router.stack.find((layer) => layer.route?.path === '/boot/remoteErase/:guid/status')?.route
    expect(route).toBeDefined()
    expect(route.stack.map((layer) => layer.method)).toEqual(['get', 'get'])
    expect(route.stack.map((layer) => layer.handle)).toEqual([ciraMiddleware, getRemoteEraseStatus])
  })
})
