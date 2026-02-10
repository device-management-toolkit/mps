/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type AMT } from '@device-management-toolkit/wsman-messages'
import { CIRAHandler } from '../../amt/CIRAHandler.js'
import { DeviceAction } from '../../amt/DeviceAction.js'
import { HttpHandler } from '../../amt/HttpHandler.js'
import { createSpyObj } from '../../test/helper/jest.js'
import {
  bootOptions,
  determinePowerAction,
  setBootData,
  getBootSource,
  determineBootDevice,
  validateHTTPBootParams
} from './bootOptions.js'
import { type SpyInstance, spyOn } from 'jest-mock'
import { messages } from '../../logging/index.js'

describe('Boot Options', () => {
  let resSpy: any
  let req: any
  let getBootOptionsSpy: SpyInstance<any>
  let setBootConfigurationSpy: SpyInstance<any>
  let forceBootModeSpy: SpyInstance<any>
  let changeBootOrderSpy: SpyInstance<any>
  let sendPowerActionSpy: SpyInstance<any>
  let getSetupAndConfigurationServiceSpy: SpyInstance<any>
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

    getSetupAndConfigurationServiceSpy = spyOn(device, 'getSetupAndConfigurationService')
    getSetupAndConfigurationServiceSpy.mockResolvedValue({
      Body: { AMT_SetupAndConfigurationService: { ProvisioningMode: 1 } } // Default to ACM mode
    })
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
    expect(forceBootModeSpy).toHaveBeenCalledWith(1)
    expect(changeBootOrderSpy).toHaveBeenCalledWith('')
    expect(sendPowerActionSpy).toHaveBeenCalledWith(2)
  })

  // Tests for setBootData function
  it('Should set boot data when Power up to BIOS (action 100)', () => {
    const bootSettingsToSend = setBootData(100, false, bootSettingData)
    expect(bootSettingsToSend.BIOSPause).toBe(false)
    expect(bootSettingsToSend.BIOSSetup).toBe(true) // action < 104
    expect(bootSettingsToSend.BootMediaIndex).toBe(0)
    expect(bootSettingsToSend.ConfigurationDataReset).toBe(false)
    expect(bootSettingsToSend.FirmwareVerbosity).toBe(0)
    expect(bootSettingsToSend.ForcedProgressEvents).toBe(false)
    expect(bootSettingsToSend.IDERBootDevice).toBe(0) // not 202 or 203
    expect(bootSettingsToSend.LockKeyboard).toBe(false)
    expect(bootSettingsToSend.LockPowerButton).toBe(false)
    expect(bootSettingsToSend.LockResetButton).toBe(false)
    expect(bootSettingsToSend.LockSleepButton).toBe(false)
    expect(bootSettingsToSend.ReflashBIOS).toBe(false)
    expect(bootSettingsToSend.UseIDER).toBe(false) // not in range 200-299
    expect(bootSettingsToSend.UseSOL).toBe(false)
    expect(bootSettingsToSend.UseSafeMode).toBe(false)
    expect(bootSettingsToSend.UserPasswordBypass).toBe(false)
    expect(bootSettingsToSend.SecureErase).toBe(false)
  })
  it('Should set boot data when reset to BIOS (action 101)', () => {
    const bootSettingsToSend = setBootData(101, false, bootSettingData)
    expect(bootSettingsToSend.BIOSSetup).toBe(true) // action < 104
    expect(bootSettingsToSend.UseIDER).toBe(false) // not in range 200-299
  })
  it('Should set boot data when reset up to BIOS using SOL (action 101)', () => {
    const bootSettingsToSend = setBootData(101, true, bootSettingData)
    expect(bootSettingsToSend.BIOSSetup).toBe(true) // action < 104
    expect(bootSettingsToSend.UseSOL).toBe(true)
  })
  it('Should set boot data IDERBootDevice when reset to IDER-CD-ROM (action 202)', () => {
    const bootSettingsToSend = setBootData(202, false, bootSettingData)
    expect(bootSettingsToSend.UseIDER).toBe(true) // action > 199 && action < 300
    expect(bootSettingsToSend.IDERBootDevice).toBe(1) // action === 202
    expect(bootSettingsToSend.BIOSSetup).toBe(false) // action >= 104
  })
  it('Should set boot data IDERBootDevice when power up to IDER-CD-ROM (action 203)', () => {
    const bootSettingsToSend = setBootData(203, false, bootSettingData)
    expect(bootSettingsToSend.UseIDER).toBe(true) // action > 199 && action < 300
    expect(bootSettingsToSend.IDERBootDevice).toBe(1) // action === 203
    expect(bootSettingsToSend.BIOSSetup).toBe(false) // action >= 104
  })
  it('Should set boot data IDERBootDevice when reset to IDER-Floppy (action 200)', () => {
    const bootSettingsToSend = setBootData(200, false, bootSettingData)
    expect(bootSettingsToSend.UseIDER).toBe(true) // action > 199 && action < 300
    expect(bootSettingsToSend.IDERBootDevice).toBe(0) // not 202 or 203
    expect(bootSettingsToSend.BIOSSetup).toBe(false) // action >= 104
  })
  it('Should set boot data IDERBootDevice when power up to IDER-Floppy (action 201)', () => {
    const bootSettingsToSend = setBootData(201, false, bootSettingData)
    expect(bootSettingsToSend.UseIDER).toBe(true) // action > 199 && action < 300
    expect(bootSettingsToSend.IDERBootDevice).toBe(0) // not 202 or 203
    expect(bootSettingsToSend.BIOSSetup).toBe(false) // action >= 104
  })

  // Tests for getBootSource function (corrected function name)
  it('Should NOT set bootSource when 299', async () => {
    const result = await getBootSource('test-guid', { action: 299 }, req.deviceAction)
    expect(result).toBe('')
  })
  it('Should NOT set bootSource when 402', async () => {
    const result = await getBootSource('test-guid', { action: 402 }, req.deviceAction)
    expect(result).toBe('')
  })
  it('Should set bootSource when 400 (ResetToPXE)', async () => {
    const result = await getBootSource('test-guid', { action: 400 }, req.deviceAction)
    expect(result).toBe('Intel(r) AMT: Force PXE Boot')
  })
  it('Should set bootSource when 401 (PowerOnToPXE)', async () => {
    const result = await getBootSource('test-guid', { action: 401 }, req.deviceAction)
    expect(result).toBe('Intel(r) AMT: Force PXE Boot')
  })
  it('Should set bootSource when 202 (ResetToIDERCDROM)', async () => {
    const result = await getBootSource('test-guid', { action: 202 }, req.deviceAction)
    expect(result).toBe('Intel(r) AMT: Force CD/DVD Boot')
  })
  it('Should set bootSource when 203 (PowerOnIDERCDROM)', async () => {
    const result = await getBootSource('test-guid', { action: 203 }, req.deviceAction)
    expect(result).toBe('Intel(r) AMT: Force CD/DVD Boot')
  })
  it('Should set bootSource when 105 (HTTPSBoot)', async () => {
    const result = await getBootSource('test-guid', { action: 105 }, req.deviceAction)
    expect(result).toBe('Intel(r) AMT: Force OCR UEFI HTTPS Boot')
  })
  it('Should set bootSource when 106 (PowerOnHTTPSBoot)', async () => {
    const result = await getBootSource('test-guid', { action: 106 }, req.deviceAction)
    expect(result).toBe('Intel(r) AMT: Force OCR UEFI HTTPS Boot')
  })

  // Tests for determinePowerAction function
  it('Should determine power action when 100 (power on)', () => {
    const result = determinePowerAction(100)
    expect(result).toBe(2) // Power on
  })
  it('Should determine power action when 201 (power on)', () => {
    const result = determinePowerAction(201)
    expect(result).toBe(2) // Power on
  })
  it('Should determine power action when 203 (power on)', () => {
    const result = determinePowerAction(203)
    expect(result).toBe(2) // Power on
  })
  it('Should determine power action when 401 (power on)', () => {
    const result = determinePowerAction(401)
    expect(result).toBe(2) // Power on
  })
  it('Should determine power action when 101 (reset)', () => {
    const result = determinePowerAction(101)
    expect(result).toBe(10) // Reset
  })
  it('Should determine power action when 200 (reset)', () => {
    const result = determinePowerAction(200)
    expect(result).toBe(10) // Reset
  })
  it('Should determine power action when 202 (reset)', () => {
    const result = determinePowerAction(202)
    expect(result).toBe(10) // Reset
  })
  it('Should determine power action when 400 (reset)', () => {
    const result = determinePowerAction(400)
    expect(result).toBe(10) // Reset
  })
  it('Should determine power action when 105 (reset for HTTPS boot)', () => {
    const result = determinePowerAction(105)
    expect(result).toBe(10) // Reset
  })
  it('Should determine power action when 301 (reset)', () => {
    const result = determinePowerAction(301)
    expect(result).toBe(10) // Reset
  })

  it('Should set HTTPS boot parameters for action 105', () => {
    const bootSetting = {
      action: 105,
      bootDetails: {
        url: 'https://192.168.1.100:8080/boot.iso', // Valid HTTPS URL
        username: '', // Simple username
        password: '', // Simple password
        enforceSecureBoot: true
      }
    }
    const newData: any = { IDERBootDevice: 0 }

    determineBootDevice(bootSetting, newData)

    expect(newData.UseIDER).toBe(false)
    expect(newData.BIOSSetup).toBe(false)
    expect(newData.UseSOL).toBe(false)
    expect(newData.BootMediaIndex).toBe(0)
    expect(newData.EnforceSecureBoot).toBe(true)
    expect(newData.UserPasswordBypass).toBe(false)
    expect(newData.ForcedProgressEvents).toBe(true)
    expect(newData.UefiBootNumberOfParams).toBe(2)
    expect(newData.UefiBootParametersArray).toBeDefined()
  })

  it('Should set IDERBootDevice to 0 for default case', () => {
    const bootSetting = { action: 999 }
    const newData: any = { IDERBootDevice: 5 }

    determineBootDevice(bootSetting, newData)

    expect(newData.IDERBootDevice).toBe(0)
  })

  it('Should validate HTTPS boot parameters with only URL', () => {
    const result = validateHTTPBootParams('https://example.com/boot.img', '', '')

    expect(result.buffer).toBeInstanceOf(Uint8Array)
    expect(result.paramCount).toBe(2) // URL, SyncRootCA only
    expect(result.buffer.length).toBeGreaterThan(0)
  })

  // Tests for CCM mode EnforceSecureBoot validation
  it('should return 400 error when EnforceSecureBoot is false in CCM mode', async () => {
    getSetupAndConfigurationServiceSpy.mockResolvedValue({
      Body: { AMT_SetupAndConfigurationService: { ProvisioningMode: 4 } } // CCM mode
    })
    req.body = {
      action: 105,
      useSOL: false,
      bootDetails: {
        url: 'https://example.com/boot.img',
        enforceSecureBoot: false
      }
    }

    await bootOptions(req, resSpy)

    expect(getSetupAndConfigurationServiceSpy).toHaveBeenCalled()
    expect(resSpy.status).toHaveBeenCalledWith(400)
    expect(resSpy.json).toHaveBeenCalledWith({
      error: 'Incorrect URI or Bad Request',
      errorDescription: messages.BOOT_SETTING_ENFORCE_SECURE_BOOT_CCM
    })
  })

  it('should return 400 error when EnforceSecureBoot is false in CCM mode (string ProvisioningMode)', async () => {
    getSetupAndConfigurationServiceSpy.mockResolvedValue({
      Body: { AMT_SetupAndConfigurationService: { ProvisioningMode: '4' } } // CCM mode as string
    })
    req.body = {
      action: 105,
      useSOL: false,
      bootDetails: {
        url: 'https://example.com/boot.img',
        enforceSecureBoot: false
      }
    }

    await bootOptions(req, resSpy)

    expect(getSetupAndConfigurationServiceSpy).toHaveBeenCalled()
    expect(resSpy.status).toHaveBeenCalledWith(400)
    expect(resSpy.json).toHaveBeenCalledWith({
      error: 'Incorrect URI or Bad Request',
      errorDescription: messages.BOOT_SETTING_ENFORCE_SECURE_BOOT_CCM
    })
  })

  it('should succeed when EnforceSecureBoot is true in CCM mode', async () => {
    getSetupAndConfigurationServiceSpy.mockResolvedValue({
      Body: { AMT_SetupAndConfigurationService: { ProvisioningMode: 4 } } // CCM mode
    })
    req.body = {
      action: 105,
      useSOL: false,
      bootDetails: {
        url: 'https://example.com/boot.img',
        enforceSecureBoot: true
      }
    }

    await bootOptions(req, resSpy)

    expect(getSetupAndConfigurationServiceSpy).not.toHaveBeenCalled()
    expect(resSpy.status).toHaveBeenCalledWith(200)
  })

  it('should succeed when EnforceSecureBoot is false in ACM mode', async () => {
    getSetupAndConfigurationServiceSpy.mockResolvedValue({
      Body: { AMT_SetupAndConfigurationService: { ProvisioningMode: 1 } } // ACM mode
    })
    req.body = {
      action: 105,
      useSOL: false,
      bootDetails: {
        url: 'https://example.com/boot.img',
        enforceSecureBoot: false
      }
    }

    await bootOptions(req, resSpy)

    expect(getSetupAndConfigurationServiceSpy).toHaveBeenCalled()
    expect(resSpy.status).toHaveBeenCalledWith(200)
  })

  it('should return 400 error when enforceSecureBoot is explicitly false in CCM mode', async () => {
    getSetupAndConfigurationServiceSpy.mockResolvedValue({
      Body: { AMT_SetupAndConfigurationService: { ProvisioningMode: 4 } } // CCM mode
    })
    req.body = {
      action: 400,
      useSOL: false,
      bootDetails: { enforceSecureBoot: false }
    }

    await bootOptions(req, resSpy)

    expect(getSetupAndConfigurationServiceSpy).toHaveBeenCalled()
    expect(resSpy.status).toHaveBeenCalledWith(400)
    expect(resSpy.json).toHaveBeenCalledWith({
      error: 'Incorrect URI or Bad Request',
      errorDescription: messages.BOOT_SETTING_ENFORCE_SECURE_BOOT_CCM
    })
  })
})
