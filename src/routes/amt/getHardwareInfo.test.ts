/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { vi } from 'vitest'
import { hardwareInfo } from './getHardwareInfo.js'
import { createSpyObj } from '../../test/helper/vitest.js'
import {
  biosElement,
  card,
  chassis,
  chip,
  computerSystemPackage,
  mediaAccessDevice,
  physicalMemory,
  physicalPackage,
  processor,
  systemPackaging
} from '../../test/helper/wsmanResponses.js'
import { type DeviceAction } from '../../amt/DeviceAction.js'
// import { CIRAHandler } from '../../amt/CIRAHandler.js'
// import { HttpHandler } from '../../amt/HttpHandler.js'
import { messages } from '../../logging/index.js'
describe('Hardware information', () => {
  let resSpy
  let req
  let ComputerSystemPackageSpy, ChassisSpy, CardSpy, BIOSElementSpy, ProcessorSpy
  let PhysicalMemorySpy, MediaAccessDeviceSpy, PhysicalPackageSpy, SystemPackagingSpy, ChipSpy
  let device: DeviceAction
  beforeEach(() => {
    // const handler = new CIRAHandler(new HttpHandler(), 'admin', 'P@ssw0rd')
    device = {
      getComputerSystemPackage: vi.fn(),
      getChassis: vi.fn(),
      getCard: vi.fn(),
      getBIOSElement: vi.fn(),
      getProcessor: vi.fn(),
      getPhysicalMemory: vi.fn(),
      getMediaAccessDevice: vi.fn(),
      getPhysicalPackage: vi.fn(),
      getSystemPackaging: vi.fn(),
      getChip: vi.fn()
    } as any
    // new DeviceAction(handler, null)
    resSpy = createSpyObj('Response', [
      'status',
      'json',
      'end',
      'send'
    ])
    req = { params: { guid: '4c4c4544-004b-4210-8033-b6c04f504633' }, deviceAction: device }
    resSpy.status.mockReturnThis()
    resSpy.json.mockReturnThis()
    resSpy.send.mockReturnThis()
    ComputerSystemPackageSpy = vi.spyOn(device, 'getComputerSystemPackage')
    ChassisSpy = vi.spyOn(device, 'getChassis')
    CardSpy = vi.spyOn(device, 'getCard')
    BIOSElementSpy = vi.spyOn(device, 'getBIOSElement')
    ProcessorSpy = vi.spyOn(device, 'getProcessor')
    PhysicalMemorySpy = vi.spyOn(device, 'getPhysicalMemory')
    MediaAccessDeviceSpy = vi.spyOn(device, 'getMediaAccessDevice')
    PhysicalPackageSpy = vi.spyOn(device, 'getPhysicalPackage')
    SystemPackagingSpy = vi.spyOn(device, 'getSystemPackaging')
    ChipSpy = vi.spyOn(device, 'getChip')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should get hardware information', async () => {
    ComputerSystemPackageSpy.mockResolvedValueOnce(computerSystemPackage.Envelope)
    ChassisSpy.mockResolvedValueOnce(chassis.Envelope)
    CardSpy.mockResolvedValueOnce(card.Envelope)
    BIOSElementSpy.mockResolvedValueOnce(biosElement.Envelope)
    ProcessorSpy.mockResolvedValueOnce(processor.Envelope)
    PhysicalMemorySpy.mockResolvedValueOnce(physicalMemory.Envelope)
    MediaAccessDeviceSpy.mockResolvedValueOnce(mediaAccessDevice.Envelope)
    PhysicalPackageSpy.mockResolvedValueOnce(physicalPackage.Envelope)
    SystemPackagingSpy.mockResolvedValueOnce(systemPackaging.Envelope)
    ChipSpy.mockResolvedValueOnce(chip.Envelope)
    await hardwareInfo(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
  })
  it('should handle error 400', async () => {
    ComputerSystemPackageSpy.mockResolvedValueOnce(null)
    ChassisSpy.mockResolvedValueOnce(null)
    CardSpy.mockResolvedValueOnce(null)
    BIOSElementSpy.mockResolvedValueOnce(null)
    ProcessorSpy.mockResolvedValueOnce(null)
    PhysicalMemorySpy.mockResolvedValueOnce(null)
    MediaAccessDeviceSpy.mockResolvedValueOnce(null)
    PhysicalPackageSpy.mockResolvedValueOnce(null)
    SystemPackagingSpy.mockResolvedValueOnce(null)
    ChipSpy.mockResolvedValueOnce(null)
    await hardwareInfo(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(400)
    expect(resSpy.json).toHaveBeenCalledWith({
      error: 'Incorrect URI or Bad Request',
      errorDescription: `${messages.HARDWARE_INFORMATION_REQUEST_FAILED} for guid : 4c4c4544-004b-4210-8033-b6c04f504633.`
    })
  })
  it('should handle error 500', async () => {
    ;(device as any).getComputerSystemPackage = vi
      .fn<any>()
      .mockRejectedValueOnce(new Error('Failed to get ComputerSystemPackage'))
    await hardwareInfo(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(500)
    expect(resSpy.json).toHaveBeenCalledWith({
      error: 'Internal Server Error',
      errorDescription: messages.HARDWARE_INFORMATION_EXCEPTION
    })
  })
})
