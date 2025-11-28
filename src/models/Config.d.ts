/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import type forge from 'node-forge'

export interface configType {
  common_name: string
  port: number
  country: string
  company: string
  organization?: string
  listen_any: boolean
  https?: boolean
  web_port: number
  generate_certificates: boolean
  secrets_path?: string
  secrets_provider: string
  data_path?: string
  cert_path: string
  cert_format: string
  vault_address?: string
  vault_token?: string
  mqtt_address?: string
  jwt_secret: string
  jwt_issuer: string
  jwt_expiration: number
  web_admin_user: string
  web_admin_password: string
  mps_tls_config: any
  web_tls_config: any
  tls_cert: string
  tls_cert_key: string
  tls_cert_ca: string
  web_tls_cert: string
  web_tls_cert_key: string
  web_tls_cert_ca: string
  db_provider: string
  connection_string: string
  instance_name: string
  redirection_expiration_time: number
  web_auth_enabled: boolean
  jwt_token_header: string
  jwt_tenant_property: string
  consul_enabled: boolean
  consul_host: string
  consul_port: string
  consul_key_prefix: string
  cira_last_seen: boolean
  timeout_ms_default: string
  cira_window_size: number
  mps_cert_key_size?: number
}

export interface certificatesType {
  mps_tls_config: mpsConfigType
  web_tls_config: webConfigType
  root_key?: string
}

export interface mpsConfigType {
  cert: string
  key: string
  minVersion: any
  secureOptions?: any
  requestCert: boolean
  rejectUnauthorized: boolean
  ciphers: any
}

export interface webConfigType {
  ca: string[] | string
  cert: string
  key: string
  secureOptions?: any
}

export interface certAndKeyType {
  cert: forge.pki.Certificate
  key: forge.pki.PrivateKey
}

export interface apiResponseType {
  statuscode: number
  payload: any
}

export interface queryParams {
  host: string
  port: number
  p: number
  tls: number
  tls1only: number
  mode: string
}

export class DataWithCount {
  data: any[]
  totalCount: number
}
