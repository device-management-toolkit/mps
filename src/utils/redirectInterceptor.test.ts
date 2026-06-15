/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { vi } from 'vitest'
import { AmtMode, type Args, type Connection, ConnectionType } from '../models/models.js'
import { config } from '../test/helper/config.js'
import Common from './common.js'
import { Environment } from './Environment.js'
import {
  AuthenticationStatus,
  AuthenticationType,
  RedirectCommands,
  RedirectInterceptor,
  StartRedirectionSessionReplyStatus
} from './redirectInterceptor.js'
Environment.Config = config

let interceptor: RedirectInterceptor = null

const args: Args = {
  user: 'admin',
  pass: 'P@ssw0rd',
  host: 'localhost',
  port: 1234
}

beforeEach(() => {
  interceptor = new RedirectInterceptor(args)
})

afterEach(() => {
  vi.clearAllMocks()
  interceptor = null
})

test('processAmtData test', () => {
  vi.spyOn(interceptor, 'processAmtDataEx').mockReturnValueOnce('mockResult')
  const result = interceptor.processAmtData('input')
  expect(result).toBe('mockResult')
})

test('processAmtDataEx empty acc', () => {
  const connection: Connection = {
    type: ConnectionType.AMT,
    mode: AmtMode.HEADER,
    acc: '',
    directive: null,
    count: 0,
    headers: null,
    authCNonceCount: 0,
    authCNonce: '',
    error: false,
    direct: false,
    digestRealm: '',
    digestNonce: '',
    digestQOP: ''
  }

  interceptor.amt = connection
  vi.spyOn(interceptor, 'handleStartRedirectionSessionReply').mockReturnValueOnce('handleStartRedirectionSessionReply')
  vi.spyOn(interceptor, 'handleAuthenticateSessionReply').mockReturnValueOnce('handleAuthenticateSessionReply')

  const result = interceptor.processAmtDataEx()
  expect(result).toBe('')
})

test('processAmtDataEx direct mode', () => {
  const connection: Connection = {
    type: ConnectionType.AMT,
    mode: AmtMode.HEADER,
    acc: 'abcdefghij1234567890',
    directive: null,
    count: 0,
    headers: null,
    authCNonceCount: 0,
    authCNonce: '',
    error: false,
    direct: true,
    digestRealm: '',
    digestNonce: '',
    digestQOP: ''
  }

  interceptor.amt = connection
  vi.spyOn(interceptor, 'handleStartRedirectionSessionReply').mockReturnValueOnce('handleStartRedirectionSessionReply')
  vi.spyOn(interceptor, 'handleAuthenticateSessionReply').mockReturnValueOnce('handleAuthenticateSessionReply')

  const result = interceptor.processAmtDataEx()
  expect(result).toBe('abcdefghij1234567890')
  expect(connection.acc).toBe('')
})

test('processAmtDataEx StartRedirectionSessionReply mode', () => {
  const connection: Connection = {
    type: ConnectionType.AMT,
    mode: AmtMode.HEADER,
    acc: String.fromCharCode(RedirectCommands.StartRedirectionSessionReply),
    directive: null,
    count: 0,
    headers: null,
    authCNonceCount: 0,
    authCNonce: '',
    error: false,
    direct: false,
    digestRealm: '',
    digestNonce: '',
    digestQOP: ''
  }

  interceptor.amt = connection
  vi.spyOn(interceptor, 'handleStartRedirectionSessionReply').mockReturnValueOnce('handleStartRedirectionSessionReply')
  vi.spyOn(interceptor, 'handleAuthenticateSessionReply').mockReturnValueOnce('handleAuthenticateSessionReply')

  const result = interceptor.processAmtDataEx()
  expect(result).toBe('handleStartRedirectionSessionReply')
})

test('processAmtDataEx AuthenticateSessionReply mode', () => {
  const connection: Connection = {
    type: ConnectionType.AMT,
    mode: AmtMode.HEADER,
    acc: String.fromCharCode(RedirectCommands.AuthenticateSessionReply),
    directive: null,
    count: 0,
    headers: null,
    authCNonceCount: 0,
    authCNonce: '',
    error: false,
    direct: false,
    digestRealm: '',
    digestNonce: '',
    digestQOP: ''
  }

  interceptor.amt = connection
  vi.spyOn(interceptor, 'handleStartRedirectionSessionReply').mockReturnValueOnce('handleStartRedirectionSessionReply')
  vi.spyOn(interceptor, 'handleAuthenticateSessionReply').mockReturnValueOnce('handleAuthenticateSessionReply')

  const result = interceptor.processAmtDataEx()
  expect(result).toBe('handleAuthenticateSessionReply')
})

