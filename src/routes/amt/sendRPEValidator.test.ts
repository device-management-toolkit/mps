/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { describe, expect, it } from 'vitest'
import { validationResult } from 'express-validator'
import { sendRPEValidator } from './sendRPEValidator.js'
import { MAX_SSD_PASSWORD_LENGTH } from './rpeConstants.js'

async function getValidationErrors(body: any): Promise<any[]> {
  const req: any = { body, query: {}, params: {} }
  const chains = sendRPEValidator()
  for (const chain of chains) {
    await chain.run(req)
  }
  return validationResult(req).array()
}

describe('sendRPE validator', () => {
  describe('valid requests', () => {
    it('accepts a single boolean erase option', async () => {
      const errors = await getValidationErrors({ secureEraseAllSSDs: true })
      expect(errors).toHaveLength(0)
    })

    it('accepts multiple erase options', async () => {
      const errors = await getValidationErrors({
        secureEraseAllSSDs: true,
        tpmClear: true,
        restoreBIOSToEOM: false,
        unconfigureCSME: false
      })
      expect(errors).toHaveLength(0)
    })

    it('accepts CSME-only erase', async () => {
      const errors = await getValidationErrors({ unconfigureCSME: true })
      expect(errors).toHaveLength(0)
    })

    it('accepts ssdPassword with secureEraseAllSSDs', async () => {
      const errors = await getValidationErrors({
        secureEraseAllSSDs: true,
        ssdPassword: 'mypassword'
      })
      expect(errors).toHaveLength(0)
    })

    it('accepts ssdPassword at exactly the max byte length', async () => {
      const errors = await getValidationErrors({
        secureEraseAllSSDs: true,
        ssdPassword: 'a'.repeat(MAX_SSD_PASSWORD_LENGTH)
      })
      expect(errors).toHaveLength(0)
    })

    it('accepts omitted ssdPassword', async () => {
      const errors = await getValidationErrors({ tpmClear: true })
      expect(errors).toHaveLength(0)
    })
  })

  describe('at-least-one-option requirement', () => {
    it('rejects an empty body', async () => {
      const errors = await getValidationErrors({})
      expect(errors.length).toBeGreaterThan(0)
      expect(errors.some((e) => e.msg === 'At least one erase option must be enabled')).toBe(true)
    })

    it('rejects when all erase options are false', async () => {
      const errors = await getValidationErrors({
        secureEraseAllSSDs: false,
        tpmClear: false,
        restoreBIOSToEOM: false,
        unconfigureCSME: false
      })
      expect(errors.some((e) => e.msg === 'At least one erase option must be enabled')).toBe(true)
    })
  })

  describe('boolean type enforcement', () => {
    it('rejects string "true" for secureEraseAllSSDs', async () => {
      const errors = await getValidationErrors({ secureEraseAllSSDs: 'true' })
      expect(errors.some((e) => e.path === 'secureEraseAllSSDs')).toBe(true)
    })

    it('rejects string "false" for secureEraseAllSSDs', async () => {
      const errors = await getValidationErrors({ secureEraseAllSSDs: 'false', tpmClear: true })
      expect(errors.some((e) => e.path === 'secureEraseAllSSDs')).toBe(true)
    })

    it('rejects number 1 for tpmClear', async () => {
      const errors = await getValidationErrors({ tpmClear: 1 })
      expect(errors.some((e) => e.path === 'tpmClear')).toBe(true)
    })

    it('rejects string for restoreBIOSToEOM', async () => {
      const errors = await getValidationErrors({ restoreBIOSToEOM: 'yes', secureEraseAllSSDs: true })
      expect(errors.some((e) => e.path === 'restoreBIOSToEOM')).toBe(true)
    })

    it('rejects string for unconfigureCSME', async () => {
      const errors = await getValidationErrors({ unconfigureCSME: '1', secureEraseAllSSDs: true })
      expect(errors.some((e) => e.path === 'unconfigureCSME')).toBe(true)
    })
  })

  describe('ssdPassword validation', () => {
    it('rejects non-string ssdPassword', async () => {
      const errors = await getValidationErrors({ secureEraseAllSSDs: true, ssdPassword: 12345 })
      expect(errors.some((e) => e.path === 'ssdPassword')).toBe(true)
    })

    it('rejects ssdPassword exceeding max byte length', async () => {
      const errors = await getValidationErrors({
        secureEraseAllSSDs: true,
        ssdPassword: 'a'.repeat(MAX_SSD_PASSWORD_LENGTH + 1)
      })
      expect(errors.some((e) => e.path === 'ssdPassword')).toBe(true)
      expect(errors.some((e) => e.msg.includes(`${MAX_SSD_PASSWORD_LENGTH} bytes`))).toBe(true)
    })

    it('rejects multibyte password that exceeds 64 bytes despite being fewer characters', async () => {
      // Each '€' is 3 bytes in UTF-8; 22 × 3 = 66 bytes > 64
      const errors = await getValidationErrors({
        secureEraseAllSSDs: true,
        ssdPassword: '€'.repeat(22)
      })
      expect(errors.some((e) => e.path === 'ssdPassword')).toBe(true)
    })
  })
})
