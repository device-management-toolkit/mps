/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { Router } from 'express'
import { param } from 'express-validator'
import validateMiddleware from '../../middleware/validate.js'
import { login } from './login.js'
import { authValidator } from './authValidator.js'
import { authorizeDevice } from './authorizeDevice.js'

const authRouter: Router = Router()

authRouter.post('/', authValidator(), login)
authRouter.get('/redirection/:guid', param('guid').isUUID('loose'), validateMiddleware, authorizeDevice)

export default authRouter
