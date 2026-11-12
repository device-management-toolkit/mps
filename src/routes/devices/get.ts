/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { logger, messages } from '../../logging/index.js'
import { type Request, type Response } from 'express'

export async function getDevice(req: Request<{ guid: string }>, res: Response): Promise<void> {
  try {
    let tenantId = req.tenantId
    const tentantIdInQuery = req.query?.tenantId
    if ((tenantId == null || tenantId === '') && tentantIdInQuery != null && tentantIdInQuery !== '') {
      tenantId = tentantIdInQuery as string
    }
    const result = await req.db.devices.getById(req.params.guid)
    if (result != null) {
      if (result.tenantId === tenantId) {
        res.status(200).json(result).end()
      } else {
        res.status(204).end()
      }
    } else {
      res.status(404).end()
    }
  } catch (err) {
    logger.error(`${messages.DEVICE_GET_EXCEPTION}: ${err}`)
    res.status(500).end()
  }
}
