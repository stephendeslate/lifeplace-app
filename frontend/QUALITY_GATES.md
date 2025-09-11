# LifePlace Quality Gates & CI/CD Integration

## 🎯 Overview

This document defines quality gates and CI/CD integration strategies for the LifePlace frontend applications to ensure production-ready code with comprehensive testing, security, and performance standards.

## 📊 Quality Metrics & Thresholds

### Code Coverage Requirements
| Metric | Minimum | Target | Critical |
|--------|---------|---------|----------|
| Statements | 80% | 90% | 95% |
| Branches | 80% | 85% | 90% |
| Functions | 80% | 90% | 95% |
| Lines | 80% | 90% | 95% |

### Performance Benchmarks
| Metric | Threshold | Tool |
|--------|-----------|------|
| Bundle Size (gzip) | < 250KB per chunk | Rollup Analysis |
| First Contentful Paint | < 1.5s | Lighthouse |
| Largest Contentful Paint | < 2.5s | Lighthouse |
| Cumulative Layout Shift | < 0.1 | Lighthouse |
| Time to Interactive | < 3.5s | Lighthouse |
| Component Render Time | < 16ms | Custom Metrics |

### Accessibility Standards
| Requirement | Standard | Tool |
|-------------|----------|------|
| WCAG Compliance | AA Level | axe-core |
| Color Contrast | 4.5:1 minimum | Accessibility Helpers |
| Keyboard Navigation | 100% coverage | Custom Tests |
| Screen Reader Support | Full compatibility | Custom Tests |

### Code Quality Metrics
| Metric | Threshold | Tool |
|--------|-----------|------|
| TypeScript Errors | 0 | tsc --noEmit |
| ESLint Violations | 0 critical, < 5 warnings | ESLint |
| Security Vulnerabilities | 0 high/critical | npm audit |
| Dependency Freshness | < 6 months outdated | npm outdated |

## 🚀 CI/CD Pipeline Configuration

### GitHub Actions Workflow

```yaml
# .github/workflows/frontend-ci.yml
name: Frontend CI/CD Pipeline

on:
  push:
    branches: [main, develop]
    paths: ['frontend/**']
  pull_request:
    branches: [main]
    paths: ['frontend/**']

env:
  NODE_VERSION: '20'
  COVERAGE_THRESHOLD: 80

jobs:
  quality-checks:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        app: [admin-crm, client-portal]
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: frontend/${{ matrix.app }}/package-lock.json
      
      - name: Install dependencies
        working-directory: frontend/${{ matrix.app }}
        run: npm ci
      
      - name: Type checking
        working-directory: frontend/${{ matrix.app }}
        run: npm run type-check
      
      - name: Linting
        working-directory: frontend/${{ matrix.app }}
        run: npm run lint
      
      - name: Security audit
        working-directory: frontend/${{ matrix.app }}
        run: npm audit --audit-level=high
      
      - name: Run tests with coverage
        working-directory: frontend/${{ matrix.app }}
        run: npm run test:coverage
      
      - name: Coverage gate check
        working-directory: frontend/${{ matrix.app }}
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq -r '.total.statements.pct')
          if (( $(echo "$COVERAGE < $COVERAGE_THRESHOLD" | bc -l) )); then
            echo "Coverage $COVERAGE% is below threshold $COVERAGE_THRESHOLD%"
            exit 1
          fi
      
      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          file: ./frontend/${{ matrix.app }}/coverage/lcov.info
          flags: ${{ matrix.app }}
          name: ${{ matrix.app }}-coverage
      
      - name: Build application
        working-directory: frontend/${{ matrix.app }}
        run: npm run build
      
      - name: Bundle size analysis
        working-directory: frontend/${{ matrix.app }}
        run: |
          npx bundlesize
          
      - name: Accessibility tests
        working-directory: frontend/${{ matrix.app }}
        run: npm run test -- --testPathPattern=a11y
      
      - name: Performance tests
        working-directory: frontend/${{ matrix.app }}
        run: npm run test -- --testPathPattern=performance

  integration-tests:
    runs-on: ubuntu-latest
    needs: quality-checks
    if: github.event_name == 'pull_request'
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.12'
      
      - name: Start backend services
        working-directory: backend
        run: |
          pip install -r requirements.txt
          python manage.py migrate
          python manage.py runserver &
          sleep 10
      
      - name: Run integration tests
        working-directory: frontend
        run: |
          npm run test:integration

  security-scan:
    runs-on: ubuntu-latest
    needs: quality-checks
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: './frontend'
          format: 'sarif'
          output: 'trivy-results.sarif'
      
      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'

  lighthouse-audit:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Build and serve applications
        run: |
          cd frontend/admin-crm
          npm ci && npm run build
          npx serve -s dist -p 3001 &
          
          cd ../client-portal  
          npm ci && npm run build
          npx serve -s dist -p 3002 &
          
          sleep 10
      
      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli@0.12.x
          lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}

  deploy-staging:
    runs-on: ubuntu-latest
    needs: [quality-checks, integration-tests]
    if: github.ref == 'refs/heads/develop'
    environment: staging
    
    steps:
      - name: Deploy to staging
        run: |
          echo "Deploying to staging environment..."
          # Add deployment steps here

  deploy-production:
    runs-on: ubuntu-latest
    needs: [quality-checks, integration-tests, security-scan]
    if: github.ref == 'refs/heads/main'
    environment: production
    
    steps:
      - name: Deploy to production
        run: |
          echo "Deploying to production environment..."
          # Add deployment steps here
```

