# Testing Strategy for Enterprise Readiness

## Overview
This document specifies the testing infrastructure required to achieve 90% coverage with E2E testing for LifePlace.

---

## 1. Testing Stack Summary

| Layer | Tool | Target |
|-------|------|--------|
| **Unit Tests** | Vitest (Frontend), Django TestCase (Backend) | 90% coverage |
| **Integration Tests** | Vitest + React Testing Library | API layer, context providers |
| **E2E Tests (Web)** | Playwright | Client Portal, Admin CRM |
| **E2E Tests (Mobile)** | Maestro | React Native app |
| **Accessibility** | vitest-axe + axe-core | WCAG 2.1 AA |
| **Security** | Bandit (Python), npm audit | OWASP Top 10 |

---

## 2. E2E Testing Framework Selection

### Recommendation: Playwright (Web) + Maestro (Mobile)

#### Why Playwright for Web
- Fast execution with parallel tests
- Cross-browser support (Chrome, Firefox, Safari)
- Built-in auto-waiting reduces flakiness
- Great debugging tools (trace viewer, codegen)
- Strong CI/CD integration

#### Why Maestro for Mobile
- Official Expo integration and documentation
- YAML-based tests (easy to write and maintain)
- Handles WebViews and native permissions seamlessly
- Lower learning curve than Detox
- Cloud execution available via Maestro Cloud

---

## 3. Playwright Configuration (Web)

### Installation

```bash
cd frontend/client-portal
npm install -D @playwright/test playwright
npx playwright install
```

### Configuration

Create `playwright.config.ts`:
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['github'],  // GitHub Actions annotations
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5174',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Mobile viewports
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5174',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

### Critical User Journeys to Test

#### Client Portal E2E Tests

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('user can register and login', async ({ page }) => {
    await page.goto('/register');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'SecurePass123!');
    await page.fill('[name="firstName"]', 'Test');
    await page.fill('[name="lastName"]', 'User');
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
  });

  test('user can login with valid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'existing@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'wrong@example.com');
    await page.fill('[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('[role="alert"]')).toBeVisible();
  });
});

// e2e/booking.spec.ts
test.describe('Booking Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each booking test
    await page.goto('/login');
    await page.fill('[name="email"]', 'client@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
  });

  test('complete booking flow', async ({ page }) => {
    // Step 1: Select venue
    await page.goto('/book');
    await page.click('[data-testid="venue-card-1"]');
    await page.click('button:has-text("Continue")');

    // Step 2: Select date
    await page.click('[data-testid="date-2025-06-15"]');
    await page.click('button:has-text("Continue")');

    // Step 3: Select package
    await page.click('[data-testid="package-premium"]');
    await page.click('button:has-text("Continue")');

    // Step 4: Questionnaire
    await page.fill('[name="guestCount"]', '100');
    await page.click('button:has-text("Continue")');

    // Step 5: Review
    await expect(page.locator('[data-testid="booking-summary"]')).toBeVisible();
    await page.click('button:has-text("Confirm Booking")');

    // Success
    await expect(page.locator('text=Booking Confirmed')).toBeVisible();
  });
});

// e2e/contract.spec.ts
test.describe('Contract Signing', () => {
  test('can view and sign contract', async ({ page }) => {
    await page.goto('/events/1/contracts');
    await page.click('[data-testid="sign-contract-btn"]');

    // Sign with signature pad
    const canvas = page.locator('[data-testid="signature-pad"]');
    await canvas.dispatchEvent('mousedown', { clientX: 100, clientY: 100 });
    await canvas.dispatchEvent('mousemove', { clientX: 200, clientY: 150 });
    await canvas.dispatchEvent('mouseup');

    // Accept terms
    await page.click('[name="acceptTerms"]');
    await page.click('button:has-text("Submit Signature")');

    await expect(page.locator('text=Contract Signed')).toBeVisible();
  });
});

// e2e/payment.spec.ts
test.describe('Payment', () => {
  test('can complete payment with Stripe', async ({ page }) => {
    await page.goto('/events/1/payments');
    await page.click('[data-testid="pay-invoice-btn"]');

    // Fill Stripe test card
    const stripeFrame = page.frameLocator('[name^="__privateStripeFrame"]');
    await stripeFrame.locator('[name="cardnumber"]').fill('4242424242424242');
    await stripeFrame.locator('[name="exp-date"]').fill('12/30');
    await stripeFrame.locator('[name="cvc"]').fill('123');

    await page.click('button:has-text("Pay Now")');

    await expect(page.locator('text=Payment Successful')).toBeVisible();
  });
});
```

---

## 4. Maestro Configuration (Mobile)

### Installation

```bash
# macOS
brew tap mobile-dev-inc/tap
brew install maestro

