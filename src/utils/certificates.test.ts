/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { vi, type MockInstance } from 'vitest'
import { Certificates, CertificateStartupError, getPemKeySize } from './certificates.js'
import { type certAndKeyType, type certificatesType } from '../models/Config.js'
import forge from 'node-forge'
import { type ISecretManagerService } from '../interfaces/ISecretManagerService.js'
import { logger, messages } from '../logging/index.js'
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
  writeSecretWithObject: async () => true
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
      3072
    )
  })

  it('should generate certificates with 4096-bit key size when configured', () => {
    const config4096 = {
      common_name: 'test',
      country: 'US',
      organization: 'TestOrg',
      mps_tls_config: {
        minVersion: 'TLSv1.2',
        mps_cert_key_size: 4096
      }
    }
    const certificates4096 = new Certificates(config4096 as any, secrets)
    const generateRootCertificateSpy = vi.spyOn(certificates4096, 'GenerateRootCertificate').mockReturnValue({})
    const issueWebServerCertificateSpy = vi.spyOn(certificates4096, 'IssueWebServerCertificate').mockReturnValue({})
    vi.spyOn(forge.pki, 'certificateToPem').mockReturnValue('certificate')
    vi.spyOn(forge.pki, 'privateKeyToPem').mockReturnValue('private key')
    const result: certificatesType = certificates4096.generateCertificates()
    expect(result).toBeTruthy()
    expect(issueWebServerCertificateSpy).toHaveBeenCalledWith(
      expect.anything(),
      false,
      'test',
      'US',
      'TestOrg',
      null,
      4096
    )
    expect(generateRootCertificateSpy).toHaveBeenCalled()
  })

  it('should generate certificates with 2048-bit key size when configured', () => {
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
      2048
    )
  })

  it('should generate the leaf at the 4096-bit default when no key size is configured', () => {
    const configDefault = {
      common_name: 'test',
      country: 'US',
      organization: 'TestOrg',
      mps_tls_config: { minVersion: 'TLSv1.2' }
    }
    const certificatesDefault = new Certificates(configDefault as any, secrets)
    const issueWebServerCertificateSpy = vi.spyOn(certificatesDefault, 'IssueWebServerCertificate').mockReturnValue({})
    const generateRootCertificateSpy = vi.spyOn(certificatesDefault, 'GenerateRootCertificate').mockReturnValue({})
    vi.spyOn(forge.pki, 'certificateToPem').mockReturnValue('certificate')
    vi.spyOn(forge.pki, 'privateKeyToPem').mockReturnValue('private key')
    certificatesDefault.generateCertificates()
    expect(issueWebServerCertificateSpy).toHaveBeenCalledWith(
      expect.anything(),
      false,
      'test',
      'US',
      'TestOrg',
      null,
      4096
    )
    // the root is always generated strong (3072), independent of the leaf default
    expect(generateRootCertificateSpy).toHaveBeenCalledWith(true, 'MPSRoot', null, null, true)
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
    expect(generateKeyPairSpy).toHaveBeenCalledWith(3072)
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
    expect(generateKeyPairSpy).toHaveBeenCalledWith(2048)
  })
})

