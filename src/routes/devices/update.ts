/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { logger, messages } from '../../logging/index.js'
import { MPSValidationError } from '../../utils/MPSValidationError.js'
import { type Request, type Response } from 'express'

export async function updateDevice(req: Request, res: Response): Promise<void> {
  const guid: string = req.body.guid
  try {
    let device = await req.db.devices.getById(guid, req.tenantId)
    if (device == null) {
      res
        .status(404)
        .json({ error: 'NOT FOUND', message: `Device ID ${guid} not found` })
        .end()
    } else {
      // power state is server-owned, so it never comes from the request body
      const { powerState, osPowerSavingState, powerStateUpdatedAt, ...updatable } = req.body
      device = { ...device, ...updatable }
      const results = await req.db.devices.update(device)
      res.status(200).json(results).end()
    }
  } catch (err) {
    logger.error(`${messages.DEVICE_UPDATE_FAILED} : ${guid}`, err)
    if (err instanceof MPSValidationError) {
      res.status(err.status).json({ error: err.name, message: err.message }).end()
    } else {
      res.status(500).end()
    }
  }
}
