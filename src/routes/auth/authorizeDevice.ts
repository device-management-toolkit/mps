/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type Request, type Response } from 'express'
import { logger } from '../../logging/index.js'
import { Environment } from '../../utils/Environment.js'
import { signature } from './signature.js'

export async function authorizeDevice(req: Request, res: Response): Promise<void> {
  const guid: string = req.params.guid
  const device = await req.db.devices.getById(guid)
  const tenantId = (req.tenantId as string) ?? ''
  if (device) {
    const expirationMinutes = Number(Environment.Config.redirection_expiration_time)
    res.status(200).send({ token: signature(expirationMinutes, guid, tenantId) })
  } else {
    logger.silly(`device: ${guid} not found`)
    res.status(404).end()
  }
}
