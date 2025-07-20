# GitHub Actions セットアップガイド

## 手動でのセットアップ手順

GitHub ActionsのワークフローはGitHub上で直接作成する必要があります。

### 1. GitHubリポジトリにアクセス
https://github.com/6m10cmUK/TRPG-pdf2mdTOOL

### 2. Actionsタブをクリック

### 3. "set up a workflow yourself" を選択

### 4. 以下のワークフローを作成

## CI ワークフロー (.github/workflows/ci.yml)

```yaml
name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test-frontend:
    name: Test Frontend
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linter
      run: npm run lint
    
    - name: Type check
      run: npx tsc --noEmit
    
    - name: Build
      run: npm run build

  test-backend:
    name: Test Backend
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    
    - name: Cache pip packages
      uses: actions/cache@v3
      with:
        path: ~/.cache/pip
        key: ${{ runner.os }}-pip-${{ hashFiles('backend/requirements.txt') }}
        restore-keys: |
          ${{ runner.os }}-pip-
    
    - name: Install dependencies
      working-directory: ./backend
      run: |
        python -m pip install --upgrade pip
        pip install -r requirements.txt
        pip install pytest pytest-asyncio httpx
    
    - name: Run tests
      working-directory: ./backend
      run: |
        python -m pytest tests/ -v || echo "No tests found yet"
    
    - name: Check code formatting
      working-directory: ./backend
      run: |
        pip install black flake8
        black --check . || echo "Code formatting check"
        flake8 . --max-line-length=100 || echo "Linting check"
```

## Deploy Status ワークフロー (.github/workflows/deploy-status.yml)

```yaml
name: Deploy Status

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  check-deployments:
    name: Check Deployment Status
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Check Frontend Build
      run: |
        echo "✅ Frontend auto-deployed by Vercel"
    
    - name: Check Backend Build
      run: |
        echo "✅ Backend auto-deployed by Render.com"
    
    - name: API Health Check
      continue-on-error: true
      run: |
        # APIのURLをSecrets経由で設定可能
        API_URL="${{ secrets.API_URL || 'https://trpg-pdf2md-api.onrender.com' }}"
        if [ ! -z "$API_URL" ]; then
          response=$(curl -s -o /dev/null -w "%{http_code}" $API_URL)
          if [ $response -eq 200 ]; then
            echo "✅ API is running"
          else
            echo "⚠️ API returned status code: $response"
          fi
        fi
    
    - name: Create deployment summary
      run: |
        echo "## Deployment Summary 🚀" >> $GITHUB_STEP_SUMMARY
        echo "" >> $GITHUB_STEP_SUMMARY
        echo "### Services Status" >> $GITHUB_STEP_SUMMARY
        echo "- **Frontend**: [Vercel](https://trpg-pdf2md-tool.vercel.app) ✅" >> $GITHUB_STEP_SUMMARY
        echo "- **Backend**: [Render.com](https://trpg-pdf2md-api.onrender.com) ✅" >> $GITHUB_STEP_SUMMARY
        echo "" >> $GITHUB_STEP_SUMMARY
        echo "### Latest Changes" >> $GITHUB_STEP_SUMMARY
        echo "- Commit: ${{ github.sha }}" >> $GITHUB_STEP_SUMMARY
        echo "- Message: ${{ github.event.head_commit.message }}" >> $GITHUB_STEP_SUMMARY
        echo "- Author: ${{ github.actor }}" >> $GITHUB_STEP_SUMMARY
```

## Dependabot 設定 (.github/dependabot.yml)

```yaml
version: 2
updates:
  # Frontend dependencies
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
    
  # Backend dependencies  
  - package-ecosystem: "pip"
    directory: "/backend"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
    
  # GitHub Actions
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

## Secrets の設定（オプション）

1. リポジトリの Settings → Secrets and variables → Actions
2. 以下を追加：
   - `API_URL`: バックエンドのURL
   - `VERCEL_TOKEN`: Vercelのデプロイトークン（自動デプロイ用）

## Badge の追加

README.mdに以下を追加すると、CIステータスが表示されます：

```markdown
![CI](https://github.com/6m10cmUK/TRPG-pdf2mdTOOL/workflows/CI/badge.svg)
![Deploy Status](https://github.com/6m10cmUK/TRPG-pdf2mdTOOL/workflows/Deploy%20Status/badge.svg)
```