/*********************************************************************
 * Copyright (c) Intel Corporation 2026
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { createServer, type RequestListener } from 'node:http'
import { once } from 'node:events'
import { type AddressInfo } from 'node:net'

export async function request(
  app: RequestListener,
  path: string,
  init?: RequestInit
): Promise<{ status: number; body: any }> {
  const server = createServer(app)
  server.listen(0, '127.0.0.1')
  try {
    await once(server, 'listening')
    const { port } = server.address() as AddressInfo
    const response = await fetch(`http://127.0.0.1:${port}${path}`, init)
    return { status: response.status, body: await response.json() }
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
      server.closeAllConnections()
    })
  }
}
