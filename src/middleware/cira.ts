/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type Request, type Response } from 'express'
import { CIRAHandler } from '../amt/CIRAHandler.js'
import { DeviceAction } from '../amt/DeviceAction.js'
import { devices } from '../server/mpsserver.js'
import { ErrorResponse } from '../utils/amtHelper.js'
import { MqttProvider } from '../utils/MqttProvider.js'

const ciraMiddleware = async (req: Request<{ guid: string }>, res: Response, next): Promise<void> => {
  const guid = req.params.guid
  const device = devices[guid]

  if ((device as any)?.ciraSocket.readyState === 'open') {
    // if a tenantId is provided, ensure the request is for the same tenant/device
    if (req.tenantId != null) {
      if (req.tenantId !== device.tenantId) {
        res.status(401).json(ErrorResponse(401, 'Unauthorized')).end()
        return
      }
    }

    const ciraHandler = new CIRAHandler(device.httpHandler, device.username, device.password, device.limiter)
    req.deviceAction = new DeviceAction(ciraHandler, device.ciraSocket)
    next()
  } else {
    MqttProvider.publishEvent('fail', ['CIRA_Connection'], 'Device Not Found', guid)
    res
      .status(404)
      .json(ErrorResponse(404, `guid : ${guid}`, 'device'))
      .end()
  }
}

export default ciraMiddleware
