import { insertDevice } from './create'
import { logger } from '../../logging'
import { MPSValidationError } from '../../utils/MPSValidationError'

let res: Express.Response
let statusSpy: jest.SpyInstance
let jsonSpy: jest.SpyInstance
let endSpy: jest.SpyInstance

beforeEach(() => {
  res = {
    status: () => {
      return res
    },
    json: () => {
      return res
    },
    end: () => {
      return res
    }
  }
  statusSpy = jest.spyOn(res as any, 'status')
  endSpy = jest.spyOn(res as any, 'end')
  jsonSpy = jest.spyOn(res as any, 'json')
})

describe('create', () => {
  it('should set status to 200 and update device in db with relevant properties from request if device already exists in db', async () => {
    const deviceFromMockDb = {
      connectionStatus: true
    } as any
    const hostnameFromRequest = 'anyhost'
    const tagsFromRequest = ['tag']
    const mpsusernameFromRequest = 'itproadmin'
    const tenantIdFromRequest = 'tenantxyz'
    const guidFromRequest = '00000000-0000-0000-0000-000000000000'
    const expectedUpdateResultFromDb = {
      hostname: hostnameFromRequest,
      tags: tagsFromRequest,
      connectionStatus: true,
      mpsusername: mpsusernameFromRequest,
      tenantId: tenantIdFromRequest
    }
    const req = {
      body: {
        guid: guidFromRequest,
        hostname: hostnameFromRequest,
        tags: tagsFromRequest,
        mpsusername: mpsusernameFromRequest,
        tenantId: tenantIdFromRequest
      },
      db: {
        devices: {
          getById: jest.fn().mockReturnValue(deviceFromMockDb),
          update: jest.fn().mockReturnValue(expectedUpdateResultFromDb)
        }
      }
    } as any
    await insertDevice(req, res as any)
    expect(req.db.devices.getById).toHaveBeenCalledWith(guidFromRequest)
    expect(statusSpy).toHaveBeenCalledWith(200)
    expect(jsonSpy).toHaveBeenCalledWith(expectedUpdateResultFromDb)
    expect(req.db.devices.update).toHaveBeenCalledWith(expectedUpdateResultFromDb)
  })

  it('should set status to 200 and update device in db with relevant properties from db if device already exists in db', async () => {
    const hostnameFromDb = 'anyhost'
    const tagsFromDb = ['tag']
    const mpsusernameFromDb = 'itproadmin'
    const tenantIdFromDb = ''
    const guidFromRequest = '00000000-0000-0000-0000-000000000000'
    const deviceFromMockDb = {
      hostname: hostnameFromDb,
      tags: tagsFromDb,
      mpsusername: mpsusernameFromDb
    } as any
    const expectedUpdateResultFromDb = {
      hostname: hostnameFromDb,
      tags: tagsFromDb,
      connectionStatus: false,
      mpsusername: mpsusernameFromDb,
      tenantId: tenantIdFromDb
    }
    const req = {
      body: {
        guid: guidFromRequest,
        hostname: null,
        tags: null,
        mpsusername: null,
        tenantId: null
      },
      db: {
        devices: {
          getById: jest.fn().mockReturnValue(deviceFromMockDb),
          update: jest.fn().mockReturnValue(expectedUpdateResultFromDb)
        }
      }
    } as any
    await insertDevice(req, res as any)
    expect(req.db.devices.getById).toHaveBeenCalledWith(guidFromRequest)
    expect(statusSpy).toHaveBeenCalledWith(200)
    expect(jsonSpy).toHaveBeenCalledWith(expectedUpdateResultFromDb)
    expect(req.db.devices.update).toHaveBeenCalledWith(expectedUpdateResultFromDb)
  })

  it('should set status to 201 and insert device in db with relevant properties from request if device does not already exist in db', async () => {
    const deviceFromMockDb = null
    const hostnameFromRequest = 'anyhost'
    const tagsFromRequest = ['tag']
    const mpsusernameFromRequest = 'itproadmin'
    const tenantIdFromRequest = 'tenantxyz'
    const guidFromRequest = '00000000-0000-0000-0000-000000000000'
    const expectedInsertResultFromDb = {
      connectionStatus: false,
      guid: guidFromRequest,
      hostname: hostnameFromRequest,
      tags: tagsFromRequest,
      mpsusername: mpsusernameFromRequest,
      mpsInstance: null,
      tenantId: tenantIdFromRequest
    }
    const req = {
      body: {
        guid: guidFromRequest,
        hostname: hostnameFromRequest,
        tags: tagsFromRequest,
        mpsusername: mpsusernameFromRequest,
        tenantId: tenantIdFromRequest
      },
      db: {
        devices: {
          getById: jest.fn().mockReturnValue(deviceFromMockDb),
          insert: jest.fn().mockReturnValue(expectedInsertResultFromDb)
        }
      }
    } as any
    await insertDevice(req, res as any)
    expect(req.db.devices.getById).toHaveBeenCalledWith(guidFromRequest)
    expect(statusSpy).toHaveBeenCalledWith(201)
    expect(jsonSpy).toHaveBeenCalledWith(expectedInsertResultFromDb)
    expect(req.db.devices.insert).toHaveBeenCalledWith(expectedInsertResultFromDb)
  })

  it('should set status to 201 and insert device in db with default properties if device does not already exist in db', async () => {
    const deviceFromMockDb = null
    const hostnameFromRequest = null
    const tagsFromRequest = null
    const mpsusernameFromRequest = 'itproadmin'
    const tenantIdFromRequest = null
    const guidFromRequest = '00000000-0000-0000-0000-000000000000'
    const expectedInsertResultFromDb = {
      connectionStatus: false,
      guid: guidFromRequest,
      hostname: null,
      tags: null,
      mpsusername: mpsusernameFromRequest,
      mpsInstance: null,
      tenantId: ''
    }
    const req = {
      body: {
        guid: guidFromRequest,
        hostname: hostnameFromRequest,
        tags: tagsFromRequest,
        mpsusername: mpsusernameFromRequest,
        tenantId: tenantIdFromRequest
      },
      db: {
        devices: {
          getById: jest.fn().mockReturnValue(deviceFromMockDb),
          insert: jest.fn().mockReturnValue(expectedInsertResultFromDb)
        }
      }
    } as any
    await insertDevice(req, res as any)
    expect(req.db.devices.getById).toHaveBeenCalledWith(guidFromRequest)
    expect(statusSpy).toHaveBeenCalledWith(201)
    expect(jsonSpy).toHaveBeenCalledWith(expectedInsertResultFromDb)
    expect(req.db.devices.insert).toHaveBeenCalledWith(expectedInsertResultFromDb)
  })

  it('should handle MPSValidationError', async () => {
    const errorName = 'FakeMPSError'
    const errorMessage = 'This is a fake error'
    const errorStatus = 555
    const guidFromRequest = '00000000-0000-0000-0000-000000000000'
    const req = {
      body: {
        guid: guidFromRequest
      },
      db: {
        devices: {
          getById: jest.fn().mockImplementation(() => {
            throw new MPSValidationError(errorMessage, errorStatus, errorName)
          })
        }
      }
    } as any
    const errorSpy = jest.spyOn(logger, 'error')
    await insertDevice(req, res as any)
    expect(statusSpy).toHaveBeenLastCalledWith(errorStatus)
    expect(jsonSpy).toHaveBeenCalledWith({
      error: errorName,
      message: errorMessage
    })
    expect(errorSpy).toHaveBeenCalled()
  })

  it('should handle general error', async () => {
    const guidFromRequest = '00000000-0000-0000-0000-000000000000'
    const req = {
      body: {
        guid: guidFromRequest
      },
      db: {
        devices: {
          getById: jest.fn().mockImplementation(() => {
            throw new TypeError('fake error')
          })
        }
      }
    } as any
    const errorSpy = jest.spyOn(logger, 'error')
    await insertDevice(req, res as any)
    expect(statusSpy).toHaveBeenLastCalledWith(500)
    expect(endSpy).toHaveBeenCalled()
    expect(errorSpy).toHaveBeenCalled()
  })
})
