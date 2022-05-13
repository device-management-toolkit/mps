import { validationResult } from 'express-validator'
import { Request, Response } from 'express'
import { logger } from '../../logging/logger'
import { Environment } from '../../utils/Environment'
import { messages } from '../../logging'
import { signature } from './signature'

export async function login (req: Request, res: Response): Promise<void> {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() })
    return
  }
  const username: string = req.body.username
  const password: string = req.body.password
  // todo: implement a more advanced authentication system and RBAC
  if (username.toLowerCase() === Environment.Config.web_admin_user.toLowerCase() && password === Environment.Config.web_admin_password) {
    const expirationMinutes = Number(Environment.Config.jwt_expiration)
    res.status(200).send({ token: signature(expirationMinutes, '*') })
  } else {
    logger.silly(`${messages.LOGIN_FAILED}, username: ${username}`)
    res.status(401).send({ message: messages.LOGIN_FAILED })
  }
}
