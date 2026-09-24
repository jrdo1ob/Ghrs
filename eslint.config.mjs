import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/android/**',
      '**/coverage/**',
      '**/test-results/**',
      '**/playwright-report/**',
      '**/blob-report/**',
      '**/playwright/.cache/**',
      '**/.vercel/**',
      '**/.playwright-mcp/**',
      '**/.freebuff/**',
      '**/.temp/**',
      '**/out/**',
      '**/build/**',
      '**/*.js',
      '**/*.mjs',
      '**/*.cjs',
    ],
  },

  // Base recommended rules
  js.configs.recommended,

  // TypeScript recommended rules
  ...tseslint.configs.recommended,

  // React Hooks rules
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },

  // Project-specific overrides for TS files
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Allow unused variables prefixed with _ (common convention)
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      // Relax no-explicit-any to warn (existing codebase uses it)
      '@typescript-eslint/no-explicit-any': 'warn',

      // React 19 hooks — warn on existing patterns that work but are stricter in React 19
      // These are not application errors; they are React 19 strict-mode suggestions
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/purity': 'warn',

      // Core ESLint rules
      'no-useless-assignment': 'warn',
      'prefer-const': 'warn',
    },
  },
);
