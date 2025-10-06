# Development Guide - Payment Method Management System

## Overview

This guide provides comprehensive instructions for developers working on the Payment Method Management System, including setup, development workflow, testing procedures, and best practices.

## Prerequisites

### System Requirements
- **Node.js**: 18.x or higher
- **Python**: 3.12 or higher
- **PostgreSQL**: 13.x or higher
- **Git**: Latest version
- **Docker** (optional): For containerized development

### Required Accounts & Services
- **Stripe Account**: For payment processing (test and live modes)
- **GitHub Access**: Repository access for version control
- **Database Access**: Local PostgreSQL or cloud database

## Initial Setup

### Backend Setup

#### 1. Clone Repository
```bash
git clone <repository-url>
cd lifeplace-app
```

#### 2. Create Virtual Environment
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

#### 3. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

#### 4. Environment Configuration
Create `.env` file in backend root:
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/lifeplace_dev
POSTGRES_DB=lifeplace_dev
POSTGRES_USER=lifeplace_user
POSTGRES_PASSWORD=your_secure_password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# Django
SECRET_KEY=your-super-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CSRF_TRUSTED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Payment Gateways
STRIPE_LIVE_PUBLIC_KEY=pk_live_...
STRIPE_LIVE_SECRET_KEY=sk_live_...
STRIPE_TEST_PUBLIC_KEY=pk_test_...
STRIPE_TEST_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
CORS_ALLOW_CREDENTIALS=True

# Email (Optional)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

#### 5. Database Setup
```bash
python manage.py migrate
python manage.py createsuperuser
```

#### 6. Create Payment Gateway Configuration
```bash
python manage.py shell
```

In Django shell:
```python
from core.domains.payments.models import PaymentGateway

# Create Stripe test gateway
stripe_test = PaymentGateway.objects.create(
    name="Stripe Test",
    code="stripe",
    is_active=True,
    config={
        "public_key": "pk_test_...",
        "secret_key": "sk_test_...",
        "webhook_secret": "whsec_..."
    }
)
```

#### 7. Start Development Server
```bash
# For WebSocket support (recommended)
daphne -p 8000 core.asgi:application

# OR standard Django server (no WebSockets)
python manage.py runserver
```

### Frontend Setup

#### 1. Install Dependencies
```bash
cd frontend/client-portal
npm install
```

#### 2. Environment Configuration
Create `.env.local` file:
```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_STRIPE_PUBLIC_KEY=pk_test_...
VITE_APP_ENV=development
```

#### 3. Start Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Development Workflow