test('processAmtDataEx error condition', () => {
  const connection: Connection = {
    type: ConnectionType.AMT,
    mode: AmtMode.HEADER,
    acc: '99',
    directive: null,
    count: 0,
    headers: null,
    authCNonceCount: 0,
    authCNonce: '',
    error: false,
    direct: false,
    digestRealm: '',
    digestNonce: '',
    digestQOP: ''
  }

  interceptor.amt = connection
  vi.spyOn(interceptor, 'handleStartRedirectionSessionReply').mockReturnValueOnce('handleStartRedirectionSessionReply')
  vi.spyOn(interceptor, 'handleAuthenticateSessionReply').mockReturnValueOnce('handleAuthenticateSessionReply')

  const result = interceptor.processAmtDataEx()
  expect(result).toBe('')
  expect(connection.error).toBeTruthy()
})

test('handleStartRedirectionSessionReply redirect success acc length short check', () => {
  const connection: Connection = {
    type: ConnectionType.AMT,
    mode: AmtMode.HEADER,
    acc: `0${String.fromCharCode(StartRedirectionSessionReplyStatus.SUCCESS)}00000`,
    directive: null,
    count: 0,
    headers: null,
    authCNonceCount: 0,
    authCNonce: '',
    error: false,
    direct: false,
    digestRealm: '',
    digestNonce: '',
    digestQOP: ''
  }

  interceptor.amt = connection

  const result = interceptor.handleStartRedirectionSessionReply()
  expect(result).toBe('')
})

test('handleStartRedirectionSessionReply StartRedirectionSessionReplyStatus not SUCCESS', () => {
  const connection: Connection = {
    type: ConnectionType.AMT,
    mode: AmtMode.HEADER,
    acc: `0${String.fromCharCode(StartRedirectionSessionReplyStatus.BUSY)}000000000000`,
    directive: null,
    count: 0,
    headers: null,
    authCNonceCount: 0,
    authCNonce: '',
    error: false,
    direct: false,
    digestRealm: '',
    digestNonce: '',
    digestQOP: ''
  }

  interceptor.amt = connection

  const result = interceptor.handleStartRedirectionSessionReply()
  expect(result).toBeUndefined()
})

test('handleStartRedirectionSessionReply acc length check', () => {
  const connection: Connection = {
    type: ConnectionType.AMT,
    mode: AmtMode.HEADER,
    acc: `0${String.fromCharCode(StartRedirectionSessionReplyStatus.SUCCESS)}0000000000${String.fromCharCode(20)}`,
    directive: null,
    count: 0,
    headers: null,
    authCNonceCount: 0,
    authCNonce: '',
    error: false,
    direct: false,
    digestRealm: '',
    digestNonce: '',
    digestQOP: ''
  }

  interceptor.amt = connection

  const result = interceptor.handleStartRedirectionSessionReply()
  expect(result).toBe('')
})

test('handleStartRedirectionSessionReply short acc', () => {
  const connection: Connection = {
    type: ConnectionType.AMT,
    mode: AmtMode.HEADER,
    acc: '000',
    directive: null,
    count: 0,
    headers: null,
    authCNonceCount: 0,
    authCNonce: '',
    error: false,
    direct: false,
    digestRealm: '',
    digestNonce: '',
    digestQOP: ''
  }

  interceptor.amt = connection

  const result = interceptor.handleStartRedirectionSessionReply()
  expect(result).toBe('')
})

