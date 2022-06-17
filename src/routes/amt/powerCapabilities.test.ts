/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { ErrorResponse } from '../../utils/amtHelper'
import { MqttProvider } from '../../utils/MqttProvider'
import { powerCapabilities } from './powerCapabilities'
import { setupAndConfigurationServiceResponse, softwareIdentityResponse, versionResponse } from '../../test/helper/wsmanResponses'
import { createSpyObj } from '../../test/helper/jest'
import { DeviceAction } from '../../amt/DeviceAction'
import { CIRAHandler } from '../../amt/CIRAHandler'
import { HttpHandler } from '../../amt/HttpHandler'
import { messages } from '../../logging'

describe('Power Capabilities', () => {
  let req: Express.Request
  let resSpy
  let mqttSpy: jest.SpyInstance
  let powerCaps
  let swIdentitySpy: jest.SpyInstance
  let setupAndConfigSpy: jest.SpyInstance
  let device: DeviceAction
  beforeEach(() => {
    const handler = new CIRAHandler(new HttpHandler(), 'admin', 'P@ssw0rd')
    device = new DeviceAction(handler, null)
    req = {
      params: {
        guid: '123456'
      },
      deviceAction: device
    }
    resSpy = createSpyObj('Response', ['status', 'json', 'end', 'send'])
    resSpy.status.mockReturnThis()
    resSpy.json.mockReturnThis()
    resSpy.send.mockReturnThis()

    mqttSpy = jest.spyOn(MqttProvider, 'publishEvent')

    powerCaps = { Body: { AMT_BootCapabilities: {} } }
    swIdentitySpy = jest.spyOn(device, 'getSoftwareIdentity')
    setupAndConfigSpy = jest.spyOn(device, 'getSetupAndConfigurationService')
  })
  it('Should get power capabilities', async () => {
    const expectedResponse = {
      'Power up': 2,
      'Power cycle': 5,
      'Power down': 8,
      Reset: 10,
      'Soft-off': 12,
      'Soft-reset': 14,
      Sleep: 4,
      Hibernate: 7,
      'Reset to IDE-R Floppy': 200,
      'Power on to IDE-R Floppy': 201,
      'Reset to IDE-R CDROM': 202,
      'Power on to IDE-R CDROM': 203,
      'Reset to PXE': 400,
      'Power on to PXE': 401
    }
    jest.spyOn(device, 'getPowerCapabilities').mockResolvedValue(powerCaps)
    swIdentitySpy.mockResolvedValue(softwareIdentityResponse.Envelope.Body)
    setupAndConfigSpy.mockResolvedValue(setupAndConfigurationServiceResponse.Envelope)
    await powerCapabilities(req as any, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith(expectedResponse)
    expect(resSpy.end).toHaveBeenCalled()
    expect(mqttSpy).toHaveBeenCalled()
  })
  it('Should get power capabilities when amt <= 9', async () => {
    const expectedResponse = {
      'Power up': 2,
      'Power cycle': 5,
      'Power down': 8,
      Reset: 10,
      'Soft-off': 12,
      'Soft-reset': 14,
      Sleep: 4,
      Hibernate: 7,
      'Reset to IDE-R Floppy': 200,
      'Power on to IDE-R Floppy': 201,
      'Reset to IDE-R CDROM': 202,
      'Power on to IDE-R CDROM': 203,
      'Reset to PXE': 400,
      'Power on to PXE': 401
    }
    versionResponse.CIM_SoftwareIdentity.responses = [
      { InstanceID: 'AMT', IsEntity: 'true', VersionString: '9.0.0' }
    ]
    jest.spyOn(device, 'getPowerCapabilities').mockResolvedValue(powerCaps)
    swIdentitySpy.mockResolvedValue(softwareIdentityResponse.Envelope.Body)
    setupAndConfigSpy.mockResolvedValue(setupAndConfigurationServiceResponse.Envelope)
    await powerCapabilities(req as any, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith(expectedResponse)
    expect(resSpy.end).toHaveBeenCalled()
    expect(mqttSpy).toHaveBeenCalled()
  })
  it('Should get power capabilities when all enabled', async () => {
    const expectedResponse = {
      'Power up': 2,
      'Power cycle': 5,
      'Power down': 8,
      Reset: 10,
      'Soft-off': 12,
      'Soft-reset': 14,
      Sleep: 4,
      Hibernate: 7,
      'Power up to BIOS': 100,
      'Reset to BIOS': 101,
      'Reset to Secure Erase': 104,
      'Reset to IDE-R Floppy': 200,
      'Power on to IDE-R Floppy': 201,
      'Reset to IDE-R CDROM': 202,
      'Power on to IDE-R CDROM': 203,
      'Power on to diagnostic': 300,
      'Reset to diagnostic': 301,
      'Reset to PXE': 400,
      'Power on to PXE': 401
    }
    powerCaps.Body.AMT_BootCapabilities.BIOSSetup = true
    powerCaps.Body.AMT_BootCapabilities.SecureErase = true
    powerCaps.Body.AMT_BootCapabilities.ForceDiagnosticBoot = true
    jest.spyOn(device, 'getPowerCapabilities').mockResolvedValue(powerCaps)
    swIdentitySpy.mockResolvedValue(softwareIdentityResponse.Envelope.Body)
    setupAndConfigSpy.mockResolvedValue(setupAndConfigurationServiceResponse.Envelope)
    await powerCapabilities(req as any, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith(expectedResponse)
    expect(resSpy.end).toHaveBeenCalled()
    expect(mqttSpy).toHaveBeenCalled()
  })
  it('Should handle error', async () => {
    jest.spyOn(device, 'getPowerCapabilities').mockResolvedValue(null)
    swIdentitySpy.mockResolvedValue(softwareIdentityResponse.Envelope.Body)
    setupAndConfigSpy.mockResolvedValue(setupAndConfigurationServiceResponse.Envelope)
    await powerCapabilities(req as any, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(500)
    expect(resSpy.json).toHaveBeenCalledWith(ErrorResponse(500, messages.POWER_CAPABILITIES_EXCEPTION))
    expect(resSpy.end).toHaveBeenCalled()
    expect(mqttSpy).toHaveBeenCalled()
  })
})
