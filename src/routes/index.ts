/*********************************************************************
* Copyright (c) Intel Corporation 2021
* SPDX-License-Identifier: Apache-2.0
**********************************************************************/

import { Router } from 'express'
import metadataRouter from './metadata/index'
import deviceRouter from './devices/index'
import { login } from './auth/login'

const router: Router = Router()
router.post('/authorize', login)
router.use('/devices', deviceRouter)
router.use('/metadata', metadataRouter)

export default router
