// @ts-check
import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default defineConfig(
  {
    ignores: ['dist/**', 'node_modules/**', 'drizzle/**', 'drizzle.config.ts'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Add specific configuration for Node.js/Express environment
    files: ['**/*.ts'],
    languageOptions: {
      sourceType: 'module',
      ecmaVersion: 2022, // Adjust based on your Node.js version/target
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    // Customize rules as needed for your project
    rules: {
      // Example rule from typescript-eslint
      '@typescript-eslint/no-unused-vars': 'error',
    },
  },
  // Disable ESLint rules that conflict with Prettier
  eslintConfigPrettier
);
