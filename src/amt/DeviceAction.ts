/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { AMT, CIM, IPS, type Common } from '@device-management-toolkit/wsman-messages'
import { Base, type Selector } from '@device-management-toolkit/wsman-messages/WSMan.js'
import { logger, messages } from '../logging/index.js'
import { type CIRASocket } from '../models/models.js'
import { type CIRAHandler } from './CIRAHandler.js'

export interface OCRData {
  CIM_BootService: any; 
  CIM_BootSourceSettings: CIM.Models.BootSourceSetting[]|null; 
  AMT_BootCapabilities; 
  AMT_BootSettingData: AMT.Models.BootSettingData; 
}

export interface BootSettings {
	isHTTPSBootExists : boolean
	isPBAWinREExists  : boolean
}

export interface AMT_PublicPrivateKeyPair{
  DERKey: string
  ElementName: string
  InstanceID: string
}
export interface Certificates {
	ConcreteDependencyResponse:CIM_ConcreteDependency[] | null;    
	PublicKeyCertificateResponse:AMT.Models.PublicKeyCertificate[]|null; 
	PublicPrivateKeyPairResponse:AMT_PublicPrivateKeyPair[]|null; 
	CIMCredentialContextResponse:CIM.Models.CredentialContext[]|null; 
}

export class CIM_CredentialContext extends Base {
  Antecedent
  Dependent
  className = 'CIM_CredentialContext' as unknown as CIM.Classes;
  
  constructor(wsmanMessageCreator) {
    super(wsmanMessageCreator);
  }
}

export class CIM_ConcreteDependency extends Base {  
  className = 'CIM_ConcreteDependency' as unknown as CIM.Classes;
  
  constructor(wsmanMessageCreator) {
    super(wsmanMessageCreator);
  }
}

export class DeviceAction {
  ciraHandler: CIRAHandler
  ciraSocket: CIRASocket
  cim: CIM.Messages
  amt: AMT.Messages
  ips: IPS.Messages
  credentialContext: CIM_CredentialContext
  concreteDependency: CIM_ConcreteDependency

  constructor(ciraHandler: CIRAHandler, ciraSocket: CIRASocket) {
    this.ciraHandler = ciraHandler
    this.ciraSocket = ciraSocket
    this.cim = new CIM.Messages()
    this.amt = new AMT.Messages()
    this.ips = new IPS.Messages()
    this.credentialContext = new CIM_CredentialContext(this.cim.wsmanMessageCreator)
    this.concreteDependency = new CIM_ConcreteDependency(this.cim.wsmanMessageCreator)
  }

  async getPowerState(): Promise<Common.Models.Pull<CIM.Models.AssociatedPowerManagementService>> {
    logger.silly(`getPowerState ${messages.REQUEST}`)
    let xmlRequestBody = this.cim.ServiceAvailableToElement.Enumerate()
    const result = await this.ciraHandler.Enumerate(this.ciraSocket, xmlRequestBody)
    const enumContext: string = result?.Envelope?.Body?.EnumerateResponse?.EnumerationContext
    if (enumContext == null) {
      logger.error(`getPowerState failed. Reason: ${messages.ENUMERATION_RESPONSE_NULL}`)
      return null
    }
    xmlRequestBody = this.cim.ServiceAvailableToElement.Pull(enumContext)
    const pullResponse = await this.ciraHandler.Pull<CIM.Models.AssociatedPowerManagementService>(
      this.ciraSocket,
      xmlRequestBody
    )
    logger.silly(`getPowerState ${messages.COMPLETE}`)
    return pullResponse.Envelope.Body
  }

  async getSoftwareIdentity(): Promise<Common.Models.Pull<CIM.Models.SoftwareIdentity>> {
    logger.silly(`getSoftwareIdentity enumeration ${messages.REQUEST}`)
    const result = await this.ciraHandler.Enumerate(this.ciraSocket, this.cim.SoftwareIdentity.Enumerate())
    logger.info('getSoftwareIdentity enumeration result :', JSON.stringify(result, null, '\t'))
    const enumContext: string = result?.Envelope.Body?.EnumerateResponse?.EnumerationContext
    if (enumContext == null) {
      logger.error(`getSoftwareIdentity failed. Reason: ${messages.ENUMERATION_RESPONSE_NULL}`)
      return null
    }
    logger.silly(`getSoftwareIdentity pull ${messages.REQUEST}`)
    const pullResponse = await this.ciraHandler.Pull<CIM.Models.SoftwareIdentity>(
      this.ciraSocket,
      this.cim.SoftwareIdentity.Pull(enumContext)
    )
    logger.info('getSoftwareIdentity pullResponse :', JSON.stringify(pullResponse, null, '\t'))
    logger.silly(`getSoftwareIdentity ${messages.COMPLETE}`)
    return pullResponse.Envelope.Body
  }

  async getIpsOptInService(): Promise<IPS.Models.OptInServiceResponse> {
    logger.silly(`getIpsOptInService ${messages.REQUEST}`)
    const xmlRequestBody = this.ips.OptInService.Get()
    const result = await this.ciraHandler.Get<IPS.Models.OptInServiceResponse>(this.ciraSocket, xmlRequestBody)
    logger.silly(`getIpsOptInService ${messages.COMPLETE}`)
    return result.Envelope.Body
  }

  async putIpsOptInService(data: IPS.Models.OptInServiceResponse): Promise<IPS.Models.OptInServiceResponse> {
    logger.silly(`putIpsOptInService ${messages.REQUEST}`)
    const xmlRequestBody = this.ips.OptInService.Put(data)
    const result = await this.ciraHandler.Get<IPS.Models.OptInServiceResponse>(this.ciraSocket, xmlRequestBody)
    logger.silly(`putIpsOptInService ${messages.COMPLETE}`)
    return result.Envelope.Body
  }

  async getRedirectionService(): Promise<AMT.Models.RedirectionResponse> {
    logger.silly(`getRedirectionService ${messages.REQUEST}`)
    const xmlRequestBody = this.amt.RedirectionService.Get()
    const result = await this.ciraHandler.Get<AMT.Models.RedirectionResponse>(this.ciraSocket, xmlRequestBody)
    logger.silly(`getRedirectionService ${messages.COMPLETE}`)
    return result.Envelope.Body
  }

  async setRedirectionService(requestState: AMT.Types.RedirectionService.RequestedState): Promise<any> {
    logger.silly(`setRedirectionService ${messages.REQUEST}`)
    const xmlRequestBody = this.amt.RedirectionService.RequestStateChange(requestState)
    const result = await this.ciraHandler.Send(this.ciraSocket, xmlRequestBody)
    logger.silly(`setRedirectionService ${messages.COMPLETE}`)
    return result.Envelope.Body
  }

