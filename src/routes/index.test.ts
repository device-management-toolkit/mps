/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import router from './index.js'

describe('Check index from routes', () => {
  const routes = [
    { path: '/ciracert', method: 'get' }]
  it('should have routes', () => {
    routes.forEach((route) => {
      const match = router.stack.find((s) => s.route?.path === route.path && (s.route as any)?.methods?.[route.method])
      expect(match).toBeTruthy()
    })
  })
  const routers = [
    { path: '/authorize', method: 'use' },
    { path: '/devices', method: 'use' },
    { path: '/amt', method: 'use' },
    { path: '/health', method: 'use' }
  ]

  it('should have routers', () => {
    routers.forEach((route) => {
      const match = router.stack.find((s) => (s?.regexp as RegExp).exec(route.path)?.length > 0 && s.path == null)
      expect(match).toBeTruthy()
    })
  })
})
