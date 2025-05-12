/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type CIRASocket } from '../models/models.js'
import { computerSystemPackage } from '../test/helper/wsmanResponses.js'
import { parseBody } from '../utils/parseWSManResponseBody.js'
import APFProcessor from './APFProcessor.js'
import { CIRAHandler } from './CIRAHandler.js'
import { HttpHandler } from './HttpHandler.js'
import { spyOn } from 'jest-mock'

describe('CIRA Handler', () => {
  let ciraHandler: CIRAHandler

  const httpHeader200 =
    'HTTP/1.1 200 OK\r\nDate: Mon, 10 Jan 2022 20:37:48 GMT\r\nServer: Intel(R) Active Management Technology 15.0.23.1706\r\nX-Frame-Options: DENY\r\nContent-Type: application/soap+xml; charset=UTF-8\r\nTransfer-Encoding: chunked\r\n'
  const cimComputerPackageResponse =
    '\r\n0220\r\n<?xml version="1.0" encoding="UTF-8"?><a:Envelope xmlns:a="http://www.w3.org/2003/05/soap-envelope" xmlns:b="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:c="http://schemas.dmtf.org/wbem/wsman/1/wsman.xsd" xmlns:d="http://schemas.xmlsoap.org/ws/2005/02/trust" xmlns:e="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" xmlns:f="http://schemas.dmtf.org/wbem/wsman/1/cimbinding.xsd" xmlns:g="http://schemas.dmtf.org/wbem/wscim/1/cim-schema/2/CIM_ComputerSystemPackage" xmlns:xsi="http://www.w3.org/2001/\r\n02FA\r\nXMLSchema-instance"><a:Header><b:To>http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous</b:To><b:RelatesTo>1</b:RelatesTo><b:Action a:mustUnderstand="true">http://schemas.xmlsoap.org/ws/2004/09/transfer/GetResponse</b:Action><b:MessageID>uuid:00000000-8086-8086-8086-000000000001</b:MessageID><c:ResourceURI>http://schemas.dmtf.org/wbem/wscim/1/cim-schema/2/CIM_ComputerSystemPackage</c:ResourceURI></a:Header><a:Body><g:CIM_ComputerSystemPackage><g:Antecedent><b:Address>http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous</b:Address><b:ReferenceParameters><c:ResourceURI>http://schemas.dmtf.org/wbem/wscim/1/cim-schema/2/CIM_Chassis</c:ResourceURI><c:SelectorSet><c:Selector Name="CreationClassName">CIM_Chassis</c:Selector><c:Selector \r\n0267\r\nName="Tag">CIM_Chassis</c:Selector></c:SelectorSet></b:ReferenceParameters></g:Antecedent><g:Dependent><b:Address>http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous</b:Address><b:ReferenceParameters><c:ResourceURI>http://schemas.dmtf.org/wbem/wscim/1/cim-schema/2/CIM_ComputerSystem</c:ResourceURI><c:SelectorSet><c:Selector Name="CreationClassName">CIM_ComputerSystem</c:Selector><c:Selector Name="Name">ManagedSystem</c:Selector></c:SelectorSet></b:ReferenceParameters></g:Dependent><g:PlatformGUID>44454C4C4B0010428033B6C04F504633</g:PlatformGUID></g:CIM_ComputerSystemPackage></a:Body></a:Envelope>\r\n0\r\n\r\n'
  const cimCardResponse =
    '0220\r\n<?xml version="1.0" encoding="UTF-8"?><a:Envelope xmlns:a="http://www.w3.org/2003/05/soap-envelope" xmlns:b="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:c="http://schemas.dmtf.org/wbem/wsman/1/wsman.xsd" xmlns:d="http://schemas.xmlsoap.org/ws/2005/02/trust" xmlns:e="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" xmlns:f="http://schemas.dmtf.org/wbem/wsman/1/cimbinding.xsd" xmlns:g="http://schemas.dmtf.org/wbem/wscim/1/cim-schema/2/CIM_Card" xmlns:h="http://schemas.dmtf.org/wbem/wscim/1/commo\r\n02FA\r\nn" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><a:Header><b:To>http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous</b:To><b:RelatesTo>2</b:RelatesTo><b:Action a:mustUnderstand="true">http://schemas.xmlsoap.org/ws/2004/09/transfer/GetResponse</b:Action><b:MessageID>uuid:00000000-8086-8086-8086-000000000003</b:MessageID><c:ResourceURI>http://schemas.dmtf.org/wbem/wscim/1/cim-schema/2/CIM_Card</c:ResourceURI></a:Header><a:Body><g:CIM_Card><g:CanBeFRUed>true</g:CanBeFRUed><g:CreationClassName>CIM_Card</g:CreationClassName><g:ElementName>Managed System Base Board</g:ElementName><g:Manufacturer>Dell Inc.</g:Manufacturer><g:Model>0MVDNX</g:Model><g:OperationalStatus>0</g:OperationalStatus><g:PackageType>9</g:PackageType><g:SerialNumber>/\r\n007C\r\n6KB3PF3/CNPEC0017500BC/</g:SerialNumber><g:Tag>CIM_Card</g:Tag><g:Version>A00</g:Version></g:CIM_Card></a:Body></a:Envelope>\r\n0\r\n\r\n'
  const unauthorizedResponse =
    'HTTP/1.1 401 Unauthorized\r\nWWW-Authenticate: Digest realm="Digest:34BF4B5A0561F95248F58509A406E046", nonce="bQali2IAAAAAAAAAn0xaWCOcxNsRcEHX",stale="false",qop="auth"\r\nContent-Type: text/html\r\nServer: Intel(R) Active Management Technology 15.0.23.1706\r\nContent-Length: 693\r\nConnection: close\r\n\r\n'
  let sendSpy
  beforeEach(() => {
    ciraHandler = new CIRAHandler(new HttpHandler(), 'admin', 'P@ssw0rd')
  })
  it('should call Send when Pull<T> called', async () => {
    sendSpy = spyOn(ciraHandler, 'Send').mockResolvedValue('xml')
    await ciraHandler.Pull<any>(null, '')
    expect(sendSpy).toHaveBeenCalledWith(null, '')
  })
  it('should call Send when Get<T> called', async () => {
    sendSpy = spyOn(ciraHandler, 'Send').mockResolvedValue('xml')
    await ciraHandler.Get<any>(null, '')
    expect(sendSpy).toHaveBeenCalledWith(null, '')
  })
  it('should call Send when Enumerate called', async () => {
    sendSpy = spyOn(ciraHandler, 'Send').mockResolvedValue('xml')
    await ciraHandler.Enumerate(null, '')
    expect(sendSpy).toHaveBeenCalledWith(null, '')
  })

  it('Should add request to send', async () => {
    const spy = spyOn(ciraHandler, 'ExecRequest').mockResolvedValue('data')
    const result = await ciraHandler.Send(null, 'hello')
    expect(ciraHandler.socket).toBeNull()
    expect(spy).toHaveBeenCalledWith('hello')
    expect(result).toBe('data')
  })

  it('Should execute request when channel closed and auth challenge', async () => {
    ciraHandler.channel = {
      write: async () => 'response',
      CloseChannel: () => {
        // a hack to simulate that auth has completed
        ciraHandler.httpHandler.authResolve()
        return 0
      }
    } as any
    const closeSpy = spyOn(ciraHandler.channel, 'CloseChannel')
    const execSpy = spyOn(ciraHandler, 'ExecRequest')
    let count = 0
    const handleResultSpy = spyOn(ciraHandler, 'handleResult').mockImplementation(() => {
      if (count === 0) {
        count++
        throw new Error('Unauthorized')
      } else {
        return { data: 'data' }
      }
    })
    const connectSpy = spyOn(ciraHandler, 'Connect').mockResolvedValue(2)
    expect(ciraHandler.channelState).toBe(0)
    const result = await ciraHandler.ExecRequest('xml')
    expect(connectSpy).toHaveBeenCalled()
    expect(closeSpy).toHaveBeenCalled()
    expect(handleResultSpy).toHaveBeenNthCalledWith(1, 'response')
    expect(handleResultSpy).toHaveBeenNthCalledWith(2, 'response')
    expect(execSpy).toHaveBeenCalledTimes(2)
    expect(result).toStrictEqual({ data: 'data' })
  })

  it('Should execute request when channel open and auth exists', async () => {
    ciraHandler.channel = {
      write: async () => 'response'
    } as any
    const handleResultSpy = spyOn(ciraHandler, 'handleResult').mockReturnValue({ data: 'data' })
    const connectSpy = spyOn(ciraHandler, 'Connect')
    ciraHandler.channelState = 2
    ciraHandler.httpHandler.isAuthInProgress = new Promise((resolve, reject) => {
      ciraHandler.httpHandler.authResolve = resolve
    })
    ciraHandler.httpHandler.authResolve()
    const result = await ciraHandler.ExecRequest('xml')
    expect(connectSpy).not.toHaveBeenCalled()
    expect(handleResultSpy).toHaveBeenCalled()
    expect(result).toStrictEqual({ data: 'data' })
  })
  it('should parse body when valid message', () => {
    const message = {
      statusCode: 200,
      body: {
        text: cimCardResponse
      } as any
    } as any
    const response = parseBody(message)
    expect(response).toBeDefined()
  })
  it('should throw error when empty data', () => {
    expect(() => {
      ciraHandler.handleResult('')
    }).toThrowError('rawMessage has incorrect format')
  })
  it('should throw Unauthorized Error when 401 from ATM - digest challenge', () => {
    const handleAuthSpy = spyOn(ciraHandler, 'handleAuth')
    ciraHandler.httpHandler.authResolve = () => {}
    const authSpy = spyOn(ciraHandler.httpHandler, 'authResolve')
    expect(() => {
      ciraHandler.handleResult(unauthorizedResponse)
    }).toThrowError('Unauthorized')
    expect(authSpy).toHaveBeenCalled()
    expect(handleAuthSpy).toHaveBeenCalled()
  })
  // it('should parse when status is 200 and parse body', () => {
  //   const response = ciraHandler.handleResult(httpHeader200 + cimComputerPackageResponse)
  //   expect(response).toEqual(computerSystemPackage)
  // })
  // it('should parse when status is something else and parse body', () => {
  //   const tempHeader = httpHeader200.replace('200', '201')
  //   const response = ciraHandler.handleResult(tempHeader + cimComputerPackageResponse)
  //   computerSystemPackage.statusCode = 201
  //   expect(response).toEqual(computerSystemPackage)
  // })
  it('should return null when header does not contain www-Auntenticate', () => {
    const response = ciraHandler.handleAuth({
      protocolVersion: 'HTTP/1.1',
      statusCode: 200,
      statusMessage: 'OK',
      headersSize: 218,
      bodySize: 2165,
      headers: [
        { name: 'X-Frame-Options', value: 'DENY' },
        {
          name: 'Content-Type',
          value: 'application/soap+xml; charset=UTF-8'
        },
        { name: 'Transfer-Encoding', value: 'chunked' }
      ],
      body: {
        boundary: '',
        params: [],
        contentType: 'application/soap+xml',
        text: ''
      }
    })
    expect(response).toEqual(null)
  })
  it('should set up a new CIRA channel', () => {
    const sendChannelSpy = spyOn(APFProcessor, 'SendChannelOpen').mockImplementation(() => {})
    const socket: CIRASocket = {
      tag: {
        first: true,
        activetunnels: 0,
        boundPorts: [],
        host: null,
        nextchannelid: 4,
        channels: {},
        nextsourceport: 0,
        nodeid: null
      }
    } as any
    const channel = ciraHandler.SetupCiraChannel(socket, 16692)
    expect(sendChannelSpy).toBeCalledTimes(1)
    expect(channel.state).toEqual(1)
  })
})