  async putRedirectionService(data: AMT.Models.RedirectionService): Promise<any> {
    logger.silly(`putRedirectionService ${messages.REQUEST}`)
    const xmlRequestBody = this.amt.RedirectionService.Put(data)
    const result = await this.ciraHandler.Send(this.ciraSocket, xmlRequestBody)
    logger.silly(`putRedirectionService ${messages.COMPLETE}`)
    return result.Envelope.Body
  }

  async getKvmRedirectionSap(): Promise<CIM.Models.KVMRedirectionSAPResponse> {
    logger.silly(`getKvmRedirectionSap ${messages.REQUEST}`)
    const xmlRequestBody = this.cim.KVMRedirectionSAP.Get()
    const result = await this.ciraHandler.Get<CIM.Models.KVMRedirectionSAPResponse>(this.ciraSocket, xmlRequestBody)
    logger.silly(`getKvmRedirectionSap ${messages.COMPLETE}`)
    return result.Envelope.Body
  }

  async setKvmRedirectionSap(requestedState: CIM.Types.KVMRedirectionSAP.RequestedStateInputs): Promise<any> {
    logger.silly(`setKvmRedirectionSap ${messages.REQUEST}`)
    const xmlRequestBody = this.cim.KVMRedirectionSAP.RequestStateChange(requestedState)
    const result = await this.ciraHandler.Send(this.ciraSocket, xmlRequestBody)
    logger.silly(`setKvmRedirectionSap ${messages.COMPLETE}`)
    return result.Envelope.Body
  }

  async forceBootMode(role: CIM.Types.BootService.Role = 1): Promise<number> {
    logger.silly(`forceBootMode ${messages.REQUEST}`)
    const bootSource = 'Intel(r) AMT: Boot Configuration 0'
    const xmlRequestBody = this.cim.BootService.SetBootConfigRole(bootSource, role)
    const result = await this.ciraHandler.Send(this.ciraSocket, xmlRequestBody)
    logger.silly(`forceBootMode ${messages.COMPLETE}`)
    return result
  }

  async requestBootServiceStateChange(reqState: CIM.Types.BootService.RequestedState): Promise<number> {
    logger.silly(`BootServiceStateChange ${messages.REQUEST}`)
    //const bootSource = 'Intel(r) AMT: Boot Configuration 0'
    const xmlRequestBody = this.cim.BootService.RequestStateChange(reqState)
    const result = await this.ciraHandler.Send(this.ciraSocket, xmlRequestBody)
    logger.silly(`BootServiceStateChange ${messages.COMPLETE}`)
    return result
  }

  async getBootSettingSource(): Promise<any> {
    logger.silly(`getBootSettingSource ${messages.REQUEST}`)
    const xmlRequestBody = this.cim.BootSourceSetting.Get()
    const result = await this.ciraHandler.Send(this.ciraSocket, xmlRequestBody)
    logger.silly(`getBootSettingSource ${messages.COMPLETE}`)
    return result
  }

  async getBootSourceSettings(): Promise<CIM.Models.BootSourceSetting[]> {
    logger.silly(`CIM_BootSourceSettings ${messages.REQUEST}`)
    const xmlRequestBody = this.cim.BootSourceSetting.Enumerate()
    const result = await this.ciraHandler.Enumerate(this.ciraSocket, xmlRequestBody)
    if (result == null) {
      logger.error(`CIM_BootSourceSettings > Enumerate > NULL. Reason: ${messages.ENUMERATION_RESPONSE_NULL}`)
      return null
    }
    const enumContext: string = result?.Envelope?.Body?.EnumerateResponse?.EnumerationContext
    if (enumContext == null) {
      logger.error(`CIM_BootSourceSettings > EnumeratioContext > NULL. Reason: ${messages.ENUMERATION_RESPONSE_NULL}`)
      return null
    }
    const pullResponse = await this.ciraHandler.Pull<CIM.Models.BootSourceSetting>(
      this.ciraSocket,
      this.cim.BootSourceSetting.Pull(enumContext)
    )
    const items = pullResponse?.Envelope?.Body?.PullResponse?.Items
    if (items == null) {
      logger.error(`CIM_BootSourceSettings > PullResponse.Items > NULL. Reason: ${messages.RESPONSE_NULL}`)
      return null
    }
    if ('CIM_BootSourceSetting' in items) {
      if (Array.isArray(items.CIM_BootSourceSetting)) {
        logger.silly(`CIM_BootSourceSettings ${messages.COMPLETE}`)
        return items.CIM_BootSourceSetting as CIM.Models.BootSourceSetting[]
      }
    }
    logger.error(`CIM_BootSourceSettings > CIM_BootSourceSetting is missing in the response. Reason: ${messages.RESPONSE_NULL}`)
    return null
  }

  async getBootService(): Promise<any> {
    logger.silly(`getBootService ${messages.REQUEST}`)
    const xmlRequestBody = this.cim.BootService.Get()    
    const result = await this.ciraHandler.Send(this.ciraSocket, xmlRequestBody)

    const content= result?.Envelope?.Body
    if (content == null) {
      logger.error(`getBootService > Envelope.Body > NULL. Reason: ${messages.RESPONSE_NULL}`)
      return null
    }
    if ('CIM_BootService' in content) {
      logger.silly(`getBootService ${messages.COMPLETE}`)      
      return content.CIM_BootService 
    }

    logger.error(`getBootService > Envelope.Body > NULL. Reason: ${messages.RESPONSE_NULL}`)
    return null
  }

  async changeBootOrder(bootSource?: CIM.Types.BootConfigSetting.InstanceID): Promise<any> {
    logger.silly(`changeBootOrder ${messages.REQUEST}`)
    let xmlRequestBody: string
    if (bootSource == null) {
      xmlRequestBody = this.cim.BootConfigSetting.ChangeBootOrder()
    } else {
      xmlRequestBody = this.cim.BootConfigSetting.ChangeBootOrder(bootSource)
    }
    const result = await this.ciraHandler.Send(this.ciraSocket, xmlRequestBody)
    logger.silly(`changeBootOrder ${messages.COMPLETE}`)
    return result
  }

  async setBootConfiguration(data: AMT.Models.BootSettingData): Promise<any> {
    logger.silly(`setBootConfiguration ${messages.REQUEST}`)
    const xmlRequestBody = this.amt.BootSettingData.Put(data)
    const result = await this.ciraHandler.Send(this.ciraSocket, xmlRequestBody)
    logger.silly(`setBootConfiguration ${messages.COMPLETE}`)
    return result.Envelope.Body
  }

  async getBootOptions(): Promise<AMT.Models.BootSettingDataResponse> {
    logger.silly(`getBootOptions ${messages.REQUEST}`)
    const xmlRequestBody = this.amt.BootSettingData.Get()
    const result = await this.ciraHandler.Get<AMT.Models.BootSettingDataResponse>(this.ciraSocket, xmlRequestBody)
    logger.silly(`getBootOptions ${messages.COMPLETE}`)
    return result.Envelope.Body
  }

