/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { check } from 'express-validator'
import { DMTFPowerExtendedStates } from '../../utils/constants.js'

export const bootOptionsValidator = (): any => [
  check('action').isIn(DMTFPowerExtendedStates).isNumeric(),
  check('useSOL').isBoolean().toBoolean(),
  check('bootDetails.url').optional().isURL(),
  check('bootDetails.username').optional().isString(),
  check('bootDetails.password').optional().isString(),
  check('bootDetails.enforceSecureBoot').optional().isBoolean().toBoolean()
]
// TLV Boot Parser - TypeScript equivalent

// Enum for parameter types
enum ParameterType {
  OCR_EFI_NETWORK_DEVICE_PATH = 1,
  OCR_EFI_FILE_DEVICE_PATH = 2,
  OCR_EFI_DEVICE_PATH_LEN = 3,
  OCR_BOOT_IMAGE_HASH_SHA256 = 4,
  OCR_BOOT_IMAGE_HASH_SHA384 = 5,
  OCR_BOOT_IMAGE_HASH_SHA512 = 6,
  OCR_EFI_BOOT_OPTIONAL_DATA = 10,
  OCR_HTTPS_CERT_SYNC_ROOT_CA = 20,
  OCR_HTTPS_CERT_SERVER_NAME = 21,
  OCR_HTTPS_SERVER_NAME_VERIFY_METHOD = 22,
  OCR_HTTPS_SERVER_CERT_HASH_SHA256 = 23,
  OCR_HTTPS_SERVER_CERT_HASH_SHA384 = 24,
  OCR_HTTPS_SERVER_CERT_HASH_SHA512 = 25,
  OCR_HTTPS_REQUEST_TIMEOUT = 30,
  OCR_HTTPS_USER_NAME = 40,
  OCR_HTTPS_PASSWORD = 41
}

// Parameter names mapping
const ParameterNames: Record<ParameterType, string> = {
  [ParameterType.OCR_EFI_NETWORK_DEVICE_PATH]: 'URI to HTTPS Server',
  [ParameterType.OCR_EFI_FILE_DEVICE_PATH]: 'Device path to PBA.efi',
  [ParameterType.OCR_EFI_DEVICE_PATH_LEN]: 'Device path length',
  [ParameterType.OCR_BOOT_IMAGE_HASH_SHA256]: 'SHA256 hash of boot loader',
  [ParameterType.OCR_BOOT_IMAGE_HASH_SHA384]: 'SHA384 hash of boot loader',
  [ParameterType.OCR_BOOT_IMAGE_HASH_SHA512]: 'SHA512 hash of boot loader',
  [ParameterType.OCR_EFI_BOOT_OPTIONAL_DATA]: 'Optional binary data',
  [ParameterType.OCR_HTTPS_CERT_SYNC_ROOT_CA]: 'Sync Root CAs with Intel AMT',
  [ParameterType.OCR_HTTPS_CERT_SERVER_NAME]: 'HTTPS server certificate name',
  [ParameterType.OCR_HTTPS_SERVER_NAME_VERIFY_METHOD]: 'Server name verification method',
  [ParameterType.OCR_HTTPS_SERVER_CERT_HASH_SHA256]: 'SHA256 hash of server certificate',
  [ParameterType.OCR_HTTPS_SERVER_CERT_HASH_SHA384]: 'SHA384 hash of server certificate',
  [ParameterType.OCR_HTTPS_SERVER_CERT_HASH_SHA512]: 'SHA512 hash of server certificate',
  [ParameterType.OCR_HTTPS_REQUEST_TIMEOUT]: 'HTTP Request timeout',
  [ParameterType.OCR_HTTPS_USER_NAME]: 'HTTPS Username',
  [ParameterType.OCR_HTTPS_PASSWORD]: 'HTTPS Password'
}

