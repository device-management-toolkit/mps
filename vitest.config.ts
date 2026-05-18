/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Match jest's prior testMatch
    include: ['src/**/*.test.ts'],
    environment: 'node',
    // Enable globals for `describe`, `it`, `expect`, `beforeEach`, etc. The
    // original suite relied on Jest's implicit globals (via @types/jest) for
    // those names and only imported `jest` explicitly from '@jest/globals'.
    // The migration converts `jest` usage to explicit `vi` imports from
    // 'vitest' while leaving the implicit globals usage intact — enabling
    // `globals: true` preserves that pattern without touching 76 files.
    globals: true,
    // Some suites rely on long-running async setup; keep a generous default
    // equivalent to the prior jest.setTimeout(60000) usage in a couple of files.
    testTimeout: 60000,
    hookTimeout: 60000,
    // Match jest --forceExit semantics: vitest has pool teardown by default,
    // but several tests leave servers/sockets open. Forking helps isolation
    // and avoids stale module state from the prior resetModules usage.
    pool: 'forks',
    reporters: ['default', ['junit', { outputFile: 'junit.xml' }]],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,ts}'],
      exclude: [
        'src/middleware/custom/**/*.{js,ts}',
        'src/**/*.test.ts',
        'src/**/*.d.ts',
        'src/test/**'
      ],
      reporter: [
        'text',
        'lcov',
        'html',
        'json'
      ],
      reportsDirectory: './coverage'
    }
  },
  // Vitest resolves TS extension specifiers natively; the jest moduleNameMapper
  // that stripped `.js` suffixes from ESM imports is not required. No bare
  // specifiers from `src/` are used in tests, so no alias config is needed.
  // DbCreatorFactory and SecretManagerCreatorFactory use dynamic template-string
  // imports like `import(\`../data/${provider}/index.js\`)`. Vite's
  // dynamic-import-vars plugin cannot statically analyze these. Disable that
  // plugin so Node.js handles the dynamic import at runtime unchanged.
  build: {
    dynamicImportVarsOptions: {
      exclude: [/.*/]
    }
  }
})
