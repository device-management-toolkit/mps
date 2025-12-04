/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { AMT, CIM, IPS, type Common } from '@device-management-toolkit/wsman-messages'
import { type Selector } from '@device-management-toolkit/wsman-messages/WSMan.js'
import { logger, messages } from '../logging/index.js'
import { Certificates, OCRData, type CIRASocket } from '../models/models.js'
import { type CIRAHandler } from './CIRAHandler.js'

export class DeviceAction {
  ciraHandler: CIRAHandler
  ciraSocket: CIRASocket
  cim: CIM.Messages
  amt: AMT.Messages
  ips: IPS.Messages
  constructor(ciraHandler: CIRAHandler, ciraSocket: CIRASocket) {
    this.ciraHandler = ciraHandler
    this.ciraSocket = ciraSocket
    this.cim = new CIM.Messages()
    this.amt = new AMT.Messages()
    this.ips = new IPS.Messages()
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

  async getBootSettingSource(): Promise<any> {
    logger.silly(`getBootSettingSource ${messages.REQUEST}`)
    const xmlRequestBody = this.cim.BootSourceSetting.Get()
    const result = await this.ciraHandler.Send(this.ciraSocket, xmlRequestBody)
    logger.silly(`getBootSettingSource ${messages.COMPLETE}`)
    return result
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

  async getConcreteDependency(): Promise<any> {
    let xmlRequestBody = await this.cim.ConcreteDependency.Enumerate()
    const concreteDepEnumResp = await this.ciraHandler.Enumerate(this.ciraSocket, xmlRequestBody)
    if (concreteDepEnumResp == null) {
      logger.error(`getCertificates failed. Reason: ${messages.ENUMERATION_RESPONSE_NULL}`)
      return null
    }

    const concreteDepEnumContext = concreteDepEnumResp.Envelope.Body.EnumerateResponse.EnumerationContext
    xmlRequestBody = await this.cim.ConcreteDependency.Pull(concreteDepEnumContext)
    const concreteDepPullResp = await this.ciraHandler.Pull(this.ciraSocket, xmlRequestBody)
    if (concreteDepPullResp == null) {
      return null
    }
    return concreteDepPullResp.Envelope.Body.PullResponse.Items ?? null
  }

  async getpublicKeyCertificates(): Promise<any> {
    let xmlRequestBody = await this.amt.PublicKeyCertificate.Enumerate()
    const pubKeyCertEnumResp = await this.ciraHandler.Enumerate(this.ciraSocket, xmlRequestBody)
    if (pubKeyCertEnumResp == null) {
      logger.error(`getCertificates failed. Reason: ${messages.ENUMERATION_RESPONSE_NULL}`)
      return null
    }

    const pubKeyCertEnumContext = pubKeyCertEnumResp.Envelope.Body.EnumerateResponse.EnumerationContext
    xmlRequestBody = await this.amt.PublicKeyCertificate.Pull(pubKeyCertEnumContext)
    const pubKeyCertResponse = await this.ciraHandler.Pull<AMT.Models.PublicKeyCertificate>(
      this.ciraSocket,
      xmlRequestBody
    )
    if (pubKeyCertResponse == null) {
      return null
    }

    return pubKeyCertResponse.Envelope.Body.PullResponse.Items ?? null
  }

  async getPublicPrivateKeyPair(): Promise<any> {
    let xmlRequestBody = await this.amt.PublicPrivateKeyPair.Enumerate()
    const pubPrivKeyPairEnumResp = await this.ciraHandler.Enumerate(this.ciraSocket, xmlRequestBody)
    if (pubPrivKeyPairEnumResp == null) {
      logger.error(`getCertificates failed. Reason: ${messages.ENUMERATION_RESPONSE_NULL}`)
      return null
    }

    const pubPrivKeyPairEnumContext = pubPrivKeyPairEnumResp.Envelope.Body.EnumerateResponse.EnumerationContext
    xmlRequestBody = await this.amt.PublicPrivateKeyPair.Pull(pubPrivKeyPairEnumContext)
    const pubPrivKeyPairResponse = await this.ciraHandler.Pull(this.ciraSocket, xmlRequestBody)
    if (pubPrivKeyPairResponse == null) {
      return null
    }

    return pubPrivKeyPairResponse.Envelope.Body.PullResponse.Items ?? null
  }

  async getCIMCredentialContext(): Promise<any> {
    let xmlRequestBody = await this.cim.CredentialContext.Enumerate()
    const cimCredContextEnumResp = await this.ciraHandler.Enumerate(this.ciraSocket, xmlRequestBody)
    if (cimCredContextEnumResp == null) {
      logger.error(`getCertificates failed. Reason: ${messages.ENUMERATION_RESPONSE_NULL}`)
      return null
    }

    const cimCredContextEnumContext = cimCredContextEnumResp.Envelope.Body.EnumerateResponse.EnumerationContext
    xmlRequestBody = await this.cim.CredentialContext.Pull(cimCredContextEnumContext)
    const cimCredContextResponse = await this.ciraHandler.Pull(this.ciraSocket, xmlRequestBody)
    if (cimCredContextResponse == null) {
      return null
    }
    return cimCredContextResponse.Envelope.Body.PullResponse.Items ?? null
  }

  async getCertificates(): Promise<Certificates> {
    const concreteDependency = await this.getConcreteDependency()
    const publicKeyCertificates = await this.getpublicKeyCertificates()
    const pubPrivKeyPairResponse = await this.getPublicPrivateKeyPair()
    const cimCredContextResponse = await this.getCIMCredentialContext()

    return {
      ConcreteDependencyResponse: concreteDependency,
      PublicKeyCertificateResponse: publicKeyCertificates,
      PublicPrivateKeyPairResponse: pubPrivKeyPairResponse,
      CIMCredentialContextResponse: cimCredContextResponse
    }
  }

  async addCertificate(cert: string, isTrusted: boolean): Promise<string> {
    let result: any
    let handle: string

    if (isTrusted) {
      const xmlRequestBody = this.amt.PublicKeyManagementService.AddTrustedRootCertificate({ CertificateBlob: cert })
      result = await this.ciraHandler.Send(this.ciraSocket, xmlRequestBody)
      if (result == null) {
        logger.error(`addCertificate failed. Reason: ${messages.RESPONSE_NULL}`)
        return null
      }
      handle =
        result.Envelope.Body?.AddTrustedRootCertificate_OUTPUT?.CreatedCertificate?.ReferenceParameters?.SelectorSet
          ?.Selector
    } else {
      const xmlRequestBody = this.amt.PublicKeyManagementService.AddCertificate({ CertificateBlob: cert })
      result = await this.ciraHandler.Send(this.ciraSocket, xmlRequestBody)
      if (result == null) {
        logger.error(`addCertificate failed. Reason: ${messages.RESPONSE_NULL}`)
        return null
      }
      handle =
        result.Envelope.Body?.AddCertificate_OUTPUT?.CreatedCertificate?.ReferenceParameters?.SelectorSet?.Selector
    }

    logger.silly(`addCertificate ${messages.COMPLETE}`)
    return handle
  }

  async removeCertificate(handle: string): Promise<boolean> {
    logger.silly(`removeCertificate: ${messages.DELETE}`)
    
    try {
      // Create selector for the certificate to delete
      const selector: Selector = { 
        name: 'InstanceID',
        value: handle 
      }
      
      // Use AMT PublicKeyCertificate to remove the certificate
      const xmlRequestBody = this.amt.PublicKeyCertificate.Delete(selector)
      const result = await this.ciraHandler.Delete(this.ciraSocket, xmlRequestBody)
      
      if (result == null) {
        logger.error(`removeCertificate failed. Reason: ${messages.DELETE_RESPONSE_NULL}`)
        return false
      }

      logger.silly(`removeCertificate: ${messages.COMPLETE}`)
      return true
    } catch (error) {
      logger.error(`removeCertificate failed. Error: ${error}`)
      return false
    }
  }

  async getBootService(): Promise<any> {
    const xmlRequestBody = this.cim.BootService.Get()
    const result = await this.ciraHandler.Get(this.ciraSocket, xmlRequestBody)
    if (result == null) {
      logger.error(`getBootService failed. Reason: ${messages.RESPONSE_NULL}`)
      return null
    }
    return result.Envelope.Body ?? null
  }

  async getBootSourceSetting(): Promise<any> {
    let xmlRequestBody = this.cim.BootSourceSetting.Enumerate()
    const enumResponse = await this.ciraHandler.Enumerate(this.ciraSocket, xmlRequestBody)
    if (enumResponse == null) {
      logger.error(`GetBootSourceSetting failed. Reason: ${messages.RESPONSE_NULL}`)
      return null
    }
    const enumContext = enumResponse.Envelope.Body.EnumerateResponse.EnumerationContext
    xmlRequestBody = this.cim.BootSourceSetting.Pull(enumContext)
    const result = await this.ciraHandler.Pull(this.ciraSocket, xmlRequestBody)
    if (result == null) {
      logger.error(`GetBootSourceSetting failed. Reason: ${messages.RESPONSE_NULL}`)
      return null
    }
    return result.Envelope.Body.PullResponse
  }

  async getBootSettingData(): Promise<any> {
    const xmlRequestBody = this.amt.BootSettingData.Get()
    const result = await this.ciraHandler.Get(this.ciraSocket, xmlRequestBody)
    if (result == null) {
      logger.error(`getBootSettingData failed. Reason: ${messages.RESPONSE_NULL}`)
      return null
    }
    return result.Envelope.Body ?? null
  }

  async getOCRData(): Promise<OCRData> {
    const bootService = await this.getBootService()
    const bootSourceSettings = await this.getBootSourceSetting()
    const capabilities = await this.getPowerCapabilities()
    const bootData = await this.getBootSettingData()

    return {
      bootService,
      bootSourceSettings,
      capabilities,
      bootData
    }
  }

  async BootServiceStateChange(requestedState: number): Promise<void> {
    logger.silly(`BootServiceStateChange ${messages.REQUEST}`)
    const xmlRequestBody = this.cim.BootService.RequestStateChange(
      requestedState as CIM.Types.BootService.RequestedState
    )
    const result = await this.ciraHandler.Send(this.ciraSocket, xmlRequestBody)
    if (result == null || result.Envelope?.Body?.RequestStateChange_OUTPUT?.ReturnValue != 0) {
      logger.error(`BootServiceStateChange failed. Reason: ${messages.RESPONSE_NULL}`)
    }
  }

  async getScreenSettingData(): Promise<any> {
    let xmlRequestBody = this.ips.ScreenSettingData.Enumerate()
    const enumResponse = await this.ciraHandler.Enumerate(this.ciraSocket, xmlRequestBody)
    if (enumResponse == null) {
      logger.error(`enumerateScreenSettingData failed. Reason: ${messages.RESPONSE_NULL}`)
      return null
    }
    const enumContext = enumResponse.Envelope.Body.EnumerateResponse.EnumerationContext
    xmlRequestBody = this.ips.ScreenSettingData.Pull(enumContext)
    const result = await this.ciraHandler.Pull(this.ciraSocket, xmlRequestBody)
    if (result == null) {
      logger.error(`pullScreenSettingData failed. Reason: ${messages.RESPONSE_NULL}`)
      return null
    }
    return result.Envelope.Body.PullResponse ?? null
  }

  async getKVMRedirectionSettingData(): Promise<any> {
    const xmlRequestBody = this.ips.KVMRedirectionSettingData.Get()
    const result = await this.ciraHandler.Get(this.ciraSocket, xmlRequestBody)
    if (result == null) {
      logger.error(`getKVMRedirectionSettingData failed. Reason: ${messages.RESPONSE_NULL}`)
      return null
    }
    return result.Envelope.Body ?? null
  }

  async putKVMRedirectionSettingData(data: IPS.Models.KVMRedirectionSettingData): Promise<any> {
    logger.silly(`putKVMRedirectionSettingData ${messages.REQUEST}`)
    const xmlRequestBody = this.ips.KVMRedirectionSettingData.Put(data)
    const result = await this.ciraHandler.Send(this.ciraSocket, xmlRequestBody)
    logger.silly(`putKVMRedirectionSettingData ${messages.COMPLETE}`)
    return result.Envelope.Body
  }

  async getEthernetPortSettings(): Promise<
    Common.Models.Envelope<Common.Models.Pull<AMT.Models.EthernetPortSettings>>
  > {
    logger.silly(`getEthernetPortSettings ${messages.REQUEST}`)
    let xmlRequestBody = this.amt.EthernetPortSettings.Enumerate()
    const enumResponse = await this.ciraHandler.Enumerate(this.ciraSocket, xmlRequestBody)
    if (enumResponse == null) {
      logger.error(`getEthernetPortSettings failed. Reason: ${messages.ENUMERATION_RESPONSE_NULL}`)
      return null
    }
    xmlRequestBody = this.amt.EthernetPortSettings.Pull(enumResponse.Envelope.Body.EnumerateResponse.EnumerationContext)
    const pullResponse = await this.ciraHandler.Pull<AMT.Models.EthernetPortSettings>(this.ciraSocket, xmlRequestBody)
    logger.silly(`getEthernetPortSettings ${messages.COMPLETE}`)
    return pullResponse.Envelope
  }

  /**
   * Finds the first WiFi port by checking PhysicalConnectionType
   * @returns Object with instanceID and full port settings, or null if none found
   */
  async findWiFiPort(): Promise<{ instanceID: string; settings: any } | null> {
    logger.silly('findWiFiPort: searching for WiFi port')
    try {
      const enumResult = await this.getEthernetPortSettings()
      if (enumResult?.Body?.PullResponse?.Items == null) {
        logger.error('findWiFiPort: No ethernet port settings found')
        return null
      }

      const settings: any = (enumResult.Body.PullResponse.Items as any).AMT_EthernetPortSettings
      if (settings == null) {
        logger.error('findWiFiPort: AMT_EthernetPortSettings not found in response')
        return null
      }

      const ports = Array.isArray(settings) ? settings : [settings]

      // Find the first port with PhysicalConnectionType = 3 (Wireless LAN)
      const wifiPort = ports.find((port: any) => {
        const connectionType = parseInt(port.PhysicalConnectionType, 10)
        return connectionType === 3
      })

      if (wifiPort == null) {
        logger.error('findWiFiPort: No WiFi port found')
        return null
      }

      logger.silly(`findWiFiPort: Found WiFi port ${wifiPort.InstanceID}`)
      return {
        instanceID: wifiPort.InstanceID,
        settings: wifiPort
      }
    } catch (err) {
      logger.error(`findWiFiPort error: ${(err as Error).message}`)
      return null
    }
  }

  async setEthernetLinkPreference(
    linkPreference: AMT.Types.EthernetPortSettings.LinkPreference,
    timeoutSeconds: number
  ): Promise<number | null> {
    logger.silly(`setEthernetLinkPreference ${messages.REQUEST}`)

    // Check the availibilty of the WiFi port
    const wifiPortInfo = await this.findWiFiPort()
    if (wifiPortInfo == null) {
      const errorMsg =
        'No WiFi port found on this device. SetLinkPreference requires a WiFi interface (PhysicalConnectionType=3).'
      logger.error(`setEthernetLinkPreference: ${errorMsg}`)
      return null
    }
    logger.info(`setEthernetLinkPreference: WiFi port: ${wifiPortInfo.instanceID}`)

    const xmlRequestBody = this.amt.EthernetPortSettings.SetLinkPreference(
      linkPreference,
      timeoutSeconds,
      wifiPortInfo.instanceID
    )
    const result = await this.ciraHandler.Get(this.ciraSocket, xmlRequestBody)
    const body = result?.Envelope?.Body as { SetLinkPreference_OUTPUT?: { ReturnValue?: number } } | null
    const returnValue = body?.SetLinkPreference_OUTPUT?.ReturnValue

    return returnValue ?? -1
  }
}