test('handleStartRedirectionSessionReply test', () => {
  const connection: Connection = {
    type: ConnectionType.AMT,
    mode: AmtMode.HEADER,
    acc: `0${String.fromCharCode(StartRedirectionSessionReplyStatus.SUCCESS)}123456789A${String.fromCharCode(0)}`,
    directive: null,
    count: 0,
    headers: null,
    authCNonceCount: 0,
    authCNonce: '',
    error: false,
    direct: false,
    digestRealm: '',
    digestNonce: '',
    digestQOP: ''
  }

  interceptor.amt = connection

  const result = interceptor.handleStartRedirectionSessionReply()
  expect(result).toBe(
    `0${String.fromCharCode(StartRedirectionSessionReplyStatus.SUCCESS)}123456789A${String.fromCharCode(0)}`
  )
  expect(connection.acc).toBe('')
})

test('handleAuthenticateSessionReply short acc length', () => {
  const connection: Connection = {
    type: ConnectionType.AMT,
    mode: AmtMode.HEADER,
    acc: '01234567',
    directive: null,
    count: 0,
    headers: null,
    authCNonceCount: 0,
    authCNonce: '',
    error: false,
    direct: false,
    digestRealm: '',
    digestNonce: '',
    digestQOP: ''
  }

  interceptor.amt = connection

  const result = interceptor.handleAuthenticateSessionReply()
  expect(result).toBe('')
  expect(connection.acc).toBe('01234567')
})

test('handleAuthenticateSessionReply short acc length 2', () => {
  const connection: Connection = {
    type: ConnectionType.AMT,
    mode: AmtMode.HEADER,
    acc: '0123456789',
    directive: null,
    count: 0,
    headers: null,
    authCNonceCount: 0,
    authCNonce: '',
    error: false,
    direct: false,
    digestRealm: '',
    digestNonce: '',
    digestQOP: ''
  }

  interceptor.amt = connection

  const result = interceptor.handleAuthenticateSessionReply()
  expect(result).toBe('')
  expect(connection.acc).toBe('0123456789')
})

test('handleAuthenticateSessionReply DIGEST auth FALIURE status', () => {
  const connection: Connection = {
    type: ConnectionType.AMT,
    mode: AmtMode.HEADER,
    acc: `0${String.fromCharCode(AuthenticationStatus.FALIURE)}00${String.fromCharCode(AuthenticationType.DIGEST)}AAAA${String.fromCharCode(2)}AA${String.fromCharCode(5)}AAAAA${String.fromCharCode(4)}AAAAAAAAA`,
    directive: null,
    count: 0,
    headers: null,
    authCNonceCount: 0,
    authCNonce: '',
    error: false,
    direct: false,
    digestRealm: '',
    digestNonce: '',
    digestQOP: ''
  }

  interceptor.amt = connection

  vi.spyOn(Common, 'ReadIntX').mockReturnValueOnce(0)

  const result = interceptor.handleAuthenticateSessionReply()
  expect(result).toBe(
    `0${String.fromCharCode(AuthenticationStatus.FALIURE)}00${String.fromCharCode(AuthenticationType.DIGEST)}AAAA`
  )
  expect(interceptor.amt.acc).toBe(
    `${String.fromCharCode(2)}AA${String.fromCharCode(5)}AAAAA${String.fromCharCode(4)}AAAAAAAAA`
  )
  expect(interceptor.amt.digestRealm).toBe('AA')
  expect(interceptor.amt.digestNonce).toBe('AAAAA')
  expect(interceptor.amt.digestQOP).toBe('AAAA')
})

test('handleAuthenticateSessionReply auth SUCCESS', () => {
  const connection: Connection = {
    type: ConnectionType.AMT,
    mode: AmtMode.HEADER,
    acc: `0${String.fromCharCode(AuthenticationStatus.SUCCESS)}00${String.fromCharCode(AuthenticationType.DIGEST)}AAAA${String.fromCharCode(2)}AA${String.fromCharCode(5)}AAAAA${String.fromCharCode(4)}AAAAAAAAA`,
    directive: null,
    count: 0,
    headers: null,
    authCNonceCount: 0,
    authCNonce: '',
    error: false,
    direct: false,
    digestRealm: '',
    digestNonce: '',
    digestQOP: ''
  }

  interceptor.amt = connection

  vi.spyOn(Common, 'ReadIntX').mockReturnValueOnce(0)

  const result = interceptor.handleAuthenticateSessionReply()

  expect(result).toBe(
    `0${String.fromCharCode(AuthenticationStatus.SUCCESS)}00${String.fromCharCode(AuthenticationType.DIGEST)}AAAA`
  )
  expect(interceptor.amt.acc).toBe(
    `${String.fromCharCode(2)}AA${String.fromCharCode(5)}AAAAA${String.fromCharCode(4)}AAAAAAAAA`
  )
  expect(interceptor.amt.direct).toBeTruthy()
  expect(interceptor.ws.direct).toBeTruthy()
})

