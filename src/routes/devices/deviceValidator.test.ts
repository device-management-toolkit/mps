/*********************************************************************
 * Copyright (c) Intel Corporation 2026
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { describe, expect, it } from 'vitest'
import { validationResult } from 'express-validator'
import { validator } from './deviceValidator.js'

async function getValidationErrors(body: any): Promise<any[]> {
  const req: any = { body, query: {}, params: {} }
  const chains = validator()

  for (const chain of chains) {
    await chain.run(req)
  }

  return validationResult(req).array()
}

describe('device validator dnsSuffix checks', () => {
  it('accepts a valid dnsSuffix', async () => {
    const errors = await getValidationErrors({
      guid: '123e4567-e89b-12d3-a456-426614174000',
      dnsSuffix: 'os.suffix.com'
    })

    expect(errors).toHaveLength(0)
  })

  it('accepts null dnsSuffix', async () => {
    const errors = await getValidationErrors({
      guid: '123e4567-e89b-12d3-a456-426614174000',
      dnsSuffix: null
    })

    expect(errors).toHaveLength(0)
  })

  it('accepts empty string dnsSuffix', async () => {
    const errors = await getValidationErrors({
      guid: '123e4567-e89b-12d3-a456-426614174000',
      dnsSuffix: ''
    })

    expect(errors).toHaveLength(0)
  })

  it('rejects dnsSuffix containing query string characters', async () => {
    const errors = await getValidationErrors({
      guid: '123e4567-e89b-12d3-a456-426614174000',
      dnsSuffix: 'None?injected_query_string=123'
    })

    expect(errors.some((error) => error.path === 'dnsSuffix')).toBeTruthy()
    const dnsSuffixError = errors.find((error) => error.path === 'dnsSuffix')
    expect(dnsSuffixError).toBeDefined()
    expect(dnsSuffixError?.msg).toContain('dnsSuffix')
  })
})
