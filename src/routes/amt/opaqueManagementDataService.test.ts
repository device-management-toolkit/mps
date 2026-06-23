/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { vi } from 'vitest'
import {
  readOpaqueManagementData,
  writeOpaqueManagementData,
  createOpaqueManagementData,
  lockOpaqueManagementData,
  assignAccessOpaqueManagementData,
  reassignOwnershipOpaqueManagementData,
  exportOpaqueManagementDataToURI,
  importOpaqueManagementDataFromURI
} from './opaqueManagementDataService.js'
import { createSpyObj } from '../../test/helper/vitest.js'
import { DeviceAction } from '../../amt/DeviceAction.js'
import { CIRAHandler } from '../../amt/CIRAHandler.js'
import { HttpHandler } from '../../amt/HttpHandler.js'
import { messages } from '../../logging/index.js'

// [route handler, DeviceAction method, WSMAN method name, a valid request body]
const cases: [
  any,
  string,
  string,
  any
][] = [
  [
    readOpaqueManagementData,
    'readOpaqueManagementData',
    'Read',
    { Handle: 'h', Length: 16, Offset: 0 }
  ],
  [
    writeOpaqueManagementData,
    'writeOpaqueManagementData',
    'Write',
    { Handle: 'h', Data: 'AAEC' }
  ],
  [
    createOpaqueManagementData,
    'createOpaqueManagementData',
    'Create',
    { ElementName: 'block', MaxSize: 4096 }
  ],
  [
    lockOpaqueManagementData,
    'lockOpaqueManagementData',
    'Lock',
    { Handle: 'h', Lock: true }
  ],
  [
    assignAccessOpaqueManagementData,
    'assignAccessOpaqueManagementData',
    'AssignAccess',
    { Handle: 'h', Identity: 'AdminAcl', Activities: [5, 6] }
  ],
  [
    reassignOwnershipOpaqueManagementData,
    'reassignOwnershipOpaqueManagementData',
    'ReassignOwnership',
    { Handle: 'h', NewOwner: 'User2' }
  ],
  [
    exportOpaqueManagementDataToURI,
    'exportOpaqueManagementDataToURI',
    'ExportToURI',
    { Handle: 'h', ExportURI: 'https://x/y' }
  ],
  [
    importOpaqueManagementDataFromURI,
    'importOpaqueManagementDataFromURI',
    'ImportFromURI',
    { Handle: 'h', ImportURI: 'https://x/y' }
  ]
]

describe('Opaque Management Data Service', () => {
  let resSpy
  let req
  let device: DeviceAction

  beforeEach(() => {
    const handler = new CIRAHandler(new HttpHandler(), 'admin', 'P@ssw0rd')
    device = new DeviceAction(handler, null)
    resSpy = createSpyObj('Response', [
      'status',
      'json',
      'end',
      'send'
    ])
    req = { params: { guid: '4c4c4544-004b-4210-8033-b6c04f504633' }, body: {}, deviceAction: device }
    resSpy.status.mockReturnThis()
    resSpy.json.mockReturnThis()
    resSpy.send.mockReturnThis()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it.each(cases)('should return 200 with the OUTPUT for %o', async (handler, methodName, wsmanMethod, body) => {
    const output = { ReturnValue: 0 }
    req.body = body
    vi.spyOn(device, methodName as any).mockResolvedValueOnce({ Body: { [`${wsmanMethod}_OUTPUT`]: output } } as any)
    await handler(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(200)
    expect(resSpy.json).toHaveBeenCalledWith(output)
  })

  it('should return 400 when the response has no OUTPUT element', async () => {
    vi.spyOn(device, 'readOpaqueManagementData').mockResolvedValueOnce({ Body: {} } as any)
    await readOpaqueManagementData(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(400)
    expect(resSpy.json).toHaveBeenCalledWith({
      error: 'Incorrect URI or Bad Request',
      errorDescription: `${messages.OPAQUE_MANAGEMENT_DATA_SERVICE_REQUEST_FAILED} for guid : 4c4c4544-004b-4210-8033-b6c04f504633.`
    })
  })

  it('should return 500 on exception', async () => {
    vi.spyOn(device, 'readOpaqueManagementData').mockRejectedValueOnce(new Error('boom'))
    await readOpaqueManagementData(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(500)
    expect(resSpy.json).toHaveBeenCalledWith({
      error: 'Internal Server Error',
      errorDescription: messages.OPAQUE_MANAGEMENT_DATA_SERVICE_EXCEPTION
    })
  })
})