  async sendPowerAction(powerState: CIM.Types.PowerManagementService.PowerState): Promise<any> {
    logger.silly(`sendPowerAction ${messages.REQUEST}`)
    const xmlToSend = this.cim.PowerManagementService.RequestPowerStateChange(powerState)
    const result = await this.ciraHandler.Get<CIM.Models.PowerActionResponse>(this.ciraSocket, xmlToSend)
    logger.silly(`sendPowerAction ${messages.COMPLETE}`)
    return result.Envelope
  }

  async getSetupAndConfigurationService(): Promise<Common.Models.Envelope<AMT.Models.SetupAndConfigurationService>> {
    logger.silly(`getSetupAndConfigurationService ${messages.REQUEST}`)
    const xmlRequestBody = this.amt.SetupAndConfigurationService.Get()
    const getResponse = await this.ciraHandler.Get<AMT.Models.SetupAndConfigurationService>(
      this.ciraSocket,
      xmlRequestBody
    )
    logger.info('getSetupAndConfigurationService result :', JSON.stringify(getResponse, null, '\t'))
    logger.silly(`getSetupAndConfigurationService ${messages.COMPLETE}`)
    return getResponse.Envelope
  }

  async getGeneralSettings(): Promise<Common.Models.Envelope<AMT.Models.GeneralSettingsResponse>> {
    logger.silly(`getGeneralSettings ${messages.REQUEST}`)
    const xmlRequestBody = this.amt.GeneralSettings.Get()
    const getResponse = await this.ciraHandler.Get<AMT.Models.GeneralSettingsResponse>(this.ciraSocket, xmlRequestBody)
    logger.silly(`getGeneralSettings ${messages.COMPLETE}`)
    return getResponse.Envelope
  }

  async getPowerCapabilities(): Promise<Common.Models.Envelope<AMT.Models.BootCapabilities>> {
    logger.silly(`getPowerCapabilities ${messages.REQUEST}`)
    const xmlRequestBody = this.amt.BootCapabilities.Get()
    const result = await this.ciraHandler.Get<AMT.Models.BootCapabilities>(this.ciraSocket, xmlRequestBody)
    logger.info(JSON.stringify(result))
    logger.silly(`getPowerCapabilities ${messages.COMPLETE}`)
    return result.Envelope
  }

  async requestUserConsentCode(): Promise<Common.Models.Envelope<IPS.Models.StartOptIn_OUTPUT>> {
    logger.silly(`requestUserConsentCode ${messages.REQUEST}`)
    const xmlRequestBody = this.ips.OptInService.StartOptIn()
    const getResponse = await this.ciraHandler.Get<IPS.Models.StartOptIn_OUTPUT>(this.ciraSocket, xmlRequestBody)
    logger.silly(`requestUserConsentCode ${messages.COMPLETE}`)
    return getResponse.Envelope
  }

  async cancelUserConsentCode(): Promise<Common.Models.Envelope<IPS.Models.CancelOptIn_OUTPUT>> {
    logger.silly(`cancelUserConsentCode ${messages.REQUEST}`)
    const xmlRequestBody = this.ips.OptInService.CancelOptIn()
    const getResponse = await this.ciraHandler.Get<IPS.Models.CancelOptIn_OUTPUT>(this.ciraSocket, xmlRequestBody)
    logger.silly(`cancelUserConsentCode ${messages.COMPLETE}`)
    return getResponse.Envelope
  }

  async sendUserConsentCode(code: number): Promise<Common.Models.Envelope<IPS.Models.SendOptInCode_OUTPUT>> {
    logger.silly(`sendUserConsentCode ${messages.REQUEST}`)
    const xmlRequestBody = this.ips.OptInService.SendOptInCode(code)
    const getResponse = await this.ciraHandler.Get<IPS.Models.SendOptInCode_OUTPUT>(this.ciraSocket, xmlRequestBody)
    logger.silly(`sendUserConsentCode ${messages.COMPLETE}`)
    return getResponse.Envelope
  }

  async getComputerSystemPackage(): Promise<Common.Models.Envelope<CIM.Models.ComputerSystemPackage>> {
    logger.silly(`getComputerSystemPackage ${messages.REQUEST}`)
    const xmlRequestBody = this.cim.ComputerSystemPackage.Get()
    const getResponse = await this.ciraHandler.Get<CIM.Models.ComputerSystemPackage>(this.ciraSocket, xmlRequestBody)
    logger.info('getComputerSystemPackage getResponse :', JSON.stringify(getResponse, null, '\t'))
    logger.silly(`getComputerSystemPackage ${messages.COMPLETE}`)
    return getResponse.Envelope
  }

  async getChassis(): Promise<Common.Models.Envelope<CIM.Models.Chassis>> {
    logger.silly(`getChassis ${messages.REQUEST}`)
    const xmlRequestBody = this.cim.Chassis.Get()
    const getResponse = await this.ciraHandler.Get<CIM.Models.Chassis>(this.ciraSocket, xmlRequestBody)
    logger.info('getChassis getChassis :', JSON.stringify(getResponse, null, '\t'))
    logger.silly(`getChassis ${messages.COMPLETE}`)
    return getResponse.Envelope
  }

  async getCard(): Promise<Common.Models.Envelope<CIM.Models.Card>> {
    logger.silly(`getCard ${messages.REQUEST}`)
    const xmlRequestBody = this.cim.Card.Get()
    const getResponse = await this.ciraHandler.Get<CIM.Models.Card>(this.ciraSocket, xmlRequestBody)
    logger.info('getCard getResponse :', JSON.stringify(getResponse, null, '\t'))
    logger.silly(`getCard ${messages.COMPLETE}`)
    return getResponse.Envelope
  }

  async getBIOSElement(): Promise<Common.Models.Envelope<CIM.Models.BIOSElement>> {
    logger.silly(`getBIOSElement ${messages.REQUEST}`)
    const xmlRequestBody = this.cim.BIOSElement.Get()
    const getResponse = await this.ciraHandler.Get<CIM.Models.BIOSElement>(this.ciraSocket, xmlRequestBody)
    logger.info('getBIOSElement getResponse :', JSON.stringify(getResponse, null, '\t'))
    logger.silly(`getBIOSElement ${messages.COMPLETE}`)
    return getResponse.Envelope
  }