// Maximum sizes for each parameter type
const MaxSizes: Record<ParameterType, number> = {
  [ParameterType.OCR_EFI_NETWORK_DEVICE_PATH]: 300,
  [ParameterType.OCR_EFI_FILE_DEVICE_PATH]: 300,
  [ParameterType.OCR_EFI_DEVICE_PATH_LEN]: 2, // UINT16
  [ParameterType.OCR_BOOT_IMAGE_HASH_SHA256]: 32,
  [ParameterType.OCR_BOOT_IMAGE_HASH_SHA384]: 48,
  [ParameterType.OCR_BOOT_IMAGE_HASH_SHA512]: 64,
  [ParameterType.OCR_EFI_BOOT_OPTIONAL_DATA]: 50,
  [ParameterType.OCR_HTTPS_CERT_SYNC_ROOT_CA]: 1, // BOOLEAN
  [ParameterType.OCR_HTTPS_CERT_SERVER_NAME]: 256,
  [ParameterType.OCR_HTTPS_SERVER_NAME_VERIFY_METHOD]: 2, // UINT16
  [ParameterType.OCR_HTTPS_SERVER_CERT_HASH_SHA256]: 32,
  [ParameterType.OCR_HTTPS_SERVER_CERT_HASH_SHA384]: 48,
  [ParameterType.OCR_HTTPS_SERVER_CERT_HASH_SHA512]: 64,
  [ParameterType.OCR_HTTPS_REQUEST_TIMEOUT]: 2, // UINT16
  [ParameterType.OCR_HTTPS_USER_NAME]: 16,
  [ParameterType.OCR_HTTPS_PASSWORD]: 16
}

// Parameter details for validation rules
interface ParameterDetail {
  mandatory: boolean
  dependsOn?: ParameterType
  comment: string
}

const ParameterDetails: Record<ParameterType, ParameterDetail> = {
  [ParameterType.OCR_EFI_NETWORK_DEVICE_PATH]: {
    mandatory: true,
    comment: 'Mandatory for boot to HTTPS'
  },
  [ParameterType.OCR_EFI_FILE_DEVICE_PATH]: {
    mandatory: false,
    comment: 'Used when console specifies device path not registered by BIOS'
  },
  [ParameterType.OCR_EFI_DEVICE_PATH_LEN]: {
    mandatory: false,
    dependsOn: ParameterType.OCR_EFI_FILE_DEVICE_PATH,
    comment: 'Mandatory when OCR_EFI_FILE_DEVICE_PATH is provided'
  },
  [ParameterType.OCR_BOOT_IMAGE_HASH_SHA256]: {
    mandatory: false,
    comment: "Optional for HTTPS boot. Mandatory when image not signed and secure boot can't be disabled"
  },
  [ParameterType.OCR_BOOT_IMAGE_HASH_SHA384]: {
    mandatory: false,
    comment: "Optional for HTTPS boot. Mandatory when image not signed and secure boot can't be disabled"
  },
  [ParameterType.OCR_BOOT_IMAGE_HASH_SHA512]: {
    mandatory: false,
    comment: "Optional for HTTPS boot. Mandatory when image not signed and secure boot can't be disabled"
  },
  [ParameterType.OCR_EFI_BOOT_OPTIONAL_DATA]: {
    mandatory: false,
    comment: 'Optional binary data for loaded image'
  },
  [ParameterType.OCR_HTTPS_CERT_SYNC_ROOT_CA]: {
    mandatory: false,
    comment: "Optional for HTTPS boot. Required if BIOS doesn't have root CA"
  },
  [ParameterType.OCR_HTTPS_CERT_SERVER_NAME]: {
    mandatory: false,
    comment: 'Optional for HTTPS boot'
  },
  [ParameterType.OCR_HTTPS_SERVER_NAME_VERIFY_METHOD]: {
    mandatory: false,
    comment: 'Optional for HTTPS boot'
  },
  [ParameterType.OCR_HTTPS_SERVER_CERT_HASH_SHA256]: {
    mandatory: false,
    comment: 'Can be provided instead of or with Root CA, server name and verify method'
  },
  [ParameterType.OCR_HTTPS_SERVER_CERT_HASH_SHA384]: {
    mandatory: false,
    comment: 'Can be provided instead of or with Root CA, server name and verify method'
  },
  [ParameterType.OCR_HTTPS_SERVER_CERT_HASH_SHA512]: {
    mandatory: false,
    comment: 'Can be provided instead of or with Root CA, server name and verify method'
  },
  [ParameterType.OCR_HTTPS_REQUEST_TIMEOUT]: {
    mandatory: false,
    comment: 'Optional for HTTPS boot'
  },
  [ParameterType.OCR_HTTPS_USER_NAME]: {
    mandatory: false,
    comment: 'Optional for HTTPS boot'
  },
  [ParameterType.OCR_HTTPS_PASSWORD]: {
    mandatory: false,
    comment: 'Optional for HTTPS boot'
  }
}

