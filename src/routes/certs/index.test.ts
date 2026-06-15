/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { mpsrootcert } from './index.js'
import { createSpyObj } from '../../test/helper/vitest.js'
import { ErrorResponse } from '../../utils/amtHelper.js'
import { messages } from '../../logging/index.js'

describe('Check index', () => {
  let resSpy
  let req

  beforeEach(() => {
    resSpy = createSpyObj('Response', [
      'status',
      'json',
      'end',
      'send'
    ])
    resSpy.status.mockReturnThis()
    resSpy.json.mockReturnThis()
    resSpy.send.mockReturnThis()
  })
  it('should fail if cert not provided', async () => {
    req = {}
    await mpsrootcert(req, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(500)
    expect(resSpy.json).toHaveBeenCalledWith(ErrorResponse(500, messages.MPS_ROOT_CERTIFICATE_DOES_NOT_EXIST))
  })
  it('should pass if cert provided', async () => {
    req = {
      certs: {
        web_tls_config: {
          ca: 'fake'
        }
      }
    }
    await mpsrootcert(req, resSpy)
    expect(resSpy.send).toHaveBeenCalled()
  })
  it('should handle exception', async () => {
    await mpsrootcert(null, resSpy)
    expect(resSpy.status).toHaveBeenCalledWith(500)
    expect(resSpy.json).toHaveBeenCalledWith(ErrorResponse(500, messages.MPS_ROOT_CERTIFICATE_EXCEPTION))
  })
})
