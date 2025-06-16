/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import * as auditLog from './auditLog.js'
import { MqttProvider } from '../../utils/MqttProvider.js'
import { createSpyObj } from '../../test/helper/jest.js'
import { DeviceAction } from '../../amt/DeviceAction.js'
import { CIRAHandler } from '../../amt/CIRAHandler.js'
import { HttpHandler } from '../../amt/HttpHandler.js'
import { type AMT } from '@device-management-toolkit/wsman-messages'
import { spyOn } from 'jest-mock'

describe('auditLog', () => {
  let req
  let resSpy
  let device: DeviceAction
  let mqttSpy: jest.Spied<any>
  let getAuditLogSpy: jest.Spied<any>
  const fakeGuid = '00000000-0000-0000-0000-000000000000'
  const eventRecords = [
    'ABUAAAAJJCRPc0FkbWluP/Nj6wAJMTI3LjAuMC4xBFyZIW4=',
    'ABUAAAAJJCRPc0FkbWluXJlLAQAJMTI3LjAuMC4xBFyaHfM=',
    'ABUAAAAJJCRPc0FkbWluXoMPegEnMDAwMDowMDAwOjAwMDA6MDAwMDowMDAwOjAwMDA6MDAwMDowMDAxBF6CO2A=',
    'ABAAAAJegj0UAgAA',
    'ABUAAAAFYWRtaW5egj0kAAkxMjcuMC4wLjEEXoI9JQ==',
    'ABIACgAFYWRtaW5egj0nAAkxMjcuMC4wLjEA',
    'AB0AAgAFYWRtaW5egj0tAAkxMjcuMC4wLjEA',
    'ABAAAAJhqMdtAgAA',
    'ABAAEwAFYWRtaW5hpfvMAScwMDAwOjAwMDA6MDAwMDowMDAwOjAwMDA6MDAwMDowMDAwOjAwMDEBBA==',
    'AB4AAQAFYWRtaW5hpfrtAAcxLjIuMy40AQA='
  ]
  let wsmanRsp: AMT.Models.AuditLog_ReadRecords

  beforeEach(() => {
    const handler = new CIRAHandler(new HttpHandler(), 'admin', 'P@ssw0rd')
    device = new DeviceAction(handler, null)
    resSpy = createSpyObj('Response', [
      'status',
      'json',
      'end',
      'send'
    ])
    req = {
      deviceAction: device,
      params: {
        guid: fakeGuid
      },
      query: {}
    }
    wsmanRsp = {
      ReadRecords_OUTPUT: {
        TotalRecordCount: eventRecords.length.toString(),
        RecordsReturned: eventRecords.length.toString(),
        EventRecords: eventRecords,
        ReturnValue: '0'
      }
    }
    resSpy.status.mockReturnThis()
    resSpy.json.mockReturnThis()
    resSpy.send.mockReturnThis()
    mqttSpy = spyOn(MqttProvider, 'publishEvent')
    getAuditLogSpy = spyOn(device, 'getAuditLog')
  })

  it('should convert response to an auditLog result', () => {
    const result = auditLog.convertToAuditLogResult(wsmanRsp.ReadRecords_OUTPUT)
    expect(Number(result.totalCnt)).toBe(eventRecords.length)
    expect(result.records.length).toBe(eventRecords.length)
  })

  it('should convert response to an auditLog result', () => {
    wsmanRsp.ReadRecords_OUTPUT.RecordsReturned = '0'
    wsmanRsp.ReadRecords_OUTPUT.EventRecords = []
    const result = auditLog.convertToAuditLogResult(wsmanRsp.ReadRecords_OUTPUT)
    expect(result.records.length).toBe(0)
  })

  it('should get initiator info for http digest and ptr value from decoded event record', () => {
    const fakeDecodedEventRecordforInitiatorTypeHttpDigest = Buffer.from(
      'ABUAAAAJJCRPc0FkbWluP/Nj6wAJMTI3LjAuMC4xBFyZIW4=',
      'base64'
    ).toString('binary')
    const [
      initiatorType,
      initiator,
      ptr
    ] = auditLog.getInitiatorInfo(fakeDecodedEventRecordforInitiatorTypeHttpDigest)
    expect(initiatorType).toBe(auditLog.InitiatorType.HttpDigest)
    expect(initiator).toBe('$$OsAdmin')
    expect(ptr).toBe(15)
  })

  it('should get initiator info for local and ptr value from decoded event record', () => {
    const fakeDecodedEventRecordforInitiatorTypeLocal = Buffer.from('ABAAAAJegj0UAgAA', 'base64').toString('binary')
    const [
      initiatorType,
      initiator,
      ptr
    ] = auditLog.getInitiatorInfo(fakeDecodedEventRecordforInitiatorTypeLocal)
    expect(initiatorType).toBe(auditLog.InitiatorType.Local)
    expect(initiator).toBe('Local')
    expect(ptr).toBe(5)
  })

  it('should return 200 with no startIndex in query', async () => {
    getAuditLogSpy.mockResolvedValue(wsmanRsp)
    await auditLog.auditLog(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.end).toHaveBeenCalled()
    expect(mqttSpy).toHaveBeenCalled()
  })

  it('should get newest by default (reverse order) and handle end case', async () => {
    const events01 = eventRecords.slice(1, 7)
    const rsp01 = {
      ReadRecords_OUTPUT: {
        TotalRecordCount: eventRecords.length.toString(),
        RecordsReturned: events01.length.toString(),
        EventRecords: events01,
        ReturnValue: '0'
      }
    }
    const events02 = eventRecords.slice(8)
    const rsp02 = {
      ReadRecords_OUTPUT: {
        TotalRecordCount: eventRecords.length.toString(),
        RecordsReturned: events02.length.toString(),
        EventRecords: events02,
        ReturnValue: '0'
      }
    }
    rsp02.ReadRecords_OUTPUT.RecordsReturned = events02.length.toString()
    rsp02.ReadRecords_OUTPUT.EventRecords = events02

    req.query.startIndex = 2
    getAuditLogSpy.mockResolvedValueOnce(rsp01).mockResolvedValueOnce(rsp02)
    await auditLog.auditLog(req, resSpy)
    expect(getAuditLogSpy).toHaveBeenNthCalledWith(1, 2)
    expect(getAuditLogSpy).toHaveBeenNthCalledWith(2, 1)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.end).toHaveBeenCalled()
    expect(mqttSpy).toHaveBeenCalled()
  })

  it('should return 500 on exception', async () => {
    getAuditLogSpy.mockImplementation(() => {
      throw new Error()
    })

    await auditLog.auditLog(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(500)
    expect(mqttSpy).toHaveBeenCalled()
  })
})