test('processBrowserData', () => {
  vi.spyOn(interceptor, 'processBrowserDataEx').mockReturnValueOnce('mock output')

  const result = interceptor.processBrowserData('input')
  expect(result).toBe('mock output')
})

test('processBrowserDataEx empty acc', () => {
  const connection: Connection = {
    type: ConnectionType.WS,
    mode: AmtMode.HEADER,
    acc: '',
    directive: null,
    count: 0,
    headers: null,
    authCNonceCount: 0,
    authCNonce: '',
    error: false,
    direct: false,
    digestRealm: '',
    digestNonce: '',
    digestQOP: ''
  }

  interceptor.ws = connection
  vi.spyOn(interceptor, 'handleStartRedirectionSession').mockReturnValueOnce('handleStartRedirectionSession')
  vi.spyOn(interceptor, 'handleEndRedirectionSession').mockReturnValueOnce('handleEndRedirectionSession')
  vi.spyOn(interceptor, 'handleAuthenticateSession').mockReturnValueOnce('handleAuthenticateSession')

  const result = interceptor.processBrowserDataEx()
  expect(result).toBe('')
})

test('processBrowserDataEx direct mode', () => {
  const connection: Connection = {
    type: ConnectionType.WS,
    mode: AmtMode.HEADER,
    acc: '1234567890',
    directive: null,
    count: 0,
    headers: null,
    authCNonceCount: 0,
    authCNonce: '',
    error: false,
    direct: true,
    digestRealm: '',
    digestNonce: '',
    digestQOP: ''
  }

  interceptor.ws = connection
  vi.spyOn(interceptor, 'handleStartRedirectionSession').mockReturnValueOnce('handleStartRedirectionSession')
  vi.spyOn(interceptor, 'handleEndRedirectionSession').mockReturnValueOnce('handleEndRedirectionSession')
  vi.spyOn(interceptor, 'handleAuthenticateSession').mockReturnValueOnce('handleAuthenticateSession')

  const result = interceptor.processBrowserDataEx()
  expect(result).toBe('1234567890')
  expect(interceptor.ws.acc).toBe('')
})

test('processBrowserDataEx handleStartRedirectionSession', () => {
  const connection: Connection = {
    type: ConnectionType.WS,
    mode: AmtMode.HEADER,
    acc: `${String.fromCharCode(RedirectCommands.StartRedirectionSession)}1234567890`,
    directive: null,
    count: 0,
    headers: null,
    authCNonceCount: 0,
    authCNonce: '',
    error: false,
    direct: false,
    digestRealm: '',
    digestNonce: '',
    digestQOP: ''
  }

  interceptor.ws = connection
  vi.spyOn(interceptor, 'handleStartRedirectionSession').mockReturnValueOnce('handleStartRedirectionSession')
  vi.spyOn(interceptor, 'handleEndRedirectionSession').mockReturnValueOnce('handleEndRedirectionSession')
  vi.spyOn(interceptor, 'handleAuthenticateSession').mockReturnValueOnce('handleAuthenticateSession')

  const result = interceptor.processBrowserDataEx()
  expect(result).toBe('handleStartRedirectionSession')
})

test('processBrowserDataEx handleEndRedirectionSession', () => {
  const connection: Connection = {
    type: ConnectionType.WS,
    mode: AmtMode.HEADER,
    acc: `${String.fromCharCode(RedirectCommands.EndRedirectionSession)}1234567890`,
    directive: null,
    count: 0,
    headers: null,
    authCNonceCount: 0,
    authCNonce: '',
    error: false,
    direct: false,
    digestRealm: '',
    digestNonce: '',
    digestQOP: ''
  }

  interceptor.ws = connection
  vi.spyOn(interceptor, 'handleStartRedirectionSession').mockReturnValueOnce('handleStartRedirectionSession')
  vi.spyOn(interceptor, 'handleEndRedirectionSession').mockReturnValueOnce('handleEndRedirectionSession')
  vi.spyOn(interceptor, 'handleAuthenticateSession').mockReturnValueOnce('handleAuthenticateSession')

  const result = interceptor.processBrowserDataEx()
  expect(result).toBe('handleEndRedirectionSession')
})