  async getProcessor(): Promise<Common.Models.Envelope<Common.Models.Pull<CIM.Models.Processor>>> {
    logger.silly(`getProcessor ${messages.REQUEST}`)
    let xmlRequestBody = this.cim.Processor.Enumerate()
    const enumResponse = await this.ciraHandler.Enumerate(this.ciraSocket, xmlRequestBody)
    if (enumResponse == null) {
      logger.error(`getProcessor failed. Reason: ${messages.ENUMERATION_RESPONSE_NULL}`)
      return null
    }
    xmlRequestBody = this.cim.Processor.Pull(enumResponse.Envelope.Body.EnumerateResponse.EnumerationContext)
    const pullResponse = await this.ciraHandler.Pull<CIM.Models.Processor>(this.ciraSocket, xmlRequestBody)
    logger.silly(`getProcessor ${messages.COMPLETE}`)
    return pullResponse.Envelope
  }

  async getPhysicalMemory(): Promise<Common.Models.Envelope<Common.Models.Pull<CIM.Models.PhysicalMemory>>> {
    logger.silly(`getPhysicalMemory ${messages.REQUEST}`)
    let xmlRequestBody = this.cim.PhysicalMemory.Enumerate()
    const enumResponse = await this.ciraHandler.Enumerate(this.ciraSocket, xmlRequestBody)
    if (enumResponse == null) {
      logger.error(`getPhysicalMemory failed. Reason: ${messages.ENUMERATION_RESPONSE_NULL}`)
      return null
    }
    xmlRequestBody = this.cim.PhysicalMemory.Pull(enumResponse.Envelope.Body.EnumerateResponse.EnumerationContext)
    const pullResponse = await this.ciraHandler.Pull<CIM.Models.PhysicalMemory>(this.ciraSocket, xmlRequestBody)
    logger.silly(`getPhysicalMemory ${messages.COMPLETE}`)
    return pullResponse.Envelope
  }

  async getMediaAccessDevice(): Promise<Common.Models.Envelope<Common.Models.Pull<CIM.Models.MediaAccessDevice>>> {
    logger.silly(`getMediaAccessDevice ${messages.REQUEST}`)
    let xmlRequestBody = this.cim.MediaAccessDevice.Enumerate()
    const enumResponse = await this.ciraHandler.Enumerate(this.ciraSocket, xmlRequestBody)
    if (enumResponse == null) {
      logger.error(`getMediaAccessDevice failed. Reason: ${messages.ENUMERATION_RESPONSE_NULL}`)
      return null
    }
    xmlRequestBody = this.cim.MediaAccessDevice.Pull(enumResponse.Envelope.Body.EnumerateResponse.EnumerationContext)
    const pullResponse = await this.ciraHandler.Pull<CIM.Models.MediaAccessDevice>(this.ciraSocket, xmlRequestBody)
    logger.silly(`getMediaAccessDevice ${messages.COMPLETE}`)
    return pullResponse.Envelope
  }

  async getPhysicalPackage(): Promise<Common.Models.Envelope<Common.Models.Pull<CIM.Models.PhysicalPackage>>> {
    logger.silly(`getPhysicalPackage ${messages.REQUEST}`)
    let xmlRequestBody = this.cim.PhysicalPackage.Enumerate()
    const enumResponse = await this.ciraHandler.Enumerate(this.ciraSocket, xmlRequestBody)
    if (enumResponse == null) {
      logger.error(`getPhysicalPackage failed. Reason: ${messages.ENUMERATION_RESPONSE_NULL}`)
      return null
    }
    xmlRequestBody = this.cim.PhysicalPackage.Pull(enumResponse.Envelope.Body.EnumerateResponse.EnumerationContext)
    const pullResponse = await this.ciraHandler.Pull<CIM.Models.PhysicalPackage>(this.ciraSocket, xmlRequestBody)
    logger.silly(`getPhysicalPackage ${messages.COMPLETE}`)
    return pullResponse.Envelope
  }

  async getSystemPackaging(): Promise<Common.Models.Envelope<Common.Models.Pull<CIM.Models.SystemPackaging>>> {
    logger.silly(`getSystemPackaging ${messages.REQUEST}`)
    let xmlRequestBody = this.cim.SystemPackaging.Enumerate()
    const enumResponse = await this.ciraHandler.Enumerate(this.ciraSocket, xmlRequestBody)
    if (enumResponse == null) {
      logger.error(`getSystemPackaging failed. Reason: ${messages.ENUMERATION_RESPONSE_NULL}`)
      return null
    }
    xmlRequestBody = this.cim.SystemPackaging.Pull(enumResponse.Envelope.Body.EnumerateResponse.EnumerationContext)
    const pullResponse = await this.ciraHandler.Pull<CIM.Models.SystemPackaging>(this.ciraSocket, xmlRequestBody)
    logger.silly(`getSystemPackaging ${messages.COMPLETE}`)
    return pullResponse.Envelope
  }

  async getChip(): Promise<Common.Models.Envelope<Common.Models.Pull<CIM.Models.Chip>>> {
    logger.silly(`getChip ${messages.REQUEST}`)
    let xmlRequestBody = this.cim.Chip.Enumerate()
    const enumResponse = await this.ciraHandler.Enumerate(this.ciraSocket, xmlRequestBody)
    if (enumResponse == null) {
      logger.error(`getChip failed. Reason: ${messages.ENUMERATION_RESPONSE_NULL}`)
      return null
    }
    xmlRequestBody = this.cim.Chip.Pull(enumResponse.Envelope.Body.EnumerateResponse.EnumerationContext)
    const pullResponse = await this.ciraHandler.Pull<CIM.Models.Chip>(this.ciraSocket, xmlRequestBody)
    logger.silly(`getChip ${messages.COMPLETE}`)
    return pullResponse.Envelope
  }

  async getEventLog(): Promise<Common.Models.Envelope<AMT.Models.MessageLog>> {
    logger.silly(`getEventLog ${messages.REQUEST}`)
    let xmlRequestBody = this.amt.MessageLog.PositionToFirstRecord()
    const response = await this.ciraHandler.Get<{
      PositionToFirstRecord_OUTPUT: {
        IterationIdentifier: string
        ReturnValue: string
      }
    }>(this.ciraSocket, xmlRequestBody)
    if (response == null) {
      logger.error(`failed to get position to first record of AMT_MessageLog. Reason: ${messages.RESPONSE_NULL}`)
      return null
    }
    xmlRequestBody = this.amt.MessageLog.GetRecords(
      Number(response.Envelope.Body.PositionToFirstRecord_OUTPUT.IterationIdentifier)
    )
    const eventLogs = await this.ciraHandler.Get<AMT.Models.MessageLog>(this.ciraSocket, xmlRequestBody)
    logger.info('getEventLog response :', JSON.stringify(eventLogs, null, '\t'))
    logger.silly(`getEventLog ${messages.COMPLETE}`)
    return eventLogs.Envelope
  }

