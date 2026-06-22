/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { vi } from 'vitest'
import { addWirelessProfile } from './addWirelessProfile.js'
import { createSpyObj } from '../../../test/helper/vitest.js'
import { CIRAHandler } from '../../../amt/CIRAHandler.js'
import { DeviceAction } from '../../../amt/DeviceAction.js'
import { HttpHandler } from '../../../amt/HttpHandler.js'

const wifiPort = { Body: { PullResponse: { Items: { CIM_WiFiPort: { InstanceID: 'WiFi Endpoint 0' } } } } }
const emptyWifiSettings = { Body: { PullResponse: { Items: '' } } }

const validPSKProfile = {
  profileName: 'home',
  ssid: 'homeSsid',
  priority: 1,
  authenticationMethod: 'WPA2PSK',
  encryptionMethod: 'CCMP',
  password: 'superSecret'
}

describe('wireless profiles - add', () => {
  let resSpy
  let req
  let device
  let portSpy
  let wifiSpy
  let addSpy

  beforeEach(() => {
    const handler = new CIRAHandler(new HttpHandler(), 'admin', 'P@ssw0rd')
    device = new DeviceAction(handler, null)
    resSpy = createSpyObj('Response', [
      'status',
      'json',
      'end',
      'send'
    ])
    req = {
      params: { guid: '4c4c4544-004b-4210-8033-b6c04f504633' },
      body: {},
      deviceAction: device
    }
    resSpy.status.mockReturnThis()
    resSpy.json.mockReturnThis()
    resSpy.send.mockReturnThis()
    resSpy.end.mockReturnThis()

    portSpy = vi.spyOn(device, 'getWiFiPortState')
    wifiSpy = vi.spyOn(device, 'getWiFiEndpointSettings')
    addSpy = vi.spyOn(device, 'addWiFiSettings')
  })

  it('adds a PSK profile and returns 204', async () => {
    req.body = { ...validPSKProfile }
    portSpy.mockResolvedValueOnce(wifiPort as any)
    wifiSpy.mockResolvedValueOnce(emptyWifiSettings as any)
    addSpy.mockResolvedValueOnce(0)

    await addWirelessProfile(req, resSpy)

    expect(addSpy).toHaveBeenCalledWith(
      expect.objectContaining({ ElementName: 'home', AuthenticationMethod: 6, EncryptionMethod: 4 }),
      undefined,
      undefined,
      undefined
    )
    expect(resSpy.status).toHaveBeenCalledWith(204)
  })

  it('returns 400 on validation error', async () => {
    req.body = { ...validPSKProfile, profileName: '' }
    await addWirelessProfile(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(400)
    expect(portSpy).not.toHaveBeenCalled()
  })

  it('returns 404 when no WiFi port', async () => {
    req.body = { ...validPSKProfile }
    portSpy.mockResolvedValueOnce(null as any)
    await addWirelessProfile(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(404)
    expect(resSpy.json).toHaveBeenCalledWith({
      error: 'No WiFi port found on the device',
      errorDescription: `No WiFi port found on the device for guid : ${req.params.guid}.`
    })
  })

  it('returns 409 when profile name already exists', async () => {
    req.body = { ...validPSKProfile }
    portSpy.mockResolvedValueOnce(wifiPort as any)
    wifiSpy.mockResolvedValueOnce({
      Body: {
        PullResponse: {
          Items: {
            CIM_WiFiEndpointSettings: {
              InstanceID: 'Intel(r) AMT:WiFi Endpoint Settings home',
              ElementName: 'home',
              Priority: 5
            }
          }
        }
      }
    } as any)
    await addWirelessProfile(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(409)
    expect(addSpy).not.toHaveBeenCalled()
  })

  it('returns 409 when priority already exists', async () => {
    req.body = { ...validPSKProfile }
    portSpy.mockResolvedValueOnce(wifiPort as any)
    wifiSpy.mockResolvedValueOnce({
      Body: {
        PullResponse: {
          Items: {
            CIM_WiFiEndpointSettings: {
              InstanceID: 'Intel(r) AMT:WiFi Endpoint Settings other',
              ElementName: 'other',
              Priority: 1
            }
          }
        }
      }
    } as any)
    await addWirelessProfile(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(409)
  })

  it('returns 409 when the device already has the maximum number of profiles', async () => {
    req.body = { ...validPSKProfile }
    portSpy.mockResolvedValueOnce(wifiPort as any)
    wifiSpy.mockResolvedValueOnce({
      Body: {
        PullResponse: {
          Items: {
            CIM_WiFiEndpointSettings: Array.from({ length: 8 }, (_, index) => ({
              InstanceID: `Intel(r) AMT:WiFi Endpoint Settings existing${index}`,
              ElementName: `existing${index}`,
              Priority: index + 10
            }))
          }
        }
      }
    } as any)
    await addWirelessProfile(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(409)
    expect(resSpy.json).toHaveBeenCalledWith(
      expect.objectContaining({
        errorDescription: `Maximum number of wireless profiles already configured on the device for guid : ${req.params.guid}.`
      })
    )
    expect(addSpy).not.toHaveBeenCalled()
  })

  it('returns 400 when AddWiFiSettings returns null', async () => {
    req.body = { ...validPSKProfile }
    portSpy.mockResolvedValueOnce(wifiPort as any)
    wifiSpy.mockResolvedValueOnce(emptyWifiSettings as any)
    addSpy.mockResolvedValueOnce(null)
    await addWirelessProfile(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(400)
  })

  it('returns 400 when AddWiFiSettings returns a non-zero ReturnValue', async () => {
    req.body = { ...validPSKProfile }
    portSpy.mockResolvedValueOnce(wifiPort as any)
    wifiSpy.mockResolvedValueOnce(emptyWifiSettings as any)
    addSpy.mockResolvedValueOnce(1)
    await addWirelessProfile(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(400)
  })

  it('configures 802.1x certificates and applies after pause', async () => {
    vi.useFakeTimers()
    req.body = {
      profileName: 'corp',
      ssid: 'corpSsid',
      priority: 2,
      authenticationMethod: 'WPA2IEEE8021x',
      encryptionMethod: 'CCMP',
      ieee8021x: {
        username: 'user',
        authenticationProtocol: 0,
        privateKey: 'keyDer',
        clientCert: 'clientPem',
        caCert: 'caPem'
      }
    }
    portSpy.mockResolvedValueOnce(wifiPort as any)
    wifiSpy.mockResolvedValueOnce(emptyWifiSettings as any)
    vi.spyOn(device, 'getCertificates').mockResolvedValue({
      PublicKeyCertificateResponse: { AMT_PublicKeyCertificate: [] },
      PublicPrivateKeyPairResponse: { AMT_PublicPrivateKeyPair: [] }
    } as any)
    vi.spyOn(device, 'addPrivateKey').mockResolvedValue('key-handle')
    vi.spyOn(device, 'addCertificate').mockResolvedValueOnce('client-handle').mockResolvedValueOnce('root-handle')
    addSpy.mockResolvedValue(0)

    const promise = addWirelessProfile(req, resSpy)
    await vi.runAllTimersAsync()
    await promise

    expect(addSpy).toHaveBeenCalledWith(
      expect.objectContaining({ ElementName: 'corp' }),
      expect.objectContaining({ Username: 'user' }),
      'client-handle',
      'root-handle'
    )
    expect(resSpy.status).toHaveBeenCalledWith(204)
    vi.useRealTimers()
  })

  it('returns 500 on error', async () => {
    req.body = { ...validPSKProfile }
    portSpy.mockRejectedValueOnce(new Error('boom'))
    await addWirelessProfile(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(500)
  })
})
