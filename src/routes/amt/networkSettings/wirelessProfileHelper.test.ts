/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { vi } from 'vitest'
import {
  buildWirelessProfileResponses,
  ieee8021xInstanceID,
  configureIEEE8021xCertificates,
  findWirelessSettingByProfileName,
  findWirelessSettingByPriority,
  hasReachedWirelessProfileLimit,
  prepareWirelessProfileForApply,
  toIEEE8021xSettingsRequest,
  toWiFiEndpointSettingsRequest,
  validateWirelessProfileConfig,
  wifiEndpointInstanceID,
  type WirelessProfileConfigRequest
} from './wirelessProfileHelper.js'

describe('wirelessProfileHelper', () => {

  describe('instanceID helpers', () => {
    it('formats instance ids', () => {
      expect(ieee8021xInstanceID('home')).toBe('Intel(r) AMT:IEEE 802.1x Settings home')
      expect(wifiEndpointInstanceID('home')).toBe('Intel(r) AMT:WiFi Endpoint Settings home')
    })
  })

  describe('buildWirelessProfileResponses', () => {
    it('associates 802.1x settings via concrete dependency and omits secrets', () => {
      const wifiItems = {
        CIM_WiFiEndpointSettings: {
          InstanceID: 'Intel(r) AMT:WiFi Endpoint Settings corp',
          ElementName: 'corp',
          Priority: 1,
          SSID: 'corpSsid',
          AuthenticationMethod: 7,
          EncryptionMethod: 4,
          PSKPassPhrase: 'shouldNotLeak'
        }
      }
      const ieee8021xItems = {
        CIM_IEEE8021xSettings: {
          InstanceID: 'Intel(r) AMT:IEEE 802.1x Settings corp',
          ElementName: 'corp',
          Username: 'user',
          Password: 'shouldNotLeak',
          AuthenticationProtocol: 0
        }
      }
      const concreteDependencies = {
        CIM_ConcreteDependency: {
          Antecedent: {
            ReferenceParameters: {
              ResourceURI: 'http://schemas/CIM_WiFiEndpointSettings',
              SelectorSet: {
                Selector: { $: { Name: 'InstanceID' }, _: 'Intel(r) AMT:WiFi Endpoint Settings corp' }
              }
            }
          },
          Dependent: {
            ReferenceParameters: {
              ResourceURI: 'http://schemas/CIM_IEEE8021xSettings',
              SelectorSet: {
                Selector: { $: { Name: 'InstanceID' }, _: 'Intel(r) AMT:IEEE 802.1x Settings corp' }
              }
            }
          }
        }
      }

      const responses = buildWirelessProfileResponses(wifiItems, ieee8021xItems, concreteDependencies)
      expect(responses).toHaveLength(1)
      expect(responses[0]).toEqual({
        profileName: 'corp',
        ssid: 'corpSsid',
        authenticationMethod: 'WPA2IEEE8021x',
        encryptionMethod: 'CCMP',
        priority: 1,
        ieee8021x: { username: 'user', authenticationProtocol: 0 }
      })
      expect(JSON.stringify(responses)).not.toContain('shouldNotLeak')
    })

    it('falls back to profile name association when no concrete dependency exists', () => {
      const wifiItems = {
        CIM_WiFiEndpointSettings: {
          InstanceID: 'Intel(r) AMT:WiFi Endpoint Settings corp',
          ElementName: 'corp',
          Priority: 1,
          AuthenticationMethod: 7,
          EncryptionMethod: 4
        }
      }
      const ieee8021xItems = {
        CIM_IEEE8021xSettings: {
          InstanceID: 'Intel(r) AMT:IEEE 802.1x Settings corp',
          ElementName: 'corp',
          Username: 'user',
          AuthenticationProtocol: 2
        }
      }
      const responses = buildWirelessProfileResponses(wifiItems, ieee8021xItems, null)
      expect(responses[0].ieee8021x).toEqual({ username: 'user', authenticationProtocol: 2 })
    })

    it('associates 802.1x when the concrete dependency direction is reversed', () => {
      const wifiItems = {
        CIM_WiFiEndpointSettings: {
          InstanceID: 'Intel(r) AMT:WiFi Endpoint Settings corp',
          ElementName: 'corp',
          Priority: 1,
          AuthenticationMethod: 7,
          EncryptionMethod: 4
        }
      }
      const ieee8021xItems = {
        CIM_IEEE8021xSettings: {
          InstanceID: 'Intel(r) AMT:IEEE 802.1x Settings other',
          ElementName: 'other',
          Username: 'reversed',
          AuthenticationProtocol: 1
        }
      }
      const concreteDependencies = {
        CIM_ConcreteDependency: {
          Antecedent: {
            ReferenceParameters: {
              ResourceURI: 'http://schemas/CIM_IEEE8021xSettings',
              SelectorSet: {
                Selector: { $: { Name: 'InstanceID' }, _: 'Intel(r) AMT:IEEE 802.1x Settings other' }
              }
            }
          },
          Dependent: {
            ReferenceParameters: {
              ResourceURI: 'http://schemas/CIM_WiFiEndpointSettings',
              SelectorSet: {
                Selector: { $: { Name: 'InstanceID' }, _: 'Intel(r) AMT:WiFi Endpoint Settings corp' }
              }
            }
          }
        }
      }

      const responses = buildWirelessProfileResponses(wifiItems, ieee8021xItems, concreteDependencies)
      expect(responses[0].ieee8021x).toEqual({ username: 'reversed', authenticationProtocol: 1 })
    })

    it('ignores concrete dependencies whose resources do not match either association', () => {
      const wifiItems = {
        CIM_WiFiEndpointSettings: {
          InstanceID: 'Intel(r) AMT:WiFi Endpoint Settings corp',
          ElementName: 'corp',
          Priority: 1,
          AuthenticationMethod: 6,
          EncryptionMethod: 4
        }
      }
      const concreteDependencies = {
        CIM_ConcreteDependency: {
          Antecedent: {
            ReferenceParameters: {
              ResourceURI: 'http://schemas/CIM_SomethingElse',
              SelectorSet: { Selector: { $: { Name: 'InstanceID' }, _: 'a' } }
            }
          },
          Dependent: {
            ReferenceParameters: {
              ResourceURI: 'http://schemas/CIM_Unrelated',
              SelectorSet: { Selector: { $: { Name: 'InstanceID' }, _: 'b' } }
            }
          }
        }
      }

      const responses = buildWirelessProfileResponses(wifiItems, {}, concreteDependencies)
      expect(responses).toHaveLength(1)
      expect(responses[0].ieee8021x).toBeUndefined()
    })

    it('does not associate when the matched reference has no InstanceID selector', () => {
      const wifiItems = {
        CIM_WiFiEndpointSettings: {
          InstanceID: 'Intel(r) AMT:WiFi Endpoint Settings corp',
          ElementName: 'corp',
          Priority: 1,
          AuthenticationMethod: 6,
          EncryptionMethod: 4
        }
      }
      const ieee8021xItems = {
        CIM_IEEE8021xSettings: {
          InstanceID: 'Intel(r) AMT:IEEE 802.1x Settings unrelated',
          ElementName: 'unrelated',
          Username: 'nope',
          AuthenticationProtocol: 0
        }
      }
      const concreteDependencies = {
        CIM_ConcreteDependency: {
          Antecedent: {
            ReferenceParameters: {
              ResourceURI: 'http://schemas/CIM_WiFiEndpointSettings',
              SelectorSet: { Selector: { $: { Name: 'Name' }, _: 'Intel(r) AMT:WiFi Endpoint Settings corp' } }
            }
          },
          Dependent: {
            ReferenceParameters: {
              ResourceURI: 'http://schemas/CIM_IEEE8021xSettings',
              SelectorSet: { Selector: { $: { Name: 'Name' }, _: 'Intel(r) AMT:IEEE 802.1x Settings unrelated' } }
            }
          }
        }
      }

      const responses = buildWirelessProfileResponses(wifiItems, ieee8021xItems, concreteDependencies)
      expect(responses[0].ieee8021x).toBeUndefined()
    })

    it('associates by profile name when no instance-id match exists', () => {
      const wifiItems = {
        CIM_WiFiEndpointSettings: {
          InstanceID: 'Intel(r) AMT:WiFi Endpoint Settings corp',
          ElementName: 'Corp',
          Priority: 1,
          AuthenticationMethod: 7,
          EncryptionMethod: 4
        }
      }
      const ieee8021xItems = {
        CIM_IEEE8021xSettings: {
          InstanceID: 'Intel(r) AMT:IEEE 802.1x Settings non-matching-id',
          ElementName: 'corp',
          Username: 'byname',
          AuthenticationProtocol: 3
        }
      }

      const responses = buildWirelessProfileResponses(wifiItems, ieee8021xItems, null)
      expect(responses[0].ieee8021x).toEqual({ username: 'byname', authenticationProtocol: 3 })
    })

    it('returns no 802.1x for a profile with no element name and no association', () => {
      const wifiItems = {
        CIM_WiFiEndpointSettings: {
          InstanceID: 'Intel(r) AMT:WiFi Endpoint Settings noName',
          Priority: 2,
          AuthenticationMethod: 6,
          EncryptionMethod: 4
        }
      }

      const responses = buildWirelessProfileResponses(wifiItems, {}, null)
      expect(responses).toHaveLength(1)
      expect(responses[0].profileName).toBe('')
      expect(responses[0].ieee8021x).toBeUndefined()
    })

    it('returns no 802.1x when there are no matching 802.1x settings', () => {
      const wifiItems = {
        CIM_WiFiEndpointSettings: {
          InstanceID: 'Intel(r) AMT:WiFi Endpoint Settings open',
          ElementName: 'open',
          Priority: 1,
          AuthenticationMethod: 4,
          EncryptionMethod: 4
        }
      }

      const responses = buildWirelessProfileResponses(wifiItems, {}, null)
      expect(responses[0].ieee8021x).toBeUndefined()
    })

    it('applies defaults for missing username and authentication protocol', () => {
      const wifiItems = {
        CIM_WiFiEndpointSettings: {
          InstanceID: 'Intel(r) AMT:WiFi Endpoint Settings corp',
          ElementName: 'corp',
          Priority: 1,
          AuthenticationMethod: 7,
          EncryptionMethod: 4
        }
      }
      const ieee8021xItems = {
        CIM_IEEE8021xSettings: {
          InstanceID: 'Intel(r) AMT:IEEE 802.1x Settings corp',
          ElementName: 'corp'
        }
      }

      const responses = buildWirelessProfileResponses(wifiItems, ieee8021xItems, null)
      expect(responses[0].ieee8021x).toEqual({ username: '', authenticationProtocol: 0 })
    })

    it('returns an empty list when there are no wireless settings', () => {
      expect(buildWirelessProfileResponses({}, {}, null)).toEqual([])
      expect(buildWirelessProfileResponses(null, null, null)).toEqual([])
    })
  })

  describe('referenceInstanceID selector variants', () => {
    const wifiItems = {
      CIM_WiFiEndpointSettings: {
        InstanceID: 'Intel(r) AMT:WiFi Endpoint Settings corp',
        ElementName: 'corp',
        Priority: 1,
        AuthenticationMethod: 7,
        EncryptionMethod: 4
      }
    }
    const ieee8021xItems = {
      CIM_IEEE8021xSettings: {
        InstanceID: 'Intel(r) AMT:IEEE 802.1x Settings corp',
        ElementName: 'corp',
        Username: 'user',
        AuthenticationProtocol: 0
      }
    }

    const buildDependency = (wifiSelector: unknown, ieee8021xSelector: unknown): unknown => ({
      CIM_ConcreteDependency: {
        Antecedent: {
          ReferenceParameters: {
            ResourceURI: 'http://schemas/CIM_WiFiEndpointSettings',
            SelectorSet: { Selector: wifiSelector }
          }
        },
        Dependent: {
          ReferenceParameters: {
            ResourceURI: 'http://schemas/CIM_IEEE8021xSettings',
            SelectorSet: { Selector: ieee8021xSelector }
          }
        }
      }
    })

    it('reads instance ids from an array of selectors', () => {
      const dependencies = buildDependency(
        [
          { $: { Name: 'Name' }, _: 'ignored' },
          { $: { Name: 'InstanceID' }, _: 'Intel(r) AMT:WiFi Endpoint Settings corp' }
        ],
        { $: { Name: 'InstanceID' }, _: 'Intel(r) AMT:IEEE 802.1x Settings corp' }
      )
      const responses = buildWirelessProfileResponses(wifiItems, ieee8021xItems, dependencies)
      expect(responses[0].ieee8021x).toEqual({ username: 'user', authenticationProtocol: 0 })
    })

    it('reads instance ids from Name/Text selector shapes', () => {
      const dependencies = buildDependency(
        { Name: 'InstanceID', Text: 'Intel(r) AMT:WiFi Endpoint Settings corp' },
        { Name: 'InstanceID', Text: 'Intel(r) AMT:IEEE 802.1x Settings corp' }
      )
      const responses = buildWirelessProfileResponses(wifiItems, ieee8021xItems, dependencies)
      expect(responses[0].ieee8021x).toEqual({ username: 'user', authenticationProtocol: 0 })
    })
  })

  describe('configureIEEE8021xCertificates', () => {
    it('reuses existing handles without adding', async () => {
      const device: any = {
        getCertificates: vi.fn().mockResolvedValue({
          PublicKeyCertificateResponse: {
            AMT_PublicKeyCertificate: [
              { InstanceID: 'client-handle', X509Certificate: 'clientPem', TrustedRootCertficate: false },
              { InstanceID: 'root-handle', X509Certificate: 'caPem', TrustedRootCertficate: true }
            ]
          },
          PublicPrivateKeyPairResponse: {
            AMT_PublicPrivateKeyPair: { InstanceID: 'key-handle', DERKey: 'keyDer' }
          }
        }),
        addPrivateKey: vi.fn(),
        addCertificate: vi.fn()
      }

      const result = await configureIEEE8021xCertificates(device, 'keyDer', 'clientPem', 'caPem')
      expect(result.handles).toEqual({ clientCertHandle: 'client-handle', rootCertHandle: 'root-handle' })
      expect(result.addedCredentials).toBe(false)
      expect(device.addPrivateKey).not.toHaveBeenCalled()
      expect(device.addCertificate).not.toHaveBeenCalled()
    })

    it('adds missing credentials and flags pause', async () => {
      const device: any = {
        getCertificates: vi.fn().mockResolvedValue({
          PublicKeyCertificateResponse: { AMT_PublicKeyCertificate: [] },
          PublicPrivateKeyPairResponse: { AMT_PublicPrivateKeyPair: [] }
        }),
        addPrivateKey: vi.fn().mockResolvedValue('new-key'),
        addCertificate: vi.fn().mockResolvedValueOnce('new-client').mockResolvedValueOnce('new-root')
      }

      const result = await configureIEEE8021xCertificates(device, 'keyDer', 'clientPem', 'caPem')
      expect(result.handles).toEqual({ clientCertHandle: 'new-client', rootCertHandle: 'new-root' })
      expect(result.addedCredentials).toBe(true)
      expect(device.addCertificate).toHaveBeenCalledWith('clientPem', false)
      expect(device.addCertificate).toHaveBeenCalledWith('caPem', true)
    })

    it('refreshes and resolves a handle when add returns null (already exists)', async () => {
      const device: any = {
        getCertificates: vi
          .fn()
          .mockResolvedValueOnce({
            PublicKeyCertificateResponse: { AMT_PublicKeyCertificate: [] },
            PublicPrivateKeyPairResponse: { AMT_PublicPrivateKeyPair: [] }
          })
          .mockResolvedValueOnce({
            PublicKeyCertificateResponse: {
              AMT_PublicKeyCertificate: {
                InstanceID: 'existing-root',
                X509Certificate: 'caPem',
                TrustedRootCertficate: true
              }
            },
            PublicPrivateKeyPairResponse: { AMT_PublicPrivateKeyPair: [] }
          }),
        addPrivateKey: vi.fn(),
        addCertificate: vi.fn().mockResolvedValue(null)
      }

      const result = await configureIEEE8021xCertificates(device, '', '', 'caPem')
      expect(result.handles.rootCertHandle).toBe('existing-root')
      expect(result.addedCredentials).toBe(false)
    })

    it('treats an empty private-key handle (key already on device) as success', async () => {
      const device: any = {
        getCertificates: vi.fn().mockResolvedValue({
          PublicKeyCertificateResponse: {
            AMT_PublicKeyCertificate: [
              { InstanceID: 'client-handle', X509Certificate: 'clientPem', TrustedRootCertficate: false },
              { InstanceID: 'root-handle', X509Certificate: 'caPem', TrustedRootCertficate: true }
            ]
          },
          PublicPrivateKeyPairResponse: { AMT_PublicPrivateKeyPair: [] }
        }),
        addPrivateKey: vi.fn().mockResolvedValue(''),
        addCertificate: vi.fn()
      }

      const result = await configureIEEE8021xCertificates(device, 'keyDer', 'clientPem', 'caPem')
      expect(device.addPrivateKey).toHaveBeenCalledWith('keyDer')
      expect(result.handles).toEqual({ clientCertHandle: 'client-handle', rootCertHandle: 'root-handle' })
      expect(result.addedCredentials).toBe(true)
    })

    it('throws when a private key add genuinely fails', async () => {
      const device: any = {
        getCertificates: vi.fn().mockResolvedValue({
          PublicKeyCertificateResponse: { AMT_PublicKeyCertificate: [] },
          PublicPrivateKeyPairResponse: { AMT_PublicPrivateKeyPair: [] }
        }),
        addPrivateKey: vi.fn().mockResolvedValue(null),
        addCertificate: vi.fn()
      }

      await expect(configureIEEE8021xCertificates(device, 'keyDer', '', '')).rejects.toThrow(
        'failed to resolve certificate handle'
      )
    })
  })

  describe('findWirelessSettingByProfileName', () => {
    const mockSettings = [
      {
        InstanceID: 'Intel(r) AMT:WiFi Endpoint Settings home',
        ElementName: 'home',
        Priority: 1,
        SSID: 'homeSsid',
        AuthenticationMethod: 6,
        EncryptionMethod: 4
      },
      {
        InstanceID: 'Intel(r) AMT:WiFi Endpoint Settings work',
        ElementName: 'work',
        Priority: 2,
        SSID: 'workSsid',
        AuthenticationMethod: 7,
        EncryptionMethod: 4
      },
      {
        InstanceID: 'Intel(r) AMT:WiFi Endpoint Settings guest',
        ElementName: 'guest',
        Priority: 3,
        SSID: 'guestSsid',
        AuthenticationMethod: 4,
        EncryptionMethod: 4
      }
    ]

    it('finds a setting by profile name', () => {
      const result = findWirelessSettingByProfileName(mockSettings as any, 'work')
      expect(result).toEqual(mockSettings[1])
    })

    it('returns the first matching profile when multiple exist', () => {
      const result = findWirelessSettingByProfileName(mockSettings as any, 'home')
      expect(result?.ElementName).toBe('home')
    })

    it('returns null when profile name is not found', () => {
      const result = findWirelessSettingByProfileName(mockSettings as any, 'nonexistent')
      expect(result).toBeNull()
    })

    it('returns null for empty settings array', () => {
      const result = findWirelessSettingByProfileName([], 'home')
      expect(result).toBeNull()
    })

    it('is case-sensitive', () => {
      const result = findWirelessSettingByProfileName(mockSettings as any, 'HOME')
      expect(result).toBeNull()
    })
  })

  describe('findWirelessSettingByPriority', () => {
    const mockSettings = [
      {
        InstanceID: 'Intel(r) AMT:WiFi Endpoint Settings home',
        ElementName: 'home',
        Priority: 1,
        SSID: 'homeSsid',
        AuthenticationMethod: 6,
        EncryptionMethod: 4
      },
      {
        InstanceID: 'Intel(r) AMT:WiFi Endpoint Settings work',
        ElementName: 'work',
        Priority: 2,
        SSID: 'workSsid',
        AuthenticationMethod: 7,
        EncryptionMethod: 4
      },
      {
        InstanceID: 'Intel(r) AMT:WiFi Endpoint Settings guest',
        ElementName: 'guest',
        Priority: 3,
        SSID: 'guestSsid',
        AuthenticationMethod: 4,
        EncryptionMethod: 4
      }
    ]

    it('finds a setting by priority', () => {
      const result = findWirelessSettingByPriority(mockSettings as any, 2)
      expect(result).toEqual(mockSettings[1])
    })

    it('returns the first matching priority when multiple exist', () => {
      const result = findWirelessSettingByPriority(mockSettings as any, 1)
      expect(result?.ElementName).toBe('home')
    })

    it('returns null when priority is not found', () => {
      const result = findWirelessSettingByPriority(mockSettings as any, 99)
      expect(result).toBeNull()
    })

    it('returns null for empty settings array', () => {
      const result = findWirelessSettingByPriority([], 1)
      expect(result).toBeNull()
    })

    it('finds settings with high priority values', () => {
      const result = findWirelessSettingByPriority(mockSettings as any, 3)
      expect(result?.ElementName).toBe('guest')
    })

    it('does not find a setting with priority 0', () => {
      const result = findWirelessSettingByPriority(mockSettings as any, 0)
      expect(result).toBeNull()
    })
  })

  describe('hasReachedWirelessProfileLimit', () => {
    const makeSettings = (count: number): any[] =>
      Array.from({ length: count }, (_, index) => ({
        InstanceID: `Intel(r) AMT:WiFi Endpoint Settings p${index}`,
        ElementName: `p${index}`,
        Priority: index + 1
      }))

    it('returns false below the maximum of 8 profiles', () => {
      expect(hasReachedWirelessProfileLimit([])).toBe(false)
      expect(hasReachedWirelessProfileLimit(makeSettings(7))).toBe(false)
    })

    it('returns true at or above the maximum of 8 profiles', () => {
      expect(hasReachedWirelessProfileLimit(makeSettings(8))).toBe(true)
      expect(hasReachedWirelessProfileLimit(makeSettings(9))).toBe(true)
    })
  })

  describe('prepareWirelessProfileForApply', () => {
    it('skips certificate handling for PSK profiles', async () => {
      const device: any = { getCertificates: vi.fn() }
      const prepared = await prepareWirelessProfileForApply(device, {
        profileName: 'home',
        ssid: 'ssid',
        priority: 1,
        authenticationMethod: 'WPA2PSK',
        encryptionMethod: 'CCMP',
        password: 'secret'
      })
      expect(prepared.needsPauseBeforeApply).toBe(false)
      expect(prepared.ieee8021xRequest).toEqual({})
      expect(device.getCertificates).not.toHaveBeenCalled()
    })
  })

  describe('request builders', () => {
    it('builds a WiFi endpoint settings request', () => {
      const request = toWiFiEndpointSettingsRequest({
        profileName: 'home',
        ssid: 'mySsid',
        priority: 3,
        authenticationMethod: 'WPA2PSK',
        encryptionMethod: 'CCMP',
        password: 'secret'
      })
      expect(request).toEqual(
        expect.objectContaining({
          ElementName: 'home',
          InstanceID: 'Intel(r) AMT:WiFi Endpoint Settings home',
          AuthenticationMethod: 6,
          EncryptionMethod: 4,
          SSID: 'mySsid',
          Priority: 3,
          PSKPassPhrase: 'secret'
        })
      )
    })

    it('builds an empty 802.1x request when none provided', () => {
      expect(toIEEE8021xSettingsRequest({ profileName: 'home' })).toEqual({})
    })

    it('builds an 802.1x request when provided', () => {
      const request = toIEEE8021xSettingsRequest({
        profileName: 'corp',
        ieee8021x: { username: 'user', password: 'pass', authenticationProtocol: 0 }
      })
      expect(request).toEqual(
        expect.objectContaining({
          ElementName: 'corp',
          InstanceID: 'Intel(r) AMT:IEEE 802.1x Settings corp',
          AuthenticationProtocol: 0,
          Username: 'user',
          Password: 'pass'
        })
      )
    })
  })

  describe('validateWirelessProfileConfig', () => {
    const basePSK: WirelessProfileConfigRequest = {
      profileName: 'home',
      ssid: 'mySsid',
      priority: 1,
      authenticationMethod: 'WPA2PSK',
      encryptionMethod: 'CCMP',
      password: 'superSecret'
    }

    it('accepts a valid PSK profile', () => {
      expect(validateWirelessProfileConfig(basePSK)).toBeNull()
    })

    it('rejects non-alphanumeric profile names', () => {
      expect(validateWirelessProfileConfig({ ...basePSK, profileName: 'no spaces' })).not.toBeNull()
    })

    it('rejects missing ssid', () => {
      expect(validateWirelessProfileConfig({ ...basePSK, ssid: '' })).not.toBeNull()
    })

    it('rejects priority out of range', () => {
      expect(validateWirelessProfileConfig({ ...basePSK, priority: 0 })).not.toBeNull()
      expect(validateWirelessProfileConfig({ ...basePSK, priority: 256 })).not.toBeNull()
    })

    it('rejects invalid authentication/encryption methods', () => {
      expect(validateWirelessProfileConfig({ ...basePSK, authenticationMethod: 'bogus' })).not.toBeNull()
      expect(validateWirelessProfileConfig({ ...basePSK, encryptionMethod: 'bogus' })).not.toBeNull()
    })

    it('rejects PSK profile that also includes ieee8021x', () => {
      expect(
        validateWirelessProfileConfig({
          ...basePSK,
          ieee8021x: { username: 'u', authenticationProtocol: 0 }
        })
      ).not.toBeNull()
    })

    it('rejects PSK profile without password', () => {
      expect(validateWirelessProfileConfig({ ...basePSK, password: '' })).not.toBeNull()
    })

    it('accepts a valid 802.1x profile', () => {
      expect(
        validateWirelessProfileConfig({
          profileName: 'corp',
          ssid: 'corpSsid',
          priority: 2,
          authenticationMethod: 'WPA2IEEE8021x',
          encryptionMethod: 'CCMP',
          ieee8021x: { username: 'user', password: 'pass', authenticationProtocol: 0 }
        })
      ).toBeNull()
    })

    it('rejects 802.1x profile with a password at top level', () => {
      expect(
        validateWirelessProfileConfig({
          profileName: 'corp',
          ssid: 'corpSsid',
          priority: 2,
          authenticationMethod: 'WPA2IEEE8021x',
          encryptionMethod: 'CCMP',
          password: 'nope',
          ieee8021x: { username: 'user', authenticationProtocol: 0 }
        })
      ).not.toBeNull()
    })

    it('rejects 802.1x profile with unsupported authentication protocol', () => {
      expect(
        validateWirelessProfileConfig({
          profileName: 'corp',
          ssid: 'corpSsid',
          priority: 2,
          authenticationMethod: 'WPA2IEEE8021x',
          encryptionMethod: 'CCMP',
          ieee8021x: { username: 'user', authenticationProtocol: 1 }
        })
      ).not.toBeNull()
    })

    it('rejects 802.1x profile without a username', () => {
      expect(
        validateWirelessProfileConfig({
          profileName: 'corp',
          ssid: 'corpSsid',
          priority: 2,
          authenticationMethod: 'WPA2IEEE8021x',
          encryptionMethod: 'CCMP',
          ieee8021x: { authenticationProtocol: 0 }
        })
      ).not.toBeNull()
    })
  })
})
