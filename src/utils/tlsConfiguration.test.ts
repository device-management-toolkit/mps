/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { web, mps } from './tlsConfiguration.js'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import { logger } from '../logging/index.js'
import { type mpsConfigType, type webConfigType } from '../models/Config.js'
import { constants } from 'node:crypto'
import { jest } from '@jest/globals'
import { type SpyInstance, spyOn } from 'jest-mock'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let existsSyncSpy: SpyInstance<any>
let readFileSyncSpy: SpyInstance<any>
let jsonParseSpy: SpyInstance<any>
let errorSpy: SpyInstance<any>
let exitSpy: SpyInstance<any>

beforeEach(() => {
  errorSpy = spyOn(logger, 'error')
  exitSpy = spyOn(process, 'exit').mockImplementation((code: number) => null as never)
  existsSyncSpy = spyOn(fs, 'existsSync')
  readFileSyncSpy = spyOn(fs, 'readFileSync')
  jsonParseSpy = spyOn(JSON, 'parse')
})

afterEach(() => {
  jest.clearAllMocks()
  jest.resetModules()
})

describe('web', () => {
  it('should return webConfig (more than one secure options)', () => {
    const webConfig = {
      ca: 'abc',
      cert: 'cert',
      key: 'key',
      secureOptions: [
        constants.SSL_OP_NO_SSLv2,
        constants.SSL_OP_NO_SSLv3,
        constants.SSL_OP_NO_TLSv1
      ],
      null: null
    }
    readFileSyncSpy.mockImplementation(() => {})
    jsonParseSpy.mockReturnValue(webConfig)
    existsSyncSpy.mockReturnValue(true)
    const result = web()
    expect(result).toEqual(webConfig)
    expect(readFileSyncSpy).toHaveBeenCalled()
  })

  it('should return webConfig (one secure option)', () => {
    const webConfig = {
      ca: 'abc',
      cert: 'cert',
      key: 'key',
      secureOptions: [constants.SSL_OP_NO_SSLv2]
    }
    readFileSyncSpy.mockImplementation(() => {})
    jsonParseSpy.mockReturnValue(webConfig)
    existsSyncSpy.mockReturnValue(true)
    const result = web()
    expect(result).toEqual(webConfig)
    expect(readFileSyncSpy).toHaveBeenCalled()
  })
  it('should return void if webTlsConfigPath does not exist', () => {
    existsSyncSpy.mockReturnValue(false)
    const result = web()
    expect(result).toBeUndefined()
    expect(errorSpy).toHaveBeenCalled()
  })

  it('should exit if webConfig missing either TLS cert or private key', () => {
    const webConfig: webConfigType = {
      ca: 'abc',
      cert: null,
      key: null,
      secureOptions: [constants.SSL_OP_NO_SSLv2, constants.SSL_OP_NO_SSLv3]
    }
    readFileSyncSpy.mockImplementation(() => {})
    jsonParseSpy.mockReturnValue(webConfig)
    existsSyncSpy.mockReturnValue(true)
    const result = web()
    expect(result).toBeFalsy()
    expect(errorSpy).toHaveBeenCalled()
    expect(exitSpy).toHaveBeenCalled()
  })

  it('should exit if TLS cert or private key does not exist', () => {
    const webConfig: webConfigType = {
      ca: 'abc',
      cert: 'cert',
      key: 'key',
      secureOptions: [constants.SSL_OP_NO_SSLv2, constants.SSL_OP_NO_SSLv3]
    }
    readFileSyncSpy.mockImplementation(() => {})
    jsonParseSpy.mockReturnValue(webConfig)
    existsSyncSpy.mockImplementation((p) => {
      if (p === path.join(__dirname, webConfig.key)) {
        return false
      } else if (p === path.join(__dirname, webConfig.cert)) {
        return false
      } else {
        return true
      }
    })
    const result = web()
    expect(result).toBeFalsy()
    expect(errorSpy).toHaveBeenCalled()
    expect(exitSpy).toHaveBeenCalled()
  })

  it('should exit if exception on failed to parse json file', () => {
    existsSyncSpy.mockReturnValue(true)
    jsonParseSpy.mockImplementation(() => {
      throw new Error('fake json parse error')
    })
    const result = web()
    expect(result).toBeFalsy()
    expect(errorSpy).toHaveBeenCalled()
    expect(exitSpy).toHaveBeenCalled()
  })

  it('should exit if webConfig missing CA cert', () => {
    const webConfig: webConfigType = {
      ca: null,
      cert: 'cert',
      key: 'key',
      secureOptions: [constants.SSL_OP_NO_SSLv2, constants.SSL_OP_NO_SSLv3]
    }
    readFileSyncSpy.mockImplementation(() => {})
    jsonParseSpy.mockReturnValue(webConfig)
    existsSyncSpy.mockImplementation((p) => {
      if (p === path.join(__dirname, webConfig.key)) {
        return true
      } else if (p === path.join(__dirname, webConfig.cert)) {
        return true
      } else {
        return true
      }
    })
    const result = web()
    expect(result).toBeFalsy()
    expect(errorSpy).toHaveBeenCalled()
    expect(exitSpy).toHaveBeenCalled()
  })

  it('should exit on exception', () => {
    const webConfig: webConfigType = {
      ca: 'abc',
      cert: 'cert',
      key: 'key',
      secureOptions: [constants.SSL_OP_NO_SSLv2, constants.SSL_OP_NO_SSLv3]
    }
    readFileSyncSpy.mockImplementation((p, e) => {
      if (p === path.join(__dirname, webConfig.key)) {
        throw Error('fake read file error')
      }
    })
    jsonParseSpy.mockReturnValue(webConfig)
    existsSyncSpy.mockReturnValue(true)
    const result = web()
    expect(result).toBeFalsy()
    expect(errorSpy).toHaveBeenCalled()
    expect(exitSpy).toHaveBeenCalled()
  })
})

