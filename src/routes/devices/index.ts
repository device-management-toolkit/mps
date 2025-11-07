/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { Router } from 'express'
import { metadataQueryValidator, odataValidator, validator } from './deviceValidator.js'
import { disconnect } from './disconnect.js'
import { getAllDevices } from './getAll.js'
import { stats } from './stats.js'
import { getDevice } from './get.js'
import { getDistinctTags } from './tags.js'
import { insertDevice } from './create.js'
import { updateDevice } from './update.js'
import { deleteDevice } from './delete.js'
import { refreshDevice } from './refresh.js'
import { param, query } from 'express-validator'
import validateMiddleware from '../../middleware/validate.js'
import ciraMiddleware from '../../middleware/cira.js'
import { getRedirStatus } from './getRedirStatus.js'

const deviceRouter: Router = Router()

deviceRouter.get('/', odataValidator(), metadataQueryValidator(), validateMiddleware, getAllDevices)
deviceRouter.get('/stats', stats)
deviceRouter.get('/tags', getDistinctTags)
deviceRouter.get('/:guid', param('guid').isUUID('loose'), validateMiddleware, getDevice)
deviceRouter.get('/redirectstatus/:guid', param('guid').isUUID('loose'), validateMiddleware, ciraMiddleware, getRedirStatus)
deviceRouter.post('/', validator(), validateMiddleware, insertDevice)
deviceRouter.patch('/', validator(), validateMiddleware, updateDevice)
deviceRouter.delete('/refresh/:guid', validator(), validateMiddleware, refreshDevice)
deviceRouter.delete(
  '/:guid',
  param('guid').isUUID('loose'),
  query('isSecretToBeDeleted').optional().isBoolean(),
  validateMiddleware,
  deleteDevice
)
deviceRouter.delete('/disconnect/:guid', param('guid').isUUID('loose'), validateMiddleware, ciraMiddleware, disconnect)
export default deviceRouter
