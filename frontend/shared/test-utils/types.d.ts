// test-utils/types.d.ts
/// <reference types="vitest/globals" />
/// <reference types="@testing-library/jest-dom" />

import type { VitestUtils } from 'vitest'

declare global {
  const vi: VitestUtils
  const expect: typeof import('vitest').expect
  const describe: typeof import('vitest').describe
  const it: typeof import('vitest').it
  const test: typeof import('vitest').test
  const beforeEach: typeof import('vitest').beforeEach
  const afterEach: typeof import('vitest').afterEach
  const beforeAll: typeof import('vitest').beforeAll
  const afterAll: typeof import('vitest').afterAll
}

export {}