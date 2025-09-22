/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type configType } from '../../models/Config.js'

// Parsing configuration
export const config: configType = {
  common_name: 'localhost',
  port: 4433,
  country: 'US',
  company: 'NoCorp',
  listen_any: true,
  web_port: 3000,
  generate_certificates: true,
  web_admin_user: '',
  web_admin_password: '',
  web_auth_enabled: true,
  vault_address: 'http://localhost:8200',
  vault_token: 'myroot',
  mqtt_address: '',
  secrets_path: 'secret/data/',
  secrets_provider: 'vault',
  cert_format: 'file',
  jwt_secret: 'supersecret',
  jwt_issuer: '9EmRJTbIiIb4bIeSsmgcWIjrR6HyETqc',
  jwt_expiration: 1440,
  db_provider: 'postgres',
  connection_string: 'postgresql://<USERNAME>:<PASSWORD>@localhost:5432/mpsdb?sslmode=no-verify',
  instance_name: 'localhost',
  jwt_token_header: '',
  jwt_tenant_property: '',
  mps_tls_config: {
    key: '../private/mpsserver-cert-private.key',
    cert: '../private/mpsserver-cert-public.crt',
    requestCert: true,
    rejectUnauthorized: false,
    minVersion: 'TLSv1',
    ciphers: null,
    secureOptions: [
      'SSL_OP_NO_SSLv2',
      'SSL_OP_NO_SSLv3'
    ]
  },
  web_tls_config: {
    key: '../private/mpsserver-cert-private.key',
    cert: '../private/mpsserver-cert-public.crt',
    ca: [
      '../private/root-cert-public.crt'
    ],
    secureOptions: [
      'SSL_OP_NO_SSLv2',
      'SSL_OP_NO_SSLv3',
      'SSL_OP_NO_COMPRESSION',
      'SSL_OP_CIPHER_SERVER_PREFERENCE',
      'SSL_OP_NO_TLSv1',
      'SSL_OP_NO_TLSv11'
    ]
  },
  cert_path: '',
  tls_cert: '',
  tls_cert_key: '',
  tls_cert_ca: '',
  web_tls_cert: '',
  web_tls_cert_key: '',
  web_tls_cert_ca: '',
  redirection_expiration_time: 5,
  consul_enabled: true,
  consul_host: 'localhost',
  consul_port: '8500',
  consul_key_prefix: 'MPS',
  cira_last_seen: true,
  timeout_ms_default: '10000',
  cira_window_size: 81920
}
