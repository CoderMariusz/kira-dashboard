import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  modulePathIgnorePatterns: ['<rootDir>/archive/'],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/tests/',
    '<rootDir>/archive/',
  ],
  testMatch: ['**/?(*.)+(spec|test).[tj]s?(x)'],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  transform: {
    '^.+\\.(ts|tsx|js|jsx|mjs)$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: '<rootDir>/tsconfig.json',
      },
    ],
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(msw|@mswjs|interceptors|strict-event-emitter|@open-draft)/)',
  ],
  collectCoverageFrom: [
    // EPIC-6 + nowe: pipeline, projects, services, hooks
    'services/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    'app/api/pipeline/**/*.{ts,tsx}',
    'app/api/projects/**/*.{ts,tsx}',
    'app/api/auth/**/*.{ts,tsx}',
    // Wyklucz starszy kod (EPIC-1-5) — testy w osobnym tickecie
    '!app/api/home/**',
    '!hooks/home/**',
    '!app/api/models/**',
    '!app/api/events/**',
    '!app/api/bridge/**',
    '!app/api/debug-auth/**',
    '!app/api/eval/**',
    '!app/api/runs/**',
    '!app/api/stories/**',
    '!app/api/sync/**',
    '!app/api/users/**',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  // Coverage thresholds disabled — STORY-7.4 adds tests incrementally
  // Re-enable with proper targets after EPIC-7 test coverage is complete
  // coverageThreshold: {
  //   global: {
  //     branches: 80,
  //     functions: 80,
  //     lines: 80,
  //     statements: 80,
  //   },
  // },
};

export default config;