test('processBrowserDataEx handleAuthenticateSession ', () => {
  const connection: Connection = {
    type: ConnectionType.WS,
    mode: AmtMode.HEADER,
    acc: `${String.fromCharCode(RedirectCommands.AuthenticateSession)}1234567890`,
    directive: null,
    count: 0,
    headers: null,
    authCNonceCount: 0,
    authCNonce: '',
    error: false,
    direct: false,
    digestRealm: '',
    digestNonce: '',
    digestQOP: ''
  }

  interceptor.ws = connection
  vi.spyOn(interceptor, 'handleStartRedirectionSession').mockReturnValueOnce('handleStartRedirectionSession')
  vi.spyOn(interceptor, 'handleEndRedirectionSession').mockReturnValueOnce('handleEndRedirectionSession')
  vi.spyOn(interceptor, 'handleAuthenticateSession').mockReturnValueOnce('handleAuthenticateSession')

  const result = interceptor.processBrowserDataEx()
  expect(result).toBe('handleAuthenticateSession')
})

test('processBrowserDataEx error condition', () => {
  const connection: Connection = {
    type: ConnectionType.WS,
    mode: AmtMode.HEADER,
    acc: `${String.fromCharCode(99)}1234567890`,
    directive: null,
    count: 0,
    headers: null,
    authCNonceCount: 0,
    authCNonce: '',
    error: false,
    direct: false,
    digestRealm: '',
    digestNonce: '',
    digestQOP: ''
  }

  interceptor.ws = connection
  vi.spyOn(interceptor, 'handleStartRedirectionSession').mockReturnValueOnce('handleStartRedirectionSession')
  vi.spyOn(interceptor, 'handleEndRedirectionSession').mockReturnValueOnce('handleEndRedirectionSession')
  vi.spyOn(interceptor, 'handleAuthenticateSession').mockReturnValueOnce('handleAuthenticateSession')

  const result = interceptor.processBrowserDataEx()
  expect(result).toBe('')
  expect(interceptor.ws.error).toBeTruthy()
})

test('handleStartRedirectionSession acc length short', () => {
  const connection: Connection = {
    type: ConnectionType.WS,
    mode: AmtMode.HEADER,
    acc: '1234567',
    directive: null,
    count: 0,
    headers: null,
    authCNonceCount: 0,
    authCNonce: '',
    error: false,
    direct: false,
    digestRealm: '',
    digestNonce: '',
    digestQOP: ''
  }

  interceptor.ws = connection

  const result = interceptor.handleStartRedirectionSession()
  expect(result).toBe('')
})

test('handleStartRedirectionSession without acc data', () => {
  const connection: Connection = {
    type: ConnectionType.WS,
    mode: AmtMode.HEADER,
    acc: '12345678',
    directive: null,
    count: 0,
    headers: null,
    authCNonceCount: 0,
    authCNonce: '',
    error: false,
    direct: false,
    digestRealm: '',
    digestNonce: '',
    digestQOP: ''
  }

  interceptor.ws = connection

  const result = interceptor.handleStartRedirectionSession()
  expect(result).toBe('12345678')
  expect(interceptor.ws.acc).toBe('')
})

test('handleStartRedirectionSession with acc data', () => {
  const connection: Connection = {
    type: ConnectionType.WS,
    mode: AmtMode.HEADER,
    acc: '123456789',
    directive: null,
    count: 0,
    headers: null,
    authCNonceCount: 0,
    authCNonce: '',
    error: false,
    direct: false,
    digestRealm: '',
    digestNonce: '',
    digestQOP: ''
  }

  interceptor.ws = connection

  const result = interceptor.handleStartRedirectionSession()
  expect(result).toBe('12345678')
  expect(interceptor.ws.acc).toBe('9')
})

