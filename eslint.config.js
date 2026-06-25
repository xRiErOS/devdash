// DD2 Clean-Cut: schlanke ESLint-9-Flat-Config. Custom-Tier-/Archetyp-Rules +
// inline-style-Ratchet + Suppressions entfernt (Maschinerie-Abbau). Nur noch
// Basis-Hygiene: recommended + react + hooks. Alignment kommt aus Single-Source
// (Storybook), nicht aus Lint-Gates.
import js from '@eslint/js'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'

const reactRules = {
  ...react.configs.flat.recommended.rules,
  'react/react-in-jsx-scope': 'off', // React 19 / automatic runtime
  'react/prop-types': 'off',
  'react-hooks/rules-of-hooks': 'error',
  'react-hooks/exhaustive-deps': 'warn',
  'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  'no-undef': 'error',
  'no-empty': ['error', { allowEmptyCatch: true }],
}

export default [
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**', '**/*.min.js', 'storybook-static/**'] },
  js.configs.recommended,
  {
    files: ['apps/frontend/src/**/*.{js,jsx}', 'apps/frontend/.storybook/**/*.{js,jsx}'],
    plugins: { react, 'react-hooks': reactHooks },
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.es2024 },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: '19.0' } },
    rules: reactRules,
  },
  // Node-Skripte: node-Globals, kein react-Regelwerk.
  {
    files: ['scripts/**/*.{js,mjs}', 'apps/backend/**/*.{js,mjs}', 'apps/cli/**/*.{js,mjs}', 'packages/**/*.{js,mjs}'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: { ...globals.node, ...globals.es2024 },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef': 'error',
    },
  },
]