# Or using curl
curl -Ls "https://get.maestro.mobile.dev" | bash
```

### Test Structure

Create `.maestro/` directory in mobile-app:

```yaml
# .maestro/auth/login.yaml
appId: com.lifeplace.app
---
- launchApp:
    clearState: true

- tapOn: "Login"

- tapOn:
    id: "email-input"
- inputText: "test@example.com"

- tapOn:
    id: "password-input"
- inputText: "TestPassword123"

- tapOn: "Sign In"

# Verify successful login
- assertVisible: "Dashboard"
- assertVisible: "Welcome"
```

```yaml
# .maestro/booking/complete-flow.yaml
appId: com.lifeplace.app
---
- launchApp

# Navigate to booking
- tapOn: "Book Event"

# Select venue
- tapOn:
    id: "venue-card-0"
- tapOn: "Select Venue"

# Select date (scroll to find)
- scrollUntilVisible:
    element:
      text: "June 2025"
    direction: RIGHT
- tapOn:
    text: "15"

- tapOn: "Continue"

# Select package
- tapOn:
    text: "Premium Package"
- tapOn: "Continue"

# Fill questionnaire
- tapOn:
    id: "guest-count-input"
- inputText: "100"
- tapOn: "Continue"

# Review and confirm
- assertVisible: "Review Your Booking"
- tapOn: "Confirm Booking"

# Success
- assertVisible: "Booking Confirmed"
```

### CI Integration with EAS

Create `eas.json` workflow:
```json
{
  "build": {
    "e2e": {
      "distribution": "internal",
      "ios": {
        "simulator": true
      },
      "android": {
        "buildType": "apk"
      },
      "env": {
        "E2E_TESTING": "true"
      }
    }
  }
}
```

---

## 5. Accessibility Testing with vitest-axe

### Installation

```bash
npm install -D vitest-axe
```

### Setup

Create `src/test/a11y-setup.ts`:
```typescript
import 'vitest-axe/extend-expect';
```

Update `vitest.config.ts`:
```typescript
export default defineConfig({
  test: {
    environment: 'jsdom', // NOT happy-dom (vitest-axe bug)
    setupFiles: ['./src/test/setup.ts', './src/test/a11y-setup.ts'],
  },
});
```

### Accessibility Test Examples

```typescript
// src/components/__tests__/Button.a11y.test.tsx
import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { Button } from '../Button';

describe('Button Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <Button onClick={() => {}}>Click me</Button>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations when disabled', async () => {
    const { container } = render(
      <Button onClick={() => {}} disabled>Disabled</Button>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// src/pages/__tests__/LoginPage.a11y.test.tsx
import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { BrowserRouter } from 'react-router-dom';
import { LoginPage } from '../LoginPage';

describe('LoginPage Accessibility', () => {
  it('meets WCAG 2.1 AA standards', async () => {
    const { container } = render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    const results = await axe(container, {
      rules: {
        // Ensure WCAG 2.1 AA compliance
        'color-contrast': { enabled: true },
        'label': { enabled: true },
        'link-name': { enabled: true },
      },
    });

    expect(results).toHaveNoViolations();
  });
});
```

### Run Accessibility Tests

```bash
npm run test -- --grep "a11y"
```

---

## 6. Coverage Enforcement Configuration

### Frontend (Vitest)

Update `vitest.config.ts`:
```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      thresholds: {
        global: {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
      },
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
        'e2e/**',
        '**/__mocks__/**',
      ],
    },
  },
});
```

### Backend (Django)

Create `.coveragerc`:
```ini
[run]
source = core
omit =
    */migrations/*
    */tests/*
    */__pycache__/*
    */admin.py
    manage.py

[report]
fail_under = 90
show_missing = true
exclude_lines =
    pragma: no cover
    def __repr__
    raise NotImplementedError
    if __name__ == .__main__.:
