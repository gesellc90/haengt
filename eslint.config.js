// Zentrale Flat-Config für das gesamte Monorepo.
// Backend (Node) und Frontend (React) werden über `files`-Globs unterschieden,
// damit die Regeln aus CONTRIBUTING.md überall einheitlich greifen.

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  // ── Ignorierte Pfade ───────────────────────────────────────────────────────
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/playwright-report/**',
      '**/test-results/**',
      '.husky/_/**',
    ],
  },

  // ── Basis: JS + TypeScript-Empfehlung ──────────────────────────────────────
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // ── Globale Projektregeln (aus CONTRIBUTING.md abgeleitet) ─────────────────
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
    },
  },

  // ── Backend: Node-Globals, kein Browser ────────────────────────────────────
  {
    files: ['backend/**/*.ts'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // ── Frontend: React + Browser-Globals ──────────────────────────────────────
  {
    files: ['frontend/**/*.{ts,tsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: { react: { version: '18.3' } },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react/prop-types': 'off', // wir nutzen TS-Typen
    },
  },

  // ── Tests: Vitest-Globals erlauben, console.log akzeptabel ─────────────────
  {
    files: ['**/tests/**/*.{ts,tsx}', '**/*.test.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      'no-console': 'off',
    },
  },

  // ── Node.js-Hilfsskripte (.mjs): build-Skripte wie copy-migrations ─────────
  {
    files: ['**/*.mjs'],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      'no-console': 'off',
    },
  },

  // ── Konfig-Dateien dürfen require/console/etc. ─────────────────────────────
  {
    files: ['**/*.config.{js,ts}', '**/.prettierrc.{js,cjs,mjs}'],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      'no-console': 'off',
    },
  },
);
