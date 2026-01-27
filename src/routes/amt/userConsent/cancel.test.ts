/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { createSpyObj } from '../../../test/helper/jest.js'
import { cancel } from './cancel.js'
import { cancelOptInResponse } from '../../../test/helper/wsmanResponses.js'
import { DeviceAction } from '../../../amt/DeviceAction.js'
import { HttpHandler } from '../../../amt/HttpHandler.js'
import { CIRAHandler } from '../../../amt/CIRAHandler.js'
import { messages } from '../../../logging/index.js'
import { spyOn } from 'jest-mock'

describe('cancel user consent code', () => {
  let resSpy
  let req
  let cancelUserConsetCodeSpy
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

    cancelUserConsetCodeSpy = spyOn(device, 'cancelUserConsentCode')
  })

  it('should cancel user conset code', async () => {
    const result = {
      Header: cancelOptInResponse.Envelope.Header,
      Body: cancelOptInResponse.Envelope.Body.CancelOptIn_OUTPUT
    }
    cancelUserConsetCodeSpy.mockResolvedValueOnce(cancelOptInResponse.Envelope)
    await cancel(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith(result)
  })
  it('should return 409 when return value is NOT_READY', async () => {
    const result = {
      Header: {
        To: 'http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous',
        RelatesTo: '0',
        Action: 'http://intel.com/wbem/wscim/1/ips-schema/1/IPS_OptInService/CancelOptInResponse',
        MessageID: 'uuid:00000000-8086-8086-8086-000000000786',
        ResourceURI: 'http://intel.com/wbem/wscim/1/ips-schema/1/IPS_OptInService'
      },
      Body: {
        CancelOptIn_OUTPUT: {
          ReturnValue: '2',
          ReturnValueStr: 'NOT_READY'
        }
      }
    }
    cancelUserConsetCodeSpy.mockResolvedValueOnce(result)
    await cancel(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(409)
    expect(resSpy.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'Conflict',
      message: expect.any(String),
      details: expect.any(Object),
      amtResponse: expect.objectContaining({
        Header: result.Header,
        Body: expect.objectContaining({
          ReturnValue: '2',
          ReturnValueStr: 'NOT_READY'
        })
      })
    }))
  })
  
  it('should return 400 for other non-zero return values', async () => {
    const result = {
      Header: {
        To: 'http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous',
        RelatesTo: '0',
        Action: 'http://intel.com/wbem/wscim/1/ips-schema/1/IPS_OptInService/CancelOptInResponse',
        MessageID: 'uuid:00000000-8086-8086-8086-000000000786',
        ResourceURI: 'http://intel.com/wbem/wscim/1/ips-schema/1/IPS_OptInService'
      },
      Body: {
        CancelOptIn_OUTPUT: {
          ReturnValue: '1',
          ReturnValueStr: 'INTERNAL_ERROR'
        }
      }
    }
    cancelUserConsetCodeSpy.mockResolvedValueOnce(result)
    await cancel(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(400)
    expect(resSpy.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'Bad Request',
      message: expect.stringContaining('INTERNAL_ERROR'),
      details: expect.any(Object),
      amtResponse: expect.objectContaining({
        Header: result.Header,
        Body: expect.objectContaining({
          ReturnValue: '1',
          ReturnValueStr: 'INTERNAL_ERROR'
        })
      })
    }))
  })
  it('should get an error with status code 400, when failed to cancel user consent code', async () => {
    cancelUserConsetCodeSpy.mockResolvedValueOnce(null)
    await cancel(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(400)
    expect(resSpy.json).toHaveBeenCalledWith({
      error: 'Incorrect URI or Bad Request',
      errorDescription: `${messages.USER_CONSENT_CANCEL_FAILED} for guid : 4c4c4544-004b-4210-8033-b6c04f504633.`
    })
  })
  it('should get an error with status code 500 for an unexpected exception', async () => {
    cancelUserConsetCodeSpy.mockImplementation(() => {
      throw new Error()
    })
    await cancel(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(500)
    expect(resSpy.json).toHaveBeenCalledWith({
      error: 'Internal Server Error',
      errorDescription: messages.USER_CONSENT_CANCEL_EXCEPTION
    })
  })
})