describe('mps', () => {
  it('should return mpsConfig (more than one secure options)', () => {
    const mpsConfig = {
      cert: 'cert',
      key: 'key',
      minVersion: '',
      secureOptions: [
        constants.SSL_OP_NO_SSLv2,
        constants.SSL_OP_NO_SSLv3,
        constants.SSL_OP_NO_TLSv1
      ],
      requestCert: true,
      rejectUnauthorized: true,
      null: null
    }
    readFileSyncSpy.mockImplementation(() => {})
    jsonParseSpy.mockReturnValue(mpsConfig)
    existsSyncSpy.mockReturnValue(true)
    const result = mps()
    expect(result).toEqual(mpsConfig)
    expect(readFileSyncSpy).toHaveBeenCalled()
  })

  it('should return mpsConfig (one secure option)', () => {
    const mpsConfig = {
      cert: 'cert',
      key: 'key',
      minVersion: '',
      secureOptions: [constants.SSL_OP_NO_SSLv2],
      requestCert: true,
      rejectUnauthorized: true,
      null: null
    }
    readFileSyncSpy.mockImplementation(() => {})
    jsonParseSpy.mockReturnValue(mpsConfig)
    existsSyncSpy.mockReturnValue(true)
    const result = mps()
    expect(result).toEqual(mpsConfig)
    expect(readFileSyncSpy).toHaveBeenCalled()
  })

  it('should return void if mpsTlsConfigPath does not exist', () => {
    existsSyncSpy.mockReturnValue(false)
    const result = mps()
    expect(result).toBeUndefined()
    expect(errorSpy).toHaveBeenCalled()
  })

  it('should exit if mpsConfig missing either TLS cert or private key', () => {
    const mpsConfig: mpsConfigType = {
      cert: null,
      key: null,
      minVersion: '',
      secureOptions: [constants.SSL_OP_NO_SSLv2, constants.SSL_OP_NO_SSLv3],
      requestCert: true,
      rejectUnauthorized: true,
      ciphers: null
    }
    readFileSyncSpy.mockImplementation(() => {})
    jsonParseSpy.mockReturnValue(mpsConfig)
    existsSyncSpy.mockReturnValue(true)
    const result = mps()
    expect(result).toBeFalsy()
    expect(errorSpy).toHaveBeenCalled()
    expect(exitSpy).toHaveBeenCalled()
  })

  it('should exit if TLS cert or private key does not exist', () => {
    const mpsConfig: mpsConfigType = {
      cert: 'cert',
      key: 'key',
      minVersion: '',
      secureOptions: [constants.SSL_OP_NO_SSLv2, constants.SSL_OP_NO_SSLv3],
      requestCert: true,
      rejectUnauthorized: true,
      ciphers: null
    }
    readFileSyncSpy.mockImplementation(() => {})
    jsonParseSpy.mockReturnValue(mpsConfig)
    existsSyncSpy.mockImplementation((p) => {
      if (p === path.join(__dirname, mpsConfig.key)) {
        return false
      } else if (p === path.join(__dirname, mpsConfig.cert)) {
        return false
      } else {
        return true
      }
    })
    const result = mps()
    expect(result).toBeFalsy()
    expect(errorSpy).toHaveBeenCalled()
    expect(exitSpy).toHaveBeenCalled()
  })

  it('should exit if exception on failed to parse json file', () => {
    existsSyncSpy.mockReturnValue(true)
    jsonParseSpy.mockImplementation(() => {
      throw new Error('fake json parse error')
    })
    const result = mps()
    expect(result).toBeFalsy()
    expect(errorSpy).toHaveBeenCalled()
    expect(exitSpy).toHaveBeenCalled()
  })

  it('should exit on exception', () => {
    const mpsConfig: mpsConfigType = {
      cert: 'cert',
      key: 'key',
      minVersion: '',
      secureOptions: [constants.SSL_OP_NO_SSLv2, constants.SSL_OP_NO_SSLv3],
      requestCert: true,
      rejectUnauthorized: true,
      ciphers: null
    }
    readFileSyncSpy.mockImplementation((p, e) => {
      if (p === path.join(__dirname, mpsConfig.key)) {
        throw Error('fake read file error')
      }
    })
    jsonParseSpy.mockReturnValue(mpsConfig)
    existsSyncSpy.mockReturnValue(true)
    const result = mps()
    expect(result).toBeFalsy()
    expect(errorSpy).toHaveBeenCalled()
    expect(exitSpy).toHaveBeenCalled()
  })
})
