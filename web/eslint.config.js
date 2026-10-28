import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

// Local stand-in for @moduleleague/ui, copied from ml-frontend-base: fix lint findings upstream, not here
const SHARED_UI_KIT = ['src/components/ml/**', 'src/hooks/**']

export default defineConfig([
  globalIgnores([
    'dist',
    'src/components/ui',
    'src/hooks/useDialog.tsx',
    'src/hooks/useDrawer.tsx',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Destructuring a prop out to keep it from a rest spread is how props get omitted
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
    },
  },
  {
    // "Null & Boolean Operators" in CLAUDE.md
    files: ['src/**/*.{ts,tsx}'],
    ignores: SHARED_UI_KIT,
    rules: {
      // Off: API and saved data are read with `?.` even where the type says the value exists
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/strict-boolean-expressions': [
        'error',
        { allowString: false, allowNumber: false },
      ],
      '@typescript-eslint/no-non-null-assertion': 'error',
      'no-extra-boolean-cast': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
    },
  },
])
