/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { Certificates } from './certificates.js'
import { type certAndKeyType, type certificatesType } from '../models/Config.js'
import forge from 'node-forge'
import { type ISecretManagerService } from '../interfaces/ISecretManagerService.js'
import { jest } from '@jest/globals'
import { spyOn } from 'jest-mock'

let certificates: Certificates
let certificatesTls12: Certificates
let generateKeyPairSpy: jest.Spied<any>
let createCertificateSpy: jest.Spied<any>
let getPublicKeyFingerprintSpy: jest.Spied<any>
let sha384CreateSpy: jest.Spied<any>
let getMPSCertsSpy: jest.Spied<any>
let storeCertificatesSpy: jest.Spied<any>
let writeSecretWithObjectSpy: jest.Spied<any>
const config = {
  common_name: 'me',
  country: 'us',
  organization: 'rbhe',
  mps_tls_config: {
    minVersion: 'TLSv1'
  }
}
const configtls12 = {
  common_name: 'me',
  country: 'us',
  organization: 'rbhe',
  mps_tls_config: {
    minVersion: 'TLSv1.2'
  }
}
const secrets: ISecretManagerService = {
  getSecretFromKey: () => undefined,
  getSecretAtPath: () => undefined,
  getAMTCredentials: () => undefined,
  deleteSecretAtPath: () => undefined,
  health: () => undefined,
  getMPSCerts: () => undefined,
  writeSecretWithObject: async () => undefined
}

beforeEach(() => {
  getMPSCertsSpy = spyOn(secrets, 'getMPSCerts')
  certificates = new Certificates(config as any, secrets)
  certificatesTls12 = new Certificates(configtls12 as any, secrets)
  writeSecretWithObjectSpy = spyOn(secrets, 'writeSecretWithObject')
  storeCertificatesSpy = spyOn(certificates, 'storeCertificates')
  generateKeyPairSpy = spyOn(forge.pki.rsa, 'generateKeyPair')
  createCertificateSpy = spyOn(forge.pki, 'createCertificate')
  getPublicKeyFingerprintSpy = spyOn(forge.pki, 'getPublicKeyFingerprint')
  sha384CreateSpy = spyOn(forge.md.sha384, 'create')
})

afterEach(() => {
  jest.clearAllMocks()
  jest.resetModules()
})

describe('constructor', () => {
  it('should construct a Certificates object', () => {
    const result = certificates
    expect(result).toBeTruthy()
  })
})

describe('generateCertificates', () => {
  it('should generate certificates', () => {
    const generateRootCertificateSpy = spyOn(certificates, 'GenerateRootCertificate').mockReturnValue({})
    const certificateToPemSpy = spyOn(forge.pki, 'certificateToPem').mockReturnValue('certificate')
    const privateKeyToPemSpy = spyOn(forge.pki, 'privateKeyToPem').mockReturnValue('private key')
    const issueWebServerCertificateSpy = spyOn(certificates, 'IssueWebServerCertificate').mockReturnValue({})
    const result: certificatesType = certificates.generateCertificates()
    expect(result.mps_tls_config).toBeTruthy()
    expect(result.web_tls_config).toBeTruthy()
    expect(result.root_key).toBeTruthy()
    expect(certificateToPemSpy).toHaveBeenCalled()
    expect(privateKeyToPemSpy).toHaveBeenCalled()
    expect(issueWebServerCertificateSpy).toHaveBeenCalled()
    expect(generateRootCertificateSpy).toHaveBeenCalled()
  })

  it('should generate certificates for TLS1.2', () => {
    const generateRootCertificateSpy = spyOn(certificatesTls12, 'GenerateRootCertificate').mockReturnValue({})
    const certificateToPemSpy = spyOn(forge.pki, 'certificateToPem').mockReturnValue('certificate')
    const privateKeyToPemSpy = spyOn(forge.pki, 'privateKeyToPem').mockReturnValue('private key')
    const issueWebServerCertificateSpy = spyOn(certificatesTls12, 'IssueWebServerCertificate').mockReturnValue({})
    const result: certificatesType = certificatesTls12.generateCertificates()
    expect(result.mps_tls_config).toBeTruthy()
    expect(result.web_tls_config).toBeTruthy()
    expect(result.root_key).toBeTruthy()
    expect(certificateToPemSpy).toHaveBeenCalled()
    expect(privateKeyToPemSpy).toHaveBeenCalled()
    expect(issueWebServerCertificateSpy).toHaveBeenCalled()
    expect(generateRootCertificateSpy).toHaveBeenCalled()
  })
})

