/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/
export interface KVMScreenDisplay {
  displayIndex: number
  isActive: boolean
  upperLeftX: number
  upperLeftY: number
  resolutionX: number
  resolutionY: number
  role?: 'primary' | 'secondary' | 'tertiary' | 'quaternary'
  isDefault: boolean
}

export interface KVMScreenSettings {
  displays: KVMScreenDisplay[]
}

function getInt(arr: number[] = [], i: number): number {
  return i < arr.length ? arr[i] : 0
}

function getBool(arr: boolean[] = [], i: number): boolean {
  return i < arr.length ? arr[i] : false
}

function maxOf(...nums: number[]): number {
  return Math.max(0, ...nums)
}

export function mapScreenSettingDataToKVMScreenSettings(screenData: any, kvmData: any): KVMScreenSettings {
  let items = screenData?.Items?.IPS_ScreenSettingData
  if (!items && screenData?.IPS_ScreenSettingDataItems) items = screenData.IPS_ScreenSettingDataItems
  if (!items && screenData?.ScreenSettingDataItems) items = screenData.ScreenSettingDataItems
  if (!items) return { displays: [] }
  const arr = Array.isArray(items) ? items : [items]
  const displays: KVMScreenDisplay[] = []

  for (const it of arr) {
    if (!it) continue
    const primary = Number(it.PrimaryIndex ?? -1)
    const secondary = Number(it.SecondaryIndex ?? -1)
    const tertiary = Number(it.TertiaryIndex ?? -1)
    const quaternary = Number(it.QuadraryIndex ?? -1)

    const isActiveArr = it.IsActive || it.isActive || []
    const ulxArr = (it.UpperLeftX || it.upperLeftX || []).map(Number)
    const ulyArr = (it.UpperLeftY || it.upperLeftY || []).map(Number)
    const rxArr = (it.ResolutionX || it.resolutionX || []).map(Number)
    const ryArr = (it.ResolutionY || it.resolutionY || []).map(Number)

    const max = maxOf(isActiveArr.length, ulxArr.length, ulyArr.length, rxArr.length, ryArr.length)
    for (let i = 0; i < max; i++) {
      const d: KVMScreenDisplay = {
        displayIndex: i,
        isActive: getBool(isActiveArr, i),
        upperLeftX: getInt(ulxArr, i),
        upperLeftY: getInt(ulyArr, i),
        resolutionX: getInt(rxArr, i),
        resolutionY: getInt(ryArr, i),
        isDefault: (kvmData?.IPS_KVMRedirectionSettingData?.DefaultScreen ?? -1) === i
      }
      if (i === primary) d.role = 'primary'
      else if (i === secondary) d.role = 'secondary'
      else if (i === tertiary) d.role = 'tertiary'
      else if (i === quaternary) d.role = 'quaternary'
      displays.push(d)
    }
  }
  return { displays: displays }
}
