/*********************************************************************
 * Copyright (c) Intel Corporation 2025
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type Request, type Response } from 'express'
import { logger } from '../../logging/logger.js'
import { messages } from '../../logging/messages.js'

function mapBootSource(raw: any): any {
  return {
    biosBootString: raw.BIOSBootString ?? '',
    bootString: raw.BootString ?? '',
    elementName: raw.ElementName ?? '',
    failThroughSupported: raw.FailThroughSupported != null ? Number(raw.FailThroughSupported) : 0,
    instanceID: raw.InstanceID ?? '',
    structuredBiosBootString: raw.StructuredBootString ?? ''
  }
}

export async function bootSources(req: Request, res: Response): Promise<void> {
  const guid: string = req.params.guid
  try {
    const result = await req.deviceAction.getBootSourceSetting()
    const items = result?.Items?.CIM_BootSourceSetting ?? result?.Items
    const itemsArray = Array.isArray(items) ? items : items ? [items] : []
    if (itemsArray.length === 0) {
      res.status(200).json([])
      return
    }
    const mapped = itemsArray.map(mapBootSource)
    res.status(200).json(mapped)
  } catch (err) {
    logger.error(`${messages.BOOT_SOURCE_REQUEST_FAILED} for guid : ${guid}.`)
    res.status(500).json({ error: 'Failed to get boot source settings', details: err?.message || err })
    return
  }
}