describe('getCertificates', () => {
  // a complete stored set: root certificate and key, and the leaf certificate and key in both configs
  const storedSet = (): any => ({
    mps_tls_config: { cert: 'leaf-pem', key: 'leaf-key-pem' },
    web_tls_config: { ca: 'root-pem', cert: 'leaf-pem', key: 'leaf-key-pem' },
    root_key: 'root-key-pem'
  })
  const leafOf = (bits: number): any => ({ publicKey: { n: { bitLength: () => bits } } })
  // every stored certificate parses (the leaf reports leafBits); keys parse
  const mockReadablePems = (leafBits: number): void => {
    vi.spyOn(forge.pki, 'certificateFromPem').mockImplementation(((pem: string) =>
      pem === 'root-pem' ? leafOf(3072) : leafOf(leafBits)) as any)
    vi.spyOn(forge.pki, 'privateKeyFromPem').mockReturnValue({} as any)
  }
  const withTlsConfig = (tlsConfig: Record<string, unknown>): Certificates =>
    new Certificates({ ...config, mps_tls_config: { ...config.mps_tls_config, ...tlsConfig } } as any, secrets)

  it('should get certificates if they already exist', async () => {
    const storedCertificates = storedSet()
    getMPSCertsSpy.mockReturnValue(storedCertificates)
    mockReadablePems(2048)
    const result = await certificates.getCertificates()
    expect(result).toBe(storedCertificates)
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

  it('should run the leaf through reissueLeafIfNeeded when certificates already exist and reissue is enabled', async () => {
    const certificatesReissue = withTlsConfig({ mps_cert_reissue_enabled: true })
    const storedCertificates = storedSet()
    getMPSCertsSpy.mockReturnValue(storedCertificates)
    mockReadablePems(2048)
    const reissueLeafIfNeededSpy = vi
      .spyOn(certificatesReissue, 'reissueLeafIfNeeded')
      .mockResolvedValue(storedCertificates)
    const result = await certificatesReissue.getCertificates()
    expect(result).toBe(storedCertificates)
    expect(reissueLeafIfNeededSpy).toHaveBeenCalledWith(storedCertificates)
  })

  it.each([
    false,
    undefined
  ])('should serve stored certificates unchanged when reissue is %s', async (reissueEnabled) => {
    const certificatesNoReissue = withTlsConfig({ mps_cert_key_size: 4096, mps_cert_reissue_enabled: reissueEnabled })
    const storedCertificates = storedSet()
    getMPSCertsSpy.mockReturnValue(storedCertificates)
    mockReadablePems(2048)
    const reissueLeafIfNeededSpy = vi.spyOn(certificatesNoReissue, 'reissueLeafIfNeeded')
    const generateCertificatesSpy = vi.spyOn(certificatesNoReissue, 'generateCertificates')
    const storeSpy = vi.spyOn(certificatesNoReissue, 'storeCertificates')

    const result = await certificatesNoReissue.getCertificates()

    expect(result).toBe(storedCertificates)
    expect(reissueLeafIfNeededSpy).not.toHaveBeenCalled()
    expect(generateCertificatesSpy).not.toHaveBeenCalled()
    expect(storeSpy).not.toHaveBeenCalled()
  })

  describe('with stored certificate material missing or unreadable', () => {
    it.each([
      ['root certificate (web_tls_config.ca) is missing', (s: any) => (s.web_tls_config.ca = undefined)],
      ['root key (root_key) is missing', (s: any) => (s.root_key = undefined)],
      ['leaf certificate (web_tls_config.cert) is missing', (s: any) => (s.web_tls_config.cert = '')],
      ['leaf key (web_tls_config.key) is missing', (s: any) => (s.web_tls_config.key = undefined)],
      ['leaf certificate (mps_tls_config.cert) is missing', (s: any) => (s.mps_tls_config.cert = undefined)],
      ['leaf key (mps_tls_config.key) is missing', (s: any) => (s.mps_tls_config.key = undefined)],
      ['root key (root_key) is missing', (s: any) => (s.root_key = null)]
    ])('stops startup when the %s', async (expected, remove) => {
      const storedCertificates = storedSet()
      remove(storedCertificates)
      getMPSCertsSpy.mockReturnValue(storedCertificates)
      mockReadablePems(2048)
      const generateCertificatesSpy = vi.spyOn(certificates, 'generateCertificates')

      await expect(certificates.getCertificates()).rejects.toThrow(expected)
      expect(generateCertificatesSpy).not.toHaveBeenCalled()
      expect(storeCertificatesSpy).not.toHaveBeenCalled()
    })

    it.each([
      true,
      false
    ])('stops startup when a stored certificate cannot be read (reissue %s)', async (reissueEnabled) => {
      const certificatesUnderTest = withTlsConfig({ mps_cert_reissue_enabled: reissueEnabled })
      getMPSCertsSpy.mockReturnValue(storedSet())
      vi.spyOn(forge.pki, 'certificateFromPem').mockImplementation(() => {
        throw new Error('bad cert')
      })
      vi.spyOn(forge.pki, 'privateKeyFromPem').mockReturnValue({} as any)
      const generateCertificatesSpy = vi.spyOn(certificatesUnderTest, 'generateCertificates')
      const reissueLeafIfNeededSpy = vi.spyOn(certificatesUnderTest, 'reissueLeafIfNeeded')
      const storeSpy = vi.spyOn(certificatesUnderTest, 'storeCertificates')

      await expect(certificatesUnderTest.getCertificates()).rejects.toThrow(messages.MPS_STORED_CERTIFICATES_INVALID)
      await expect(certificatesUnderTest.getCertificates()).rejects.toBeInstanceOf(CertificateStartupError)
      expect(generateCertificatesSpy).not.toHaveBeenCalled()
      expect(reissueLeafIfNeededSpy).not.toHaveBeenCalled()
      expect(storeSpy).not.toHaveBeenCalled()
    })

    it('stops startup when a stored key cannot be read, naming every problem', async () => {
      getMPSCertsSpy.mockReturnValue(storedSet())
      mockReadablePems(2048)
      vi.spyOn(forge.pki, 'privateKeyFromPem').mockImplementation(() => {
        throw new Error('bad key')
      })

      await expect(certificates.getCertificates()).rejects.toThrow(
        'root key (root_key) cannot be read; leaf key (web_tls_config.key) cannot be read; leaf key (mps_tls_config.key) cannot be read'
      )
    })
  })

  describe('with reissue disabled', () => {
    const makeCertificates = (keySize: number): Certificates =>
      withTlsConfig({ mps_cert_key_size: keySize, mps_cert_reissue_enabled: false })

    it('warns and names both sizes when the stored leaf differs from mps_cert_key_size', async () => {
      const certificates4096 = makeCertificates(4096)
      const storedCertificates = storedSet()
      getMPSCertsSpy.mockReturnValue(storedCertificates)
      mockReadablePems(2048)
      const warnSpy = vi.spyOn(logger, 'warn')

      const result = await certificates4096.getCertificates()

      expect(result).toBe(storedCertificates)
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining(messages.MPS_LEAF_CERTIFICATE_KEY_SIZE_MISMATCH))
      expect(warnSpy).toHaveBeenCalledWith(expect.stringMatching(/2048-bit.*4096-bit/))
    })

    it('does not warn when the stored leaf matches mps_cert_key_size', async () => {
      const certificates2048 = makeCertificates(2048)
      getMPSCertsSpy.mockReturnValue(storedSet())
      mockReadablePems(2048)
      const warnSpy = vi.spyOn(logger, 'warn')

      await certificates2048.getCertificates()

      expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining(messages.MPS_LEAF_CERTIFICATE_KEY_SIZE_MISMATCH))
    })

    it('checks the leaf CIRA serves (mps_tls_config), not the web copy, when the two differ', async () => {
      const certificates4096 = makeCertificates(4096)
      const storedCertificates = storedSet()
      storedCertificates.web_tls_config.cert = 'web-leaf-pem' // e.g. an operator replaced only the CIRA leaf
      getMPSCertsSpy.mockReturnValue(storedCertificates)
      vi.spyOn(forge.pki, 'certificateFromPem').mockImplementation(((pem: string) =>
        leafOf(pem === 'root-pem' ? 3072 : pem === 'web-leaf-pem' ? 4096 : 2048)) as any)
      vi.spyOn(forge.pki, 'privateKeyFromPem').mockReturnValue({} as any)
      const warnSpy = vi.spyOn(logger, 'warn')
      const infoSpy = vi.spyOn(logger, 'info')

      await certificates4096.getCertificates()

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringMatching(/stored leaf is 2048-bit, mps_cert_key_size is 4096-bit/)
      )
      expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('leaf=2048-bit, root=3072-bit'))
    })
  })
})

