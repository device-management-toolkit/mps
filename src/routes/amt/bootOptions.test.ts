/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type AMT } from '@device-management-toolkit/wsman-messages'
import { CIRAHandler } from '../../amt/CIRAHandler.js'
import { DeviceAction } from '../../amt/DeviceAction.js'
import { HttpHandler } from '../../amt/HttpHandler.js'
import { createSpyObj } from '../../test/helper/jest.js'
import { bootOptions, determinePowerAction, setBootData, setBootSource } from './bootOptions.js'
import { type SpyInstance, spyOn } from 'jest-mock'

describe('Boot Options', () => {
  let resSpy: any
  let req: any
  let getBootOptionsSpy: SpyInstance<any>
  let setBootConfigurationSpy: SpyInstance<any>
  let forceBootModeSpy: SpyInstance<any>
  let changeBootOrderSpy: SpyInstance<any>
  let sendPowerActionSpy: SpyInstance<any>
  let bootSettingData: AMT.Models.BootSettingData | any
  beforeEach(() => {
    const handler = new CIRAHandler(new HttpHandler(), 'admin', 'P@ssw0rd')
    const device = new DeviceAction(handler, null)
    resSpy = createSpyObj('Response', [
      'status',
      'json',
      'send'
    ])
    req = {
      params: { guid: '4c4c4544-004b-4210-8033-b6c04f504633' },
      body: { action: 400, useSOL: false },
      deviceAction: device
    }
    resSpy.status.mockReturnThis()
    resSpy.json.mockReturnThis()
    resSpy.send.mockReturnThis()
    bootSettingData = {
      BIOSPause: 'false',
      BIOSSetup: 'false',
      BootMediaIndex: '0',
      ConfigurationDataReset: 'false',
      FirmwareVerbosity: '0',
      ForcedProgressEvents: 'false',
      IDERBootDevice: '0', // 0 : Boot on Floppy, 1 : Boot on IDER
      LockKeyboard: 'false',
      LockPowerButton: 'false',
      LockResetButton: 'false',
      LockSleepButton: 'false',
      ReflashBIOS: 'false',
      UseIDER: 'false',
      UseSOL: 'false',
      UseSafeMode: 'false',
      UserPasswordBypass: 'false',
      SecureErase: 'false'
    }

    getBootOptionsSpy = spyOn(device, 'getBootOptions')
    getBootOptionsSpy.mockResolvedValue({ AMT_BootSettingData: bootSettingData })
    setBootConfigurationSpy = spyOn(device, 'setBootConfiguration')
    setBootConfigurationSpy.mockResolvedValue({})
    forceBootModeSpy = spyOn(device, 'forceBootMode')
    forceBootModeSpy.mockResolvedValue({})
    changeBootOrderSpy = spyOn(device, 'changeBootOrder')
    changeBootOrderSpy.mockResolvedValue({})
    sendPowerActionSpy = spyOn(device, 'sendPowerAction')
    sendPowerActionSpy.mockResolvedValue({ Body: { RequestPowerStateChange_OUTPUT: { ReturnValue: 0 } } })
  })
  it('should handle error', async () => {
    setBootConfigurationSpy.mockRejectedValue({})

    await bootOptions(req, resSpy)

    expect(resSpy.status).toHaveBeenCalledWith(500)
    expect(resSpy.json).toHaveBeenCalled()
  })
  it('should do advanced power action when force PXE Boot w/ Reset', async () => {
    await bootOptions(req, resSpy)
    expect(getBootOptionsSpy).toHaveBeenCalled()
    expect(setBootConfigurationSpy).toHaveBeenCalled()
    expect(forceBootModeSpy).toHaveBeenCalled()
    expect(changeBootOrderSpy).toHaveBeenCalledWith('Intel(r) AMT: Force PXE Boot')
    expect(sendPowerActionSpy).toHaveBeenCalledWith(10)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith({ Body: { ReturnValue: 0, ReturnValueStr: 'SUCCESS' } })
  })
  it('should do advanced power action when NOT force PXE Boot', async () => {
    req.body.action = 201
    await bootOptions(req, resSpy)
    expect(getBootOptionsSpy).toHaveBeenCalled()
    expect(setBootConfigurationSpy).toHaveBeenCalled()
    expect(forceBootModeSpy).not.toHaveBeenCalledWith('')
    expect(changeBootOrderSpy).not.toHaveBeenCalledWith(null)
    expect(sendPowerActionSpy).toHaveBeenCalledWith(2)
  })
  it('Should set boot data when Power up to BIOS', () => {
    const bootSettingsToSend = setBootData(100, false, bootSettingData)
    expect(bootSettingsToSend.BIOSPause).toBe(false)
    expect(bootSettingsToSend.BIOSSetup).toBe(true)
    expect(bootSettingsToSend.BootMediaIndex).toBe(0)
    expect(bootSettingsToSend.ConfigurationDataReset).toBe(false)
    expect(bootSettingsToSend.FirmwareVerbosity).toBe(0)
    expect(bootSettingsToSend.ForcedProgressEvents).toBe(false)
    expect(bootSettingsToSend.IDERBootDevice).toBe(0)
    expect(bootSettingsToSend.LockKeyboard).toBe(false)
    expect(bootSettingsToSend.LockPowerButton).toBe(false)
    expect(bootSettingsToSend.LockResetButton).toBe(false)
    expect(bootSettingsToSend.LockSleepButton).toBe(false)
    expect(bootSettingsToSend.ReflashBIOS).toBe(false)
    expect(bootSettingsToSend.UseIDER).toBe(false)
    expect(bootSettingsToSend.UseSOL).toBe(false)
    expect(bootSettingsToSend.UseSafeMode).toBe(false)
    expect(bootSettingsToSend.UserPasswordBypass).toBe(false)
    expect(bootSettingsToSend.SecureErase).toBe(false)
  })
  it('Should set boot data when reset to BIOS', () => {
    const bootSettingsToSend = setBootData(101, false, bootSettingData)
    expect(bootSettingsToSend.BIOSSetup).toBe(true)
  })
  it('Should set boot data when reset up to BIOS using SOL', () => {
    const bootSettingsToSend = setBootData(101, true, bootSettingData)
    expect(bootSettingsToSend.BIOSSetup).toBe(true)
    expect(bootSettingsToSend.UseSOL).toBe(true)
  })
  it('Should set boot data IDERBootDevice when reset to IDER-CD-ROM', () => {
    const bootSettingsToSend = setBootData(202, false, bootSettingData)
    expect(bootSettingsToSend.UseIDER).toBe(true)
    expect(bootSettingsToSend.IDERBootDevice).toBe(1)
  })
  it('Should set boot data IDERBootDevice when power up to IDER-CD-ROM', () => {
    const bootSettingsToSend = setBootData(203, false, bootSettingData)
    expect(bootSettingsToSend.UseIDER).toBe(true)
    expect(bootSettingsToSend.IDERBootDevice).toBe(1)
  })
  it('Should set boot data IDERBootDevice when reset to IDER-Floppy', () => {
    const bootSettingsToSend = setBootData(200, false, bootSettingData)
    expect(bootSettingsToSend.UseIDER).toBe(true)
    expect(bootSettingsToSend.IDERBootDevice).toBe(0)
  })
  it('Should set boot data IDERBootDevice when power up to IDER-Floppy', () => {
    const bootSettingsToSend = setBootData(201, false, bootSettingData)
    expect(bootSettingsToSend.UseIDER).toBe(true)
    expect(bootSettingsToSend.IDERBootDevice).toBe(0)
  })
  it('Should NOT set bootSource when 299', () => {
    const result = setBootSource(299)
    expect(result).toBeUndefined()
  })
  it('Should NOT set bootSource when 402', () => {
    const result = setBootSource(402)
    expect(result).toBeUndefined()
  })
  it('Should set bootSource when 400', () => {
    const result = setBootSource(400)
    expect(result).toBe('Intel(r) AMT: Force PXE Boot')
  })
  it('Should set bootSource when 401', () => {
    const result = setBootSource(401)
    expect(result).toBe('Intel(r) AMT: Force PXE Boot')
  })
  it('Should determine power action when 100', () => {
    const result = determinePowerAction(100)
    expect(result).toBe(2)
  })
  it('Should determine power action when 201', () => {
    const result = determinePowerAction(201)
    expect(result).toBe(2)
  })
  it('Should determine power action when 203', () => {
    const result = determinePowerAction(203)
    expect(result).toBe(2)
  })
  it('Should determine power action when 401', () => {
    const result = determinePowerAction(401)
    expect(result).toBe(2)
  })
  it('Should determine power action when 101', () => {
    const result = determinePowerAction(101)
    expect(result).toBe(10)
  })
  //   it('Should determine power action when 104', () => {
  //     const result = determinePowerAction(104)
  //     expect(result).toBe(10)
  //   })
  it('Should determine power action when 200', () => {
    const result = determinePowerAction(200)
    expect(result).toBe(10)
  })
  it('Should determine power action when 202', () => {
    const result = determinePowerAction(202)
    expect(result).toBe(10)
  })
  it('Should determine power action when 400', () => {
    const result = determinePowerAction(400)
    expect(result).toBe(10)
  })
})
