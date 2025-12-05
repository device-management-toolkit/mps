/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { jest } from '@jest/globals'
import { spyOn } from 'jest-mock'
import { deleteAMTCertificate } from './delete.js'
import { DeviceAction } from '../../../amt/DeviceAction.js'
import { CIRAHandler } from '../../../amt/CIRAHandler.js'
import { HttpHandler } from '../../../amt/HttpHandler.js'
import { MPSValidationError } from '../../../utils/MPSValidationError.js'
import { MqttProvider } from '../../../utils/MqttProvider.js'
import { ErrorResponse } from '../../../utils/amtHelper.js'
import { messages } from '../../../logging/messages.js'

describe('deleteAMTCertificate', () => {
  let resSpy: any
  let req: any
  let getCertificatesSpy: any
  let removeCertificateSpy: any
  let publishEventSpy: any

  beforeEach(() => {
    const handler = new CIRAHandler(new HttpHandler(), 'admin', 'P@ssw0rd')
    const device = new DeviceAction(handler, null)

    // Mock MQTT provider
    publishEventSpy = jest.fn()
    jest.spyOn(MqttProvider, 'publishEvent').mockImplementation(publishEventSpy)

    resSpy = {
      status: jest.fn(() => resSpy),
      json: jest.fn(() => resSpy),
      end: jest.fn(() => resSpy)
    }

    req = {
      params: { 
        guid: 'mock-guid',
        instanceId: 'Intel(r) AMT Certificate: Handle: 1'
      },
      body: {},
      deviceAction: device
    }

    getCertificatesSpy = spyOn(device, 'getCertificates')
    removeCertificateSpy = spyOn(device, 'removeCertificate')
  })

  afterEach(() => {
    jest.clearAllMocks()
    jest.restoreAllMocks()
  })

  describe('Success Cases', () => {
    it('should successfully delete an unreferenced certificate', async () => {
      const mockCertificateResponse = {
        PublicKeyCertificateResponse: {
          AMT_PublicKeyCertificate: [
            {
              ElementName: 'Test Certificate',
              InstanceID: 'Intel(r) AMT Certificate: Handle: 1',
              X509Certificate: 'mock-cert-data',
              TrustedRootCertficate: false,
              Issuer: 'CN=Test Issuer',
              Subject: 'CN=Test Subject',
              ReadOnlyCertificate: false,
              PublicKeyHandle: 'key-handle-123',
              AssociatedProfiles: []
            }
          ]
        },
        PublicPrivateKeyPairResponse: null,
        CIMCredentialContextResponse: null
      }

      getCertificatesSpy.mockResolvedValueOnce(mockCertificateResponse)
      removeCertificateSpy.mockResolvedValueOnce(true)

      await deleteAMTCertificate(req, resSpy)

      expect(getCertificatesSpy).toHaveBeenCalled()
      expect(removeCertificateSpy).toHaveBeenCalledWith('Intel(r) AMT Certificate: Handle: 1')
      expect(resSpy.status).toHaveBeenCalledWith(200)
      expect(resSpy.json).toHaveBeenCalledWith({
        message: 'Certificate deleted successfully',
        handle: 'Intel(r) AMT Certificate: Handle: 1'
      })
      expect(publishEventSpy).toHaveBeenCalledWith(
        'success',
        ['AMT_DeleteCertificate'],
        expect.any(String),
        'mock-guid'
      )
    })

    it('should work with handle in request body', async () => {
      req.params.instanceId = undefined
      req.body.handle = 'Intel(r) AMT Certificate: Handle: 2'

      const mockCertificateResponse = {
        PublicKeyCertificateResponse: {
          AMT_PublicKeyCertificate: [
            {
              ElementName: 'Test Certificate',
              InstanceID: 'Intel(r) AMT Certificate: Handle: 2',
              X509Certificate: 'mock-cert-data',
              TrustedRootCertficate: false,
              Issuer: 'CN=Test Issuer',
              Subject: 'CN=Test Subject',
              ReadOnlyCertificate: false,
              PublicKeyHandle: 'key-handle-123',
              AssociatedProfiles: []
            }
          ]
        },
        PublicPrivateKeyPairResponse: null,
        CIMCredentialContextResponse: null
      }

      getCertificatesSpy.mockResolvedValueOnce(mockCertificateResponse)
      removeCertificateSpy.mockResolvedValueOnce(true)

      await deleteAMTCertificate(req, resSpy)

      expect(removeCertificateSpy).toHaveBeenCalledWith('Intel(r) AMT Certificate: Handle: 2')
      expect(resSpy.status).toHaveBeenCalledWith(200)
    })
  })

  describe('Validation Error Cases', () => {
    it('should return 400 when no handle is provided', async () => {
      req.params.instanceId = undefined
      req.body = {}

      await deleteAMTCertificate(req, resSpy)

      expect(resSpy.status).toHaveBeenCalledWith(400)
      expect(resSpy.json).toHaveBeenCalledWith(ErrorResponse(400, 'Certificate handle/instanceId is required'))
    })

    it('should return 404 when certificate is not found', async () => {
      const mockCertificateResponse = {
        PublicKeyCertificateResponse: {
          AMT_PublicKeyCertificate: [
            {
              ElementName: 'Different Certificate',
              InstanceID: 'Intel(r) AMT Certificate: Handle: 999',
              X509Certificate: 'mock-cert-data',
              TrustedRootCertficate: false,
              Issuer: 'CN=Test Issuer',
              Subject: 'CN=Test Subject',
              ReadOnlyCertificate: false,
              PublicKeyHandle: 'key-handle-123',
              AssociatedProfiles: []
            }
          ]
        },
        PublicPrivateKeyPairResponse: null,
        CIMCredentialContextResponse: null
      }

      getCertificatesSpy.mockResolvedValueOnce(mockCertificateResponse)

      await deleteAMTCertificate(req, resSpy)

      expect(resSpy.status).toHaveBeenCalledWith(404)
      expect(resSpy.json).toHaveBeenCalledWith(ErrorResponse(404, "Certificate with handle 'Intel(r) AMT Certificate: Handle: 1' not found"))
    })

    it('should return 400 when certificate is read-only', async () => {
      const mockCertificateResponse = {
        PublicKeyCertificateResponse: {
          AMT_PublicKeyCertificate: [
            {
              ElementName: 'Read-Only Certificate',
              InstanceID: 'Intel(r) AMT Certificate: Handle: 1',
              X509Certificate: 'mock-cert-data',
              TrustedRootCertficate: false,
              Issuer: 'CN=Test Issuer',
              Subject: 'CN=Test Subject',
              ReadOnlyCertificate: true, // Read-only certificate
              PublicKeyHandle: 'key-handle-123',
              AssociatedProfiles: []
            }
          ]
        },
        PublicPrivateKeyPairResponse: null,
        CIMCredentialContextResponse: null
      }

      getCertificatesSpy.mockResolvedValueOnce(mockCertificateResponse)

      await deleteAMTCertificate(req, resSpy)

      expect(resSpy.status).toHaveBeenCalledWith(400)
      expect(resSpy.json).toHaveBeenCalledWith(ErrorResponse(400, "Cannot delete certificate 'Intel(r) AMT Certificate: Handle: 1': Certificate is read-only and cannot be removed"))
    })

    it('should return 409 when certificate has associated profiles', async () => {
      const mockCertificateResponse = {
        PublicKeyCertificateResponse: {
          AMT_PublicKeyCertificate: [
            {
              ElementName: 'Referenced Certificate',
              InstanceID: 'Intel(r) AMT Certificate: Handle: 1',
              X509Certificate: 'mock-cert-data',
              TrustedRootCertficate: false,
              Issuer: 'CN=Test Issuer',
              Subject: 'CN=Test Subject',
              ReadOnlyCertificate: false,
              PublicKeyHandle: 'key-handle-123',
              AssociatedProfiles: ['TLS - profile1', 'Wireless - wifi-profile']
            }
          ]
        },
        PublicPrivateKeyPairResponse: null,
        CIMCredentialContextResponse: null
      }

      getCertificatesSpy.mockResolvedValueOnce(mockCertificateResponse)

      await deleteAMTCertificate(req, resSpy)

      expect(resSpy.status).toHaveBeenCalledWith(409)
      expect(resSpy.json).toHaveBeenCalledWith(ErrorResponse(409, "Cannot delete certificate 'Intel(r) AMT Certificate: Handle: 1': Certificate is currently referenced by the following AMT profiles/configurations: TLS - profile1, Wireless - wifi-profile. Remove these references before deleting the certificate."))
    })

    it('should return 409 when certificate is referenced by TLS credential context', async () => {
      const mockCertificateResponse = {
        PublicKeyCertificateResponse: {
          AMT_PublicKeyCertificate: [
            {
              ElementName: 'TLS Certificate',
              InstanceID: 'Intel(r) AMT Certificate: Handle: 1',
              X509Certificate: 'mock-cert-data',
              TrustedRootCertficate: false,
              Issuer: 'CN=Test Issuer',
              Subject: 'CN=Test Subject',
              ReadOnlyCertificate: false,
              PublicKeyHandle: 'key-handle-123',
              AssociatedProfiles: []
            }
          ]
        },
        PublicPrivateKeyPairResponse: null,
        CIMCredentialContextResponse: {
          AMT_TLSCredentialContext: [
            {
              ElementProvidingContext: {
                ReferenceParameters: {
                  SelectorSet: {
                    Selector: 'Intel(r) AMT:IEEE 802.1x Settings tls-profile'
                  }
                }
              },
              ElementInContext: {
                ReferenceParameters: {
                  SelectorSet: {
                    Selector: 'Intel(r) AMT Certificate: Handle: 1'
                  }
                }
              }
            }
          ]
        }
      }

      getCertificatesSpy.mockResolvedValueOnce(mockCertificateResponse)

      await deleteAMTCertificate(req, resSpy)

      expect(resSpy.status).toHaveBeenCalledWith(409)
      expect(resSpy.json).toHaveBeenCalledWith(ErrorResponse(409, "Cannot delete certificate 'Intel(r) AMT Certificate: Handle: 1': Certificate is currently referenced by the following AMT profiles/configurations: TLS - tls-profile. Remove these references before deleting the certificate."))
    })

    it('should return 409 when certificate is referenced by wireless credential context', async () => {
      const mockCertificateResponse = {
        PublicKeyCertificateResponse: {
          AMT_PublicKeyCertificate: [
            {
              ElementName: 'Wireless Certificate',
              InstanceID: 'Intel(r) AMT Certificate: Handle: 1',
              X509Certificate: 'mock-cert-data',
              TrustedRootCertficate: false,
              Issuer: 'CN=Test Issuer',
              Subject: 'CN=Test Subject',
              ReadOnlyCertificate: false,
              PublicKeyHandle: 'key-handle-123',
              AssociatedProfiles: []
            }
          ]
        },
        PublicPrivateKeyPairResponse: null,
        CIMCredentialContextResponse: {
          AMT_8021XCredentialContext: [
            {
              ElementProvidingContext: {
                ReferenceParameters: {
                  SelectorSet: {
                    Selector: 'Intel(r) AMT:IEEE 802.1x Settings wireless-profile'
                  }
                }
              },
              ElementInContext: {
                ReferenceParameters: {
                  SelectorSet: {
                    Selector: 'Intel(r) AMT Certificate: Handle: 1'
                  }
                }
              }
            }
          ]
        }
      }

      getCertificatesSpy.mockResolvedValueOnce(mockCertificateResponse)

      await deleteAMTCertificate(req, resSpy)

      expect(resSpy.status).toHaveBeenCalledWith(409)
      expect(resSpy.json).toHaveBeenCalledWith(ErrorResponse(409, "Cannot delete certificate 'Intel(r) AMT Certificate: Handle: 1': Certificate is currently referenced by the following AMT profiles/configurations: Wireless - wireless-profile. Remove these references before deleting the certificate."))
    })

    it('should return 500 when getCertificates fails', async () => {
      getCertificatesSpy.mockResolvedValueOnce(null)

      await deleteAMTCertificate(req, resSpy)

      expect(resSpy.status).toHaveBeenCalledWith(500)
      expect(resSpy.json).toHaveBeenCalledWith(ErrorResponse(500, 'Failed to retrieve current certificates'))
    })

    it('should return 500 when removeCertificate fails', async () => {
      const mockCertificateResponse = {
        PublicKeyCertificateResponse: {
          AMT_PublicKeyCertificate: [
            {
              ElementName: 'Test Certificate',
              InstanceID: 'Intel(r) AMT Certificate: Handle: 1',
              X509Certificate: 'mock-cert-data',
              TrustedRootCertficate: false,
              Issuer: 'CN=Test Issuer',
              Subject: 'CN=Test Subject',
              ReadOnlyCertificate: false,
              PublicKeyHandle: 'key-handle-123',
              AssociatedProfiles: []
            }
          ]
        },
        PublicPrivateKeyPairResponse: null,
        CIMCredentialContextResponse: null
      }

      getCertificatesSpy.mockResolvedValueOnce(mockCertificateResponse)
      removeCertificateSpy.mockResolvedValueOnce(false) // Simulate failure

      await deleteAMTCertificate(req, resSpy)

      expect(resSpy.status).toHaveBeenCalledWith(500)
      expect(resSpy.json).toHaveBeenCalledWith(ErrorResponse(500, 'Failed to delete certificate from device'))
    })
  })

  describe('Error Handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      getCertificatesSpy.mockRejectedValueOnce(new Error('Unexpected error'))

      await deleteAMTCertificate(req, resSpy)

      expect(resSpy.status).toHaveBeenCalledWith(500)
      expect(resSpy.json).toHaveBeenCalledWith(ErrorResponse(500, messages.AMT_CERTIFICATES_EXCEPTION))
      expect(publishEventSpy).toHaveBeenCalledWith(
        'fail',
        ['AMT_DeleteCertificate'],
        expect.any(String)
      )
    })
  })

  describe('Reference Detection', () => {
    it('should detect multiple reference types and deduplicate', async () => {
      const mockCertificateResponse = {
        PublicKeyCertificateResponse: {
          AMT_PublicKeyCertificate: [
            {
              ElementName: 'Multi-Referenced Certificate',
              InstanceID: 'Intel(r) AMT Certificate: Handle: 1',
              X509Certificate: 'mock-cert-data',
              TrustedRootCertficate: false,
              Issuer: 'CN=Test Issuer',
              Subject: 'CN=Test Subject',
              ReadOnlyCertificate: false,
              PublicKeyHandle: 'key-handle-123',
              AssociatedProfiles: ['TLS - profile1']
            }
          ]
        },
        PublicPrivateKeyPairResponse: null,
        CIMCredentialContextResponse: {
          AMT_TLSCredentialContext: [
            {
              ElementProvidingContext: {
                ReferenceParameters: {
                  SelectorSet: {
                    Selector: 'Intel(r) AMT:IEEE 802.1x Settings profile1'
                  }
                }
              },
              ElementInContext: {
                ReferenceParameters: {
                  SelectorSet: {
                    Selector: 'Intel(r) AMT Certificate: Handle: 1'
                  }
                }
              }
            }
          ],
          AMT_8021XCredentialContext: [
            {
              ElementProvidingContext: {
                ReferenceParameters: {
                  SelectorSet: {
                    Selector: 'Intel(r) AMT:IEEE 802.1x Settings wireless-profile'
                  }
                }
              },
              ElementInContext: {
                ReferenceParameters: {
                  SelectorSet: {
                    Selector: 'Intel(r) AMT Certificate: Handle: 1'
                  }
                }
              }
            }
          ]
        }
      }

      getCertificatesSpy.mockResolvedValueOnce(mockCertificateResponse)

      await deleteAMTCertificate(req, resSpy)

      expect(resSpy.status).toHaveBeenCalledWith(409)
      const errorMessage = resSpy.json.mock.calls[0][0].errorDescription
      expect(errorMessage).toContain('TLS - profile1')
      expect(errorMessage).toContain('Wireless - wireless-profile')
    })

    it('should handle wired credential context references', async () => {
      const mockCertificateResponse = {
        PublicKeyCertificateResponse: {
          AMT_PublicKeyCertificate: [
            {
              ElementName: 'Wired Certificate',
              InstanceID: 'Intel(r) AMT Certificate: Handle: 1',
              X509Certificate: 'mock-cert-data',
              TrustedRootCertficate: false,
              Issuer: 'CN=Test Issuer',
              Subject: 'CN=Test Subject',
              ReadOnlyCertificate: false,
              PublicKeyHandle: 'key-handle-123',
              AssociatedProfiles: []
            }
          ]
        },
        PublicPrivateKeyPairResponse: null,
        CIMCredentialContextResponse: {
          AMT_8021XWiredCredentialContext: [
            {
              ElementProvidingContext: {
                ReferenceParameters: {
                  SelectorSet: {
                    Selector: 'Intel(r) AMT:IEEE 802.1x Settings wired-profile'
                  }
                }
              },
              ElementInContext: {
                ReferenceParameters: {
                  SelectorSet: {
                    Selector: 'Intel(r) AMT Certificate: Handle: 1'
                  }
                }
              }
            }
          ]
        }
      }

      getCertificatesSpy.mockResolvedValueOnce(mockCertificateResponse)

      await deleteAMTCertificate(req, resSpy)

      expect(resSpy.status).toHaveBeenCalledWith(409)
      expect(resSpy.json).toHaveBeenCalledWith(ErrorResponse(409, "Cannot delete certificate 'Intel(r) AMT Certificate: Handle: 1': Certificate is currently referenced by the following AMT profiles/configurations: Wired - wired-profile. Remove these references before deleting the certificate."))
    })
  })
})