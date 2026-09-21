/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { HTTPErrorTable } from './constants.js'

const NOT_FOUND = 'Not Found'

// `error` is always a string; the 404 entry is a table of resource messages selected by key
export const ErrorResponse = (status: number, errDesc?: string, error?: string): any => {
  const entry = HTTPErrorTable[status]
  const message = typeof entry === 'object' ? (entry[error] ?? NOT_FOUND) : entry
  const response: any = { error: message }
  if (errDesc) {
    response.errorDescription = errDesc
  }
  return response
}