  async getAuditLog(startIndex: number): Promise<AMT.Models.AuditLog_ReadRecords> {
    logger.silly(`getAuditLog ${messages.REQUEST}`)
    const xmlRequestBody = this.amt.AuditLog.ReadRecords(startIndex)
    const getResponse = await this.ciraHandler.Get<AMT.Models.AuditLog_ReadRecords>(this.ciraSocket, xmlRequestBody)
    logger.info('getAuditLog response :', JSON.stringify(getResponse, null, '\t'))

    if (getResponse == null) {
      logger.error(`failed to get audit log. Reason: ${messages.RESPONSE_NULL}`)
      throw new Error('unable to retrieve audit log')
    }
    logger.silly(`getAuditLog ${messages.COMPLETE}`)
    return getResponse.Envelope.Body
  }

  async addAlarmClockOccurrence(alarm: IPS.Models.AlarmClockOccurrence): Promise<any> {
    logger.silly(`addAlarmClockOccurrence ${messages.ALARM_ADD_REQUESTED}`)
    const xmlRequestBody = this.amt.AlarmClockService.AddAlarm(alarm)
    const addResponse = await this.ciraHandler.Get(this.ciraSocket, xmlRequestBody)
    if (addResponse == null) {
      logger.error(`addAlarmClockOccurrence failed. Reason: ${messages.ALARM_ADD_RESPONSE_NULL}`)
      return null
    }
    logger.silly(`addAlarmClockOccurrence ${messages.COMPLETE}`)
    return addResponse.Envelope
  }

  async getAlarmClockOccurrences(): Promise<
    Common.Models.Envelope<Common.Models.Pull<IPS.Models.AlarmClockOccurrence>>
  > {
    logger.silly(`getAlarmClockOccurrences ${messages.REQUEST}`)
    let xmlRequestBody = this.ips.AlarmClockOccurrence.Enumerate()
    const enumResponse = await this.ciraHandler.Enumerate(this.ciraSocket, xmlRequestBody)
    if (enumResponse == null) {
      logger.error(`getAlarmClockOccurrences failed. Reason: ${messages.ENUMERATION_RESPONSE_NULL}`)
      return null
    }
    xmlRequestBody = this.ips.AlarmClockOccurrence.Pull(enumResponse.Envelope.Body.EnumerateResponse.EnumerationContext)
    const pullResponse = await this.ciraHandler.Pull<IPS.Models.AlarmClockOccurrence>(this.ciraSocket, xmlRequestBody)
    logger.silly(`getAlarmClockOccurrences ${messages.COMPLETE}`)
    return pullResponse.Envelope
  }

  async deleteAlarmClockOccurrence(selector: Selector): Promise<any> {
    logger.silly(`deleteAlarmClockOccurrence ${messages.DELETE}`)
    const xmlRequestBody = this.ips.AlarmClockOccurrence.Delete(selector)
    const deleteResponse = await this.ciraHandler.Delete(this.ciraSocket, xmlRequestBody)
    if (deleteResponse == null) {
      logger.error(`deleteAlarmClockOccurrences failed. Reason: ${messages.DELETE_RESPONSE_NULL}`)
      return null
    }
    logger.silly(`deleteAlarmClockOccurrences ${messages.COMPLETE}`)
    return deleteResponse.Envelope
  }

  async unprovisionDevice(): Promise<Common.Models.Envelope<any>> {
    logger.debug('Unprovisioning message to AMT')
    const xmlRequestBody = this.amt.SetupAndConfigurationService.Unprovision(1)
    // will there be one?
    const unprovisionResponse = await this.ciraHandler.Send(this.ciraSocket, xmlRequestBody)
    return unprovisionResponse.Envelope
  }

  async getOSPowerSavingState(): Promise<Common.Models.Envelope<IPS.Models.PowerManagementService>> {
    logger.silly(`getOSPowerSavingState ${messages.OS_POWER_SAVING_STATE_GET_REQUESTED}`)
    const xmlRequestBody = this.ips.PowerManagementService.Get()
    const result = await this.ciraHandler.Get<IPS.Models.PowerManagementService>(this.ciraSocket, xmlRequestBody)
    logger.silly(`getOSPowerSavingState ${messages.COMPLETE}`)
    return result.Envelope
  }

  async requestOSPowerSavingStateChange(
    OSPowerSavingState: IPS.Types.PowerManagementService.OSPowerSavingState
  ): Promise<Common.Models.Envelope<IPS.Models.RequestOSPowerSavingStateChangeResponse>> {
    logger.silly(`requestOSPowerSavingStateChange ${messages.OS_POWER_SAVING_STATE_CHANGE_REQUESTED}`)
    const xmlRequestBody = this.ips.PowerManagementService.RequestOSPowerSavingStateChange(OSPowerSavingState)
    const result = await this.ciraHandler.Get<IPS.Models.RequestOSPowerSavingStateChangeResponse>(
      this.ciraSocket,
      xmlRequestBody
    )
    logger.silly(`requestOSPowerSavingStateChange ${messages.COMPLETE}`)
    return result.Envelope
  }

  async getOCRData(): Promise<OCRData> {
    const powerCaps = await this.getPowerCapabilities();    
    let bootCapabilities = powerCaps?.Body?.AMT_BootCapabilities ?? null;
    if (powerCaps == null || powerCaps.Body == null || powerCaps.Body.AMT_BootCapabilities == null) {
      bootCapabilities = null;
    }
    const ocr: OCRData = {
      CIM_BootService: await this.getBootService(),
      CIM_BootSourceSettings: await this.getBootSourceSettings(),
      AMT_BootCapabilities: bootCapabilities,
      AMT_BootSettingData: (await this.getBootOptions())?.AMT_BootSettingData
    };
    return ocr;
  }

