/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { validationResult } from 'express-validator'
import { type Request, type Response } from 'express'
import { logger, messages } from '../../logging/index.js'
import { Environment } from '../../utils/Environment.js'
import { signature } from './signature.js'

export async function login(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() })
    return
  }
  // todo: implement a more advanced authentication system and RBAC
  if (!Environment.Config.web_auth_enabled) {
    res.status(405).send({ message: messages.AUTH_DISABLED })
    return
  }
  const username: string = req.body.username
  const password: string = req.body.password
  if (
    username.toLowerCase() === Environment.Config.web_admin_user.toLowerCase() &&
    password === Environment.Config.web_admin_password
  ) {
    const expirationMinutes = Number(Environment.Config.jwt_expiration)
    res.status(200).send({ token: signature(expirationMinutes, '*', '') })
  } else {
    logger.silly(`${messages.LOGIN_FAILED}, username: ${username}`)
    res.status(401).send({ message: messages.LOGIN_FAILED })
  }
}
