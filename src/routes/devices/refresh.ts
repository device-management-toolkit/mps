/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { ErrorResponse } from '../../utils/amtHelper.js'
import { logger, messages } from '../../logging/index.js'
import { devices } from '../../server/mpsserver.js'
import { type Request, type Response } from 'express'
import { ConnectedDevice } from '../../amt/ConnectedDevice.js'

export async function refreshDevice(req: Request, res: Response): Promise<void> {
  try {
    const guid = req.params.guid
    const device = devices[guid]
    if (device != null) {
      const ciraSocket = device.ciraSocket
      const httpHandler = device.httpHandler
      const kvmConnect = device.kvmConnect
      const tenantId = device.tenantId
      const limiter = device.limiter
      delete devices[guid]

      const cred = await req.secrets.getAMTCredentials(guid, tenantId)
      devices[guid] = new ConnectedDevice(ciraSocket, cred[0], cred[1], tenantId, httpHandler, kvmConnect, limiter)

      res.json({ success: 200, description: `${messages.DEVICE_REFRESH_SUCCESS} : ${guid}` })
    } else {
      res.status(404).end()
    }
  } catch (error) {
    logger.error(`${messages.DEVICE_REFRESH_EXCEPTION}: ${JSON.stringify(error)} `)
    res.status(500).json(ErrorResponse(500, messages.DEVICE_REFRESH_EXCEPTION))
  }
}