### Quality Gate Configurations

#### Package.json Bundle Size Configuration

```json
{
  "bundlesize": [
    {
      "path": "./dist/assets/*.js",
      "maxSize": "250kb",
      "compression": "gzip"
    },
    {
      "path": "./dist/assets/*.css", 
      "maxSize": "50kb",
      "compression": "gzip"
    }
  ]
}
```

#### Lighthouse CI Configuration

```javascript
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3001', // admin-crm
        'http://localhost:3002'  // client-portal
      ],
      numberOfRuns: 3
    },
    assert: {
      assertions: {
        'categories:performance': ['error', {minScore: 0.8}],
        'categories:accessibility': ['error', {minScore: 0.9}],
        'categories:best-practices': ['error', {minScore: 0.9}],
        'categories:seo': ['error', {minScore: 0.8}]
      }
    },
    upload: {
      target: 'temporary-public-storage'
    }
  }
}
```

## 🔒 Pre-commit Hooks

### Husky Configuration

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "pre-push": "npm run test:changed && npm run type-check",
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

### Commit Message Validation

```javascript
// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore', 'perf']
    ],
    'subject-max-length': [2, 'always', 72]
  }
}
```

## 🎯 Branch Protection Rules

### Main Branch Protection

```yaml
Branch Protection Rules for 'main':
  - Require status checks to pass before merging
    - frontend-ci / quality-checks (admin-crm)
    - frontend-ci / quality-checks (client-portal) 
    - frontend-ci / integration-tests
    - frontend-ci / security-scan
    - frontend-ci / lighthouse-audit
  - Require pull request reviews before merging (2 reviewers)
  - Require review from code owners
  - Dismiss stale reviews when new commits are pushed
  - Require branches to be up to date before merging
  - Require conversation resolution before merging
  - Do not allow force pushes
  - Do not allow deletions
```

### Develop Branch Protection

```yaml
Branch Protection Rules for 'develop':
  - Require status checks to pass before merging
    - frontend-ci / quality-checks (admin-crm)
    - frontend-ci / quality-checks (client-portal)
  - Require pull request reviews before merging (1 reviewer)
  - Require branches to be up to date before merging
```

## 📊 Quality Monitoring & Reporting

### SonarQube Integration

```yaml
# sonar-project.properties
sonar.projectKey=lifeplace-frontend
sonar.organization=lifeplace
sonar.sources=frontend/admin-crm/src,frontend/client-portal/src
sonar.tests=frontend/admin-crm/src,frontend/client-portal/src
sonar.test.inclusions=**/*.test.ts,**/*.test.tsx
sonar.typescript.lcov.reportPaths=frontend/admin-crm/coverage/lcov.info,frontend/client-portal/coverage/lcov.info
sonar.coverage.exclusions=**/*.test.ts,**/*.test.tsx,**/*.config.ts

# Quality Gate Conditions
sonar.qualitygate.wait=true
sonar.qualitygate.timeout=300
```

### Performance Monitoring

```typescript
// performance-monitoring.ts
export const performanceMonitoring = {
  // Bundle size monitoring
  bundleSize: {
    maxChunkSize: 250000, // 250KB
    maxTotalSize: 1000000, // 1MB
  },
  
  // Runtime performance
  runtime: {
    maxRenderTime: 16, // 60fps
    maxInitialLoadTime: 3000, // 3 seconds
    maxApiResponseTime: 1000, // 1 second
  },
  
  // Memory usage
  memory: {
    maxHeapSize: 50000000, // 50MB
    memoryLeakThreshold: 0.1, // 10% growth
  }
}
```