### Branch Strategy
- **main**: Production-ready code
- **develop**: Integration branch for new features
- **feature/**: Individual feature branches
- **hotfix/**: Critical production fixes

### Feature Development Process

#### 1. Create Feature Branch
```bash
git checkout develop
git pull origin develop
git checkout -b feature/payment-method-enhancement
```

#### 2. Backend Development
```bash
cd backend
source venv/bin/activate

# Make code changes
# Add migrations if models changed
python manage.py makemigrations
python manage.py migrate

# Run tests
python manage.py test core.domains.payments
```

#### 3. Frontend Development
```bash
cd frontend/client-portal

# Make code changes
# Run type checking
npm run type-check

# Run linting
npm run lint

# Run tests
npm run test
```

#### 4. Testing Integration
```bash
# Backend API tests
cd backend
python manage.py test core.domains.payments.tests.test_client_views

# Frontend integration tests
cd frontend/client-portal
npm run test -- --run PaymentFlow.integration.test.tsx
```

#### 5. Code Review & Merge
```bash
git add .
git commit -m "feat: add payment method deletion confirmation"
git push origin feature/payment-method-enhancement

# Create pull request via GitHub
# After review and approval:
git checkout develop
git pull origin develop
git branch -d feature/payment-method-enhancement
```

## Development Commands

### Backend Commands

#### Database Operations
```bash
# Create migrations
python manage.py makemigrations payments

# Apply migrations
python manage.py migrate

# Reset database (development only)
python manage.py flush

# Create test data
python manage.py shell < scripts/create_test_data.py
```

#### Testing Commands
```bash
# Run all tests
python manage.py test

# Run specific app tests
python manage.py test core.domains.payments

# Run with coverage
coverage run --source='.' manage.py test
coverage report
coverage html
```

#### Development Utilities
```bash
# Django shell
python manage.py shell

# Create superuser
python manage.py createsuperuser

# Collect static files
python manage.py collectstatic

# Check for issues
python manage.py check
```

### Frontend Commands

#### Development
```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

#### Code Quality
```bash
# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format
```

#### Testing
```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm run test PaymentMethodDialog.test.tsx

# Run tests with coverage
npm run test:coverage
```

## Testing Procedures

### Backend Testing

#### Unit Tests
```python
# Example: Testing payment method service
from django.test import TestCase
from django.contrib.auth import get_user_model
from core.domains.payments.models import PaymentGateway, PaymentMethod
from core.domains.payments.services import PaymentMethodService

class PaymentMethodServiceTest(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            email='test@example.com',
            password='testpass123'
        )
        self.gateway = PaymentGateway.objects.create(
            name='Test Stripe',
            code='stripe',
            is_active=True
        )

    def test_create_payment_method(self):
        data = {
            'type': 'CREDIT_CARD',
            'nickname': 'Test Card',
            'gateway': self.gateway.id,
            'token_reference': 'pm_test_123',
            'last_four': '4242'
        }

        method = PaymentMethodService.create_payment_method(data, self.user)
        self.assertEqual(method.nickname, 'Test Card')
        self.assertEqual(method.user, self.user)
```

#### Integration Tests
```python
from rest_framework.test import APITestCase
from rest_framework import status

class PaymentMethodAPITest(APITestCase):
    def setUp(self):
        self.user = self.create_test_user()
        self.client.force_authenticate(user=self.user)

    def test_list_payment_methods(self):
        url = '/api/v1/payments/client/payment-methods/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
```

### Frontend Testing

#### Component Tests
```typescript
// Example: Testing payment method dialog
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaymentMethodEditDialog } from '../PaymentMethodEditDialog';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('PaymentMethodEditDialog', () => {
  it('should update payment method nickname', async () => {
    const mockPaymentMethod = {
      id: 1,
      nickname: 'Old Name',
      is_default: false
    };

    render(
      <PaymentMethodEditDialog
        open={true}
        paymentMethod={mockPaymentMethod}
        onClose={jest.fn()}
      />,
      { wrapper: createWrapper() }
    );

    const nicknameInput = screen.getByLabelText(/nickname/i);
    fireEvent.change(nicknameInput, { target: { value: 'New Name' } });

    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateMethod).toHaveBeenCalledWith({
        id: 1,
        nickname: 'New Name'
      });
    });
  });
});
```

#### Integration Tests
```typescript
// Example: Testing complete payment flow
describe('Payment Flow Integration', () => {
  it('should complete invoice payment with saved card', async () => {
    // Mock API responses
    server.use(
      rest.get('/api/v1/payments/client/invoices/1/', (req, res, ctx) => {
        return res(ctx.json(mockInvoice));
      }),
      rest.post('/api/v1/payments/client/invoices/1/pay/', (req, res, ctx) => {
        return res(ctx.json(mockPaymentSuccess));
      })
    );

    render(<FinancialPortal />, { wrapper: createWrapper() });

    // Navigate to invoice
    const payButton = await screen.findByText(/pay now/i);
    fireEvent.click(payButton);

    // Select payment method
    const paymentMethodSelect = await screen.findByLabelText(/payment method/i);
    fireEvent.change(paymentMethodSelect, { target: { value: '1' } });

    // Submit payment
    const submitButton = screen.getByRole('button', { name: /pay invoice/i });
    fireEvent.click(submitButton);

    // Verify success
    await waitFor(() => {
      expect(screen.getByText(/payment successful/i)).toBeInTheDocument();
    });
  });
});
```

## Code Style & Standards

### Backend Standards

#### Python Code Style
- Follow PEP 8 guidelines
- Use Black for code formatting
- Maximum line length: 88 characters
- Use type hints where appropriate

```python
from typing import Optional, Dict, Any
from decimal import Decimal

def create_payment_method(
    data: Dict[str, Any],
    user: 'User'
) -> Optional['PaymentMethod']:
    """
    Create a new payment method for the user.

    Args:
        data: Payment method data dictionary
        user: User instance

    Returns:
        Created PaymentMethod instance or None if failed
    """
    pass
```

#### Django Best Practices
- Use Django's built-in authentication
- Implement proper permissions and authorization
- Use transactions for data consistency
- Validate data at both serializer and service levels

```python
from django.db import transaction

class PaymentMethodService:
    @transaction.atomic
    def create_payment_method(self, data, user):
        # Implementation with transaction safety
        pass
```

### Frontend Standards

#### TypeScript Standards
- Strict TypeScript configuration
- Explicit return types for functions
- Proper interface definitions
- No `any` types (use `unknown` if necessary)

```typescript
interface PaymentMethod {
  id: number;
  nickname: string;
  last_four: string;
  is_default: boolean;
  created_at: string;
}

const updatePaymentMethod = async (
  id: number,
  data: Partial<PaymentMethod>
): Promise<PaymentMethod> => {
  // Implementation
};
```

#### React Best Practices
- Use functional components with hooks
- Implement proper error boundaries
- Use React.memo for performance optimization
- Follow consistent naming conventions

```typescript
interface PaymentMethodCardProps {
  paymentMethod: PaymentMethod;
  onEdit: (method: PaymentMethod) => void;
  onDelete: (id: number) => void;
}

export const PaymentMethodCard: React.FC<PaymentMethodCardProps> = React.memo(({
  paymentMethod,
  onEdit,
  onDelete
}) => {
  // Component implementation
});

PaymentMethodCard.displayName = 'PaymentMethodCard';
```

## Environment Configuration

### Development Environment
```env
# Backend .env
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=postgresql://localhost/lifeplace_dev
STRIPE_TEST_MODE=True
LOG_LEVEL=DEBUG

# Frontend .env.local
VITE_API_URL=http://localhost:8000/api/v1
VITE_STRIPE_PUBLIC_KEY=pk_test_...
VITE_LOG_LEVEL=debug
```

### Production Environment
```env
# Backend .env
DEBUG=False
ALLOWED_HOSTS=api.lifeplacealfonso.com
DATABASE_URL=postgresql://user:pass@host:5432/lifeplace_prod
STRIPE_TEST_MODE=False
LOG_LEVEL=INFO
SENTRY_DSN=https://...

# Frontend .env.production
VITE_API_URL=https://api.lifeplacealfonso.com/api/v1
VITE_STRIPE_PUBLIC_KEY=pk_live_...
VITE_LOG_LEVEL=error
```

## Debugging & Troubleshooting

### Backend Debugging

#### Django Debug Toolbar
```python
# In settings.py (development only)
if DEBUG:
    INSTALLED_APPS += ['debug_toolbar']
    MIDDLEWARE += ['debug_toolbar.middleware.DebugToolbarMiddleware']
```

#### Logging Configuration
```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
        'file': {
            'class': 'logging.FileHandler',
            'filename': 'debug.log',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
    'loggers': {
        'core.domains.payments': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}
```

#### Common Issues & Solutions

**Database Connection Errors**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Reset database (development)
python manage.py flush
python manage.py migrate
```

**Stripe Integration Issues**
```python
# Test Stripe configuration
from core.domains.payments.models import PaymentGateway
gateway = PaymentGateway.objects.get(code='stripe')
print(gateway.get_decrypted_config())
```

### Frontend Debugging

#### React Developer Tools
- Install React DevTools browser extension
- Use Components and Profiler tabs for debugging

#### Network Debugging
```typescript
// API interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log('API Request:', config);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error);
    return Promise.reject(error);
  }
);
```

#### Common Issues & Solutions

**Build Errors**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check TypeScript errors
npm run type-check
```

**Stripe Elements Issues**
```typescript
// Debug Stripe initialization
useEffect(() => {
  if (!stripe) {
    console.error('Stripe not loaded');
    return;
  }
  console.log('Stripe loaded successfully:', stripe);
}, [stripe]);
```

## Performance Optimization

### Backend Optimization

#### Database Optimization
```python
# Use select_related for foreign keys
queryset = Payment.objects.select_related(
    'event',
    'payment_method',
    'payment_method__gateway'
)

# Use prefetch_related for reverse relationships
queryset = PaymentPlan.objects.prefetch_related(
    'installments',
    'installments__payment'
)

# Add database indexes
class Meta:
    indexes = [
        models.Index(fields=['user', '-created_at']),
        models.Index(fields=['status', 'due_date']),
    ]
```

#### Caching Strategy
```python
from django.core.cache import cache

def get_payment_summary(user_id):
    cache_key = f'payment_summary_{user_id}'
    summary = cache.get(cache_key)

    if summary is None:
        summary = calculate_payment_summary(user_id)
        cache.set(cache_key, summary, timeout=300)  # 5 minutes

    return summary
```

### Frontend Optimization

#### React Query Optimization
```typescript
// Configure stale time and cache time
export const usePaymentMethods = () => {
  return useQuery({
    queryKey: ['payment-methods'],
    queryFn: FinancialApi.getPaymentMethods,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Prefetch related data
const queryClient = useQueryClient();
const prefetchInvoiceData = useCallback(async (invoiceId: number) => {
  await queryClient.prefetchQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => FinancialApi.getInvoice(invoiceId),
  });
}, [queryClient]);
```

#### Code Splitting
```typescript
// Lazy load payment components
const PaymentMethodEditDialog = lazy(
  () => import('./PaymentMethodEditDialog')
);

const PaymentFlowComponent = lazy(
  () => import('./UnifiedStripePaymentFlow')
);

// Use Suspense for loading states
<Suspense fallback={<PaymentMethodSkeleton />}>
  <PaymentMethodEditDialog />
</Suspense>
```

## Security Considerations

### Backend Security

#### Input Validation
```python
from rest_framework import serializers

class PaymentMethodSerializer(serializers.ModelSerializer):
    def validate_nickname(self, value):
        if len(value) > 50:
            raise serializers.ValidationError(
                "Nickname must be 50 characters or less"
            )
        return value.strip()

    def validate(self, attrs):
        # Cross-field validation
        return attrs
```

#### Permission Checking
```python
from rest_framework.permissions import BasePermission

class IsOwnerOrAdmin(BasePermission):
    def has_object_permission(self, request, view, obj):
        return (
            obj.user == request.user or
            request.user.is_staff
        )
```

### Frontend Security

#### XSS Prevention
```typescript
// Sanitize user input
import DOMPurify from 'dompurify';

const sanitizeInput = (input: string): string => {
  return DOMPurify.sanitize(input);
};

// Use dangerouslySetInnerHTML carefully
<div dangerouslySetInnerHTML={{
  __html: DOMPurify.sanitize(userContent)
}} />
```

#### Token Management
```typescript
// Secure token storage
class TokenManager {
  private static readonly TOKEN_KEY = 'auth_token';

  static getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  static setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  static removeToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }
}
```

## Deployment Preparation

### Backend Preparation
```bash
# Collect static files
python manage.py collectstatic --noinput

# Run security check
python manage.py check --deploy

# Create production migration
python manage.py makemigrations --check
python manage.py migrate --check
```

### Frontend Preparation
```bash
# Build production bundle
npm run build

# Analyze bundle size
npm run analyze

# Run production tests
npm run test:ci
```

## Documentation Standards

### Code Documentation
- Use docstrings for all functions and classes
- Include type hints and parameter descriptions
- Document complex business logic
- Add inline comments for non-obvious code

### API Documentation
- Use OpenAPI/Swagger for API documentation
- Include request/response examples
- Document error scenarios
- Maintain up-to-date endpoint descriptions

This development guide provides a comprehensive foundation for working with the Payment Method Management System. Follow these practices to ensure consistent, secure, and maintainable code.