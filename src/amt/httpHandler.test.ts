/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { CIM } from '@device-management-toolkit/wsman-messages'
import { type DigestChallenge } from '@device-management-toolkit/wsman-messages/models/common.js'
import { type connectionParams, HttpHandler } from './HttpHandler.js'

const httpHandler = new HttpHandler()

it('should return null when it parse empty string', async () => {
  const xml = ''
  const result = httpHandler.parseXML(xml)
  expect(result).toBe(null)
})
it('should throw an error and return null when it parse invalid xml', async () => {
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?><a:Envelope xmlns:a="http://www.w3.org/2003/05/soap-envelope" xmlns:b="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:c="http://schemas.dmtf.org/wbem/wsman/1/wsman.xsd" xmlns:d="http://schemas.xmlsoap.org/ws/2005/02/trust" xmlns:e="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" xmlns:f="http://schemas.dmtf.org/wbem/wsman/1/cimbinding.xsd" xmlns:g="http://schemas.xmlsoap.org/ws/2004/09/enumeration" xmlns:h="http:/…xmlsoap.org/ws/2004/08/addressing/role/anonymous</b:Address><b:ReferenceParameters><c:ResourceURI>http://schemas.dmtf.org/wbem/wscim/1/cim-schema/2/CIM_ComputerSystem</c:ResourceURI><c:SelectorSet><c:Selector Name="CreationClassName">CIM_ComputerSystem</c:Selector><c:Selector Name="Name">ManagedSystem</c:Selector></c:SelectorSet></b:ReferenceParameters></h:UserOfService></h:CIM_AssociatedPowerManagementService></g:Items><g:EndOfSequence></g:EndOfSequence></g:PullResponse></a:Body></a:Envelope>'
  const result = httpHandler.parseXML(xml)
  expect(result).toBe(null)
})
it('should preserve leading zeros in ElementName and InstanceID', async () => {
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?><a:Envelope xmlns:a="http://www.w3.org/2003/05/soap-envelope" xmlns:b="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:c="http://schemas.dmtf.org/wbem/wsman/1/wsman.xsd" xmlns:d="http://schemas.xmlsoap.org/ws/2005/02/trust" xmlns:e="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" xmlns:f="http://schemas.dmtf.org/wbem/wsman/1/cimbinding.xsd" xmlns:g="http://schemas.xmlsoap.org/ws/2004/09/enumeration" xmlns:h="http://intel.com/wbem/wscim/1/ips-schema/1/IPS_AlarmClockOccurrence" xmlns:i="http://schemas.dmtf.org/wbem/wscim/1/common" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><a:Header><b:To>http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous</b:To><b:RelatesTo>1</b:RelatesTo><b:Action a:mustUnderstand="true">http://schemas.xmlsoap.org/ws/2004/09/enumeration/PullResponse</b:Action><b:MessageID>uuid:00000000-8086-8086-8086-0000000022AF</b:MessageID><c:ResourceURI>http://intel.com/wbem/wscim/1/ips-schema/1/IPS_AlarmClockOccurrence</c:ResourceURI></a:Header><a:Body><g:PullResponse><g:Items><h:IPS_AlarmClockOccurrence><h:DeleteOnCompletion>true</h:DeleteOnCompletion><h:ElementName>01</h:ElementName><h:InstanceID>01</h:InstanceID><h:StartTime><i:Datetime>2022-11-30T18:51:00Z</i:Datetime></h:StartTime></h:IPS_AlarmClockOccurrence></g:Items><g:EndOfSequence></g:EndOfSequence></g:PullResponse></a:Body></a:Envelope>'
  const result = httpHandler.parseXML(xml)
  const expected = {
    DeleteOnCompletion: true,
    ElementName: '01',
    InstanceID: '01',
    StartTime: {
      Datetime: '2022-11-30T18:51:00Z'
    }
  }
  expect(result?.Envelope?.Body?.PullResponse?.Items?.IPS_AlarmClockOccurrence).toEqual(expected)
})

it('should parse authentication response header with 1 comma in value', async () => {
  const digestChallenge = {
    realm: 'Digest:56ABC7BE224EF620C69EB88F01071DC8',
    nonce: 'fVNueyEAAAAAAAAAcO8WqJ8s+WdyFUIY',
    stale: 'false',
    qop: 'auth'
  }
  const value =
    'Digest realm="Digest:56ABC7BE224EF620C69EB88F01071DC8", nonce="fVNueyEAAAAAAAAAcO8WqJ8s+WdyFUIY",stale="false",qop="auth-int, auth"'
  const result: DigestChallenge = httpHandler.parseAuthenticateResponseHeader(value)
  expect(JSON.stringify(result)).toBe(JSON.stringify(digestChallenge))
})

