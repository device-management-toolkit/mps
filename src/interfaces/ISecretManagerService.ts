/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type certificatesType } from '../models/Config.js'

export interface ISecretManagerService {
  getSecretFromKey: (path: string, key: string) => Promise<string>
  getSecretAtPath: (path: string) => Promise<any>
  // tenantId selects the tenant partition of the device secret (see utils/secretPaths.ts); omit for the empty tenant.
  getAMTCredentials: (guid: string, tenantId?: string) => Promise<string[]>
  getMPSCerts: () => Promise<certificatesType>
  writeSecretWithObject: (path: string, data: any) => Promise<boolean>
  deleteSecretAtPath: (path: string) => Promise<void>
  health: () => Promise<any>
}
