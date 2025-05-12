/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

export function parseBody(message: any): string {
  let xmlBody = ''
  // 'Bad' requests to some devices return no body (issue #661) - prevent exceptions below
  if (message.bodySize === 0) return ''
  // parse the body until its length is greater than 5, because body ends with '0\r\n\r\n'
  while (message.body.text.length > 5) {
    const chunkLength = message.body.text.indexOf('\r\n')
    if (chunkLength < 0) {
      return ''
    }
    // converts hexadecimal chunk size to integer
    const chunkSize = parseInt(message.body.text.substring(0, chunkLength), 16)
    if (message.body.text.length < chunkLength + 2 + chunkSize + 2) {
      return ''
    }
    const data = message.body.text.substring(chunkLength + 2, chunkLength + 2 + chunkSize)
    message.body.text = message.body.text.substring(chunkLength + 2 + chunkSize + 2)
    xmlBody += data
  }
  return xmlBody
}