```

Update `pytest.ini` or create one:
```ini
[pytest]
DJANGO_SETTINGS_MODULE = core.settings
python_files = test_*.py
addopts = --cov=core --cov-report=html --cov-report=term --cov-fail-under=90
```

---

## 7. CI/CD Integration

### GitHub Actions Workflow

Update `.github/workflows/ci-cd.yml`:

```yaml
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: test_db
        ports:
          - 5432:5432
        options: --health-cmd pg_isready --health-interval 10s --health-timeout 5s --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'
          cache: 'pip'

      - name: Install dependencies
        working-directory: ./backend
        run: pip install -r requirements.txt coverage pytest-cov

      - name: Run tests with coverage
        working-directory: ./backend
        run: |
          coverage run --source='core' manage.py test
          coverage report --fail-under=90
          coverage xml

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          files: ./backend/coverage.xml
          flags: backend

  test-frontend:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        app: [admin-crm, client-portal]

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/${{ matrix.app }}/package-lock.json

      - name: Install dependencies
        working-directory: ./frontend/${{ matrix.app }}
        run: npm ci

      - name: Type check
        working-directory: ./frontend/${{ matrix.app }}
        run: npm run type-check

      - name: Lint
        working-directory: ./frontend/${{ matrix.app }}
        run: npm run lint

      - name: Test with coverage (90% threshold)
        working-directory: ./frontend/${{ matrix.app }}
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./frontend/${{ matrix.app }}/coverage/lcov.info
          flags: ${{ matrix.app }}

  e2e-tests:
    runs-on: ubuntu-latest
    needs: [test-backend, test-frontend]

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install Playwright
        working-directory: ./frontend/client-portal
        run: |
          npm ci
          npx playwright install --with-deps

      - name: Start backend
        working-directory: ./backend
        run: |
          pip install -r requirements.txt
          python manage.py migrate
          python manage.py runserver &
        env:
          DATABASE_URL: postgres://test_user:test_password@localhost:5432/test_db

      - name: Start frontend
        working-directory: ./frontend/client-portal
        run: npm run dev &

      - name: Run E2E tests
        working-directory: ./frontend/client-portal
        run: npx playwright test

      - name: Upload E2E results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: frontend/client-portal/playwright-report/

  accessibility-tests:
    runs-on: ubuntu-latest
    needs: [test-frontend]

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Run a11y tests
        working-directory: ./frontend/client-portal
        run: |
          npm ci
          npm run test -- --grep "a11y"

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Python security scan
      - name: Run Bandit
        uses: jpetrucciani/bandit-check@main
        with:
          path: './backend'

      # Node.js dependency audit
      - name: npm audit (client-portal)
        working-directory: ./frontend/client-portal
        run: npm audit --audit-level=high
        continue-on-error: true

      - name: npm audit (admin-crm)
        working-directory: ./frontend/admin-crm
        run: npm audit --audit-level=high
        continue-on-error: true
```

---

## 8. Security Scanning Tools

### Python (Backend)

**Bandit** - Python security linter
```bash
pip install bandit
bandit -r core/ -f json -o bandit-report.json
```

**Safety** - Dependency vulnerability scanner
```bash
pip install safety
safety check -r requirements.txt
```

### JavaScript/TypeScript (Frontend)

**npm audit** - Built-in dependency scanner
```bash
npm audit --audit-level=high
```

**ESLint Security Plugin**
```bash
npm install -D eslint-plugin-security
```

```javascript
// .eslintrc.js
module.exports = {
  plugins: ['security'],
  extends: ['plugin:security/recommended'],
};
```

---

## 9. Test Commands Summary

### Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:a11y": "vitest run --grep a11y",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "lint": "eslint . --ext .ts,.tsx",
    "type-check": "tsc --noEmit"
  }
}
```

---

## Sources

- [Playwright Documentation](https://playwright.dev/)
- [Maestro Documentation](https://maestro.mobile.dev/)
- [Expo E2E Testing with Maestro](https://docs.expo.dev/eas/workflows/examples/e2e-tests/)
- [vitest-axe](https://github.com/chaance/vitest-axe)
- [axe-core](https://github.com/dequelabs/axe-core)
- [QA Wolf - Best Mobile E2E Frameworks 2025](https://www.qawolf.com/blog/the-best-mobile-e2e-testing-frameworks-in-2025-strengths-tradeoffs-and-use-cases)