it('should parse authentication response header with 2 commas in value', async () => {
  const digestChallenge = {
    realm: 'Digest:56ABC7BE224EF620C69EB88F01071DC8',
    nonce: 'fVNueyEAAAAAAAAAcO8WqJ8s+WdyFUIY',
    stale: 'false',
    qop: 'auth'
  }
  const value =
    'Digest realm="Digest:56ABC7BE224EF620C69EB88F01071DC8", nonce="fVNueyEAAAAAAAAAcO8WqJ8s+WdyFUIY",stale="false",qop="auth-int, auth, hot-mess"'
  const result: DigestChallenge = httpHandler.parseAuthenticateResponseHeader(value)
  expect(JSON.stringify(result)).toBe(JSON.stringify(digestChallenge))
})
it('should parse authentication response header with no value', async () => {
  const digestChallenge = {
    realm: 'Digest:56ABC7BE224EF620C69EB88F01071DC8',
    nonce: 'fVNueyEAAAAAAAAAcO8WqJ8s+WdyFUIY',
    stale: 'false',
    qop: 'auth'
  }
  const value =
    'Digest realm="Digest:56ABC7BE224EF620C69EB88F01071DC8", nonce="fVNueyEAAAAAAAAAcO8WqJ8s+WdyFUIY",stale="false",qop=""'
  const result: DigestChallenge = httpHandler.parseAuthenticateResponseHeader(value)
  expect(JSON.stringify(result)).toBe(JSON.stringify(digestChallenge))
})

it('should parse authentication response header with rogue comma', async () => {
  const digestChallenge = {
    realm: 'Digest:56ABC7BE224EF620C69EB88F01071DC8',
    nonce: 'fVNueyEAAAAAAAAAcO8WqJ8s+WdyFUIY',
    stale: 'false',
    qop: 'auth'
  }
  const value =
    'Digest realm="Digest:56ABC7BE224EF620C69EB88F01071DC8", nonce="fVNueyEAAAAAAAAAcO8WqJ8s+WdyFUIY",stale="false",qop="auth",'
  const result: DigestChallenge = httpHandler.parseAuthenticateResponseHeader(value)
  expect(JSON.stringify(result)).toBe(JSON.stringify(digestChallenge))
})

it('should parse authentication response header with rogue double comma', async () => {
  const digestChallenge = {
    realm: 'Digest:56ABC7BE224EF620C69EB88F01071DC8',
    nonce: 'fVNueyEAAAAAAAAAcO8WqJ8s+WdyFUIY',
    stale: 'false',
    qop: 'auth'
  }
  const value =
    'Digest realm="Digest:56ABC7BE224EF620C69EB88F01071DC8", nonce="fVNueyEAAAAAAAAAcO8WqJ8s+WdyFUIY",stale="false",,qop="auth",'
  const result: DigestChallenge = httpHandler.parseAuthenticateResponseHeader(value)
  expect(JSON.stringify(result)).toBe(JSON.stringify(digestChallenge))
})

it('should return a WSMan request', async () => {
  const cim = new CIM.Messages()
  const xmlRequestBody = cim.ServiceAvailableToElement.Enumerate()
  const digestChallenge = {
    realm: 'Digest:56ABC7BE224EF620C69EB88F01071DC8',
    nonce: 'fVNueyEAAAAAAAAAcO8WqJ8s+WdyFUIY',
    stale: 'false',
    qop: 'auth'
  }
  const params: connectionParams = {
    guid: '4c4c4544-004b-4210-8033-b6c04f504633',
    port: 16992,
    digestChallenge,
    username: 'admin',
    password: 'P@ssw0rd'
  }
  const result = httpHandler.wrapIt(params, xmlRequestBody)
  expect(result.toString()).toContain('Authorization')
})
it('should properly encode UTF8 characters', async () => {
  // À is codepoint 0x00C0, [0xC3, 0x80] when UTF8 encoded...
  const xmlRequestBody = '<tag>FooÀbar</tag>'
  const digestChallenge = {
    realm: 'Digest:56ABC7BE224EF620C69EB88F01071DC8',
    nonce: 'fVNueyEAAAAAAAAAcO8WqJ8s+WdyFUIY',
    stale: 'false',
    qop: 'auth'
  }
  const params: connectionParams = {
    guid: '4c4c4544-004b-4210-8033-b6c04f504633',
    port: 16992,
    digestChallenge,
    username: 'admin',
    password: 'P@ssw0rd'
  }
  const result: Buffer = httpHandler.wrapIt(params, xmlRequestBody)
  expect(result.toString('binary')).toContain('<tag>Foo' + String.fromCharCode(0xc3, 0x80) + 'bar</tag>')
  expect(result.toString('binary')).toContain('\r\nContent-Length: 19\r\n')
})
it('should return a null when no xml is passed to wrap a WSMan request', async () => {
  const digestChallenge = {
    realm: 'Digest:56ABC7BE224EF620C69EB88F01071DC8',
    nonce: 'fVNueyEAAAAAAAAAcO8WqJ8s+WdyFUIY',
    stale: 'false',
    qop: 'auth'
  }
  const params: connectionParams = {
    guid: '4c4c4544-004b-4210-8033-b6c04f504633',
    port: 16992,
    digestChallenge,
    username: 'admin',
    password: 'P@ssw0rd'
  }
  const result = httpHandler.wrapIt(params, null)
  expect(result).toBe(null)
})
it('should throw and expection and return a null when connection params are not passed to wrap a WSMan request', async () => {
  const cim = new CIM.Messages()
  const xmlRequestBody = cim.ServiceAvailableToElement.Enumerate()
  const result = httpHandler.wrapIt(null, xmlRequestBody)
  expect(result).toBe(null)
})