describe('reissueLeafIfNeeded', () => {
  const makeLeaf = (bits: number): any => ({ publicKey: { n: { bitLength: () => bits } } })
  // root certificate and root key share the same public components
  const rootModulus = new forge.jsbn.BigInteger('112233445566778899')
  const rootExponent = new forge.jsbn.BigInteger('65537')
  const matchingRoot = (): any => ({ publicKey: { n: rootModulus, e: rootExponent } })
  const matchingRootKey = (): any => ({ n: rootModulus, e: rootExponent })
  const storedCertificates: any = {
    mps_tls_config: { cert: 'leaf-pem', key: 'leaf-key-pem' },
    web_tls_config: { ca: 'root-pem', cert: 'leaf-pem', key: 'leaf-key-pem' },
    root_key: 'root-key-pem'
  }

  it('reissues the leaf under the existing root when the stored key size is smaller than configured', async () => {
    const certificates3072 = new Certificates(
      {
        common_name: 'test',
        country: 'US',
        organization: 'TestOrg',
        mps_tls_config: { mps_cert_key_size: 3072 }
      } as any,
      secrets
    )
    vi.spyOn(forge.pki, 'certificateFromPem').mockImplementation(((pem: string) =>
      pem === 'root-pem' ? matchingRoot() : makeLeaf(2048)) as any)
    vi.spyOn(forge.pki, 'privateKeyFromPem').mockReturnValue(matchingRootKey())
    const issueSpy = vi
      .spyOn(certificates3072, 'IssueWebServerCertificate')
      .mockReturnValue({ cert: {}, key: {} } as any)
    vi.spyOn(forge.pki, 'certificateToPem').mockReturnValue('new-leaf-pem')
    vi.spyOn(forge.pki, 'privateKeyToPem').mockReturnValue('new-leaf-key-pem')
    const storeSpy = vi.spyOn(certificates3072, 'storeCertificates').mockResolvedValue(undefined)

    const result = await certificates3072.reissueLeafIfNeeded(storedCertificates)

    expect(issueSpy).toHaveBeenCalledWith(expect.anything(), false, 'test', 'US', 'TestOrg', null, 3072)
    expect(result.mps_tls_config.cert).toEqual('new-leaf-pem')
    expect(result.web_tls_config.cert).toEqual('new-leaf-pem')
    expect(storeSpy).toHaveBeenCalledWith(result)
  })

  it('reissues to 4096 when configured, under the existing root', async () => {
    const certificates4096 = new Certificates(
      {
        common_name: 'test',
        country: 'US',
        organization: 'TestOrg',
        mps_tls_config: { mps_cert_key_size: 4096 }
      } as any,
      secrets
    )
    vi.spyOn(forge.pki, 'certificateFromPem').mockImplementation(((pem: string) =>
      pem === 'root-pem' ? matchingRoot() : makeLeaf(3072)) as any)
    vi.spyOn(forge.pki, 'privateKeyFromPem').mockReturnValue(matchingRootKey())
    const issueSpy = vi
      .spyOn(certificates4096, 'IssueWebServerCertificate')
      .mockReturnValue({ cert: {}, key: {} } as any)
    vi.spyOn(forge.pki, 'certificateToPem').mockReturnValue('new-leaf-pem')
    vi.spyOn(forge.pki, 'privateKeyToPem').mockReturnValue('new-leaf-key-pem')
    vi.spyOn(certificates4096, 'storeCertificates').mockResolvedValue(undefined)

    const result = await certificates4096.reissueLeafIfNeeded(storedCertificates)

    expect(issueSpy).toHaveBeenCalledWith(expect.anything(), false, 'test', 'US', 'TestOrg', null, 4096)
    expect(result.mps_tls_config.cert).toEqual('new-leaf-pem')
  })

  it('normalizes an array-valued root CA before reissuing the leaf', async () => {
    const certificates4096 = new Certificates(
      {
        common_name: 'test',
        country: 'US',
        organization: 'TestOrg',
        mps_tls_config: { mps_cert_key_size: 4096 }
      } as any,
      secrets
    )
    const certificatesWithCaArray = {
      ...storedCertificates,
      web_tls_config: { ...storedCertificates.web_tls_config, ca: ['root-pem'] }
    }
    const certificateFromPemSpy = vi
      .spyOn(forge.pki, 'certificateFromPem')
      .mockImplementation(((pem: string) => (pem === 'root-pem' ? matchingRoot() : makeLeaf(3072))) as any)
    vi.spyOn(forge.pki, 'privateKeyFromPem').mockReturnValue(matchingRootKey())
    const issueSpy = vi
      .spyOn(certificates4096, 'IssueWebServerCertificate')
      .mockReturnValue({ cert: {}, key: {} } as any)
    vi.spyOn(forge.pki, 'certificateToPem').mockReturnValue('new-leaf-pem')
    vi.spyOn(forge.pki, 'privateKeyToPem').mockReturnValue('new-leaf-key-pem')
    vi.spyOn(certificates4096, 'storeCertificates').mockResolvedValue(undefined)

    await certificates4096.reissueLeafIfNeeded(certificatesWithCaArray)

    expect(certificateFromPemSpy).toHaveBeenCalledWith('root-pem')
    expect(issueSpy).toHaveBeenCalledWith(expect.anything(), false, 'test', 'US', 'TestOrg', null, 4096)
  })

  it('still returns the reissued leaf and warns when the secret provider reports a failed write', async () => {
    const certificates3072 = new Certificates(
      {
        common_name: 'test',
        country: 'US',
        organization: 'TestOrg',
        mps_tls_config: { mps_cert_key_size: 3072 }
      } as any,
      secrets
    )
    vi.spyOn(forge.pki, 'certificateFromPem').mockImplementation(((pem: string) =>
      pem === 'root-pem' ? matchingRoot() : makeLeaf(2048)) as any)
    vi.spyOn(forge.pki, 'privateKeyFromPem').mockReturnValue(matchingRootKey())
    vi.spyOn(certificates3072, 'IssueWebServerCertificate').mockReturnValue({ cert: {}, key: {} } as any)
    vi.spyOn(forge.pki, 'certificateToPem').mockReturnValue('new-leaf-pem')
    vi.spyOn(forge.pki, 'privateKeyToPem').mockReturnValue('new-leaf-key-pem')
    writeSecretWithObjectSpy.mockResolvedValue(false)
    const warnSpy = vi.spyOn(logger, 'warn')

    const result = await certificates3072.reissueLeafIfNeeded(storedCertificates)

    expect(writeSecretWithObjectSpy).toHaveBeenCalledWith('MPSCerts', { data: result })
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining(messages.MPS_LEAF_CERTIFICATE_PERSIST_FAILED))
    expect(result.mps_tls_config.cert).toEqual('new-leaf-pem')
    expect(result.web_tls_config.cert).toEqual('new-leaf-pem')
  })

  it('leaves certificates unchanged when the stored key size matches the configured size', async () => {
    const certificates3072 = new Certificates(
      {
        common_name: 'test',
        country: 'US',
        organization: 'TestOrg',
        mps_tls_config: { mps_cert_key_size: 3072 }
      } as any,
      secrets
    )
    vi.spyOn(forge.pki, 'certificateFromPem').mockImplementation(((pem: string) =>
      pem === 'root-pem' ? matchingRoot() : makeLeaf(3072)) as any)
    vi.spyOn(forge.pki, 'privateKeyFromPem').mockReturnValue(matchingRootKey())
    const storeSpy = vi.spyOn(certificates3072, 'storeCertificates')

    const result = await certificates3072.reissueLeafIfNeeded(storedCertificates)

    expect(result).toEqual(storedCertificates)
    expect(storeSpy).not.toHaveBeenCalled()
  })

  it('reissues down to a lower configured size, under the existing root', async () => {
    const certificates2048 = new Certificates(
      {
        common_name: 'test',
        country: 'US',
        organization: 'TestOrg',
        mps_tls_config: { mps_cert_key_size: 2048 }
      } as any,
      secrets
    )
    const rootCert = { subject: 'existing-root', publicKey: { n: rootModulus, e: rootExponent } }
    const rootKey = { key: 'existing-root-key', n: rootModulus, e: rootExponent }
    vi.spyOn(forge.pki, 'certificateFromPem').mockImplementation(((pem: string) =>
      pem === 'root-pem' ? rootCert : makeLeaf(3072)) as any)
    vi.spyOn(forge.pki, 'privateKeyFromPem').mockReturnValue(rootKey as any)
    const generateRootSpy = vi.spyOn(certificates2048, 'GenerateRootCertificate')
    const issueSpy = vi
      .spyOn(certificates2048, 'IssueWebServerCertificate')
      .mockReturnValue({ cert: {}, key: {} } as any)
    vi.spyOn(forge.pki, 'certificateToPem').mockReturnValue('new-leaf-pem')
    vi.spyOn(forge.pki, 'privateKeyToPem').mockReturnValue('new-leaf-key-pem')
    const storeSpy = vi.spyOn(certificates2048, 'storeCertificates').mockResolvedValue(undefined)

    const result = await certificates2048.reissueLeafIfNeeded(storedCertificates)

    expect(issueSpy).toHaveBeenCalledWith({ cert: rootCert, key: rootKey }, false, 'test', 'US', 'TestOrg', null, 2048)
    expect(generateRootSpy).not.toHaveBeenCalled()
    expect(result.mps_tls_config.cert).toEqual('new-leaf-pem')
    expect(result.web_tls_config.cert).toEqual('new-leaf-pem')
    expect(result.web_tls_config.ca).toEqual('root-pem')
    expect(result.root_key).toEqual('root-key-pem')
    expect(storeSpy).toHaveBeenCalledWith(result)
  })

  it('stops with an error, without issuing or storing a leaf, when root_key does not match the root certificate', async () => {
    const certificates4096 = new Certificates(
      { common_name: 'test', mps_tls_config: { mps_cert_key_size: 4096 } } as any,
      secrets
    )
    vi.spyOn(forge.pki, 'certificateFromPem').mockImplementation(((pem: string) =>
      pem === 'root-pem' ? matchingRoot() : makeLeaf(2048)) as any)
    vi.spyOn(forge.pki, 'privateKeyFromPem').mockReturnValue({
      n: new forge.jsbn.BigInteger('998877665544332211'),
      e: rootExponent
    } as any)
    const issueSpy = vi.spyOn(certificates4096, 'IssueWebServerCertificate')
    const storeSpy = vi.spyOn(certificates4096, 'storeCertificates')

    await expect(certificates4096.reissueLeafIfNeeded(storedCertificates)).rejects.toBeInstanceOf(
      CertificateStartupError
    )
    await expect(certificates4096.reissueLeafIfNeeded(storedCertificates)).rejects.toThrow(
      'root key (root_key) does not match the root certificate'
    )
    expect(issueSpy).not.toHaveBeenCalled()
    expect(storeSpy).not.toHaveBeenCalled()
  })

  it('stops with an error, without reissuing, when the root certificate cannot be parsed', async () => {
    vi.spyOn(forge.pki, 'certificateFromPem').mockImplementation(() => {
      throw new Error('bad cert')
    })
    vi.spyOn(forge.pki, 'privateKeyFromPem').mockReturnValue({} as any)
    const issueSpy = vi.spyOn(certificates, 'IssueWebServerCertificate')

    await expect(certificates.reissueLeafIfNeeded(storedCertificates)).rejects.toThrow(
      'root certificate (web_tls_config.ca) cannot be read'
    )
    expect(issueSpy).not.toHaveBeenCalled()
    expect(storeCertificatesSpy).not.toHaveBeenCalled()
  })

  it('stops with an error, without reissuing, when root_key is missing', async () => {
    vi.spyOn(forge.pki, 'certificateFromPem').mockReturnValue(makeLeaf(2048))
    vi.spyOn(forge.pki, 'privateKeyFromPem').mockReturnValue({} as any)
    const certificatesWithoutRootKey = { ...storedCertificates, root_key: undefined }

    await expect(certificates.reissueLeafIfNeeded(certificatesWithoutRootKey)).rejects.toThrow(
      'root key (root_key) is missing'
    )
    expect(storeCertificatesSpy).not.toHaveBeenCalled()
  })

  it('stops with an error, without reissuing, when the root certificate is missing', async () => {
    vi.spyOn(forge.pki, 'certificateFromPem').mockReturnValue(makeLeaf(2048))
    vi.spyOn(forge.pki, 'privateKeyFromPem').mockReturnValue({} as any)
    const certificatesWithoutRootCert = {
      ...storedCertificates,
      web_tls_config: { ...storedCertificates.web_tls_config, ca: undefined }
    }

    await expect(certificates.reissueLeafIfNeeded(certificatesWithoutRootCert)).rejects.toThrow(
      'root certificate (web_tls_config.ca) is missing'
    )
    expect(storeCertificatesSpy).not.toHaveBeenCalled()
  })
})