test('handleEndRedirectionSession acc short length', () => {
  const connection: Connection = {
    type: ConnectionType.WS,
    mode: AmtMode.HEADER,
    acc: '123',
    directive: null,
    count: 0,
    headers: null,
    authCNonceCount: 0,
    authCNonce: '',
    error: false,
    direct: false,
    digestRealm: '',
    digestNonce: '',
    digestQOP: ''
  }

  interceptor.ws = connection

  const result = interceptor.handleEndRedirectionSession()
  expect(result).toBe('')
})

test('handleEndRedirectionSession empty acc', () => {
  const connection: Connection = {
    type: ConnectionType.WS,
    mode: AmtMode.HEADER,
    acc: '1234',
    directive: null,
    count: 0,
    headers: null,
    authCNonceCount: 0,
    authCNonce: '',
    error: false,
    direct: false,
    digestRealm: '',
    digestNonce: '',
    digestQOP: ''
  }

  interceptor.ws = connection

  const result = interceptor.handleEndRedirectionSession()
  expect(result).toBe('1234')
  expect(interceptor.ws.acc).toBe('')
})

test('handleEndRedirectionSession with acc data', () => {
  const connection: Connection = {
    type: ConnectionType.WS,
    mode: AmtMode.HEADER,
    acc: '123456789',
    directive: null,
    count: 0,
    headers: null,
    authCNonceCount: 0,
    authCNonce: '',
    error: false,
    direct: false,
    digestRealm: '',
    digestNonce: '',
    digestQOP: ''
  }

  interceptor.ws = connection

  const result = interceptor.handleEndRedirectionSession()
  expect(result).toBe('1234')
  expect(interceptor.ws.acc).toBe('56789')
})

test('handleAuthenticateSession short length acc', () => {
  const connection: Connection = {
    type: ConnectionType.WS,
    mode: AmtMode.HEADER,
    acc: '1234',
    directive: null,
    count: 0,
    headers: null,
    authCNonceCount: 0,
    authCNonce: '',
    error: false,
    direct: false,
    digestRealm: '',
    digestNonce: '',
    digestQOP: ''
  }

  interceptor.ws = connection

  const result = interceptor.handleAuthenticateSession()
  expect(result).toBe('')
})

test('handleAuthenticateSession short length acc 2', () => {
  const connection: Connection = {
    type: ConnectionType.WS,
    mode: AmtMode.HEADER,
    acc: '123456789',
    directive: null,
    count: 0,
    headers: null,
    authCNonceCount: 0,
    authCNonce: '',
    error: false,
    direct: false,
    digestRealm: '',
    digestNonce: '',
    digestQOP: ''
  }

  interceptor.ws = connection

  vi.spyOn(Common, 'ReadIntX').mockReturnValueOnce(1)

  const result = interceptor.handleAuthenticateSession()
  expect(result).toBe('')
})

test('handleAuthenticateSession DIGEST with user, pass and digestRealm', () => {
  const amt: Connection = {
    type: ConnectionType.AMT,
    mode: AmtMode.HEADER,
    acc: `1234${String.fromCharCode(AuthenticationType.DIGEST)}56789`,
    directive: null,
    count: 0,
    headers: null,
    authCNonceCount: 0,
    authCNonce: '',
    error: false,
    direct: false,
    digestRealm: 'digestRealm1',
    digestNonce: '',
    digestQOP: ''
  }

  const ws: Connection = {
    type: ConnectionType.WS,
    mode: AmtMode.HEADER,
    acc: `1234${String.fromCharCode(AuthenticationType.DIGEST)}56789`,
    directive: null,
    count: 0,
    headers: null,
    authCNonceCount: 0,
    authCNonce: '',
    error: false,
    direct: false,
    digestRealm: 'digestRealm1',
    digestNonce: '',
    digestQOP: ''
  }

  interceptor.amt = amt
  interceptor.ws = ws

  vi.spyOn(Common, 'ReadIntX').mockReturnValueOnce(1)
  vi.spyOn(Common, 'ComputeDigesthash').mockReturnValueOnce('digest')

  const authurl = '/RedirectionService'
  const nc = ws.authCNonceCount
  const ncs = nc.toString(16).padStart(8, '0')
  const digest = 'digest'

  let r = String.fromCharCode(0x13, 0x00, 0x00, 0x00, 0x04)
  r += Common.IntToStrX(
    args.user.length +
      amt.digestRealm.length +
      amt.digestNonce.length +
      authurl.length +
      ws.authCNonce.length +
      ncs.length +
      digest.length +
      amt.digestQOP.length +
      8
  )
  r += String.fromCharCode(args.user.length) // Username Length
  r += args.user // Username
  r += String.fromCharCode(amt.digestRealm.length) // Realm Length
  r += amt.digestRealm // Realm
  r += String.fromCharCode(amt.digestNonce.length) // Nonce Length
  r += amt.digestNonce // Nonce
  r += String.fromCharCode(authurl.length) // Authentication URL "/RedirectionService" Length
  r += authurl // Authentication URL
  r += String.fromCharCode(ws.authCNonce.length) // CNonce Length
  r += ws.authCNonce // CNonce
  r += String.fromCharCode(ncs.length) // NonceCount Length
  r += ncs // NonceCount
  r += String.fromCharCode(digest.length) // Response Length
  r += digest // Response
  r += String.fromCharCode(amt.digestQOP.length) // QOP Length
  r += amt.digestQOP // QOP

  const result = interceptor.handleAuthenticateSession()
  expect(result).toBe(r)
  expect(ws.acc).toBe('')
  expect(ws.authCNonceCount).toBe(nc + 1)
})