  findBootSettingInstances(bootSources: CIM.Models.BootSourceSetting[]): BootSettings {
    if (bootSources == null || bootSources.length === 0) {
      logger.error(`findBootSettingInstances failed. Reason: bootSources is null or empty`);
      return null;
    }

    const targetHTTPSBootInstanceID = "Intel(r) AMT: Force OCR UEFI HTTPS Boot"
  	const targetsPBAWinREInstanceID = "Intel(r) AMT: Force OCR UEFI Boot Option"

    const bootSettings: BootSettings = {
      isHTTPSBootExists: false,
      isPBAWinREExists: false
    };
    
    for (const bootSource of bootSources) {
      const bs = bootSource as CIM.Models.BootSourceSetting;

      if (typeof bs.InstanceID === 'string') {
        if (bs.InstanceID.includes(targetHTTPSBootInstanceID)) {
          bootSettings.isHTTPSBootExists = true;
        }

        if (bs.InstanceID.includes(targetsPBAWinREInstanceID)) {
          bootSettings.isPBAWinREExists = true;  
        }
      }
    }

    return bootSettings;
  }

async getOneClickRecoverySettings() {  
    const ocrdata=await this.getOCRData()    
    if (ocrdata == null) {
      return null
    }
    let isOCR = false
    if(ocrdata.CIM_BootService==null) {
      return null
    }
    else {
      if(ocrdata.CIM_BootService?.EnabledState === 32769 || ocrdata.CIM_BootService?.EnabledState === 32771) {
        isOCR = true        
      }
    }

    if (ocrdata.CIM_BootSourceSettings == null) {
      return null
    }
    
    const result:BootSettings = await this.findBootSettingInstances(ocrdata.CIM_BootSourceSettings)

    if (result == null || ocrdata.AMT_BootCapabilities == null || ocrdata.AMT_BootSettingData == null) {
      return null
    }
    // AMT_BootSettingData.UEFIHTTPSBootEnabled is read-only. AMT_BootCapabilities instance is read-only.
    // So, these cannot be updated
    let isHTTPSBootSupported = false
    if (result.isHTTPSBootExists == true) {
      if ('ForceUEFIHTTPSBoot' in ocrdata.AMT_BootCapabilities && ocrdata.AMT_BootCapabilities.ForceUEFIHTTPSBoot === true &&
          ocrdata.AMT_BootSettingData?.UEFIHTTPSBootEnabled === true) {
        isHTTPSBootSupported = true
      }
    }

    let isWinREBootSupported = false
    let isLocalPBABootSupported = false

    if (result.isPBAWinREExists == true) {
      if ('ForceWinREBoot' in ocrdata.AMT_BootCapabilities && ocrdata.AMT_BootCapabilities.ForceWinREBoot === true &&
        ocrdata.AMT_BootSettingData?.WinREBootEnabled === true) {
        isWinREBootSupported = true
      }

      if ('ForceUEFILocalPBABoot' in ocrdata.AMT_BootCapabilities && ocrdata.AMT_BootCapabilities.ForceUEFILocalPBABoot === true &&
          ocrdata.AMT_BootSettingData?.UEFILocalPBABootEnabled === true) {
        isLocalPBABootSupported = true
      }
    }

    let isRemoteEraseSupported = false
    if('SecureErase' in ocrdata.AMT_BootCapabilities && ocrdata.AMT_BootCapabilities.SecureErase === true ) {
      isRemoteEraseSupported = true
    }

    return {
      OCR: isOCR,
      HTTPSBootSupported: isHTTPSBootSupported,
      WinREBootSupported: isWinREBootSupported,
      LocalPBABootSupported: isLocalPBABootSupported,
      RemoteEraseSupported: isRemoteEraseSupported
    }
  }

  async getDevicePublicKeyCertificates(): Promise<AMT.Models.PublicKeyCertificate[]> {
    logger.silly(`AMT_PublicKeyCertificate ${messages.REQUEST}`)
    const xmlRequestBody = this.amt.PublicKeyCertificate.Enumerate()
    const result = await this.ciraHandler.Enumerate(this.ciraSocket, xmlRequestBody)
    if (result == null) {
      logger.error(`AMT_PublicKeyCertificate > Enumerate > NULL. Reason: ${messages.ENUMERATION_RESPONSE_NULL}`)
      return null
    }
    const enumContext: string = result?.Envelope?.Body?.EnumerateResponse?.EnumerationContext
    if (enumContext == null) {
      logger.error(`AMT_PublicKeyCertificate > EnumeratioContext > NULL. Reason: ${messages.ENUMERATION_RESPONSE_NULL}`)
      return null
    }
    const pullResponse = await this.ciraHandler.Pull<AMT.Models.PublicKeyCertificate>(
      this.ciraSocket,
      this.amt.PublicKeyCertificate.Pull(enumContext)
    )
    const items = pullResponse?.Envelope?.Body?.PullResponse?.Items
    if (items == null) {
      logger.error(`AMT_PublicKeyCertificate > PullResponse.Items > NULL. Reason: ${messages.RESPONSE_NULL}`)
      return null
    }

    logger.silly(`testMJD: AMT_PublicKeyCertificate ${JSON.stringify(items, null, '\t')}`)    
    if ('AMT_PublicKeyCertificate' in items) {
      if (Array.isArray(items.AMT_PublicKeyCertificate)) {
        logger.silly(`AMT_PublicKeyCertificate ${messages.COMPLETE}`)
        return items.AMT_PublicKeyCertificate as AMT.Models.PublicKeyCertificate[]// Class AMT_PublicKeyCertificate[]
      }
    }
    logger.error(`AMT_PublicKeyCertificate > AMT_PublicKeyCertificate is missing in the response. Reason: ${messages.RESPONSE_NULL}`)
    return null
  }

  async getDevicePublicPrivateKeyPair(): Promise<AMT_PublicPrivateKeyPair[]> {
    logger.silly(`AMT_PublicPrivateKeyPair ${messages.REQUEST}`)
    const xmlRequestBody = this.amt.PublicPrivateKeyPair.Enumerate()
    const result = await this.ciraHandler.Enumerate(this.ciraSocket, xmlRequestBody)
    if (result == null) {
      logger.error(`AMT_PublicPrivateKeyPair > Enumerate > NULL. Reason: ${messages.ENUMERATION_RESPONSE_NULL}`)
      return null
    }
    const enumContext: string = result?.Envelope?.Body?.EnumerateResponse?.EnumerationContext
    if (enumContext == null) {
      logger.error(`AMT_PublicPrivateKeyPair > EnumeratioContext > NULL. Reason: ${messages.ENUMERATION_RESPONSE_NULL}`)
      return null
    }
    const pullResponse = await this.ciraHandler.Pull<AMT_PublicPrivateKeyPair>(
      this.ciraSocket,
      this.amt.PublicPrivateKeyPair.Pull(enumContext)
    )

    const items = pullResponse?.Envelope?.Body?.PullResponse?.Items
    if (items == null) {
      logger.error(`AMT_PublicPrivateKeyPair > PullResponse.Items > NULL. Reason: ${messages.RESPONSE_NULL}`)
      return null
    }

    logger.silly(`testMJD: AMT_PublicPrivateKeyPair ${JSON.stringify(items, null, '\t')}`)    
    if ('AMT_PublicPrivateKeyPair' in items) {
      if (Array.isArray(items.AMT_PublicPrivateKeyPair)) {
        logger.silly(`AMT_PublicPrivateKeyPair ${messages.COMPLETE}`)
        return items.AMT_PublicPrivateKeyPair as AMT_PublicPrivateKeyPair[] //as AMT.Models.P[]// Class AMT_PublicKeyCertificate[]
      } else {
        return [items.AMT_PublicPrivateKeyPair as AMT_PublicPrivateKeyPair] // Class AMT_PublicKeyCertificate[]
      }
    }
    
    logger.error(`AMT_PublicPrivateKeyPair > AMT_PublicPrivateKeyPair is missing in the response. Reason: ${messages.RESPONSE_NULL}`)    
    return null
  }

