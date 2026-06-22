/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type Request, type Response } from 'express'
import { logger, messages } from '../../logging/index.js'

export async function deleteDevice(req: Request, res: Response): Promise<void> {
  try {
    let dbResults
    let vaultResults
    const guid: string = req.params.guid
    const tenantId = req.tenantId ?? ''
    const device = await req.db.devices.getById(guid, tenantId)
    const isSecretToBeDeleted = req.query.isSecretToBeDeleted ?? 'false'

    if (device == null) {
      res
        .status(404)
        .json({ error: 'NOT FOUND', message: `Device ID ${guid} not found` })
        .end()
    } else if (isSecretToBeDeleted === 'true') {
      // In db and delete vault
      dbResults = await req.db.devices.delete(guid, tenantId)
      vaultResults = await deleteSecrets(req, guid)
      if (dbResults && vaultResults) {
        res.status(204).end()
      } else {
        res
          .status(404)
          .json({ error: 'NOT FOUND', message: `Device ID ${guid} not found` })
          .end()
      }
    } else {
      // In db and ignore vault
      dbResults = await req.db.devices.delete(guid, tenantId)
      if (dbResults) {
        res.status(204).end()
      }
    }
  } catch (err) {
    logger.error(`${messages.DEVICE_DELETE_FAILED}: ${req.params.guid}`, err)
    res.status(500).end()
  }
}

export async function deleteSecrets(req: Request, guid: string): Promise<boolean> {
  const queryParams = req.query
  try {
    if (queryParams.isSecretToBeDeleted === 'true') {
      await req.secrets.deleteSecretAtPath(`devices/${guid}`)
      return true
    }
  } catch (error) {
    logger.error(`${messages.DEVICE_DELETE_FAILED} from secrets: ${req.params.guid}`, error)
  }
  return false
}