test('handleAuthenticateSession DIGEST with user, pass and digestRealm 2', () => {
  const amt: Connection = {
    type: ConnectionType.AMT,
    mode: AmtMode.HEADER,
    acc: `1234${String.fromCharCode(AuthenticationType.DIGEST)}56789`,
    directive: null,
    count: 0,
    headers: null,
    authCNonceCount: 0,
    authCNonce: '',
    error: false,
    direct: false,
    digestRealm: '',
    digestNonce: '',
    digestQOP: ''
  }

  const ws: Connection = {
    type: ConnectionType.WS,
    mode: AmtMode.HEADER,
    acc: `1234${String.fromCharCode(AuthenticationType.DIGEST)}56789`,
    directive: null,
    count: 0,
    headers: null,
    authCNonceCount: 0,
    authCNonce: '',
    error: false,
    direct: false,
    digestRealm: '',
    digestNonce: '',
    digestQOP: ''
  }

  interceptor.amt = amt
  interceptor.ws = ws

  vi.spyOn(Common, 'ReadIntX').mockReturnValueOnce(1)

  const authurl = '/RedirectionService'

  let r = String.fromCharCode(0x13, 0x00, 0x00, 0x00, 0x04)
  r += Common.IntToStrX(args.user.length + authurl.length + 8)
  r += String.fromCharCode(args.user.length)
  r += args.user
  r += String.fromCharCode(0x00, 0x00, authurl.length)
  r += authurl
  r += String.fromCharCode(0x00, 0x00, 0x00, 0x00)

  const result = interceptor.handleAuthenticateSession()
  expect(result).toBe(r)
  expect(ws.acc).toBe('')
})

test('handleAuthenticateSession w/o DIGEST', () => {
  const amt: Connection = {
    type: ConnectionType.AMT,
    mode: AmtMode.HEADER,
    acc: `1234${String.fromCharCode(AuthenticationType.DIGEST)}56789`,
    directive: null,
    count: 0,
    headers: null,
    authCNonceCount: 0,
    authCNonce: '',
    error: false,
    direct: false,
    digestRealm: '',
    digestNonce: '',
    digestQOP: ''
  }

  const ws: Connection = {
    type: ConnectionType.WS,
    mode: AmtMode.HEADER,
    acc: `1234${String.fromCharCode(AuthenticationType.BADDIGEST)}56789`,
    directive: null,
    count: 0,
    headers: null,
    authCNonceCount: 0,
    authCNonce: '',
    error: false,
    direct: false,
    digestRealm: '',
    digestNonce: '',
    digestQOP: ''
  }

  interceptor.amt = amt
  interceptor.ws = ws

  vi.spyOn(Common, 'ReadIntX').mockReturnValueOnce(1)

  const result = interceptor.handleAuthenticateSession()
  expect(result).toBe(`1234${String.fromCharCode(AuthenticationType.BADDIGEST)}56789`)
  expect(ws.acc).toBe('')
})
