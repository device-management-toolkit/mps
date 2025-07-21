/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { createSpyObj } from '../../../test/helper/jest.js'
import { getAMTCertificates } from './get.js'
import { HttpHandler } from '../../../amt/HttpHandler.js'
import { CIRAHandler } from '../../../amt/CIRAHandler.js'
import { DeviceAction } from '../../../amt/DeviceAction.js'
import { messages } from '../../../logging/index.js'
import { spyOn } from 'jest-mock'
// Add this import for jest functions
import { jest } from '@jest/globals'

describe('getAMTCertificates', () => {
  let resSpy
  let req
  let getCertificatesSpy

  const mockCertificateResponse = {
    PublicKeyCertificateResponse: {
      AMT_PublicKeyCertificate: [
        {
          ElementName: 'Test Certificate',
          InstanceID: 'cert-123',
          X509Certificate: 'mock-x509-data',
          TrustedRootCertificate: true,
          Issuer: 'CN=Test Issuer',
          Subject: 'CN=Test Subject',
          ReadOnlyCertificate: false,
          PublicKeyHandle: 'key-handle-123',
          AssociatedProfiles: []
        }
      ]
    },
    PublicPrivateKeyPairResponse: {
      AMT_PublicPrivateKeyPair: [
        {
          ElementName: 'Test Key Pair',
          InstanceID: 'keypair-123',
          DERKey: 'mock-der-key',
          CertificateHandle: 'cert-handle-123'
        }
      ]
    },
    CIMCredentialContextResponse: {
      AMT_TLSCredentialContext: [
        {
          ElementProvidingContext: {
            ReferenceParameters: {
              SelectorSet: {
                Selector: 'Intel(r) AMT:IEEE 802.1x Settings test-profile'
              }
            }
          },
          ElementInContext: {
            ReferenceParameters: {
              SelectorSet: {
                Selector: 'cert-123'
              }
            }
          }
        }
      ]
    },
    ConcreteDependencyResponse: {
      CIM_ConcreteDependency: [
        {
          Antecedent: {
            ReferenceParameters: {
              SelectorSet: {
                Selector: 'cert-123'
              }
            }
          },
          Dependent: {
            ReferenceParameters: {
              SelectorSet: {
                Selector: 'keypair-123'
              }
            }
          }
        }
      ]
    }
  }

  beforeEach(() => {
    const handler = new CIRAHandler(new HttpHandler(), 'admin', 'P@ssw0rd')
    const device = new DeviceAction(handler, null)

    resSpy = createSpyObj('Response', [
      'status',
      'json',
      'end'
    ])

    req = {
      params: { guid: '4c4c4544-004b-4210-8033-b6c04f504633' },
      deviceAction: device
    }

    resSpy.status.mockReturnThis()
    resSpy.json.mockReturnThis()
    resSpy.end.mockReturnThis()

    getCertificatesSpy = spyOn(device, 'getCertificates')
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should successfully get AMT certificates', async () => {
    getCertificatesSpy.mockResolvedValueOnce(mockCertificateResponse)

    await getAMTCertificates(req, resSpy)

    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith(
      expect.objectContaining({
        certificates: expect.objectContaining({
          keyManagementItems: [],
          publicKeyCertificateItems: expect.arrayContaining([
            expect.objectContaining({
              elementName: 'Test Certificate',
              instanceID: 'cert-123',
              displayName: 'Test Subject'
            })
          ])
        }),
        publicKeys: expect.objectContaining({
          publicPrivateKeyPairItems: expect.arrayContaining([
            expect.objectContaining({
              elementName: 'Test Key Pair',
              instanceID: 'keypair-123'
            })
          ])
        }),
        profileAssociation: expect.any(Array)
      })
    )
    expect(resSpy.end).toHaveBeenCalled()
  })

  it('should handle wireless credential context', async () => {
    const wirelessResponse = {
      ...mockCertificateResponse,
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
                  Selector: 'cert-123'
                }
              }
            }
          }
        ]
      }
    }

    getCertificatesSpy.mockResolvedValueOnce(wirelessResponse)

    await getAMTCertificates(req, resSpy)

    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith(
      expect.objectContaining({
        profileAssociation: expect.arrayContaining([
          expect.objectContaining({
            type: 'Wireless',
            profileID: 'wireless-profile'
          })
        ])
      })
    )
  })

  it('should handle wired credential context', async () => {
    const wiredResponse = {
      ...mockCertificateResponse,
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
                  Selector: 'cert-123'
                }
              }
            }
          }
        ]
      }
    }

    getCertificatesSpy.mockResolvedValueOnce(wiredResponse)

    await getAMTCertificates(req, resSpy)

    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith(
      expect.objectContaining({
        profileAssociation: expect.arrayContaining([
          expect.objectContaining({
            type: 'Wired',
            profileID: 'wired-profile'
          })
        ])
      })
    )
  })

  it('should handle empty certificate response', async () => {
    const emptyCertResponse = {
      PublicKeyCertificateResponse: null,
      PublicPrivateKeyPairResponse: null,
      CIMCredentialContextResponse: null
    }

    getCertificatesSpy.mockResolvedValueOnce(emptyCertResponse)

    await getAMTCertificates(req, resSpy)

    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith({
      certificates: {
        keyManagementItems: [],
        publicKeyCertificateItems: []
      },
      publicKeys: {
        publicPrivateKeyPairItems: []
      },
      profileAssociation: []
    })
  })

  it('should return 404 error when getCertificates returns null', async () => {
    getCertificatesSpy.mockResolvedValueOnce(null)

    await getAMTCertificates(req, resSpy)

    expect(resSpy.status).toHaveBeenCalledWith(404)
  })

  it('should handle unexpected exceptions with status 500', async () => {
    const genericError = new Error('Unexpected error')
    getCertificatesSpy.mockRejectedValueOnce(genericError)

    await getAMTCertificates(req, resSpy)

    expect(resSpy.status).toHaveBeenCalledWith(500)
    expect(resSpy.json).toHaveBeenCalledWith({
      error: 'Internal Server Error',
      errorDescription: messages.AMT_CERTIFICATES_EXCEPTION
    })
  })

  it('should process single certificate (not array)', async () => {
    const singleCertResponse = {
      PublicKeyCertificateResponse: {
        AMT_PublicKeyCertificate: {
          ElementName: 'Single Certificate',
          InstanceID: 'single-cert-123',
          X509Certificate: 'single-x509-data',
          TrustedRootCertificate: false,
          Issuer: 'CN=Single Issuer',
          Subject: 'CN=Single Subject',
          ReadOnlyCertificate: true,
          PublicKeyHandle: 'single-key-handle-123',
          AssociatedProfiles: []
        }
      },
      PublicPrivateKeyPairResponse: {
        AMT_PublicPrivateKeyPair: {
          ElementName: 'Single Key Pair',
          InstanceID: 'single-keypair-123',
          DERKey: 'single-der-key',
          CertificateHandle: 'single-cert-handle-123'
        }
      },
      CIMCredentialContextResponse: null
    }

    getCertificatesSpy.mockResolvedValueOnce(singleCertResponse)

    await getAMTCertificates(req, resSpy)

    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith(
      expect.objectContaining({
        certificates: expect.objectContaining({
          publicKeyCertificateItems: [
            expect.objectContaining({
              elementName: 'Single Certificate',
              instanceID: 'single-cert-123',
              displayName: 'Single Subject'
            })
          ]
        }),
        publicKeys: expect.objectContaining({
          publicPrivateKeyPairItems: [
            expect.objectContaining({
              elementName: 'Single Key Pair',
              instanceID: 'single-keypair-123'
            })
          ]
        })
      })
    )
  })

  it('should handle certificate subject without CN', async () => {
    const noCNResponse = {
      PublicKeyCertificateResponse: {
        AMT_PublicKeyCertificate: {
          ElementName: 'No CN Certificate',
          InstanceID: 'no-cn-123',
          X509Certificate: 'no-cn-x509-data',
          TrustedRootCertificate: false,
          Issuer: 'O=Organization',
          Subject: 'O=Organization,L=Location',
          ReadOnlyCertificate: false,
          PublicKeyHandle: 'no-cn-key-handle',
          AssociatedProfiles: []
        }
      },
      PublicPrivateKeyPairResponse: null,
      CIMCredentialContextResponse: null
    }

    getCertificatesSpy.mockResolvedValueOnce(noCNResponse)

    await getAMTCertificates(req, resSpy)

    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith(
      expect.objectContaining({
        certificates: expect.objectContaining({
          publicKeyCertificateItems: [
            expect.objectContaining({
              elementName: 'No CN Certificate',
              instanceID: 'no-cn-123',
              displayName: 'no-cn-123'
            })
          ]
        })
      })
    )
  })
})
