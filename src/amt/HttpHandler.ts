/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { logger, messages } from '../logging/index.js'
import { createHash } from 'node:crypto'
import * as xml2js from 'xml2js'
import { type DigestChallenge } from '@device-management-toolkit/wsman-messages/models/common.js'

export class connectionParams {
  port: number
  guid: string
  username: string
  password: string
  nonce?: string
  nonceCounter?: number
  consoleNonce?: string
  digestChallenge?: DigestChallenge
}

function myParseNumbers(value: string, name: string): any {
  if (name === 'ElementName' || name === 'InstanceID') {
    if (value.length > 1 && value.charAt(0) === '0') {
      return value
    }
  }
  return xml2js.processors.parseNumbers(value, name)
}

export class HttpHandler {
  digestChallenge: any
  authResolve: any
  isAuthInProgress: any
  // The purpose of this directive is to allow the server to detect request replays by maintaining its own copy of this count.
  // if the same nonceCounter-value is seen twice, then the request is a replay
  nonceCounter = 1
  stripPrefix: any
  parser: any
  constructor() {
    this.stripPrefix = xml2js.processors.stripPrefix
    this.parser = new xml2js.Parser({
      ignoreAttrs: true,
      mergeAttrs: false,
      explicitArray: false,
      tagNameProcessors: [this.stripPrefix],
      valueProcessors: [myParseNumbers, xml2js.processors.parseBooleans]
    })
  }

  wrapIt(connectionParams: connectionParams, data: string): Buffer {
    try {
      const url = '/wsman'
      const action = 'POST'
      let message = `${action} ${url} HTTP/1.1\r\n`
      if (data == null) {
        return null
      }
      if (connectionParams.digestChallenge != null) {
        // Prepare an Authorization request header from the 401 unauthorized response from AMT
        let responseDigest = null
        // console nonce should be a unique opaque quoted string
        connectionParams.consoleNonce = Math.random().toString(36).substring(7)
        const nc = ('00000000' + (this.nonceCounter++).toString(16)).slice(-8)
        const HA1 = this.hashIt(
          `${connectionParams.username}:${connectionParams.digestChallenge.realm}:${connectionParams.password}`
        )
        const HA2 = this.hashIt(`${action}:${url}`)
        responseDigest = this.hashIt(
          `${HA1}:${connectionParams.digestChallenge.nonce}:${nc}:${connectionParams.consoleNonce}:${connectionParams.digestChallenge.qop}:${HA2}`
        )
        const authorizationRequestHeader = this.digestIt({
          username: connectionParams.username,
          realm: connectionParams.digestChallenge.realm,
          nonce: connectionParams.digestChallenge.nonce,
          uri: url,
          qop: connectionParams.digestChallenge.qop,
          response: responseDigest,
          nc,
          cnonce: connectionParams.consoleNonce
        })
        message += `Authorization: ${authorizationRequestHeader}\r\n`
      }
      /*
      // Use Chunked-Encoding
      message += Buffer.from([
        `Host: ${connectionParams.guid}:${connectionParams.port}`,
        'Transfer-Encoding: chunked',
        '',
        data.length.toString(16).toUpperCase(),
        data,
        0,
        '\r\n'
      ].join('\r\n'), 'utf8')
      return message
      */
      const dataBuffer = Buffer.from(data, 'utf8')
      message += `Host: ${connectionParams.guid}:${connectionParams.port}\r\nContent-Length: ${dataBuffer.length}\r\n\r\n`
      const buffer = Buffer.concat([Buffer.from(message, 'utf8'), dataBuffer])
      if (dataBuffer.length !== data.length) {
        logger.silly(
          `wrapIt data length mismatch: Buffer.length = ${dataBuffer.length}, string.length = ${data.length}`
        )
        logger.silly(buffer.toString('utf8'))
      }
      return buffer
    } catch (err) {
      logger.error(`${messages.CREATE_HASH_STRING_FAILED}:`, err.message)
      return null
    }
  }

  hashIt(data: string): string {
    return createHash('md5').update(data).digest('hex')
  }

  // Prepares Authorization Request Header
  digestIt(params: object): string {
    const paramNames = []
    for (const i in params) {
      paramNames.push(i)
    }
    return `Digest ${paramNames.reduce((s1, ii) => `${s1},${ii}="${params[ii]}"`, '').substring(1)}`
  }

  parseAuthenticateResponseHeader = (value: string): DigestChallenge => {
    const params = value.replace('Digest realm', 'realm').split(/([^=,]*)=("[^"]*"|[^,"]*)/)
    const obj: DigestChallenge = {}
    for (let idx = 0; idx < params.length; idx = idx + 3) {
      if (params[idx + 1] != null) {
        obj[params[idx + 1].trim()] = params[idx + 2].replace(/"/g, '')
      }
    }
    if (obj.qop != null) {
      obj.qop = 'auth'
    }
    return obj
  }

  parseXML(xmlBody: string): any {
    let wsmanResponse: string
    const xmlDecoded: string = Buffer.from(xmlBody, 'binary').toString('utf8')
    this.parser.parseString(xmlDecoded, (err, result) => {
      if (err) {
        logger.error(`${messages.XML_PARSE_FAILED}:`, err)
        wsmanResponse = null
      } else {
        wsmanResponse = result
      }
    })
    return wsmanResponse
  }
}
