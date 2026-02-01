// @ts-check
import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
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
      // Example rule: enforce consistent single quotes
      'quotes': ['error', 'single'],
      // Example rule from typescript-eslint
      '@typescript-eslint/no-unused-vars': 'error',
    },
  }
);