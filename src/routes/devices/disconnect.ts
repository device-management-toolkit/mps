/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { ErrorResponse } from '../../utils/amtHelper.js'
import { logger, messages } from '../../logging/index.js'
import { type Request, type Response } from 'express'
import { devices } from '../../server/mpsserver.js'

export async function disconnect(req: Request<{ guid: string }>, res: Response): Promise<void> {
  try {
    const guid = req.params.guid
    const device = devices[guid]
    device.ciraSocket.destroy()
    res.json({ success: 200, description: `${messages.DEVICE_DISCONNECTED_SUCCESS} : ${guid}` })
  } catch (error) {
    logger.error(`${messages.DEVICE_DISCONNECT_EXCEPTION}: ${JSON.stringify(error)} `)
    res.status(500).json(ErrorResponse(500, messages.DEVICE_DISCONNECT_EXCEPTION))
  }
}
