/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type Args, type Connection, ConnectionType } from '../models/models.js'
import Common from './common.js'

export enum RedirectCommands {
  StartRedirectionSession = 0x10,
  StartRedirectionSessionReply = 0x11,
  EndRedirectionSession = 0x12,
  AuthenticateSession = 0x13,
  AuthenticateSessionReply = 0x14
}
export enum StartRedirectionSessionReplyStatus {
  SUCCESS = 0,
  TYPE_UNKNOWN = 1,
  BUSY = 2,
  UNSUPPORTED = 3,
  ERROR = 0xff
}
export enum AuthenticationStatus {
  SUCCESS = 0,
  FALIURE = 1,
  NOTSUPPORTED = 2
}
export enum AuthenticationType {
  QUERY = 0,
  USERPASS = 1,
  KERBEROS = 2,
  BADDIGEST = 3,
  DIGEST = 4
}

export class RedirectInterceptor {
  args: Args
  amt: Connection
  ws: Connection

  constructor(args: Args) {
    this.args = args
    this.amt = { acc: '', mode: 0, count: 0, error: false, direct: false, type: ConnectionType.AMT }
    this.ws = {
      acc: '',
      mode: 0,
      count: 0,
      error: false,
      direct: false,
      authCNonce: Common.RandomValueHex(10),
      authCNonceCount: 1,
      type: ConnectionType.WS
    }
  }

  // Process data coming from Intel AMT
  processAmtData(data): string {
    this.amt.acc += data // Add data to accumulator
    data = ''
    for (let datalen = -1; datalen !== data.length; ) {
      datalen = data.length
      data += this.processAmtDataEx()
    } // Process as much data as possible
    return data
  }

  // Process data coming from AMT in the accumulator
  processAmtDataEx(): string {
    if (this.amt.acc.length === 0) return ''
    if (this.amt.direct) {
      const data = this.amt.acc
      this.amt.acc = ''
      return data
    } else {
      switch (this.amt.acc.charCodeAt(0)) {
        case RedirectCommands.StartRedirectionSessionReply: {
          return this.handleStartRedirectionSessionReply()
        }
        case RedirectCommands.AuthenticateSessionReply: {
          return this.handleAuthenticateSessionReply()
        }
        default: {
          this.amt.error = true
          return ''
        }
      }
    }
  }

  handleStartRedirectionSessionReply(): string {
    if (this.amt.acc.length < 4) return ''
    if (this.amt.acc.charCodeAt(1) === StartRedirectionSessionReplyStatus.SUCCESS) {
      if (this.amt.acc.length < 13) return ''
      const oemlen = this.amt.acc.charCodeAt(12)
      if (this.amt.acc.length < 13 + oemlen) return ''
      const r = this.amt.acc.substring(0, 13 + oemlen)
      this.amt.acc = this.amt.acc.substring(13 + oemlen)
      return r
    }
  }

  handleAuthenticateSessionReply(): string {
    if (this.amt.acc.length < 9) return ''
    const l = Common.ReadIntX(this.amt.acc, 5)
    if (this.amt.acc.length < 9 + l) return ''
    const authstatus = this.amt.acc.charCodeAt(1)
    const authType = this.amt.acc.charCodeAt(4)

    if (authType === AuthenticationType.DIGEST && authstatus === AuthenticationStatus.FALIURE) {
      // Grab and keep all authentication parameters
      const realmlen = this.amt.acc.charCodeAt(9)
      this.amt.digestRealm = this.amt.acc.substring(10, 10 + realmlen)
      const noncelen = this.amt.acc.charCodeAt(10 + realmlen)
      this.amt.digestNonce = this.amt.acc.substring(11 + realmlen, 11 + realmlen + noncelen)
      const qoplen = this.amt.acc.charCodeAt(11 + realmlen + noncelen)
      this.amt.digestQOP = this.amt.acc.substring(12 + realmlen + noncelen, 12 + realmlen + noncelen + qoplen)
    } else if (authType !== AuthenticationType.QUERY && authstatus === AuthenticationStatus.SUCCESS) {
      // Intel AMT relayed that authentication was succesful, go to direct relay mode in both directions.
      this.ws.direct = true
      this.amt.direct = true
    }

    const r = this.amt.acc.substring(0, 9 + l)
    this.amt.acc = this.amt.acc.substring(9 + l)
    return r
  }

  processBrowserData(data): string {
    this.ws.acc += data // Add data to accumulator
    data = ''
    for (let datalen = -1; datalen !== data.length; ) {
      datalen = data.length
      data += this.processBrowserDataEx()
    } // Process as much data as possible
    return data
  }

