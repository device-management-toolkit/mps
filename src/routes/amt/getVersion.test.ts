/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { version } from './getVersion'
import { createSpyObj } from '../../test/helper/jest'
import { setupAndConfigurationServiceResponse, softwareIdentityResponse, versionResponse } from '../../test/helper/wsmanResponses'
import { CIRAHandler } from '../../amt/CIRAHandler'
import { DeviceAction } from '../../amt/DeviceAction'
import { HttpHandler } from '../../amt/HttpHandler'
import { messages } from '../../logging'

describe('version', () => {
  let resSpy
  let req
  let setupAndConfigurationServiceSpy: jest.SpyInstance
  let softwareIdentitySpy: jest.SpyInstance
  beforeEach(() => {
    const handler = new CIRAHandler(new HttpHandler(), 'admin', 'P@ssw0rd')
    const device = new DeviceAction(handler, null)
    resSpy = createSpyObj('Response', ['status', 'json', 'end', 'send'])
    req = {
      params: { guid: '4c4c4544-004b-4210-8033-b6c04f504633' },
      deviceAction: device
    }
    resSpy.status.mockReturnThis()
    resSpy.json.mockReturnThis()
    resSpy.send.mockReturnThis()

    softwareIdentitySpy = jest.spyOn(device, 'getSoftwareIdentity')
    setupAndConfigurationServiceSpy = jest.spyOn(device, 'getSetupAndConfigurationService')
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
    expect(resSpy.json).toHaveBeenCalledWith({ error: 'Incorrect URI or Bad Request', errorDescription: `${messages.VERSION_REQUEST_FAILED} for guid : 4c4c4544-004b-4210-8033-b6c04f504633.` })
  })
  it('should get an error with status code 500 for an unexpected exception', async () => {
    softwareIdentitySpy.mockImplementation(() => {
      throw new Error()
    })
    await version(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(500)
    expect(resSpy.json).toHaveBeenCalledWith({ error: 'Internal Server Error', errorDescription: messages.VERSION_EXCEPTION })
  })
})
