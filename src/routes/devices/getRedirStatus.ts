/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { logger, messages } from '../../logging/index.js'
import { type Request, type Response } from 'express'
import { devices } from '../../server/mpsserver.js'

export async function getRedirStatus(req: Request<{ guid: string }>, res: Response): Promise<void> {
  try {
    const guid = req.params.guid
    let tenantId = req.tenantId
    const tentantIdInQuery = req.query?.tenantId
    if ((tenantId == null || tenantId === '') && tentantIdInQuery != null && tentantIdInQuery !== '') {
      tenantId = tentantIdInQuery as string
    }
    const device = devices[guid]
    const result = await req.db.devices.getById(req.params.guid)
    if (device != null) {
      if (result.tenantId === tenantId) {
        res
          .status(200)
          .json({
            isKVMConnected: device.kvmConnect,
            isSOLConnected: device.solConnect,
            isIDERConnected: device.iderConnect
          })
          .end()
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
