/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { HttpZParserResponseModel } from '../models/models.js'
import { parseBody } from './parseWSManResponseBody.js'

describe('Check parseWSManResponseBody', () => {
  it('Should pass when converting WSMan response to json', async () => {
    const xmlResponse: HttpZParserResponseModel = {
      protocolVersion: 'HTTP/1.1',
      statusCode: 200,
      statusMessage: 'OK',
      headersSize: 218,
      bodySize: 2165,
      headers: [
        { name: 'Date', value: 'Mon, 24 Jan 2022 13:28:09 GMT' },
        {
          name: 'Server',
          value: 'Intel(R) Active Management Technology 15.0.23.1706'
        },
        { name: 'X-Frame-Options', value: 'DENY' },
        {
          name: 'Content-Type',
          value: 'application/soap+xml; charset=UTF-8'
        },
        { name: 'Transfer-Encoding', value: 'chunked' }
      ],
      body: {
        contentType: 'application/soap+xml',
        boundary: '',
        params: [],
        text:
          '0220\r\n' +
          '<?xml version="1.0" encoding="UTF-8"?><a:Envelope xmlns:a="http://www.w3.org/2003/05/soap-envelope" xmlns:b="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:c="http://schemas.dmtf.org/wbem/wsman/1/wsman.xsd" xmlns:d="http://schemas.xmlsoap.org/ws/2005/02/trust" xmlns:e="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" xmlns:f="http://schemas.dmtf.org/wbem/wsman/1/cimbinding.xsd" xmlns:g="http://intel.com/wbem/wscim/1/amt-schema/1/AMT_GeneralSettings" xmlns:xsi="http://www.w3.org/2001/XMLSchema-ins\r\n' +
          '02FA\r\n' +
          'tance"><a:Header><b:To>http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous</b:To><b:RelatesTo>0</b:RelatesTo><b:Action a:mustUnderstand="true">http://schemas.xmlsoap.org/ws/2004/09/transfer/GetResponse</b:Action><b:MessageID>uuid:00000000-8086-8086-8086-000000000001</b:MessageID><c:ResourceURI>http://intel.com/wbem/wscim/1/amt-schema/1/AMT_GeneralSettings</c:ResourceURI></a:Header><a:Body><g:AMT_GeneralSettings><g:AMTNetworkEnabled>1</g:AMTNetworkEnabled><g:DDNSPeriodicUpdateInterval>1440</g:DDNSPeriodicUpdateInterval><g:DDNSTTL>900</g:DDNSTTL><g:DDNSUpdateByDHCPServerEnabled>true</g:DDNSUpdateByDHCPServerEnabled><g:DDNSUpdateEnabled>false</g:DDNSUpdateEnabled><g:DHCPv6ConfigurationTimeout>0</g:DHCPv6ConfigurationTimeout><g:DigestRealm>Dige\r\n' +
          '02FA\r\n' +
          'st:62FFAC181B3F3457C5B3894ED21F3E6E</g:DigestRealm><g:DomainName></g:DomainName><g:ElementName>Intel(r) AMT: General Settings</g:ElementName><g:HostName></g:HostName><g:HostOSFQDN></g:HostOSFQDN><g:IdleWakeTimeout>1</g:IdleWakeTimeout><g:InstanceID>Intel(r) AMT: General Settings</g:InstanceID><g:NetworkInterfaceEnabled>true</g:NetworkInterfaceEnabled><g:PingResponseEnabled>true</g:PingResponseEnabled><g:PowerSource>0</g:PowerSource><g:PreferredAddressFamily>0</g:PreferredAddressFamily><g:PresenceNotificationInterval>0</g:PresenceNotificationInterval><g:PrivacyLevel>0</g:PrivacyLevel><g:RmcpPingResponseEnabled>true</g:RmcpPingResponseEnabled><g:SharedFQDN>true</g:SharedFQDN><g:ThunderboltDockEnabled>0</g:ThunderboltDockEnabled><g:WsmanOnlyMode>false</g:\r\n' +
          '003C\r\n' +
          'WsmanOnlyMode></g:AMT_GeneralSettings></a:Body></a:Envelope>\r\n' +
          '0\r\n' +
          '\r\n'
      }
    }
    const generalSettings =
      '<?xml version="1.0" encoding="UTF-8"?><a:Envelope xmlns:a="http://www.w3.org/2003/05/soap-envelope" xmlns:b="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:c="http://schemas.dmtf.org/wbem/wsman/1/wsman.xsd" xmlns:d="http://schemas.xmlsoap.org/ws/2005/02/trust" xmlns:e="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" xmlns:f="http://schemas.dmtf.org/wbem/wsman/1/cimbinding.xsd" xmlns:g="http://intel.com/wbem/wscim/1/amt-schema/1/AMT_GeneralSettings" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><a:Header><b:To>http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous</b:To><b:RelatesTo>0</b:RelatesTo><b:Action a:mustUnderstand="true">http://schemas.xmlsoap.org/ws/2004/09/transfer/GetResponse</b:Action><b:MessageID>uuid:00000000-8086-8086-8086-000000000001</b:MessageID><c:ResourceURI>http://intel.com/wbem/wscim/1/amt-schema/1/AMT_GeneralSettings</c:ResourceURI></a:Header><a:Body><g:AMT_GeneralSettings><g:AMTNetworkEnabled>1</g:AMTNetworkEnabled><g:DDNSPeriodicUpdateInterval>1440</g:DDNSPeriodicUpdateInterval><g:DDNSTTL>900</g:DDNSTTL><g:DDNSUpdateByDHCPServerEnabled>true</g:DDNSUpdateByDHCPServerEnabled><g:DDNSUpdateEnabled>false</g:DDNSUpdateEnabled><g:DHCPv6ConfigurationTimeout>0</g:DHCPv6ConfigurationTimeout><g:DigestRealm>Digest:62FFAC181B3F3457C5B3894ED21F3E6E</g:DigestRealm><g:DomainName></g:DomainName><g:ElementName>Intel(r) AMT: General Settings</g:ElementName><g:HostName></g:HostName><g:HostOSFQDN></g:HostOSFQDN><g:IdleWakeTimeout>1</g:IdleWakeTimeout><g:InstanceID>Intel(r) AMT: General Settings</g:InstanceID><g:NetworkInterfaceEnabled>true</g:NetworkInterfaceEnabled><g:PingResponseEnabled>true</g:PingResponseEnabled><g:PowerSource>0</g:PowerSource><g:PreferredAddressFamily>0</g:PreferredAddressFamily><g:PresenceNotificationInterval>0</g:PresenceNotificationInterval><g:PrivacyLevel>0</g:PrivacyLevel><g:RmcpPingResponseEnabled>true</g:RmcpPingResponseEnabled><g:SharedFQDN>true</g:SharedFQDN><g:ThunderboltDockEnabled>0</g:ThunderboltDockEnabled><g:WsmanOnlyMode>false</g:WsmanOnlyMode></g:AMT_GeneralSettings></a:Body></a:Envelope>'
    const response = parseBody(xmlResponse)
    expect(response).toEqual(generalSettings)
  })

  it('Should fail and return an empty response when a message does not contain \r\n', async () => {
    const xmlResponse: HttpZParserResponseModel = {
      protocolVersion: 'HTTP/1.1',
      statusCode: 200,
      statusMessage: 'OK',
      headersSize: 218,
      bodySize: 2165,
      headers: [
        { name: 'Date', value: 'Mon, 24 Jan 2022 13:28:09 GMT' },
        {
          name: 'Server',
          value: 'Intel(R) Active Management Technology 15.0.23.1706'
        },
        { name: 'X-Frame-Options', value: 'DENY' },
        {
          name: 'Content-Type',
          value: 'application/soap+xml; charset=UTF-8'
        },
        { name: 'Transfer-Encoding', value: 'chunked' }
      ],
      body: {
        contentType: 'application/soap+xml',
        boundary: '',
        params: [],
        text: '<?xml version="1.0" encoding="UTF-8"?><a:Envelope xmlns:a="http://www.w3.org/2003/05/soap-envelope" xmlns:b="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:c="http://schemas.dmtf.org/wbem/wsman/1/wsman.xsd" xmlns:d="http://schemas.xmlsoap.org/ws/2005/02/trust" xmlns:e="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" xmlns:f="http://schemas.dmtf.org/wbem/wsman/1/cimbinding.xsd" xmlns:g="http://intel.com/wbem/wscim/1/amt-schema/1/AMT_GeneralSettings" xmlns:xsi="http://www.w3.org/2001/XMLSchema-ins'
      }
    }
    const response = parseBody(xmlResponse)
    expect(response).toBe('')
  })

  it('Should fail and return an empty response when there is no message body', async () => {
    // See issue #661; this response is documented there.
    const xmlResponse: HttpZParserResponseModel = {
      protocolVersion: 'HTTP/1.1',
      statusCode: 400,
      statusMessage: 'Bad Request',
      headersSize: 143,
      bodySize: 0,
      headers: [
        {
          name: 'Date',
          value: 'Mon, 1 Aug 2022 18:54:20 GMT'
        },
        {
          name: 'Server',
          value: 'Intel(R) Active Management Technology 15.0.41.2142'
        },
        {
          name: 'Content-Length',
          value: '0'
        }
      ],
      body: null
    }
    delete xmlResponse.body // Yes, really!  It's not there in this case.
    const response = parseBody(xmlResponse)
    expect(response).toBe('')
  })
})
