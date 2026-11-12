/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

/**
 * @fileoverview Script Compiler / Decompiler / Runner
 * @author Ylian Saint-Hilaire
 * @copyright Intel Corporation 2018
 * @license Apache-2.0
 * @version v0.1.0e
 */

import { logger, messages } from '../logging/index.js'
import {
  type certificatesType,
  type mpsConfigType,
  type webConfigType,
  type certAndKeyType,
  type configType
} from '../models/Config.js'
import forge from 'node-forge'
import { X509Certificate } from 'node:crypto'
import { type ISecretManagerService } from '../interfaces/ISecretManagerService.js'
import { DEFAULT_MPS_CERT_KEY_SIZE } from './constants.js'

export function getPemKeySize(pem: string): number | null {
  if (!pem) return null
  try {
    return new X509Certificate(pem).publicKey.asymmetricKeyDetails?.modulusLength ?? null
  } catch {
    return null
  }
}

export function getRootKeySize(ca: string | string[], ciraChain: string): number | null {
  const parseCertificates = (value: string | string[]): X509Certificate[] =>
    (Array.isArray(value) ? value : [value])
      .filter((entry): entry is string => typeof entry === 'string')
      .flatMap((entry) => entry.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g) ?? [])
      .map((pem) => new X509Certificate(pem))

  try {
    const chain = parseCertificates(ciraChain)
    if (chain.length === 0) return null
    const candidates = [...chain.slice(1), ...parseCertificates(ca)]
    const pending = [chain[0]]
    const visited = new Set<string>()
    while (pending.length > 0) {
      const cert = pending.pop()
      if (visited.has(cert.fingerprint256)) continue
      visited.add(cert.fingerprint256)
      if (cert.ca && cert.checkIssued(cert) && cert.verify(cert.publicKey)) {
        return cert.publicKey.asymmetricKeyDetails?.modulusLength ?? null
      }
      for (const issuer of candidates) {
        if (issuer.ca && cert.checkIssued(issuer) && cert.verify(issuer.publicKey)) {
          pending.push(issuer)
        }
      }
    }
  } catch {
    return null
  }
  return null
}

export class Certificates {
  constructor(
    private readonly config: configType,
    private readonly secrets: ISecretManagerService
  ) {
    this.config = config
    this.secrets = secrets
  }

  async getCertificates(): Promise<certificatesType> {
    let certificates: certificatesType = await this.secrets.getMPSCerts()
    if (certificates == null) {
      certificates = this.generateCertificates()
      await this.storeCertificates(certificates)
    }
    return certificates // return mps and web certificates
  }

  generateCertificates(): certificatesType {
    logger.info(messages.GENERATING_ROOT_CERTIFICATE)
    const rootCertAndKey: certAndKeyType = this.GenerateRootCertificate(true, 'MPSRoot', null, null, true)
    const rootCertificate = forge.pki.certificateToPem(rootCertAndKey.cert)
    const rootPrivateKey = forge.pki.privateKeyToPem(rootCertAndKey.key)

    logger.info(messages.GENERATING_MPS_CERTIFICATE)

    // Use configured key size (default 2048 for backward compatibility)
    const mpsKeySize = this.config.mps_tls_config?.mps_cert_key_size === 3072

    const mpsCertAndKey: certAndKeyType = this.IssueWebServerCertificate(
      rootCertAndKey,
      false,
      this.config.common_name,
      this.config.country,
      this.config.organization,
      null,
      mpsKeySize
    )
    const mpsCertificate = forge.pki.certificateToPem(mpsCertAndKey.cert)
    const mpsPrivateKey = forge.pki.privateKeyToPem(mpsCertAndKey.key)

    // Set MPS TLS Configuration
    const secureCiphers = [
      'ECDHE-ECDSA-AES256-GCM-SHA384',
      'ECDHE-RSA-AES256-GCM-SHA384',
      'DHE-RSA-AES256-GCM-SHA384',
      'TLS_AES_256_GCM_SHA384',
      'TLS_AES_128_GCM_SHA256'
    ].join(':')
    const legacySupportCiphers = 'HIGH:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA:@SECLEVEL=0'
    let mpsConfig: mpsConfigType
    if (this.config.mps_tls_config.minVersion === 'TLSv1.2' || this.config.mps_tls_config.minVersion === 'TLSv1.3') {
      mpsConfig = {
        cert: mpsCertificate,
        key: mpsPrivateKey,
        minVersion: this.config.mps_tls_config.minVersion,
        requestCert: true,
        rejectUnauthorized: false,
        ciphers: this.config.mps_tls_config.ciphers || secureCiphers
      }
    } else {
      mpsConfig = {
        cert: mpsCertificate,
        key: mpsPrivateKey,
        minVersion: this.config.mps_tls_config.minVersion,
        requestCert: true,
        rejectUnauthorized: false,
        ciphers: this.config.mps_tls_config.ciphers || legacySupportCiphers
      }
    }
    // Set WebServer TLS Configuration
    const webConfig: webConfigType = { ca: rootCertificate, cert: mpsCertificate, key: mpsPrivateKey }
    const certificates: certificatesType = {
      mps_tls_config: mpsConfig,
      web_tls_config: webConfig,
      root_key: rootPrivateKey
    }
    return certificates // return mps and web certificates
  }

