/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type AMT, type CIM } from '@device-management-toolkit/wsman-messages'
import { type Selector } from '@device-management-toolkit/wsman-messages/WSMan.js'
import { type Models } from '@device-management-toolkit/wsman-messages/ips/models.js'
import { type SpyInstance, spyOn } from 'jest-mock'
import { type CIRASocket } from '../models/models.js'
import {
  addAlarmClockOccurrenceResponse,
  alarmClockOccurrences,
  amtMessageLog,
  auditLog,
  biosElement,
  bootCapabilities,
  cancelOptInResponse,
  card,
  chassis,
  chip,
  computerSystemPackage,
  deleteAlarmClockOccurrence,
  enumerateResponse,
  enumerateResponseIPSAlarmClockOccurrence,
  generalSettings,
  kvmRedirectionSettingDataResponse,
  mediaAccessDevice,
  osPowerSavingStateChangeGetResponse,
  physicalMemory,
  physicalPackage,
  positionToFirstRecord,
  processor,
  putKVMRedirectionSettingDataResponse,
  screenSettingDataResponse,
  sendOptInCodeResponse,
  serviceAvailableToElement,
  setupAndConfigurationServiceResponse,
  softwareIdentityResponse,
  startOptInResponse,
  systemPackaging
} from '../test/helper/wsmanResponses.js'
import { CIRAHandler } from './CIRAHandler.js'
import { DeviceAction } from './DeviceAction.js'
import { HttpHandler } from './HttpHandler.js'