## 🚨 Alert Configuration

### Slack Notifications

```yaml
# .github/workflows/notifications.yml
- name: Notify Slack on failure
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: failure
    channel: '#frontend-alerts'
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
    fields: repo,message,commit,author,action,eventName,ref,workflow
```

### Email Notifications

```yaml
- name: Send email on critical failure
  if: failure() && contains(github.event.head_commit.message, '[CRITICAL]')
  uses: dawidd6/action-send-mail@v3
  with:
    server_address: smtp.gmail.com
    server_port: 465
    username: ${{ secrets.EMAIL_USERNAME }}
    password: ${{ secrets.EMAIL_PASSWORD }}
    subject: '[CRITICAL] LifePlace Frontend Build Failed'
    body: |
      Critical failure in LifePlace frontend pipeline.
      
      Repository: ${{ github.repository }}
      Branch: ${{ github.ref }}
      Commit: ${{ github.sha }}
      Author: ${{ github.actor }}
      
      Please investigate immediately.
    to: devops@lifeplace.com,frontend-team@lifeplace.com
```

## 📈 Quality Metrics Dashboard

### Key Performance Indicators (KPIs)

1. **Test Success Rate**: > 99%
2. **Code Coverage Trend**: Increasing monthly
3. **Build Time**: < 5 minutes
4. **Deployment Frequency**: Multiple times per day
5. **Mean Time to Recovery**: < 1 hour
6. **Change Failure Rate**: < 5%

### Monitoring Tools Integration

```yaml
# Datadog Integration
datadog:
  api_key: ${{ secrets.DATADOG_API_KEY }}
  metrics:
    - name: frontend.test.coverage
      value: ${{ env.COVERAGE_PERCENT }}
      tags: [app:${{ matrix.app }}, env:${{ env.ENVIRONMENT }}]
    
    - name: frontend.build.duration
      value: ${{ env.BUILD_DURATION }}
      tags: [app:${{ matrix.app }}, env:${{ env.ENVIRONMENT }}]
    
    - name: frontend.bundle.size
      value: ${{ env.BUNDLE_SIZE }}
      tags: [app:${{ matrix.app }}, env:${{ env.ENVIRONMENT }}]
```

## 🔧 Emergency Procedures

### Hotfix Workflow

1. **Create hotfix branch** from main
2. **Implement minimal fix** with focused tests
3. **Run expedited quality checks**:
   - Essential tests only
   - Security scan
   - Basic performance check
4. **Deploy to staging** for quick verification
5. **Emergency review** (single reviewer)
6. **Deploy to production** with rollback plan

### Rollback Procedures

```bash
# Quick rollback script
#!/bin/bash
PREVIOUS_VERSION=$(git tag --sort=-creatordate | head -2 | tail -1)
echo "Rolling back to $PREVIOUS_VERSION"

# Deploy previous version
git checkout $PREVIOUS_VERSION
npm run build:production
npm run deploy:production

# Notify team
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"🚨 ROLLBACK: Frontend rolled back to '$PREVIOUS_VERSION'"}' \
  $SLACK_WEBHOOK_URL
```

## 📋 Quality Gate Checklist

### Pre-merge Checklist
- [ ] All tests pass (unit, integration, e2e)
- [ ] Code coverage meets threshold (80%+)
- [ ] No TypeScript errors
- [ ] No ESLint violations (critical)
- [ ] Security audit passes
- [ ] Performance benchmarks met
- [ ] Accessibility tests pass
- [ ] Bundle size within limits
- [ ] PR approved by required reviewers

### Pre-release Checklist
- [ ] All quality gates passed
- [ ] Integration tests with backend pass
- [ ] Lighthouse audit scores meet thresholds
- [ ] Cross-browser testing completed
- [ ] Security scan completed
- [ ] Performance testing completed
- [ ] Documentation updated
- [ ] Release notes prepared

### Post-release Monitoring
- [ ] Application health checks pass
- [ ] Error rates within normal range
- [ ] Performance metrics stable
- [ ] User feedback monitored
- [ ] Rollback plan ready if needed

---

## 🎯 Continuous Improvement

### Monthly Reviews
- Analyze quality metrics trends
- Review and adjust thresholds
- Update testing strategies
- Optimize CI/CD pipeline performance

### Quarterly Assessments
- Security audit and updates
- Performance benchmark reviews
- Tool and dependency updates
- Process optimization opportunities

This quality gate system ensures that only production-ready code reaches users while maintaining development velocity and team confidence.