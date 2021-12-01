/*********************************************************************
 * Copyright (c) Intel Corporation 2021
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { IDB } from './interfaces/IDb'
import { ISecretManagerService } from './interfaces/ISecretManagerService'
import { certificatesType } from './models/Config'

declare module 'express' {
  export interface Request {
    secrets: ISecretManagerService
    certs: certificatesType
    db: IDB
    amtFactory: any
    amtStack: any
  }
}
