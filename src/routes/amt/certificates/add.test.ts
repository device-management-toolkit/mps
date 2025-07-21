/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type Request, type Response } from 'express'
import { addAMTCertificate } from './add.js'
import { MPSValidationError } from '../../../utils/MPSValidationError.js'
import { createSpyObj } from '../../../test/helper/jest.js'
import { spyOn } from 'jest-mock'
import { jest } from '@jest/globals'
import { HttpHandler } from '../../../amt/HttpHandler.js'
import { CIRAHandler } from '../../../amt/CIRAHandler.js'
import { DeviceAction } from '../../../amt/DeviceAction.js'
import crypto from 'node:crypto'

// Mock external dependencies
jest.mock('../../../utils/MPSValidationError')

describe('addAMTCertificate', () => {
  let mockRequest: Partial<Request>
  let mockResponse
  let addCertificateSpy
  let mockX509Certificate: jest.Mock

  beforeEach(() => {
    const handler = new CIRAHandler(new HttpHandler(), 'admin', 'P@ssw0rd')
    const device = new DeviceAction(handler, null)

    const pemCert = `-----BEGIN CERTIFICATE-----
MIIBszCCARwCCQCyWpX+k/vW0TANBgkqhkiG9w0BAQsFADASMRAwDgYDVQQDDAd0
ZXN0Y2VydDAeFw0yNDA3MjIyMjAwMDBaFw0yNTA3MjIyMjAwMDBaMBMxETAPBgNV
BAMMCGxvY2FsaG9zdDCBnzANBgkqhkiG9w0BAQEFAAOBjQAwgYkCgYEAw/z/v/gA
AAAAAA==
-----END CERTIFICATE-----`

    mockRequest = {
      params: { guid: 'mock-guid' },
      body: {
        cert: Buffer.from(pemCert).toString('base64'),
        isTrusted: true
      },
      deviceAction: device
    }

    addCertificateSpy = spyOn(device, 'addCertificate').mockResolvedValue('mockHandle')

    mockResponse = createSpyObj('Response', [
      'status',
      'json',
      'end'
    ])
    mockResponse.status.mockReturnThis()
    mockResponse.json.mockReturnThis()
    mockResponse.end.mockReturnThis()

    // Mock X509Certificate constructor
    mockX509Certificate = jest.fn()
    ;(crypto as any).X509Certificate = mockX509Certificate
  })

  afterEach(() => {
    jest.clearAllMocks()
    mockX509Certificate.mockReset()
  })

  it('should successfully add an AMT certificate and return 200', async () => {
    const futureDate = new Date()
    futureDate.setFullYear(futureDate.getFullYear() + 1)

    const mockCertInstance = {
      validTo: futureDate.toISOString(),
      toString: jest.fn().mockReturnValue(`-----BEGIN CERTIFICATE-----
MIIBszCCARwCCQCyWpX+k/vW0TANBgkqhkiG9w0BAQsFADASMRAwDgYDVQQDDAd0
ZXN0Y2VydDAeFw0yNDA3MjIyMjAwMDBaFw0yNTA3MjIyMjAwMDBaMBMxETAPBgNV
BAMMCGxvY2FsaG9zdDCBnzANBgkqhkiG9w0BAQEFAAOBjQAwgYkCgYEAw/z/v/gA
AAAAAA==
-----END CERTIFICATE-----`)
    }

    mockX509Certificate.mockImplementation(() => mockCertInstance)
    addCertificateSpy.mockResolvedValue('mockHandle')

    await addAMTCertificate(mockRequest as Request, mockResponse as Response)

    expect(addCertificateSpy).toHaveBeenCalledWith(expect.any(String), true)
    expect(mockResponse.status).toHaveBeenCalledWith(200)
    expect(mockResponse.json).toHaveBeenCalledWith({ handle: 'mockHandle' })
  })

  it('should handle MPSValidationError and return appropriate status', async () => {
    const mockError = new MPSValidationError('Invalid base64 certificate data', 400)
    addCertificateSpy.mockImplementation(() => {
      throw mockError
    })

    const futureDate = new Date()
    futureDate.setFullYear(futureDate.getFullYear() + 1)

    const mockCertInstance = {
      validTo: futureDate.toISOString(),
      toString: jest.fn().mockReturnValue('mock-pem-cert')
    }

    mockX509Certificate.mockImplementation(() => mockCertInstance)

    await addAMTCertificate(mockRequest as Request, mockResponse as Response)

    expect(mockResponse.status).toHaveBeenCalledWith(400)
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Incorrect URI or Bad Request',
      errorDescription: 'Failed to validate or process certificate'
    })
  })
  it('should return 400 for invalid certificate format (not DER or PEM)', async () => {
    mockRequest.body.cert = Buffer.from('not a valid cert format').toString('base64')

    // Mock X509Certificate constructor to throw for invalid format
    mockX509Certificate.mockImplementation(() => {
      throw new Error('Invalid certificate format')
    })

    await addAMTCertificate(mockRequest as Request, mockResponse as Response)

    expect(mockResponse.status).toHaveBeenCalledWith(400)
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Incorrect URI or Bad Request',
      errorDescription: 'Invalid certificate format (not valid DER or PEM)'
    })
  })

  it('should return 400 for an expired certificate', async () => {
    addCertificateSpy.mockResolvedValue('mockHandle')

    const pastDate = new Date()
    pastDate.setFullYear(pastDate.getFullYear() - 1)

    const mockCertInstance = {
      validTo: pastDate.toISOString(),
      toString: jest.fn().mockReturnValue('mock-pem-cert')
    }

    mockX509Certificate.mockImplementation(() => mockCertInstance)

    await addAMTCertificate(mockRequest as Request, mockResponse as Response)

    expect(mockResponse.status).toHaveBeenCalledWith(400)
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Incorrect URI or Bad Request',
      errorDescription: 'Failed to validate or process certificate'
    })
  })

  it('should return 400 for certificate processing/validation failure', async () => {
    addCertificateSpy.mockResolvedValue('mockHandle')

    // Mock X509Certificate to throw an error during validation
    mockX509Certificate.mockImplementation(() => {
      throw new Error('Certificate validation error')
    })

    await addAMTCertificate(mockRequest as Request, mockResponse as Response)

    expect(mockResponse.status).toHaveBeenCalledWith(400)
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Incorrect URI or Bad Request',
      errorDescription: 'Failed to validate or process certificate'
    })
  })

  it('should correctly process a certificate already in PEM format', async () => {
    const pemCert = `-----BEGIN CERTIFICATE-----
MIIBszCCARwCCQCyWpX+k/vW0TANBgkqhkiG9w0BAQsFADASMRAwDgYDVQQDDAd0
ZXN0Y2VydDAeFw0yNDA3MjIyMjAwMDBaFw0yNTA3MjIyMjAwMDBaMBMxETAPBgNV
BAMMCGxvY2FsaG9zdDCBnzANBgkqhkiG9w0BAQEFAAOBjQAwgYkCgYEAw/z/v/gA
AAAAAA==
-----END CERTIFICATE-----`
    mockRequest.body.cert = Buffer.from(pemCert).toString('base64')

    const futureDate = new Date()
    futureDate.setFullYear(futureDate.getFullYear() + 1)

    const mockCertInstance = {
      validTo: futureDate.toISOString(),
      toString: jest.fn().mockReturnValue(pemCert)
    }

    mockX509Certificate.mockImplementation(() => mockCertInstance as any)
    addCertificateSpy.mockResolvedValue('mockHandle')

    await addAMTCertificate(mockRequest as Request, mockResponse as Response)

    expect(addCertificateSpy).toHaveBeenCalledWith(
      expect.stringContaining('MIIBszCCARwCCQCyWpX+k/vW0TANBgkqhkiG9w0BAQsFADASMRAwDgYDVQQDDAd0'), // Cleaned PEM
      true
    )
    expect(mockResponse.status).toHaveBeenCalledWith(200)
    expect(mockResponse.json).toHaveBeenCalledWith({ handle: 'mockHandle' })
  })

  it('should correctly process a certificate in DER format', async () => {
    const derBuffer = Buffer.from('mockDerData') // Simulate DER data
    mockRequest.body.cert = derBuffer.toString('base64')

    const futureDate = new Date()
    futureDate.setFullYear(futureDate.getFullYear() + 1)

    const convertedPem = `-----BEGIN CERTIFICATE-----
mockPemData
-----END CERTIFICATE-----`

    const mockCertInstance = {
      validTo: futureDate.toISOString(),
      toString: jest.fn().mockReturnValue(convertedPem)
    }

    mockX509Certificate.mockImplementation(() => mockCertInstance as any)
    addCertificateSpy.mockResolvedValue('mockHandle')

    await addAMTCertificate(mockRequest as Request, mockResponse as Response)

    expect(mockX509Certificate).toHaveBeenCalledWith(derBuffer)
    expect(addCertificateSpy).toHaveBeenCalledWith(
      'mockPemData', // Cleaned PEM from DER
      true
    )
    expect(mockResponse.status).toHaveBeenCalledWith(200)
    expect(mockResponse.json).toHaveBeenCalledWith({ handle: 'mockHandle' })
  })

  it('should return 400 when addCertificate returns null/undefined', async () => {
    const futureDate = new Date()
    futureDate.setFullYear(futureDate.getFullYear() + 1)

    const mockCertInstance = {
      validTo: futureDate.toISOString(),
      toString: jest.fn().mockReturnValue('mock-pem-cert')
    }

    mockX509Certificate.mockImplementation(() => mockCertInstance as any)
    addCertificateSpy.mockResolvedValue(null) // Simulate failure

    await addAMTCertificate(mockRequest as Request, mockResponse as Response)

    expect(mockResponse.status).toHaveBeenCalledWith(400)
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Incorrect URI or Bad Request',
      errorDescription: 'Failed to validate or process certificate'
    })
  })
})
