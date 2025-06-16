/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import router from './index.js'

describe('Check index from devices', () => {
  const routes = [
    { path: '/', method: 'get' },
    { path: '/stats', method: 'get' },
    { path: '/tags', method: 'get' },
    { path: '/:guid', method: 'get' },
    { path: '/', method: 'post' },
    { path: '/', method: 'patch' },
    { path: '/:guid', method: 'delete' },
    { path: '/disconnect/:guid', method: 'delete' }
  ]
  it('should have routes', async () => {
    routes.forEach((route) => {
      const match = router.stack.find(
        (s) => s.route?.path === route.path && s.route && (s.route as any).methods[route.method]
      )
      expect(match).toBeTruthy()
    })
  })
})