  async storeCertificates(certificates: certificatesType): Promise<void> {
    const data = {
      data: certificates
    }
    await this.secrets.writeSecretWithObject('MPSCerts', data)
  }

  GenerateRootCertificate = (
    addThumbPrintToName: boolean,
    commonName: string,
    country: string,
    organization: string,
    strong: boolean
  ): any => {
    const keySize = strong ? 3072 : DEFAULT_MPS_CERT_KEY_SIZE
    const keys = forge.pki.rsa.generateKeyPair(keySize)
    const cert = forge.pki.createCertificate()
    cert.publicKey = keys.publicKey
    cert.serialNumber = '' + Math.floor(Math.random() * 100000 + 1)
    cert.validity.notBefore = new Date()
    cert.validity.notBefore.setFullYear(cert.validity.notBefore.getFullYear() - 1) // Create a certificate that is valid one year before, to make sure out-of-sync clocks don't reject this cert.
    cert.validity.notAfter = new Date()
    cert.validity.notAfter.setFullYear(cert.validity.notAfter.getFullYear() + 30)
    if (addThumbPrintToName) {
      commonName += '-' + forge.pki.getPublicKeyFingerprint(cert.publicKey, { encoding: 'hex' }).substring(0, 6)
    }
    if (country == null) {
      country = 'unknown'
    }
    if (organization == null) {
      organization = 'unknown'
    }
    const attrs = [
      { name: 'commonName', value: commonName },
      { name: 'organizationName', value: organization },
      { name: 'countryName', value: country }
    ]
    cert.setSubject(attrs)
    cert.setIssuer(attrs)
    // Create a root certificate
    cert.setExtensions([
      {
        name: 'basicConstraints',
        cA: true
      },
      {
        name: 'nsCertType',
        sslCA: true,
        emailCA: true,
        objCA: true
      },
      {
        name: 'subjectKeyIdentifier',
        hash: true
      }
    ])
    cert.sign(keys.privateKey, forge.md.sha384.create())

    return { cert, key: keys.privateKey }
  }

  IssueWebServerCertificate = (
    rootcert: certAndKeyType,
    addThumbPrintToName: boolean,
    commonName: string,
    country: string,
    organization: string,
    extKeyUsage,
    strong: boolean
  ): any => {
    const keySize = strong ? 3072 : DEFAULT_MPS_CERT_KEY_SIZE
    const keys = forge.pki.rsa.generateKeyPair(keySize)
    const cert = forge.pki.createCertificate()
    cert.publicKey = keys.publicKey
    cert.serialNumber = '' + Math.floor(Math.random() * 100000 + 1)
    cert.validity.notBefore = new Date()
    cert.validity.notBefore.setFullYear(cert.validity.notAfter.getFullYear() - 1) // Create a certificate that is valid one year before, to make sure out-of-sync clocks don't reject this cert.
    cert.validity.notAfter = new Date()
    cert.validity.notAfter.setFullYear(cert.validity.notAfter.getFullYear() + 30)
    if (addThumbPrintToName) {
      commonName += '-' + forge.pki.getPublicKeyFingerprint(cert.publicKey, { encoding: 'hex' }).substring(0, 6)
    }
    const attrs = [{ name: 'commonName', value: commonName }]
    if (country != null) attrs.push({ name: 'countryName', value: country })
    if (organization != null) attrs.push({ name: 'organizationName', value: organization })
    cert.setSubject(attrs)
    cert.setIssuer(rootcert.cert.subject.attributes)

    if (extKeyUsage == null) {
      extKeyUsage = { name: 'extKeyUsage', serverAuth: true }
    } else {
      extKeyUsage.name = 'extKeyUsage'
    }
    let subjectAltName = null
    if (extKeyUsage.serverAuth === true) {
      subjectAltName = {
        name: 'subjectAltName',
        altNames: [
          {
            type: 6, // URI
            value: 'http://' + commonName + '/'
          },
          {
            type: 6, // URL
            value: 'http://localhost/'
          }
        ]
      }
    }

    const extensions = [
      {
        name: 'basicConstraints',
        cA: false
      },
      {
        name: 'keyUsage',
        keyCertSign: true,
        digitalSignature: true,
        nonRepudiation: true,
        keyEncipherment: true,
        dataEncipherment: true
      },
      extKeyUsage,
      {
        name: 'nsCertType',
        client: false,
        server: true,
        email: false,
        objsign: false,
        sslCA: false,
        emailCA: false,
        objCA: false
      },
      {
        name: 'subjectKeyIdentifier'
      }
    ]
    if (subjectAltName != null) extensions.push(subjectAltName)
    cert.setExtensions(extensions)
    cert.sign(rootcert.key, forge.md.sha384.create())

    return { cert, key: keys.privateKey }
  }
}
