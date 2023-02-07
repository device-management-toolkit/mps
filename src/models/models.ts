/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type Socket } from 'net'
import { type DetailedPeerCertificate, type TLSSocket } from 'tls'
import { type CIRAChannel } from '../amt/CIRAChannel'
import type WebSocket from 'ws'

export interface Device {
  connectionStatus: boolean
  mpsInstance: string
  hostname: string
  guid: string
  mpsusername: string
  tags: string[]
  tenantId: string
  friendlyName: string
  dnsSuffix: string
}
export type Credentials = Record<string, AMTCredential>
export interface AMTCredential {
  name: string
  mpsuser: string
  mpspass: string
  amtuser: string
  amtpass: string
}
export type eventType = 'request' | 'success' | 'fail'
export interface OpenAMTEvent {
  type: eventType
  message: string
  methods: string[]
  guid: string
  timestamp: number
}

export interface CIRASocket extends TLSSocket {
  tag?: {
    id: string
    first: boolean
    clientCert?: DetailedPeerCertificate
    accumulator: string
    activetunnels: number
    boundPorts: number[]
    socket: Socket
    host: string
    nextchannelid: number
    channels: Record<string, CIRAChannel>
    nextsourceport: number
    nodeid: string
    SystemId?: string // same as nodeid?
    MajorVersion?: number
    MinorVersion?: number
    certauth?: string
  }
}
export interface HealthCheck {
  db: HealthCheckStatus
  secretStore: HealthCheckStatus
}
export interface HealthCheckStatus {
  name: string
  status: any
}

export interface WebSocketExt extends WebSocket {
  _socket: Socket
  forwardclient?: any
  interceptor: Interceptor
}

export interface Interceptor {
  processAmtData: (data: any) => any
  processBrowserData: (data: any) => any
}

export enum AmtMode {
  HEADER = 0,
  LENGTHBODY = 1,
  CHUNKEDBODY = 2,
  UNTILCLOSE = 3
}

export enum ConnectionType {
  AMT = 0,
  WS = 1
}

export interface Connection {
  type: ConnectionType
  mode: AmtMode
  acc: string
  directive?: string[]
  count: number
  headers?: any
  authCNonceCount?: number
  authCNonce?: string
  error: boolean
  direct?: boolean
  digestRealm?: string
  digestNonce?: string
  digestQOP?: string
}

export interface Args {
  host?: string
  port?: number
  user: string
  pass: string
}

export interface DeviceSecrets {
  AMT_PASSWORD: string
  MEBX_PASSWORD?: string
  MPS_PASSWORD?: string
}