// Interfaces
interface TLVParameter {
  type: ParameterType
  length: number
  value: Uint8Array
  valid?: boolean
}

interface ValidationResult {
  valid: boolean
  parameters: TLVParameter[]
  errors: string[]
}

// Utility functions for binary operations
class BinaryUtils {
  static writeUint16LE(value: number): Uint8Array {
    const buffer = new ArrayBuffer(2)
    const view = new DataView(buffer)
    view.setUint16(0, value, true) // true for little-endian
    return new Uint8Array(buffer)
  }

  static writeUint32LE(value: number): Uint8Array {
    const buffer = new ArrayBuffer(4)
    const view = new DataView(buffer)
    view.setUint32(0, value, true) // true for little-endian
    return new Uint8Array(buffer)
  }

  static readUint16LE(buffer: Uint8Array, offset = 0): number {
    const view = new DataView(buffer.buffer, buffer.byteOffset + offset, 2)
    return view.getUint16(0, true) // true for little-endian
  }

  static readUint32LE(buffer: Uint8Array, offset = 0): number {
    const view = new DataView(buffer.buffer, buffer.byteOffset + offset, 4)
    return view.getUint32(0, true) // true for little-endian
  }

  static concatArrays(...arrays: Uint8Array[]): Uint8Array {
    const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0)
    const result = new Uint8Array(totalLength)
    let offset = 0
    for (const array of arrays) {
      result.set(array, offset)
      offset += array.length
    }
    return result
  }
}

// URL validation helper
function isValidURI(uri: string): boolean {
  try {
    new URL(uri)
    return true
  } catch {
    return false
  }
}