describe('getPemKeySize', () => {
  it('returns the RSA key size of the certificate', () => {
    vi.spyOn(forge.pki, 'certificateFromPem').mockReturnValue({ publicKey: { n: { bitLength: () => 4096 } } } as any)
    expect(getPemKeySize('leaf-pem')).toEqual(4096)
  })

  it('reads the first certificate when given a list', () => {
    const certificateFromPemSpy = vi
      .spyOn(forge.pki, 'certificateFromPem')
      .mockReturnValue({ publicKey: { n: { bitLength: () => 3072 } } } as any)
    expect(getPemKeySize(['root-pem', 'other-pem'])).toEqual(3072)
    expect(certificateFromPemSpy).toHaveBeenCalledWith('root-pem')
  })

  it('returns null when there is no certificate', () => {
    expect(getPemKeySize(undefined)).toBeNull()
    expect(getPemKeySize([])).toBeNull()
  })

  it('returns null when the certificate cannot be parsed', () => {
    vi.spyOn(forge.pki, 'certificateFromPem').mockImplementation(() => {
      throw new Error('bad cert')
    })
    expect(getPemKeySize('not-a-pem')).toBeNull()
  })
})

describe('storeCertificates', () => {
  it('should store certificates', async () => {
    const certificatesData: certificatesType = {
      mps_tls_config: undefined,
      web_tls_config: undefined
    }
    writeSecretWithObjectSpy.mockResolvedValue(true)
    await certificates.storeCertificates(certificatesData)
    const expectedData = { data: certificatesData }
    expect(writeSecretWithObjectSpy).toHaveBeenCalledWith('MPSCerts', expectedData)
  })

  it('throws when the secret provider reports a failed write', async () => {
    writeSecretWithObjectSpy.mockResolvedValue(false)
    const write = certificates.storeCertificates({} as certificatesType)
    await expect(write).rejects.toBeInstanceOf(CertificateStartupError)
    await expect(write).rejects.toThrow(messages.MPS_CERTIFICATES_WRITE_FAILED)
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
    const strong = 3072
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
    const strong = 2048
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
