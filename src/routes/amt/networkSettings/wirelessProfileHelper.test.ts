/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import {
  buildWirelessProfileResponses,
  ieee8021xInstanceID
} from './wirelessProfileHelper.js'

describe('wirelessProfileHelper', () => {

  describe('instanceID helpers', () => {
    it('formats instance ids', () => {
      expect(ieee8021xInstanceID('home')).toBe('Intel(r) AMT:IEEE 802.1x Settings home')
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
})