function validateTLVEntry(paramType: ParameterType, length: number, value: Uint8Array): string | null {
  // Check if type is valid
  if (!(paramType in ParameterNames)) {
    return `invalid parameter type: ${paramType}`
  }

  // Check length against max size
  const maxSize = MaxSizes[paramType]
  if (length > maxSize) {
    return `parameter ${ParameterNames[paramType]} exceeds maximum size: ${length} > ${maxSize}`
  }

  // Type-specific validations
  switch (paramType) {
    case ParameterType.OCR_HTTPS_CERT_SYNC_ROOT_CA: {
      // Validate boolean value (should be 0 or 1)
      if (value.length > 0 && value[0] !== 0 && value[0] !== 1) {
        return `invalid boolean value for ${ParameterNames[paramType]}}`
      }
      break
    }

    case ParameterType.OCR_HTTPS_SERVER_NAME_VERIFY_METHOD: {
      // Validate verify method (1=FullName, 2=DomainSuffix, 3=Other)
      if (value.length >= 2) {
        const method = value[0] | (value[1] << 8) // Little-endian UINT16
        if (method < 1 || method > 3) {
          return `invalid verification method: ${method}`
        }
      }
      break
    }

    case ParameterType.OCR_EFI_DEVICE_PATH_LEN: {
      // Must be valid UINT16
      if (length !== 2) {
        return `invalid length for UINT16 device path length: ${length}`
      }
      break
    }

    case ParameterType.OCR_EFI_NETWORK_DEVICE_PATH: {
      // Validate URI
      const uri = new TextDecoder().decode(value)
      if (!isValidURI(uri)) {
        return `invalid URI for ${ParameterNames[paramType]}: ${uri}`
      }
      break
    }

    case ParameterType.OCR_EFI_FILE_DEVICE_PATH:
      // Add validation if needed
      break

    case ParameterType.OCR_BOOT_IMAGE_HASH_SHA256:
    case ParameterType.OCR_BOOT_IMAGE_HASH_SHA384:
    case ParameterType.OCR_BOOT_IMAGE_HASH_SHA512:
      // Validate hash length if needed
      break

    case ParameterType.OCR_EFI_BOOT_OPTIONAL_DATA:
      // Add validation if needed
      break

    case ParameterType.OCR_HTTPS_CERT_SERVER_NAME:
      // Add validation if needed
      break

    case ParameterType.OCR_HTTPS_SERVER_CERT_HASH_SHA256:
    case ParameterType.OCR_HTTPS_SERVER_CERT_HASH_SHA384:
    case ParameterType.OCR_HTTPS_SERVER_CERT_HASH_SHA512:
      // Validate hash length if needed
      break

    case ParameterType.OCR_HTTPS_REQUEST_TIMEOUT:
      // Add timeout validation if needed
      break

    case ParameterType.OCR_HTTPS_USER_NAME:
    case ParameterType.OCR_HTTPS_PASSWORD:
      return `Validation not implemented for ${ParameterNames[paramType]}`
  }

  return null
}

// ParseTLVBuffer parses and validates a TLV buffer.
function parseTLVBuffer(buffer: Uint8Array): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    parameters: [],
    errors: []
  }

  let offset = 0
  const presentTypes = new Set<ParameterType>()

  while (offset < buffer.length) {
    // Need at least 2 bytes for type and length.
    if (offset + 2 > buffer.length) {
      result.valid = false
      result.errors.push('incomplete TLV entry at end of buffer')
      break
    }

    const paramType = buffer[offset] as ParameterType
    const length = buffer[offset + 1]
    offset += 2

    // Check if we have enough bytes for the value
    if (offset + length > buffer.length) {
      result.valid = false
      result.errors.push(`incomplete value for type ${paramType}, expected ${length} bytes`)
      break
    }

    const value = buffer.slice(offset, offset + length)
    offset += length

    // Validate this TLV entry
    let valid = true
    const error = validateTLVEntry(paramType, length, value)
    if (error) {
      result.valid = false
      result.errors.push(error)
      valid = false
    }

    // Track which parameter types we've seen
    presentTypes.add(paramType)

    // Add to parsed parameters
    result.parameters.push({
      type: paramType,
      length,
      value,
      valid
    })
  }

  // Check for mandatory parameters
  for (const [paramType, details] of Object.entries(ParameterDetails)) {
    const type = Number(paramType) as ParameterType
    if (details.mandatory && !presentTypes.has(type)) {
      result.valid = false
      result.errors.push(`missing mandatory parameter: ${ParameterNames[type]}`)
    }
  }

  // Check for dependent parameters
  for (const [paramType, details] of Object.entries(ParameterDetails)) {
    const type = Number(paramType) as ParameterType
    if (details.dependsOn && presentTypes.has(type) && !presentTypes.has(details.dependsOn)) {
      result.valid = false
      result.errors.push(
        `missing ${ParameterNames[details.dependsOn]} which is mandatory when ${ParameterNames[type]} is provided`
      )
    }
  }

  return result
}

