/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { CIRAHandler } from '../../amt/CIRAHandler.js'
import { DeviceAction } from '../../amt/DeviceAction.js'
import { HttpHandler } from '../../amt/HttpHandler.js'
import { messages } from '../../logging/index.js'
import { createSpyObj } from '../../test/helper/jest.js'
import { ErrorResponse } from '../../utils/amtHelper.js'
import { MqttProvider } from '../../utils/MqttProvider.js'
import { getAMTFeatures } from './getAMTFeatures.js'
import { type SpyInstance, spyOn } from 'jest-mock'

describe('get amt features', () => {
  let resSpy
  let req
  let redirectionSpy: SpyInstance<any>
  let optInServiceSpy: SpyInstance<any>
  let kvmRedirectionSpy: SpyInstance<any>
  let ocrDataSpy: SpyInstance<any>
  let mqttSpy: SpyInstance<any>

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

    redirectionSpy = spyOn(device, 'getRedirectionService')
    optInServiceSpy = spyOn(device, 'getIpsOptInService')
    kvmRedirectionSpy = spyOn(device, 'getKvmRedirectionSap')
    ocrDataSpy = spyOn(device, 'getOCRData')
    mqttSpy = spyOn(MqttProvider, 'publishEvent')
  })

  it('should get feature', async () => {
    redirectionSpy.mockResolvedValue({
      AMT_RedirectionService: {
        CreationClassName: 'AMT_RedirectionService',
        ElementName: 'Intel(r) AMT Redirection Service',
        EnabledState: 32771,
        ListenerEnabled: false,
        Name: 'Intel(r) AMT Redirection Service',
        SystemCreationClassName: 'CIM_ComputerSystem',
        SystemName: 'Intel(r) AMT'
      }
    })

    optInServiceSpy.mockResolvedValue({
      IPS_OptInService: {
        CanModifyOptInPolicy: 0,
        CreationClassName: 'IPS_OptInService',
        ElementName: 'Intel(r) AMT OptIn Service',
        Name: 'Intel(r) AMT OptIn Service',
        OptInCodeTimeout: 120,
        OptInDisplayTimeout: 300,
        OptInRequired: 4294967295,
        OptInState: 0,
        SystemCreationClassName: 'CIM_ComputerSystem',
        SystemName: 'Intel(r) AMT'
      }
    })

    kvmRedirectionSpy.mockResolvedValue({
      CIM_KVMRedirectionSAP: {
        CreationClassName: 'CIM_KVMRedirectionSAP',
        ElementName: 'KVM Redirection Service Access Point',
        EnabledState: 3,
        KVMProtocol: 4,
        Name: 'KVM Redirection Service Access Point',
        RequestedState: 5,
        SystemCreationClassName: 'CIM_ComputerSystem'
      }
    })

    ocrDataSpy.mockResolvedValue({
      bootService: {
        CIM_BootService: {
          CreationClassName: 'CIM_BootService',
          ElementName: 'Intel(r) AMT Boot Service',
          EnabledState: 32769,
          Name: 'Intel(r) AMT Boot Service',
          OperationalStatus: 0,
          RequestedState: 12,
          SystemCreationClassName: 'CIM_ComputerSystem',
          SystemName: 'Intel(r) AMT'
        }
      },
      bootSourceSettings: {
        Items: {
          CIM_BootSourceSetting: [
            {
              ElementName: 'Intel(r) AMT: Boot Source',
              FailThroughSupported: 2,
              InstanceID: 'Intel(r) AMT: Force OCR UEFI HTTPS Boot',
              StructuredBootString: 'CIM:Hard-Disk:1'
            },
            {
              ElementName: 'Intel(r) AMT: Boot Source',
              FailThroughSupported: 2,
              InstanceID: 'Intel(r) AMT: Force OCR UEFI Boot Option',
              StructuredBootString: 'CIM:Network:1',
              BIOSBootString: 'WinRE'
            },
            {
              ElementName: 'Intel(r) AMT: Boot Source',
              FailThroughSupported: 2,
              InstanceID: 'Intel(r) AMT: Force OCR UEFI Boot Option',
              StructuredBootString: 'CIM:Network:1',
              BIOSBootString: 'OEM PBA'
            }
          ]
        },
        EndOfSequence: ''
      },
      capabilities: {
        Body: {
          AMT_BootCapabilities: {
            ForceUEFIHTTPSBoot: true,
            ForceWinREBoot: true,
            ForceUEFILocalPBABoot: true,
            ElementName: 'Intel(r) AMT: Boot Capabilities',
            ForceCDorDVDBoot: true,
            ForceDiagnosticBoot: false,
            ForceHardDriveBoot: true,
            ForceHardDriveSafeModeBoot: false,
            ForcePXEBoot: true,
            ForcedProgressEvents: true,
            IDER: true,
            InstanceID: 'Intel(r) AMT:BootCapabilities 0',
            SOL: true
          }
        }
      },
      bootData: {
        AMT_BootSettingData: {
          UEFIHTTPSBootEnabled: true,
          WinREBootEnabled: true,
          UEFILocalPBABootEnabled: true,
          ConfigurationDataReset: false,
          ElementName: 'Intel(r) AMT Boot Configuration Settings',
          EnforceSecureBoot: false,
          IDERBootDevice: 0,
          InstanceID: 'Intel(r) AMT:BootSettingData 0',
          UseIDER: false,
          UseSOL: false
        }
      }
    })

    await getAMTFeatures(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith({
      userConsent: 'all',
      redirection: false,
      KVM: false,
      SOL: true,
      IDER: true,
      optInState: 0,
      kvmAvailable: true,
      ocr: true,
      httpsBootSupported: true,
      winREBootSupported: true,
      localPBABootSupported: false,
      remoteErase: false
    })
    expect(mqttSpy).toHaveBeenCalledTimes(2)
  })

  it('should handle error when get feature', async () => {
    redirectionSpy.mockRejectedValueOnce({})
    await getAMTFeatures(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(500)
    expect(resSpy.json).toHaveBeenCalledWith(ErrorResponse(500, messages.AMT_FEATURES_EXCEPTION))
    expect(mqttSpy).toHaveBeenCalledWith('fail', ['AMT_GetFeatures'], messages.INTERNAL_SERVICE_ERROR)
  })

  it('should handle OCR data when boot service is disabled', async () => {
    redirectionSpy.mockResolvedValue({
      AMT_RedirectionService: {
        CreationClassName: 'AMT_RedirectionService',
        ElementName: 'Intel(r) AMT Redirection Service',
        EnabledState: 32771,
        ListenerEnabled: true,
        Name: 'Intel(r) AMT Redirection Service',
        SystemCreationClassName: 'CIM_ComputerSystem',
        SystemName: 'Intel(r) AMT'
      }
    })

    optInServiceSpy.mockResolvedValue({
      IPS_OptInService: {
        CanModifyOptInPolicy: 0,
        CreationClassName: 'IPS_OptInService',
        ElementName: 'Intel(r) AMT OptIn Service',
        Name: 'Intel(r) AMT OptIn Service',
        OptInCodeTimeout: 120,
        OptInDisplayTimeout: 300,
        OptInRequired: 0,
        OptInState: 1,
        SystemCreationClassName: 'CIM_ComputerSystem',
        SystemName: 'Intel(r) AMT'
      }
    })

    kvmRedirectionSpy.mockResolvedValue({
      CIM_KVMRedirectionSAP: null
    })

    ocrDataSpy.mockResolvedValue({
      bootService: {
        CIM_BootService: {
          CreationClassName: 'CIM_BootService',
          ElementName: 'Intel(r) AMT Boot Service',
          EnabledState: 2, // Disabled
          Name: 'Intel(r) AMT Boot Service',
          OperationalStatus: 0,
          RequestedState: 12,
          SystemCreationClassName: 'CIM_ComputerSystem',
          SystemName: 'Intel(r) AMT'
        }
      },
      bootSourceSettings: {
        Items: {
          CIM_BootSourceSetting: []
        },
        EndOfSequence: ''
      },
      capabilities: {
        Body: {
          AMT_BootCapabilities: {
            ForceUEFIHTTPSBoot: false,
            ForceWinREBoot: false,
            ForceUEFILocalPBABoot: false
          }
        }
      },
      bootData: {
        AMT_BootSettingData: {
          UEFIHTTPSBootEnabled: false,
          WinREBootEnabled: false,
          UEFILocalPBABootEnabled: false
        }
      }
    })

    await getAMTFeatures(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith({
      userConsent: 'none',
      redirection: true,
      KVM: false,
      SOL: true,
      IDER: true,
      optInState: 1,
      kvmAvailable: false,
      ocr: false,
      httpsBootSupported: false,
      winREBootSupported: false,
      localPBABootSupported: false,
      remoteErase: false
    })
  })
})