describe('GenerateRootCertificate', () => {
  const keyPair = {
    publicKey: {},
    privateKey: {}
  } as any
  const certificate = {
    validity: {},
    setSubject: jest.fn(),
    setIssuer: jest.fn(),
    setExtensions: jest.fn(),
    sign: jest.fn()
  } as any

  beforeEach(() => {
    generateKeyPairSpy.mockReturnValue(keyPair)
    createCertificateSpy.mockReturnValue(certificate)
    getPublicKeyFingerprintSpy.mockReturnValue('abc123')
    sha384CreateSpy.mockReturnValue(123456 as any)
  })

  it('should generate root certificate using strong keysize', () => {
    const addThumbPrintToName = true
    const commonName = 'cn'
    const country = 'us'
    const organization = 'rhbe'
    const strong = true
    const result = certificates.GenerateRootCertificate(addThumbPrintToName, commonName, country, organization, strong)
    expect(result.cert).toBeTruthy()
    expect(result.key).toBeTruthy()
  })

  it('should generate root certificate without using strong keysize', () => {
    const addThumbPrintToName = true
    const commonName = null
    const country = null
    const organization = null
    const strong = false
    const result = certificates.GenerateRootCertificate(addThumbPrintToName, commonName, country, organization, strong)
    expect(result.cert).toBeTruthy()
    expect(result.key).toBeTruthy()
  })
})

describe('getCertificates', () => {
  it('should get certificates if they already exist', async () => {
    const expectedCertificates = {}
    getMPSCertsSpy.mockReturnValue(expectedCertificates)
    const result = await certificates.getCertificates()
    expect(result).toEqual(expectedCertificates)
    expect(storeCertificatesSpy).not.toHaveBeenCalled()
  })

  it('should get certificates after generating them first if they do not already exist', async () => {
    const expectedCertificates = {} as any
    getMPSCertsSpy.mockReturnValue(null)
    storeCertificatesSpy.mockImplementation(() => {})
    const generateCertificatesSpy = spyOn(certificates, 'generateCertificates').mockReturnValue(expectedCertificates)
    const result = await certificates.getCertificates()
    expect(result).toEqual(expectedCertificates)
    expect(generateCertificatesSpy).toHaveBeenCalled()
    expect(storeCertificatesSpy).toHaveBeenCalled()
  })
})

describe('storeCertificates', () => {
  it('should store certificates', async () => {
    const certificatesData: certificatesType = {
      mps_tls_config: undefined,
      web_tls_config: undefined
    }
    writeSecretWithObjectSpy.mockImplementation(() => {})
    await certificates.storeCertificates(certificatesData)
    const expectedData = { data: certificatesData }
    expect(writeSecretWithObjectSpy).toHaveBeenCalledWith('MPSCerts', expectedData)
  })
})

describe('IssueWebServerCertificate', () => {
  const keyPair = {
    publicKey: {},
    privateKey: {}
  } as any

  it('should issue web server certificate using strong keys', () => {
    const certificate = {
      validity: {
        notAfter: {
          getFullYear: jest.fn().mockReturnValue('2022')
        }
      },
      setSubject: jest.fn(),
      setIssuer: jest.fn(),
      setExtensions: jest.fn(),
      sign: jest.fn()
    } as any
    generateKeyPairSpy.mockReturnValue(keyPair)
    createCertificateSpy.mockReturnValue(certificate)
    getPublicKeyFingerprintSpy.mockReturnValue('abc123')
    sha384CreateSpy.mockReturnValue(123456 as any)
    const rootcert: certAndKeyType = {
      cert: {
        subject: {
          attributes: {}
        }
      }
    } as any
    const addThumbPrintToName = true
    const commonName = 'cn'
    const country = 'us'
    const organization = 'rhbe'
    const extKeyUsage = {
      serverAuth: true
    }
    const strong = true
    const result = certificates.IssueWebServerCertificate(
      rootcert,
      addThumbPrintToName,
      commonName,
      country,
      organization,
      extKeyUsage,
      strong
    )
    expect(result.cert).toBeTruthy()
    expect(result.key).toBeTruthy()
  })

  it('should issue web server certificate not using strong keys and no extKeyUsage', () => {
    const certificate = {
      validity: {
        notAfter: {
          getFullYear: jest.fn().mockReturnValue('2022')
        }
      },
      setSubject: jest.fn(),
      setIssuer: jest.fn(),
      setExtensions: jest.fn(),
      sign: jest.fn()
    } as any
    generateKeyPairSpy.mockReturnValue(keyPair)
    createCertificateSpy.mockReturnValue(certificate)
    getPublicKeyFingerprintSpy.mockReturnValue('abc123')
    sha384CreateSpy.mockReturnValue(123456 as any)
    const rootcert: certAndKeyType = {
      cert: {
        subject: {
          attributes: {}
        }
      }
    } as any
    const addThumbPrintToName = true
    const commonName = 'cn'
    const country = 'us'
    const organization = 'rhbe'
    const extKeyUsage = null
    const strong = false
    const result = certificates.IssueWebServerCertificate(
      rootcert,
      addThumbPrintToName,
      commonName,
      country,
      organization,
      extKeyUsage,
      strong
    )
    expect(result.cert).toBeTruthy()
    expect(result.key).toBeTruthy()
  })
})