// CreateTLVBuffer creates a TLV buffer from parameters.
function createTLVBuffer(parameters: TLVParameter[]): Uint8Array {
  const bufferParts: Uint8Array[] = []

  for (const param of parameters) {
    // default vendor Intel
    bufferParts.push(BinaryUtils.writeUint16LE(0x8086))

    // param type
    bufferParts.push(BinaryUtils.writeUint16LE(param.type))

    if (param.type === ParameterType.OCR_HTTPS_CERT_SYNC_ROOT_CA) {
      bufferParts.push(BinaryUtils.writeUint32LE(1))
      bufferParts.push(new Uint8Array([1]))
    } else {
      bufferParts.push(BinaryUtils.writeUint32LE(param.value.length))
      bufferParts.push(param.value)
    }
  }

  return BinaryUtils.concatArrays(...bufferParts)
}

// GetUint16Value retrieves a uint16 from a parameter value (little-endian).
function getUint16Value(param: TLVParameter): number {
  if (param.value.length !== 2) {
    throw new Error(`expected 2 bytes for uint16, got ${param.value.length}`)
  }

  return BinaryUtils.readUint16LE(param.value)
}

// GetStringValue retrieves a string from a parameter value (UTF-8).
function getStringValue(param: TLVParameter): string {
  const decoder = new TextDecoder('utf-8')
  const str = decoder.decode(param.value)
  // Remove null terminators
  return str.replace(/\0+$/, '')
}

// NewUint16Parameter creates a new parameter with a uint16 value.
function newUint16Parameter(paramType: ParameterType, value: number): TLVParameter {
  const buf = BinaryUtils.writeUint16LE(value)

  return {
    type: paramType,
    length: 2,
    value: buf
  }
}

// NewStringParameter creates a new parameter with a string value.
function newStringParameter(paramType: ParameterType, value: string): TLVParameter {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(value)

  if (bytes.length > MaxSizes[paramType]) {
    throw new Error(`string value too long: ${bytes.length} bytes (max ${MaxSizes[paramType]})`)
  }

  return {
    type: paramType,
    length: bytes.length,
    value: bytes
  }
}

// NewBoolParameter creates a new parameter with a boolean value.
function newBoolParameter(paramType: ParameterType, value: boolean): TLVParameter {
  const boolValue = value ? 1 : 0

  return {
    type: paramType,
    length: 1,
    value: new Uint8Array([boolValue])
  }
}

// ValidateParameters validates a set of parameters without creating a buffer.
function validateParameters(parameters: TLVParameter[]): { valid: boolean; errors: string[] } {
  let valid = true
  const errors: string[] = []

  // Check each parameter individually
  const presentTypes = new Set<ParameterType>()

  for (const param of parameters) {
    const error = validateTLVEntry(param.type, param.value.length, param.value)
    if (error) {
      valid = false
      errors.push(error)
    }

    presentTypes.add(param.type)
  }

  // Check for mandatory parameters
  for (const [paramType, details] of Object.entries(ParameterDetails)) {
    const type = Number(paramType) as ParameterType
    if (details.mandatory && !presentTypes.has(type)) {
      valid = false
      errors.push(`missing mandatory parameter: ${ParameterNames[type]}`)
    }
  }

  // Check for dependent parameters
  for (const [paramType, details] of Object.entries(ParameterDetails)) {
    const type = Number(paramType) as ParameterType
    if (details.dependsOn && presentTypes.has(type) && !presentTypes.has(details.dependsOn)) {
      valid = false
      errors.push(
        `missing ${ParameterNames[details.dependsOn]} which is mandatory when ${ParameterNames[type]} is provided`
      )
    }
  }

  return { valid, errors }
}

// Custom error for validation use case
class ValidationUseCaseError extends Error {
  constructor(message = 'Validation failed for use case') {
    super(message)
    this.name = 'ValidationUseCaseError'
  }
}

// Export all functions and types
export {
  ParameterType,
  ParameterNames,
  MaxSizes,
  ParameterDetails,
  ParameterDetail,
  TLVParameter,
  ValidationResult,
  ValidationUseCaseError,
  BinaryUtils,
  validateTLVEntry,
  parseTLVBuffer,
  createTLVBuffer,
  getUint16Value,
  getStringValue,
  newUint16Parameter,
  newStringParameter,
  newBoolParameter,
  validateParameters
}
