/*********************************************************************
* Copyright (c) Intel Corporation 2019
* SPDX-License-Identifier: Apache-2.0
**********************************************************************/

import * as fs from 'fs'
import * as path from 'path'
import { logger as log } from './utils/logger'
import { MPSMicroservice } from './MPSMicroservice'

import { Certificates } from './utils/Certificates'
import { TLSConfiguration } from './utils/TLSConfiguration'
import { IDbProvider } from './interfaces/IDbProvider'

import { SecretManagerService } from './utils/SecretManagerService'
import { SecretsDbProvider } from './utils/VaultDbProvider'
import { parseValue } from './utils/parseEnvValue'

import rc from 'rc'
import { Environment } from './utils/Environment'
import { MPSCertificates, MPSConfig } from './models'

try {
  // To merge ENV variables. consider after lowercasing ENV since our config keys are lowercase
  process.env = Object.keys(process.env)
    .reduce((destination, key) => {
      destination[key.toLowerCase()] = parseValue(process.env[key])
      return destination
    }, {})

  // build config object
  const config: MPSConfig = rc('mps')

  if (!config.web_admin_password || !config.web_admin_user) {
    log.error('Web admin username and password are mandatory. Make sure to set values for these variables.')
    process.exit(1)
  }

  // path where Self-signed certificates are generated
  const certPath = path.join(__dirname, config.cert_path)
  config.data_path = path.join(__dirname, config.data_path)
  let certs: MPSCertificates

  log.silly(`Updated config... ${JSON.stringify(config, null, 2)}`)
  Environment.Config = config

  // DB initialization

  const db: IDbProvider = new SecretsDbProvider(new SecretManagerService(config, log), log, config)

  // Certificate Configuration and Operations
  if (config.https || !config.tls_offload) {
    if (!config.generate_certificates) {
      if (config.cert_format === 'raw') { // if you want to read the cert raw from variable.
        log.debug('using cert format raw')

        if (config.mps_tls_config) {
          config.mps_tls_config.key = config.tls_cert_key
          config.mps_tls_config.cert = config.tls_cert
        } else {
          config.mps_tls_config = { cert: config.tls_cert, key: config.tls_cert_key, minVersion: 'TLSv1', requestCert: true, rejectUnauthorized: false }
        }

        if (config.web_tls_config) {
          config.web_tls_config.key = config.web_tls_cert_key
          config.web_tls_config.cert = config.web_tls_cert
          config.web_tls_config.ca = config.web_tls_cert_ca
        } else {
          config.web_tls_config = { ca: config.web_tls_cert_ca, cert: config.web_tls_cert, key: config.web_tls_cert_key }
        }

        certs = { mps_tls_config: config.mps_tls_config, web_tls_config: config.web_tls_config }
      } else { // else read the certs from files
        log.debug('using cert from file')
        certs = { mps_tls_config: TLSConfiguration.mps(), web_tls_config: TLSConfiguration.web() }
      }
      log.info('Loaded existing certificates')
    } else {
      if (!fs.existsSync(certPath)) {
        fs.mkdirSync(certPath, { recursive: true })
      }
      certs = Certificates.generateCertificates(config, certPath)
    }

    log.info('certs loaded..')

    const mps = new MPSMicroservice(config, db, certs)
    mps.start()
  }
} catch (error) {
  log.error('Error starting MPS microservice. Check server logs.')
  log.error(error)
}
