/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/
import { mapScreenSettingDataToKVMScreenSettings } from './kvmScreenSettingsMapper.js'

describe('mapScreenSettingDataToKVMScreenSettings', () => {
  it('should map a single screen item with all roles', () => {
    const raw = {
      IPS_ScreenSettingDataItems: [
        {
          PrimaryIndex: 0,
          SecondaryIndex: 1,
          TertiaryIndex: 2,
          QuadraryIndex: 3,
          IsActive: [
            true,
            false,
            true,
            false
          ],
          UpperLeftX: [
            0,
            100,
            200,
            300
          ],
          UpperLeftY: [
            0,
            10,
            20,
            30
          ],
          ResolutionX: [
            1920,
            1280,
            800,
            640
          ],
          ResolutionY: [
            1080,
            720,
            600,
            480
          ]
        }
      ]
    }
    const kvmData = { IPS_KVMRedirectionSettingData: { DefaultScreen: 2 } }
    const result = mapScreenSettingDataToKVMScreenSettings(raw, kvmData)
    expect(result.displays).toHaveLength(4)
    expect(result.displays[0]).toMatchObject({
      displayIndex: 0,
      isActive: true,
      upperLeftX: 0,
      upperLeftY: 0,
      resolutionX: 1920,
      resolutionY: 1080,
      role: 'primary',
      isDefault: false
    })
    expect(result.displays[1].role).toBe('secondary')
    expect(result.displays[2].role).toBe('tertiary')
    expect(result.displays[2].isDefault).toBe(true)
    expect(result.displays[3].role).toBe('quaternary')
  })

  it('should handle missing arrays and default values', () => {
    const raw = {
      IPS_ScreenSettingDataItems: [
        {
          isActive: [true],
          upperLeftX: [10]
        }
      ]
    }
    const result = mapScreenSettingDataToKVMScreenSettings(raw, undefined)
    expect(result.displays).toHaveLength(1)
    expect(result.displays[0]).toMatchObject({
      displayIndex: 0,
      isActive: true,
      upperLeftX: 10,
      upperLeftY: 0,
      resolutionX: 0,
      resolutionY: 0,
      isDefault: false
    })
  })

  it('should handle empty input', () => {
    expect(mapScreenSettingDataToKVMScreenSettings({}, undefined)).toEqual({ displays: [] })
    expect(mapScreenSettingDataToKVMScreenSettings(null, undefined)).toEqual({ displays: [] })
  })

  it('should handle non-array IPS_ScreenSettingDataItems', () => {
    const raw = {
      IPS_ScreenSettingDataItems: {
        IsActive: [true],
        UpperLeftX: [1],
        UpperLeftY: [2],
        ResolutionX: [3],
        ResolutionY: [4]
      }
    }
    const result = mapScreenSettingDataToKVMScreenSettings(raw, undefined)
    expect(result.displays).toHaveLength(1)
    expect(result.displays[0]).toMatchObject({
      displayIndex: 0,
      isActive: true,
      upperLeftX: 1,
      upperLeftY: 2,
      resolutionX: 3,
      resolutionY: 4,
      isDefault: false
    })
  })

  it('should handle ScreenSettingDataItems as fallback', () => {
    const raw = {
      ScreenSettingDataItems: [
        {
          IsActive: [false],
          UpperLeftX: [5],
          UpperLeftY: [6],
          ResolutionX: [7],
          ResolutionY: [8]
        }
      ]
    }
    const result = mapScreenSettingDataToKVMScreenSettings(raw, undefined)
    expect(result.displays).toHaveLength(1)
    expect(result.displays[0]).toMatchObject({
      displayIndex: 0,
      isActive: false,
      upperLeftX: 5,
      upperLeftY: 6,
      resolutionX: 7,
      resolutionY: 8,
      isDefault: false
    })
  })
})