describe('Device Action Tests', () => {
  let enumerateSpy: SpyInstance<any>
  let pullSpy: SpyInstance<any>
  let getSpy: SpyInstance<any>
  let sendSpy: SpyInstance<any>
  let deleteSpy: SpyInstance<any>
  let device: DeviceAction
  beforeEach(() => {
    const socket: CIRASocket = null
    const handler = new CIRAHandler(new HttpHandler(), 'admin', 'P@ssw0rd')
    device = new DeviceAction(handler, socket)
    enumerateSpy = spyOn(device.ciraHandler, 'Enumerate')
    pullSpy = spyOn(device.ciraHandler, 'Pull')
    getSpy = spyOn(device.ciraHandler, 'Get')
    sendSpy = spyOn(device.ciraHandler, 'Send')
    deleteSpy = spyOn(device.ciraHandler, 'Delete')
  })

  afterEach(() => {
    getSpy.mockReset()
    enumerateSpy.mockReset()
    pullSpy.mockReset()
    deleteSpy.mockReset()
  })

  describe('power', () => {
    it('should return null when enumerate call to power state is null', async () => {
      enumerateSpy.mockResolvedValueOnce(null)
      const result = await device.getPowerState()
      expect(result).toBe(null)
    })
    it('should return power state', async () => {
      enumerateSpy.mockResolvedValueOnce(enumerateResponse)
      pullSpy.mockResolvedValue({ Envelope: { Body: {} } })
      const result = await device.getPowerState()
      expect(result).toEqual({})
    })
    it('should return power state', async () => {
      enumerateSpy.mockResolvedValueOnce(enumerateResponse)
      pullSpy.mockResolvedValue(serviceAvailableToElement)
      const result = await device.getPowerState()
      expect(result.PullResponse.Items.CIM_AssociatedPowerManagementService.PowerState).toBe('4')
    })
    it('should send power action', async () => {
      getSpy.mockResolvedValueOnce({ Envelope: { Body: { RequestPowerStateChange_OUTPUT: { ReturnValue: 0 } } } })
      const result = await device.sendPowerAction(10)
      expect(result).toEqual({ Body: { RequestPowerStateChange_OUTPUT: { ReturnValue: 0 } } })
    })
  })

  describe('ips_power', () => {
    it('should return current OS PowerSaving State', async () => {
      getSpy.mockResolvedValueOnce(osPowerSavingStateChangeGetResponse)
      const result = await device.getOSPowerSavingState()
      expect(result).toBe(osPowerSavingStateChangeGetResponse.Envelope)
    })
    it('should request OS Power Saving State Change action', async () => {
      getSpy.mockResolvedValueOnce({
        Envelope: { Body: { RequestOSPowerSavingStateChange_OUTPUT: { ReturnValue: 0 } } }
      })
      const result = await device.requestOSPowerSavingStateChange(2)
      expect(result).toEqual({ Body: { RequestOSPowerSavingStateChange_OUTPUT: { ReturnValue: 0 } } })
    })
  })

  describe('boot', () => {
    it('should forceBootMode', async () => {
      sendSpy.mockResolvedValue(null)
      const result = await device.forceBootMode()
      expect(sendSpy).toHaveBeenCalled()
      expect(result).toBe(null)
    })
    it('should changeBootOrder', async () => {
      sendSpy.mockResolvedValue({})
      const bootSourceSetting: CIM.Types.BootConfigSetting.InstanceID = 'Intel(r) AMT: Force PXE Boot'
      const result = await device.changeBootOrder(bootSourceSetting)
      expect(sendSpy).toHaveBeenCalled()
      expect(result).toEqual({})
    })
    it('should revert changeBootOrder', async () => {
      sendSpy.mockResolvedValue({})
      const result = await device.changeBootOrder()
      expect(sendSpy).toHaveBeenCalled()
      expect(result).toEqual({})
    })
    it('should getBootSettingSource', async () => {
      sendSpy.mockResolvedValue({})
      const result = await device.getBootSettingSource()
      expect(sendSpy).toHaveBeenCalled()
      expect(result).toEqual({})
    })
    it('should setBootConfiguration', async () => {
      sendSpy.mockResolvedValue({ Envelope: { Body: {} } })
      const bootSettingData: AMT.Models.BootSettingData = {
        ElementName: 'test',
        BIOSPause: false,
        BIOSSetup: false,
        BootMediaIndex: 0,
        ConfigurationDataReset: false,
        FirmwareVerbosity: 0,
        ForcedProgressEvents: false,
        IDERBootDevice: 0,
        LockKeyboard: false,
        LockPowerButton: false,
        LockResetButton: false,
        LockSleepButton: false,
        ReflashBIOS: false,
        SecureErase: false,
        UseIDER: false,
        UserPasswordBypass: false,
        UseSafeMode: false,
        UseSOL: false
      }
      const result = await device.setBootConfiguration(bootSettingData)
      expect(sendSpy).toHaveBeenCalled()
      expect(result).toEqual({})
    })
    it('should getBootOptions', async () => {
      getSpy.mockResolvedValue({ Envelope: { Body: {} } })
      const result = await device.getBootOptions()
      expect(getSpy).toHaveBeenCalled()
      expect(result).toEqual({})
    })
  })

  describe('version', () => {
    it('should return null when enumerate call to software identity is null', async () => {
      enumerateSpy.mockResolvedValueOnce(null)
      const result = await device.getSoftwareIdentity()
      expect(result).toBe(null)
    })
    it('should return null when pull call to software identity is null', async () => {
      enumerateSpy.mockResolvedValueOnce({
        Envelope: {
          Header: {
            To: 'http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous',
            RelatesTo: '0',
            Action: 'http://schemas.xmlsoap.org/ws/2004/09/enumeration/EnumerateResponse',
            MessageID: 'uuid:00000000-8086-8086-8086-000000000001',
            ResourceURI: 'http://schemas.dmtf.org/wbem/wscim/1/cim-schema/2/CIM_SoftwareIdentity'
          },
          Body: { EnumerateResponse: { EnumerationContext: '01000000-0000-0000-0000-000000000000' } }
        }
      })
      pullSpy.mockResolvedValue(softwareIdentityResponse)
      const result = await device.getSoftwareIdentity()
      expect(result).toBe(softwareIdentityResponse.Envelope.Body)
    })
    it('should get AMT SetupAndConfigurationService ', async () => {
      getSpy.mockResolvedValueOnce(setupAndConfigurationServiceResponse)
      const result = await device.getSetupAndConfigurationService()
      expect(result).toBe(setupAndConfigurationServiceResponse.Envelope)
    })
  })

  describe('general settings', () => {
    it('should get general settings ', async () => {
      getSpy.mockResolvedValueOnce(generalSettings)
      const result = await device.getGeneralSettings()
      expect(result).toBe(generalSettings.Envelope)
    })
  })

  describe('user consent code', () => {
    it('should request for user consent code ', async () => {
      getSpy.mockResolvedValueOnce(startOptInResponse)
      const result = await device.requestUserConsentCode()
      expect(result).toBe(startOptInResponse.Envelope)
    })
    it('should cancel for user consent code ', async () => {
      getSpy.mockResolvedValueOnce(cancelOptInResponse)
      const result = await device.cancelUserConsentCode()
      expect(result).toBe(cancelOptInResponse.Envelope)
    })
    it('should send for user consent code ', async () => {
      getSpy.mockResolvedValueOnce(sendOptInCodeResponse)
      const result = await device.sendUserConsentCode(985167)
      expect(result).toBe(sendOptInCodeResponse.Envelope)
    })
  })

  describe('event log', () => {
    it('should get event log ', async () => {
      getSpy.mockResolvedValueOnce(positionToFirstRecord)
      getSpy.mockResolvedValueOnce(amtMessageLog)
      const result = await device.getEventLog()
      expect(result).toBe(amtMessageLog.Envelope)
    })
    it('should return null if fails to get event log', async () => {
      getSpy.mockResolvedValueOnce(null)
      const result = await device.getEventLog()
      expect(result).toBe(null)
    })
  })

  describe('auditLog', () => {
    it('should get audit log', async () => {
      getSpy.mockResolvedValueOnce(auditLog)
      const result = await device.getAuditLog(1)
      expect(result).toBe(auditLog.Envelope.Body)
    })
    it('should return null if fails to get audit log', async () => {
      getSpy.mockResolvedValueOnce(null)
      await expect(device.getAuditLog(1)).rejects.toThrow('unable to retrieve audit log')
    })
  })

  describe('amt features', () => {
    it('should get IPS Opt In Service', async () => {
      getSpy.mockResolvedValue({ Envelope: { Body: {} } })
      const result = await device.getIpsOptInService()
      expect(result).toEqual({})
    })
    it('should put IPS Opt In Service', async () => {
      getSpy.mockResolvedValue({ Envelope: { Body: {} } })
      const result = await device.putIpsOptInService({} as any)
      expect(result).toEqual({})
    })
    it('should get kvm', async () => {
      getSpy.mockResolvedValueOnce({ Envelope: { Body: {} } })
      const result = await device.getKvmRedirectionSap()
      expect(result).toEqual({})
    })
    it('should set kvm', async () => {
      sendSpy.mockResolvedValueOnce({ Envelope: { Body: { RequestStateChange_OUTPUT: { ReturnValue: 0 } } } })
      const result = await device.setKvmRedirectionSap(6)
      expect(result).toEqual({ RequestStateChange_OUTPUT: { ReturnValue: 0 } })
    })
    it('should get redirection service', async () => {
      getSpy.mockResolvedValueOnce({ Envelope: { Body: {} } })
      const result = await device.getRedirectionService()
      expect(result).toEqual({})
    })
    it('should put redirection service', async () => {
      sendSpy.mockResolvedValue({ Envelope: { Body: {} } })
      const result = await device.putRedirectionService({} as any)
      expect(result).toEqual({})
    })
    it('should set redirection service state', async () => {
      sendSpy.mockResolvedValue({ Envelope: { Body: { RequestStateChange_OUTPUT: { ReturnValue: 0 } } } })
      const result = await device.setRedirectionService(32768)
      expect(result).toEqual({ RequestStateChange_OUTPUT: { ReturnValue: 0 } })
    })
    it('should get KVM redirection SAP', async () => {
      getSpy.mockResolvedValueOnce({ Envelope: { Body: {} } })
      const result = await device.getKvmRedirectionSap()
      expect(result).toEqual({})
    })
  })

  describe('hardware information', () => {
    it('should get ComputerSystemPackage', async () => {
      getSpy.mockResolvedValue(computerSystemPackage)
      const result = await device.getComputerSystemPackage()
      expect(result).toEqual(computerSystemPackage.Envelope)
    })
    it('should get Chassis', async () => {
      getSpy.mockResolvedValue(chassis)
      const result = await device.getChassis()
      expect(result).toEqual(chassis.Envelope)
    })
    it('should get Card', async () => {
      getSpy.mockResolvedValue(card)
      const result = await device.getCard()
      expect(result).toEqual(card.Envelope)
    })
    it('should get BIOSElement', async () => {
      getSpy.mockResolvedValue(biosElement)
      const result = await device.getBIOSElement()
      expect(result).toEqual(biosElement.Envelope)
    })
    it('should return null when enumerate call to getProcessor fails', async () => {
      enumerateSpy.mockResolvedValueOnce(null)
      const result = await device.getProcessor()
      expect(result).toBe(null)
    })
    it('should get processor', async () => {
      enumerateSpy.mockResolvedValueOnce(enumerateResponse)
      pullSpy.mockResolvedValue(processor)
      const result = await device.getProcessor()
      expect(result).toEqual(processor.Envelope)
    })
    it('should return null when enumerate call to getPhysicalMemory fails', async () => {
      enumerateSpy.mockResolvedValueOnce(null)
      const result = await device.getPhysicalMemory()
      expect(result).toBe(null)
    })
    it('should get PhysicalMemory', async () => {
      enumerateSpy.mockResolvedValueOnce(enumerateResponse)
      pullSpy.mockResolvedValue(physicalMemory)
      const result = await device.getPhysicalMemory()
      expect(result).toEqual(physicalMemory.Envelope)
    })
    it('should return null when enumerate call to getMediaAccessDevice fails', async () => {
      enumerateSpy.mockResolvedValueOnce(null)
      const result = await device.getMediaAccessDevice()
      expect(result).toBe(null)
    })
    it('should get MediaAccessDevice', async () => {
      enumerateSpy.mockResolvedValueOnce(enumerateResponse)
      pullSpy.mockResolvedValue(mediaAccessDevice)
      const result = await device.getMediaAccessDevice()
      expect(result).toEqual(mediaAccessDevice.Envelope)
    })
    it('should return null when enumerate call to getPhysicalPackage fails', async () => {
      enumerateSpy.mockResolvedValueOnce(null)
      const result = await device.getPhysicalPackage()
      expect(result).toBe(null)
    })
    it('should get PhysicalPackage', async () => {
      enumerateSpy.mockResolvedValueOnce(enumerateResponse)
      pullSpy.mockResolvedValue(physicalPackage)
      const result = await device.getPhysicalPackage()
      expect(result).toEqual(physicalPackage.Envelope)
    })
    it('should return null when enumerate call to getSystemPackaging fails', async () => {
      enumerateSpy.mockResolvedValueOnce(null)
      const result = await device.getSystemPackaging()
      expect(result).toBe(null)
    })
    it('should get SystemPackaging', async () => {
      enumerateSpy.mockResolvedValueOnce(enumerateResponse)
      pullSpy.mockResolvedValue(systemPackaging)
      const result = await device.getSystemPackaging()
      expect(result).toEqual(systemPackaging.Envelope)
    })
    it('should return null when enumerate call to getChip fails', async () => {
      enumerateSpy.mockResolvedValueOnce(null)
      const result = await device.getChip()
      expect(result).toBe(null)
    })
    it('should get Chip', async () => {
      enumerateSpy.mockResolvedValueOnce(enumerateResponse)
      pullSpy.mockResolvedValue(chip)
      const result = await device.getChip()
      expect(result).toEqual(chip.Envelope)
    })
  })
  describe('power capabilities', () => {
    it('should get power capabilities', async () => {
      getSpy.mockResolvedValueOnce(bootCapabilities)
      const result = await device.getPowerCapabilities()
      expect(result).toEqual(bootCapabilities.Envelope)
    })
  })
  describe('alarm occurrences', () => {
    it('should return null when enumerate call to getAlarmClockOccurrences fails', async () => {
      enumerateSpy.mockResolvedValueOnce(null)
      const result = await device.getAlarmClockOccurrences()
      expect(result).toBe(null)
    })
    it('should get alarm occurrences', async () => {
      enumerateSpy.mockResolvedValueOnce(enumerateResponseIPSAlarmClockOccurrence)
      pullSpy.mockResolvedValueOnce(alarmClockOccurrences)
      const result = await device.getAlarmClockOccurrences()
      expect(result).toEqual(alarmClockOccurrences.Envelope)
    })

    const fakeSelector: Selector = {
      name: 'Name',
      value: 'Alarm Instance Name'
    }
    it('should delete an alarm occurence', async () => {
      deleteSpy.mockResolvedValueOnce(deleteAlarmClockOccurrence)

      const result = await device.deleteAlarmClockOccurrence(fakeSelector)
      expect(result).toEqual(deleteAlarmClockOccurrence.Envelope)
    })

    it('should return null when call to deleteAlarmClockOccurrence fails', async () => {
      deleteSpy.mockResolvedValueOnce(null)
      const result = await device.deleteAlarmClockOccurrence(fakeSelector)
      expect(result).toBe(null)
    })

    const fakeAlarm: Models.AlarmClockOccurrence = {
      DeleteOnCompletion: true,
      ElementName: 'Instance Name',
      InstanceID: 'Instance',
      StartTime: new Date('2022-12-31T23:59:00Z')
    }
    it('should create an alarm occurrence', async () => {
      getSpy.mockResolvedValueOnce(addAlarmClockOccurrenceResponse)

      const result = await device.addAlarmClockOccurrence(fakeAlarm)
      expect(result).toEqual(addAlarmClockOccurrenceResponse.Envelope)
    })
    it('should return null when call to addAlarmClockOccurrence fails', async () => {
      getSpy.mockResolvedValueOnce(null)
      const result = await device.addAlarmClockOccurrence(fakeAlarm)
      expect(result).toBe(null)
    })
  })
  describe('unprovision', () => {
    it('should return 0 when unprovision is run', async () => {
      sendSpy.mockResolvedValue({ Envelope: { Body: { ReturnValue: 0 } } })
      const result = await device.unprovisionDevice()
      expect(result).toEqual({ Body: { ReturnValue: 0 } })
    })
  })

  describe('addCertificate', () => {
    // getCIMCredentialContext
    it('should return null if getCIMCredentialContext returns null', async () => {
      enumerateSpy.mockResolvedValueOnce(null)
      const result = await device.getCIMCredentialContext()
      expect(result).toBeNull()
    })
    it('should return CIMCredentialContextResponse', async () => {
      enumerateSpy.mockResolvedValueOnce(enumerateResponse)
      pullSpy.mockResolvedValueOnce({ Envelope: { Body: { PullResponse: { Items: [] } } } })
      const result = await device.getCIMCredentialContext()
      expect(result).toEqual([])
    })
    // getPublicPrivateKeyPair
    it('should return null if getPublicPrivateKeyPair returns null', async () => {
      enumerateSpy.mockResolvedValueOnce(null)
      const result = await device.getPublicPrivateKeyPair()
      expect(result).toBeNull()
    })
    it('should return PublicPrivateKeyPairResponse', async () => {
      enumerateSpy.mockResolvedValueOnce(enumerateResponse)
      pullSpy.mockResolvedValueOnce({ Envelope: { Body: { PullResponse: { Items: [] } } } })
      const result = await device.getPublicPrivateKeyPair()
      expect(result).toEqual([])
    })
    // getConcreteDependency
    it('should return null if getConcreteDependency returns null', async () => {
      enumerateSpy.mockResolvedValueOnce(null)
      const result = await device.getConcreteDependency()
      expect(result).toBeNull()
    })
    it('should return ConcreteDependencyResponse', async () => {
      enumerateSpy.mockResolvedValueOnce(enumerateResponse)
      pullSpy.mockResolvedValueOnce({ Envelope: { Body: { PullResponse: { Items: [] } } } })
      const result = await device.getConcreteDependency()
      expect(result).toEqual([])
    })
    // getpublicKeyCertificates
    it('should return null if getpublicKeyCertificates returns null', async () => {
      enumerateSpy.mockResolvedValueOnce(null)
      const result = await device.getpublicKeyCertificates()
      expect(result).toBeNull()
    })
    it('should return PublicKeyCertificateResponse', async () => {
      enumerateSpy.mockResolvedValueOnce(enumerateResponse)
      pullSpy.mockResolvedValueOnce({ Envelope: { Body: { PullResponse: { Items: [] } } } })
      const result = await device.getpublicKeyCertificates()
      expect(result).toEqual([])
    })
  })

  describe('addCertificate', () => {
    it('should call AddTrustedRootCertificate for trusted certs', async () => {
      sendSpy.mockResolvedValue({
        Envelope: {
          Body: {
            AddTrustedRootCertificate_OUTPUT: {
              CreatedCertificate: {
                ReferenceParameters: {
                  SelectorSet: { Selector: 'trusted-cert-handle' }
                }
              }
            }
          }
        }
      })

      const result = await device.addCertificate('dummy-cert', true)
      expect(result).toBe('trusted-cert-handle')
    })

    it('should call AddCertificate for untrusted certs', async () => {
      sendSpy.mockResolvedValue({
        Envelope: {
          Body: {
            AddCertificate_OUTPUT: {
              CreatedCertificate: {
                ReferenceParameters: {
                  SelectorSet: { Selector: 'untrusted-cert-handle' }
                }
              }
            }
          }
        }
      })

      const result = await device.addCertificate('dummy-cert', false)
      expect(result).toBe('untrusted-cert-handle')
    })

    it('should return null and log error if response is null', async () => {
      sendSpy.mockResolvedValue(null)
      const result = await device.addCertificate('dummy-cert', false)
      expect(result).toBeNull()
    })
  })

  describe('BootServiceStateChange', () => {
    it('should call BootServiceStateChange with requested state', async () => {
      sendSpy.mockResolvedValue({
        Envelope: {
          Body: {
            RequestStateChange_OUTPUT: { ReturnValue: 0 }
          }
        }
      })
      const result = await device.BootServiceStateChange(1)
      expect(result).toBeUndefined()
    })

    it('should log error if RequestStateChange fails', async () => {
      sendSpy.mockResolvedValue({
        Envelope: {
          Body: {
            RequestStateChange_OUTPUT: { ReturnValue: 1 }
          }
        }
      })
      const result = await device.BootServiceStateChange(1)
      expect(result).toBeUndefined()
    })
  })
  describe('screen and KVM redirection setting data', () => {
    it('should get screen setting data', async () => {
      enumerateSpy.mockResolvedValueOnce(enumerateResponse)
      pullSpy.mockResolvedValue(screenSettingDataResponse)
      const result = await device.getScreenSettingData()
      expect(pullSpy).toHaveBeenCalled()
      expect(result).toEqual(screenSettingDataResponse.Envelope.Body?.PullResponse)
    })

    it('should return null if getScreenSettingData fails', async () => {
      enumerateSpy.mockResolvedValueOnce(enumerateResponse)
      pullSpy.mockResolvedValue(null)
      const result = await device.getScreenSettingData()
      expect(result).toBeNull()
    })

    it('should get KVM redirection setting data', async () => {
      getSpy.mockResolvedValueOnce(kvmRedirectionSettingDataResponse)
      const result = await device.getKVMRedirectionSettingData()
      expect(getSpy).toHaveBeenCalled()
      expect(result).toEqual(kvmRedirectionSettingDataResponse.Envelope.Body)
    })

    it('should return null if getKVMRedirectionSettingData fails', async () => {
      getSpy.mockResolvedValueOnce(null)
      const result = await device.getKVMRedirectionSettingData()
      expect(result).toBeNull()
    })

    it('should put KVM redirection setting data', async () => {
      sendSpy.mockResolvedValueOnce(putKVMRedirectionSettingDataResponse)
      const data = {
        InstanceID: 'KVMRedirection1',
        ElementName: 'KVM Redirection',
        OptInPolicy: true,
        EnabledByMEBx: true,
        BackToBackFbMode: false,
        Is5900PortEnabled: true,
        SessionTimeout: 0,
        RFBPort: 5900,
        UserConsent: 0,
        UserConsentTimeout: 0,
        ConsentRequired: 0,
        ConsentGranted: false,
        ConsentType: 0,
        RFBPassword: '',
        DefaultScreen: 0,
        InitialDecimationModeForLowRes: 0,
        GreyscalePixelFormatSupported: false,
        UserConsentDisplayTimeout: 0,
        UserConsentDisplayType: 0,
        ZlibControlSupported: false,
        DoubleBufferMode: false,
        DoubleBufferState: false
      }
      const result = await device.putKVMRedirectionSettingData(data)
      expect(sendSpy).toHaveBeenCalled()
      expect(result).toEqual(putKVMRedirectionSettingDataResponse.Envelope.Body)
    })
  })

  describe('WiFi port validation and link preference', () => {
    let getEthernetPortSettingsSpy: SpyInstance<any>

    beforeEach(() => {
      getEthernetPortSettingsSpy = spyOn(device, 'getEthernetPortSettings')
    })

    it('should find WiFi port automatically', async () => {
      const mockEnumResponse = {
        Body: {
          PullResponse: {
            Items: {
              AMT_EthernetPortSettings: [
                {
                  InstanceID: 'Intel(r) AMT Ethernet Port Settings 0',
                  PhysicalConnectionType: '0', // Integrated LAN
                  ElementName: 'LAN Port'
                },
                {
                  InstanceID: 'Intel(r) AMT Ethernet Port Settings 1',
                  PhysicalConnectionType: '3', // Wireless LAN
                  ElementName: 'WiFi Port'
                }
              ]
            }
          }
        }
      }
      getEthernetPortSettingsSpy.mockResolvedValue(mockEnumResponse as any)

      const result = await device.findWiFiPort()

      expect(result).not.toBeNull()
      expect(result?.instanceID).toBe('Intel(r) AMT Ethernet Port Settings 1')
      expect(result?.settings.InstanceID).toBe('Intel(r) AMT Ethernet Port Settings 1')
      expect(result?.settings.PhysicalConnectionType).toBe('3')
      expect(result?.settings.ElementName).toBe('WiFi Port')
    })

    it('should return null when no WiFi port exists', async () => {
      const mockEnumResponse = {
        Body: {
          PullResponse: {
            Items: {
              AMT_EthernetPortSettings: [
                {
                  InstanceID: 'Intel(r) AMT Ethernet Port Settings 0',
                  PhysicalConnectionType: '0' // Only LAN
                },
                {
                  InstanceID: 'Intel(r) AMT Ethernet Port Settings 1',
                  PhysicalConnectionType: '1' // Only LAN
                }
              ]
            }
          }
        }
      }
      getEthernetPortSettingsSpy.mockResolvedValue(mockEnumResponse as any)

      const result = await device.findWiFiPort()

      expect(result).toBeNull()
    })

    it('should auto-detect WiFi port when instanceID not provided', async () => {
      const mockEnumResponse = {
        Body: {
          PullResponse: {
            Items: {
              AMT_EthernetPortSettings: [
                {
                  InstanceID: 'Intel(r) AMT Ethernet Port Settings 0',
                  PhysicalConnectionType: '0'
                },
                {
                  InstanceID: 'Intel(r) AMT Ethernet Port Settings 1',
                  PhysicalConnectionType: '3' // WiFi
                }
              ]
            }
          }
        }
      }
      getEthernetPortSettingsSpy.mockResolvedValue(mockEnumResponse as any)
      getSpy.mockResolvedValue({ Envelope: { Body: { SetLinkPreference_OUTPUT: { ReturnValue: '0' } } } })

      const result = await device.setEthernetLinkPreference(1, 300)

      expect(getSpy).toHaveBeenCalled()
    })

    it('should return null when no WiFi port found', async () => {
      const mockEnumResponse = {
        Body: {
          PullResponse: {
            Items: {
              AMT_EthernetPortSettings: {
                InstanceID: 'Intel(r) AMT Ethernet Port Settings 0',
                PhysicalConnectionType: '0' // Only LAN
              }
            }
          }
        }
      }
      getEthernetPortSettingsSpy.mockResolvedValue(mockEnumResponse as any)

      const result = await device.setEthernetLinkPreference(1, 300)
      expect(result).toEqual(null)
    })

    it('should find a WiFi port and call SetLinkPreference, returning 0 for success', async () => {
      const mockEnumResponse = {
        Body: {
          PullResponse: {
            Items: {
              AMT_EthernetPortSettings: [
                {
                  InstanceID: 'Intel(r) AMT Ethernet Port Settings 0',
                  PhysicalConnectionType: '0', // Integrated LAN
                  ElementName: 'LAN Port'
                },
                {
                  InstanceID: 'Intel(r) AMT Ethernet Port Settings 1',
                  PhysicalConnectionType: '3', // Wireless LAN
                  ElementName: 'WiFi Port'
                }
              ]
            }
          }
        }
      }
      getEthernetPortSettingsSpy.mockResolvedValue(mockEnumResponse as any)
      getSpy.mockResolvedValue({ Envelope: { Body: { SetLinkPreference_OUTPUT: { ReturnValue: 0 } } } })

      const result = await device.setEthernetLinkPreference(1, 300)
      expect(result).toBe(0)
      expect(getSpy).toHaveBeenCalled()
    })
  })
})
