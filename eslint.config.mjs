import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Scripts use Node.js require() style
    "scripts/**",
    "apply-migration.js",
    // Test setup uses require() style
    "jest.setup.ts",
    // Test files
    "__tests__/**",
    "*.test.ts",
    "*.test.tsx",
    // Archive - old code
    "archive/**",
    // Legacy home API - different coding style
    "app/api/home/**",
    // Playwright E2E tests
    "e2e/**",
  ]),
]);

export default eslintConfig;