  async getDeviceTLSCredentialContext(): Promise<CIM.Models.CredentialContext[]> {    
    logger.silly(`AMT_TLSCredentialContext}`)
    const xmlRequestBody = this.amt.TLSCredentialContext.Enumerate()
    const result = await this.ciraHandler.Enumerate(this.ciraSocket, xmlRequestBody)
    if (result == null) {
      logger.error(`AMT_TLSCredentialContext > Enumerate > NULL. Reason: ${messages.ENUMERATION_RESPONSE_NULL}`)
      return null
    }

    const enumContext: string = result?.Envelope?.Body?.EnumerateResponse?.EnumerationContext
    if (enumContext == null) {
      logger.error(`AMT_TLSCredentialContext > EnumeratioContext > NULL. Reason: ${messages.ENUMERATION_RESPONSE_NULL}`)
      return null
    }
    const pullResponse = await this.ciraHandler.Pull<CIM.Models.CredentialContext>(
      this.ciraSocket,
      this.amt.TLSCredentialContext.Pull(enumContext)
    )

    const items = pullResponse?.Envelope?.Body?.PullResponse?.Items
    if (items == null) {
      logger.error(`AMT_TLSCredentialContext > PullResponse.Items > NULL. Reason: ${messages.RESPONSE_NULL}`)
      return null
    }
    
    if ('AMT_TLSCredentialContext' in items) {
      if (Array.isArray(items.AMT_TLSCredentialContext)) {
        logger.silly(`AMT_TLSCredentialContext ${messages.COMPLETE}`)
        return items.AMT_TLSCredentialContext as CIM.Models.CredentialContext[] 
      } else {
        return [items.AMT_TLSCredentialContext as CIM.Models.CredentialContext]
      }
    }
    
    logger.error(`AMT.Models.TLSCredentialContext > AMT.Models.TLSCredentialContext is missing in the response. Reason: ${messages.RESPONSE_NULL}`)    
    return null
  }

  async getDeviceIEEE8021xCredentialContext(): Promise<CIM.Models.CredentialContext[]> {        
    logger.silly(`IPS_IEEE8021xCredentialContext}`)
    const xmlRequestBody = this.ips.IEEE8021xCredentialContext.Enumerate()
    const result = await this.ciraHandler.Enumerate(this.ciraSocket, xmlRequestBody)
    if (result == null) {
      logger.error(`IPS_IEEE8021xCredentialContext > Enumerate > NULL. Reason: ${messages.ENUMERATION_RESPONSE_NULL}`)
      return null
    }

    const enumContext: string = result?.Envelope?.Body?.EnumerateResponse?.EnumerationContext
    if (enumContext == null) {
      logger.error(`IPS_IEEE8021xCredentialContext > EnumeratioContext > NULL. Reason: ${messages.ENUMERATION_RESPONSE_NULL}`)
      return null
    }
    const pullResponse = await this.ciraHandler.Pull<CIM.Models.CredentialContext>(
      this.ciraSocket,
      this.ips.IEEE8021xCredentialContext.Pull(enumContext)
    )

    const items = pullResponse?.Envelope?.Body?.PullResponse?.Items
    if (items == null ||
      (typeof items === 'string' && (items as string).trim().length === 0)
    ) {
      logger.error(`IPS_IEEE8021xCredentialContext > PullResponse.Items > NULL. Reason: ${messages.RESPONSE_NULL}`)
      return null
    }
    
    if ('IPS_IEEE8021xCredentialContext' in items) {
      if (Array.isArray(items.IPS_IEEE8021xCredentialContext)) {
        logger.silly(`IPS_IEEE8021xCredentialContext ${messages.COMPLETE}`)
        return items.IPS_IEEE8021xCredentialContext as CIM.Models.CredentialContext[] 
      } else {
        return [items.IPS_IEEE8021xCredentialContext as CIM.Models.CredentialContext]
      }
    }
    
    logger.error(`IPS_IEEE8021xCredentialContext > IPS_IEEE8021xCredentialContext is missing in the response. Reason: ${messages.RESPONSE_NULL}`)    
    return null
  }

  async getDeviceCIMCredentialContext(): Promise<CIM.Models.CredentialContext[]> {        
    logger.silly(`CIM_CredentialContext`)
        
    const xmlRequestBody = this.credentialContext.Enumerate();
    const result = await this.ciraHandler.Enumerate(this.ciraSocket, xmlRequestBody);
    if (result == null) {
      logger.error(`CIM_CredentialContext > Enumerate > NULL. Reason: ${messages.ENUMERATION_RESPONSE_NULL}`)
      return null
    }
    
    const enContext: string = result?.Envelope?.Body?.EnumerateResponse?.EnumerationContext
    if (enContext == null) {
      logger.error(`CIM_CredentialContext > EnumeratioContext > NULL. Reason: ${messages.ENUMERATION_RESPONSE_NULL}`)
      return null
    }
    
    const puResponse = await this.ciraHandler.Pull<CIM.Models.CredentialContext>(
      this.ciraSocket,
      this.credentialContext.Pull(enContext)
    )

    const mitems = puResponse?.Envelope?.Body?.PullResponse?.Items
    if (mitems == null ||
      (typeof mitems === 'string' && (mitems as string).trim().length === 0)
    ) {
      logger.error(`CIM_CredentialContext > PullResponse.Items > NULL. Reason: ${messages.RESPONSE_NULL}`)
      return null
    }

    let cimCredentialContext: CIM.Models.CredentialContext[] = [];

    // AMT_TLSCredentialContext
    if ('AMT_TLSCredentialContext' in mitems) 
    {
      if (Array.isArray(mitems.AMT_TLSCredentialContext)) {          
        const tls= mitems.AMT_TLSCredentialContext as CIM.Models.CredentialContext[]
        if (tls.length > 0) {
          cimCredentialContext = cimCredentialContext.concat(tls)
        }
      } else {
        const tls = [mitems.AMT_TLSCredentialContext as CIM.Models.CredentialContext]
        if (tls.length > 0) {
          cimCredentialContext = cimCredentialContext.concat(tls)
        }
      }
    }

    // IPS_8021xCredentialContext
    if ('IPS_8021xCredentialContext' in mitems) 
    {
      if (Array.isArray(mitems.IPS_8021xCredentialContext)) {          
        const tls= mitems.IPS_8021xCredentialContext as CIM.Models.CredentialContext[]
        if (tls.length > 0) {
          cimCredentialContext = cimCredentialContext.concat(tls)
        }
      } else {
        const tls = [mitems.IPS_8021xCredentialContext as CIM.Models.CredentialContext]
        if (tls.length > 0) {
          cimCredentialContext = cimCredentialContext.concat(tls)
        }
      }
    }

    // AMT_EACCredentialContext
    if ('AMT_EACCredentialContext' in mitems) 
    {
      if (Array.isArray(mitems.AMT_EACCredentialContext)) {          
        const tls= mitems.AMT_EACCredentialContext as CIM.Models.CredentialContext[]
        if (tls.length > 0) {
          cimCredentialContext = cimCredentialContext.concat(tls)
        }
      } else {
        const tls = [mitems.AMT_EACCredentialContext as CIM.Models.CredentialContext]
        if (tls.length > 0) {
          cimCredentialContext = cimCredentialContext.concat(tls)
        }
      }
    }

    // AMT_RemoteAccessCredentialContext
    if ('AMT_RemoteAccessCredentialContext' in mitems) 
    {
      if (Array.isArray(mitems.AMT_RemoteAccessCredentialContext)) {          
        const tls= mitems.AMT_RemoteAccessCredentialContext as CIM.Models.CredentialContext[]
        if (tls.length > 0) {
          cimCredentialContext = cimCredentialContext.concat(tls)
        }
      } else {
        const tls = [mitems.AMT_RemoteAccessCredentialContext as CIM.Models.CredentialContext]
        if (tls.length > 0) {
          cimCredentialContext = cimCredentialContext.concat(tls)
        }
      }
    }

    // AMT_8021xCredentialContext
    if ('AMT_8021xCredentialContext' in mitems) 
    {
      if (Array.isArray(mitems.AMT_8021xCredentialContext)) {          
        const tls= mitems.AMT_8021xCredentialContext as CIM.Models.CredentialContext[]
        if (tls.length > 0) {
          cimCredentialContext = cimCredentialContext.concat(tls)
        }
      } else {
        const tls = [mitems.AMT_8021xCredentialContext as CIM.Models.CredentialContext]
        if (tls.length > 0) {
          cimCredentialContext = cimCredentialContext.concat(tls)
        }
      }
    }

    logger.silly(`CIM_CredentialContext ${messages.COMPLETE}`)
    
    return cimCredentialContext
  }

