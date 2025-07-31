/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type Socket } from 'node:net'
import { type DetailedPeerCertificate, type TLSSocket } from 'node:tls'
import { type CIRAChannel } from '../amt/CIRAChannel.js'
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
  lastConnected?: Date
  lastSeen?: Date
  lastDisconnected?: Date
  deviceInfo?: DeviceInfo
}
export interface DeviceInfo {
  fwVersion: string
  fwBuild: string
  fwSku: string
  currentMode: string
  features: string
  ipAddress: string
  lastUpdated: Date
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

export interface AMTCertificate {
  ElementName: string
  InstanceID: string
  X509Certificate: string
  TrustedRootCertificate: boolean
  Issuer: string
  Subject: string
  ReadOnlyCertificate: boolean
  PublicKeyHandle: string
  AssociatedProfiles?: string[]
}

export interface AMTPublicKeyCertificateResponse {
  AMT_PublicKeyCertificate?: AMTCertificate | AMTCertificate[]
}

export interface AMTPublicPrivateKeyPair {
  ElementName: string
  InstanceID: string
  DERKey: string
  CertificateHandle?: string
}

export interface AMTPublicPrivateKeyPairResponse {
  AMT_PublicPrivateKeyPair?: AMTPublicPrivateKeyPair | AMTPublicPrivateKeyPair[]
}

export interface Certificates {
  ConcreteDependencyResponse: any
  PublicKeyCertificateResponse: AMTPublicKeyCertificateResponse
  PublicPrivateKeyPairResponse: AMTPublicPrivateKeyPairResponse
  CIMCredentialContextResponse: any
}

export interface SecuritySettings {
  certificates: {
    publicKeyCertificateItems: CertificateItem[]
  }
  publicKeys: {
    publicPrivateKeyPairItems: PublicPrivateKeyPairItem[]
  }
  profileAssociation: ProfileAssociation[]
}

export interface CertificateItem {
  elementName: string
  instanceID: string
  x509Certificate: string
  trustedRootCertificate?: boolean
  issuer: string
  subject: string
  readOnlyCertificate: boolean
  publicKeyHandle?: string
  associatedProfiles: string[]
  displayName: string
}

export interface PublicPrivateKeyPairItem {
  elementName: string
  instanceID: string
  derKey: string
  certificateHandle?: string
}
export interface ProfileAssociation {
  type: string
  profileID: string
  rootCertificate?: CertificateItem
  clientCertificate?: CertificateItem
  publicKey?: PublicPrivateKeyPairItem
}
export interface CertificatesDTO {
  keyManagementItems: PublicPrivateKeyPairItem[]
  publicKeyCertificateItems: CertificateItem[]
}

export interface KeyPairsDTO {
  publicPrivateKeyPairItems: PublicPrivateKeyPairItem[]
}

export interface OCRData {
  bootService: any
  bootSourceSettings: any
  capabilities: any
  bootData: any
}
export interface BootSettingResult {
  isHTTPSBootExists: boolean
  isPBAExists: boolean
  isWinREExists: boolean
}

export interface OCRProcessResult {
  WinREBootSupported: boolean
  LocalPBABootSupported: boolean
  HTTPSBootSupported: boolean
  OCR: boolean
}
