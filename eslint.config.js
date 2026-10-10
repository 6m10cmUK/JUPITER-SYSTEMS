import { readdirSync } from 'node:fs'
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { globalIgnores } from 'eslint/config'

// import の向きの規則。
// app → features/<f>/index.ts と shared。features/<f> → 自 feature と shared。shared → どこにも依存しない。
// feature 内は ui → model → lib → core の一方向、worker → core。
// 同じファイルに複数ブロックの no-restricted-imports が当たると後勝ちで上書きされるので、
// 1 ファイルに当たるブロックが 1 つになるよう、feature × 層ごとに規則をまとめて作る。

const FEATURES = readdirSync(new URL('./src/features', import.meta.url), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)

const up = (names) => `^(\\.\\./)+(${names.join('|')})(/|$)`

const REACT = {
  regex: '^react(-dom)?(/|$)',
  message: 'lib・core・worker では React を使わない（ui か model に置く）',
}

const LAYER_RULES = {
  model: [{ regex: up(['ui']), message: 'model から ui を import しない' }],
  lib: [
    { regex: up(['ui', 'model', 'worker']), message: 'lib から ui・model・worker を import しない' },
    REACT,
  ],
  core: [
    { regex: up(['ui', 'model', 'lib', 'worker', 'shared']), message: 'core は自分の中だけで完結させる' },
    REACT,
    { regex: '^pdfjs-dist(/|$)', allowTypeImports: true, message: 'core は pdfjs-dist を型だけ import する（実体は worker で読む）' },
  ],
  worker: [
    { regex: up(['ui', 'model', 'lib']), message: 'worker が import できるのは core だけ' },
    REACT,
  ],
}

const restrict = (patterns) => ({
  'no-restricted-imports': 'off',
  '@typescript-eslint/no-restricted-imports': ['error', { patterns }],
})

const featureBlocks = FEATURES.flatMap((feature) => {
  const others = FEATURES.filter((f) => f !== feature)
  const boundary = [
    { regex: up(['app', 'features']), message: 'feature から app を import しない' },
    ...(others.length > 0
      ? [{ regex: up(others), message: '別の feature を import しない（共通にするなら shared へ）' }]
      : []),
  ]
  const base = `src/features/${feature}`
  return [
    { files: [`${base}/**/*.{ts,tsx}`], rules: restrict(boundary) },
    ...Object.entries(LAYER_RULES).map(([layer, patterns]) => ({
      files: [`${base}/${layer}/**/*.{ts,tsx}`],
      rules: restrict([...boundary, ...patterns]),
    })),
  ]
})

const boundaryConfig = [
  {
    files: ['src/app/**/*.{ts,tsx}'],
    rules: restrict([
      { regex: '(^|/)features/[^/]+/.', message: 'feature は index.ts 経由で import する' },
    ]),
  },
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: restrict([{ regex: up(['app', 'features']), message: 'shared から app・features を import しない' }]),
  },
  ...featureBlocks,
  {
    files: ['scripts/**/*.ts'],
    rules: restrict([
      { regex: '(^|/)src/(?!features/pdf2md/core/)', message: 'scripts から使えるのは src/features/pdf2md/core だけ' },
    ]),
  },
]

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  ...boundaryConfig,
])
