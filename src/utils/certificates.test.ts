/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { vi, type MockInstance } from 'vitest'
import { Certificates } from './certificates.js'
import { type certAndKeyType, type certificatesType } from '../models/Config.js'
import forge from 'node-forge'
import { type ISecretManagerService } from '../interfaces/ISecretManagerService.js'
let certificates: Certificates
let certificatesTls12: Certificates
let generateKeyPairSpy: MockInstance
let createCertificateSpy: MockInstance
let getPublicKeyFingerprintSpy: MockInstance
let sha384CreateSpy: MockInstance
let getMPSCertsSpy: MockInstance
let storeCertificatesSpy: MockInstance
let writeSecretWithObjectSpy: MockInstance
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
  getMPSCertsSpy = vi.spyOn(secrets, 'getMPSCerts')
  certificates = new Certificates(config as any, secrets)
  certificatesTls12 = new Certificates(configtls12 as any, secrets)
  writeSecretWithObjectSpy = vi.spyOn(secrets, 'writeSecretWithObject')
  storeCertificatesSpy = vi.spyOn(certificates, 'storeCertificates')
  generateKeyPairSpy = vi.spyOn(forge.pki.rsa, 'generateKeyPair')
  createCertificateSpy = vi.spyOn(forge.pki, 'createCertificate')
  getPublicKeyFingerprintSpy = vi.spyOn(forge.pki, 'getPublicKeyFingerprint')
  sha384CreateSpy = vi.spyOn(forge.md.sha384, 'create')
})

afterEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
})

describe('constructor', () => {
  it('should construct a Certificates object', () => {
    const result = certificates
    expect(result).toBeTruthy()
  })
})

describe('generateCertificates', () => {
  it('should generate certificates', () => {
    const generateRootCertificateSpy = vi.spyOn(certificates, 'GenerateRootCertificate').mockReturnValue({})
    const certificateToPemSpy = vi.spyOn(forge.pki, 'certificateToPem').mockReturnValue('certificate')
    const privateKeyToPemSpy = vi.spyOn(forge.pki, 'privateKeyToPem').mockReturnValue('private key')
    const issueWebServerCertificateSpy = vi.spyOn(certificates, 'IssueWebServerCertificate').mockReturnValue({})
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
    const generateRootCertificateSpy = vi.spyOn(certificatesTls12, 'GenerateRootCertificate').mockReturnValue({})
    const certificateToPemSpy = vi.spyOn(forge.pki, 'certificateToPem').mockReturnValue('certificate')
    const privateKeyToPemSpy = vi.spyOn(forge.pki, 'privateKeyToPem').mockReturnValue('private key')
    const issueWebServerCertificateSpy = vi.spyOn(certificatesTls12, 'IssueWebServerCertificate').mockReturnValue({})
    const result: certificatesType = certificatesTls12.generateCertificates()
    expect(result.mps_tls_config).toBeTruthy()
    expect(result.web_tls_config).toBeTruthy()
    expect(result.root_key).toBeTruthy()
    expect(certificateToPemSpy).toHaveBeenCalled()
    expect(privateKeyToPemSpy).toHaveBeenCalled()
    expect(issueWebServerCertificateSpy).toHaveBeenCalled()
    expect(generateRootCertificateSpy).toHaveBeenCalled()
  })

  it('should generate certificates with 3072-bit key size when configured', () => {
    const config3072 = {
      common_name: 'test',
      country: 'US',
      organization: 'TestOrg',
      mps_tls_config: {
        minVersion: 'TLSv1.2',
        mps_cert_key_size: 3072
      }
    }
    const certificates3072 = new Certificates(config3072 as any, secrets)
    const generateRootCertificateSpy = vi.spyOn(certificates3072, 'GenerateRootCertificate').mockReturnValue({})
    const issueWebServerCertificateSpy = vi.spyOn(certificates3072, 'IssueWebServerCertificate').mockReturnValue({})
    vi.spyOn(forge.pki, 'certificateToPem').mockReturnValue('certificate')
    vi.spyOn(forge.pki, 'privateKeyToPem').mockReturnValue('private key')
    const result: certificatesType = certificates3072.generateCertificates()
    expect(result).toBeTruthy()
    expect(issueWebServerCertificateSpy).toHaveBeenCalledWith(
      expect.anything(),
      false,
      'test',
      'US',
      'TestOrg',
      null,
      true
    )
  })

  it('should generate certificates with 2048-bit key size by default', () => {
    const config2048 = {
      common_name: 'test',
      country: 'US',
      organization: 'TestOrg',
      mps_tls_config: {
        minVersion: 'TLSv1.2',
        mps_cert_key_size: 2048
      }
    }
    const certificates2048 = new Certificates(config2048 as any, secrets)
    const issueWebServerCertificateSpy = vi.spyOn(certificates2048, 'IssueWebServerCertificate').mockReturnValue({})
    vi.spyOn(certificates2048, 'GenerateRootCertificate').mockReturnValue({})
    vi.spyOn(forge.pki, 'certificateToPem').mockReturnValue('certificate')
    vi.spyOn(forge.pki, 'privateKeyToPem').mockReturnValue('private key')
    const result: certificatesType = certificates2048.generateCertificates()
    expect(result).toBeTruthy()
    expect(issueWebServerCertificateSpy).toHaveBeenCalledWith(
      expect.anything(),
      false,
      'test',
      'US',
      'TestOrg',
      null,
      false
    )
  })
})

describe('GenerateRootCertificate', () => {
  const keyPair = {
    publicKey: {},
    privateKey: {}
  } as any
  const certificate = {
    validity: {},
    setSubject: vi.fn(),
    setIssuer: vi.fn(),
    setExtensions: vi.fn(),
    sign: vi.fn()
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
    const generateCertificatesSpy = vi.spyOn(certificates, 'generateCertificates').mockReturnValue(expectedCertificates)
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
          getFullYear: vi.fn().mockReturnValue('2022')
        }
      },
      setSubject: vi.fn(),
      setIssuer: vi.fn(),
      setExtensions: vi.fn(),
      sign: vi.fn()
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
          getFullYear: vi.fn().mockReturnValue('2022')
        }
      },
      setSubject: vi.fn(),
      setIssuer: vi.fn(),
      setExtensions: vi.fn(),
      sign: vi.fn()
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