  // Process data coming from the Browser in the accumulator
  processBrowserDataEx(): string {
    if (this.ws.acc.length === 0) return ''
    if (this.ws.direct) {
      const data = this.ws.acc
      this.ws.acc = ''
      return data
    } else {
      switch (this.ws.acc.charCodeAt(0)) {
        case RedirectCommands.StartRedirectionSession: {
          return this.handleStartRedirectionSession()
        }
        case RedirectCommands.EndRedirectionSession: {
          return this.handleEndRedirectionSession()
        }
        case RedirectCommands.AuthenticateSession: {
          return this.handleAuthenticateSession()
        }
        default: {
          this.ws.error = true
          return ''
        }
      }
    }
  }

  handleStartRedirectionSession(): string {
    if (this.ws.acc.length < 8) return ''
    const r = this.ws.acc.substring(0, 8)
    this.ws.acc = this.ws.acc.substring(8)
    return r
  }

  handleEndRedirectionSession(): string {
    if (this.ws.acc.length < 4) return ''
    const r = this.ws.acc.substring(0, 4)
    this.ws.acc = this.ws.acc.substring(4)
    return r
  }

  handleAuthenticateSession(): string {
    if (this.ws.acc.length < 9) return ''
    const l = Common.ReadIntX(this.ws.acc, 5)
    if (this.ws.acc.length < 9 + l) return ''

    const authType = this.ws.acc.charCodeAt(4)
    if (authType === AuthenticationType.DIGEST && this.args.user && this.args.pass) {
      const authurl = '/RedirectionService'
      if (this.amt.digestRealm) {
        // Replace this authentication digest with a server created one
        // We have everything we need to authenticate
        const nc = this.ws.authCNonceCount
        this.ws.authCNonceCount++
        const nonceCount = nc.toString(16).padStart(8, '0')
        const digest = Common.ComputeDigesthash(
          this.args.user,
          this.args.pass,
          this.amt.digestRealm,
          'POST',
          authurl,
          this.amt.digestQOP,
          this.amt.digestNonce,
          nonceCount,
          this.ws.authCNonce
        )

        // Replace this authentication digest with a server created one
        // We have everything we need to authenticate
        let r = String.fromCharCode(0x13, 0x00, 0x00, 0x00, 0x04)
        r += Common.IntToStrX(
          this.args.user.length +
            this.amt.digestRealm.length +
            this.amt.digestNonce.length +
            authurl.length +
            this.ws.authCNonce.length +
            nonceCount.length +
            digest.length +
            this.amt.digestQOP.length +
            8
        )
        r += String.fromCharCode(this.args.user.length) // Username Length
        r += this.args.user // Username
        r += String.fromCharCode(this.amt.digestRealm.length) // Realm Length
        r += this.amt.digestRealm // Realm
        r += String.fromCharCode(this.amt.digestNonce.length) // Nonce Length
        r += this.amt.digestNonce // Nonce
        r += String.fromCharCode(authurl.length) // Authentication URL "/RedirectionService" Length
        r += authurl // Authentication URL
        r += String.fromCharCode(this.ws.authCNonce.length) // CNonce Length
        r += this.ws.authCNonce // CNonce
        r += String.fromCharCode(nonceCount.length) // NonceCount Length
        r += nonceCount // NonceCount
        r += String.fromCharCode(digest.length) // Response Length
        r += digest // Response
        r += String.fromCharCode(this.amt.digestQOP.length) // QOP Length
        r += this.amt.digestQOP // QOP

        this.ws.acc = this.ws.acc.substring(9 + l) // Don't relay the original message
        return r
      } else {
        // Replace this authentication digest with a server created one
        // Since we don't have authentication parameters, fill them in with blanks to get an error back what that info.
        let r = String.fromCharCode(0x13, 0x00, 0x00, 0x00, 0x04)
        r += Common.IntToStrX(this.args.user.length + authurl.length + 8)
        r += String.fromCharCode(this.args.user.length)
        r += this.args.user
        r += String.fromCharCode(0x00, 0x00, authurl.length)
        r += authurl
        r += String.fromCharCode(0x00, 0x00, 0x00, 0x00)
        this.ws.acc = this.ws.acc.substring(9 + l) // Don't relay the original message
        return r
      }
    }

    const r = this.ws.acc.substring(0, 9 + l)
    this.ws.acc = this.ws.acc.substring(9 + l)
    return r
  }
}