  async getDeviceIEEE8021xCredentialContextAMT(): Promise<CIM.Models.CredentialContext[]> {        
    logger.silly(`AMT_IEEE8021xCredentialContext}`)
    const xmlRequestBody = this.amt.IEEE8021xCredentialContext.Enumerate()
    const result = await this.ciraHandler.Enumerate(this.ciraSocket, xmlRequestBody)
    if (result == null) {
      logger.error(`AMT_IEEE8021xCredentialContext > Enumerate > NULL. Reason: ${messages.ENUMERATION_RESPONSE_NULL}`)
      return null
    }

    const enumContext: string = result?.Envelope?.Body?.EnumerateResponse?.EnumerationContext
    if (enumContext == null) {
      logger.error(`AMT_IEEE8021xCredentialContext > EnumeratioContext > NULL. Reason: ${messages.ENUMERATION_RESPONSE_NULL}`)
      return null
    }
    const pullResponse = await this.ciraHandler.Pull<CIM.Models.CredentialContext>(
      this.ciraSocket,
      this.amt.IEEE8021xCredentialContext.Pull(enumContext)
    )

    const items = pullResponse?.Envelope?.Body?.PullResponse?.Items
    if (items == null ||
      (typeof items === 'string' && (items as string).trim().length === 0)
    ) {
      logger.error(`AMT_IEEE8021xCredentialContext > PullResponse.Items > NULL. Reason: ${messages.RESPONSE_NULL}`)
      return null
    }

    if ('AMT_IEEE8021xCredentialContext' in items) {
      logger.silly(`AMT_IEEE8021xCredentialContext ${messages.COMPLETE}`)

      if (Array.isArray(items.AMT_IEEE8021xCredentialContext)) {
        return items.AMT_IEEE8021xCredentialContext as CIM.Models.CredentialContext[] 
      } else {
        return [items.AMT_IEEE8021xCredentialContext as CIM.Models.CredentialContext]
      }
    }

    logger.error(`AMT_IEEE8021xCredentialContext > AMT_IEEE8021xCredentialContext is missing in the response. Reason: ${messages.RESPONSE_NULL}`)
    return null
  }

  async getDeviceConcreteDependency(): Promise<CIM_ConcreteDependency[]> {
    logger.silly(`CIM_ConcreteDependency`)
        
    const xmlRequestBody = this.concreteDependency.Enumerate();
    const result = await this.ciraHandler.Enumerate(this.ciraSocket, xmlRequestBody);
    if (result == null) {
      logger.error(`CIM_ConcreteDependency > Enumerate > NULL. Reason: ${messages.ENUMERATION_RESPONSE_NULL}`)
      return null
    }
    
    const enContext: string = result?.Envelope?.Body?.EnumerateResponse?.EnumerationContext
    if (enContext == null) {
      logger.error(`CIM_ConcreteDependency > EnumerationContext > NULL. Reason: ${messages.ENUMERATION_RESPONSE_NULL}`)
      return null
    }
    
    const puResponse = await this.ciraHandler.Pull<CIM_ConcreteDependency>(
      this.ciraSocket,
      this.concreteDependency.Pull(enContext)
    )

    const mitems = puResponse?.Envelope?.Body?.PullResponse?.Items
    if (mitems == null ||
      (typeof mitems === 'string' && (mitems as string).trim().length === 0)
    ) {
      logger.error(`CIM_ConcreteDependency > PullResponse.Items > NULL. Reason: ${messages.RESPONSE_NULL}`)
      return null
    }
    
    logger.silly(`testMJD: CIM_ConcreteDependency ${JSON.stringify(mitems, null, '\t')}`)

    if ('CIM_ConcreteDependency' in mitems) 
    {
      logger.silly(`AMT_IEEE8021xCredentialContext ${messages.COMPLETE}`)
      if (Array.isArray(mitems.CIM_ConcreteDependency)) {          
        return mitems.CIM_ConcreteDependency as CIM_ConcreteDependency[]
      } else {
        return [mitems.CIM_ConcreteDependency as CIM_ConcreteDependency]
      }
    }

    logger.error(`CIM_ConcreteDependency > EnumerationContext > NULL. Reason: ${messages.ENUMERATION_RESPONSE_NULL}`)

    return null
  }

  async getDeviceCertificates(): Promise<Certificates> {
    logger.silly(`getDeviceCertificates ${messages.REQUEST}`)
    
    const mycertificates: Certificates = {
      ConcreteDependencyResponse: await this.getDeviceConcreteDependency(), 
      PublicKeyCertificateResponse: await this.getDevicePublicKeyCertificates(), 
      PublicPrivateKeyPairResponse: await this.getDevicePublicPrivateKeyPair(),
      CIMCredentialContextResponse: await this.getDeviceCIMCredentialContext() 
    };

    return mycertificates
  }

}
