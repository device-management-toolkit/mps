/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { version } from './getVersion.js'
import { createSpyObj } from '../../test/helper/jest.js'
import {
  setupAndConfigurationServiceResponse,
  softwareIdentityResponse,
  versionResponse
} from '../../test/helper/wsmanResponses.js'
import { CIRAHandler } from '../../amt/CIRAHandler.js'
import { DeviceAction } from '../../amt/DeviceAction.js'
import { HttpHandler } from '../../amt/HttpHandler.js'
import { messages } from '../../logging/index.js'
import { spyOn } from 'jest-mock'

describe('version', () => {
  let resSpy
  let req
  let setupAndConfigurationServiceSpy: jest.Spied<any>
  let softwareIdentitySpy: jest.Spied<any>
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

    softwareIdentitySpy = spyOn(device, 'getSoftwareIdentity')
    setupAndConfigurationServiceSpy = spyOn(device, 'getSetupAndConfigurationService')
  })

  it('should get version', async () => {
    softwareIdentitySpy.mockResolvedValueOnce(softwareIdentityResponse.Envelope.Body)
    setupAndConfigurationServiceSpy.mockResolvedValueOnce(setupAndConfigurationServiceResponse.Envelope)
    await version(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith(versionResponse)
  })
  it('should get an error with status code 400, when get version is null', async () => {
    softwareIdentitySpy.mockResolvedValueOnce(null)
    setupAndConfigurationServiceSpy.mockResolvedValueOnce(setupAndConfigurationServiceResponse.Envelope)
    await version(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(400)
    expect(resSpy.json).toHaveBeenCalledWith({
      error: 'Incorrect URI or Bad Request',
      errorDescription: `${messages.VERSION_REQUEST_FAILED} for guid : 4c4c4544-004b-4210-8033-b6c04f504633.`
    })
  })
  it('should get an error with status code 500 for an unexpected exception', async () => {
    softwareIdentitySpy.mockImplementation(() => {
      throw new Error()
    })
    await version(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(500)
    expect(resSpy.json).toHaveBeenCalledWith({
      error: 'Internal Server Error',
      errorDescription: messages.VERSION_EXCEPTION
    })
  })
})
