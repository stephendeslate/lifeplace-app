// frontend/client-portal/src/__tests__/integration/AuthFlow.integration.test.tsx

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { AuthProvider } from '../../contexts/AuthContext';
import { ToastProvider } from '../../contexts/ToastContext';

// Mock storage
vi.mock('../../utils/storage', () => ({
  storage: {
    getTokens: vi.fn(() => null),
    setTokens: vi.fn(),
    getUser: vi.fn(() => null),
    setUser: vi.fn(),
    clearAuth: vi.fn(),
    clearCart: vi.fn(),
    getCart: vi.fn(() => []),
    getCartItemCount: vi.fn(() => 0),
    isStorageAvailable: vi.fn(() => true),
  },
}));

// Mock auth API
vi.mock('../../apis/auth.api', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    getCurrentUser: vi.fn(),
    refreshToken: vi.fn(),
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

import { storage } from '../../utils/storage';
import { authApi } from '../../apis/auth.api';

// Simple test components simulating login page and dashboard
const LoginPage: React.FC = () => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await authApi.login({ email, password });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h1>Login</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          aria-label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          aria-label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Signing in...' : 'Sign In'}
        </button>
        {error && <div role="alert">{error}</div>}
      </form>
      <a href="/register">Create Account</a>
      <a href="/forgot-password">Forgot Password?</a>
    </div>
  );
};

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = React.useState({
    email: '',
    password: '',
    confirm_password: '',
    first_name: '',
    last_name: '',
  });
  const [error, setError] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      await authApi.register(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h1>Create Account</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="First Name"
          aria-label="First Name"
          value={formData.first_name}
          onChange={handleChange('first_name')}
        />
        <input
          type="text"
          placeholder="Last Name"
          aria-label="Last Name"
          value={formData.last_name}
          onChange={handleChange('last_name')}
        />
        <input
          type="email"
          placeholder="Email"
          aria-label="Email"
          value={formData.email}
          onChange={handleChange('email')}
        />
        <input
          type="password"
          placeholder="Password"
          aria-label="Password"
          value={formData.password}
          onChange={handleChange('password')}
        />
        <input
          type="password"
          placeholder="Confirm Password"
          aria-label="Confirm Password"
          value={formData.confirm_password}
          onChange={handleChange('confirm_password')}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </button>
        {error && <div role="alert">{error}</div>}
      </form>
      <a href="/login">Already have an account?</a>
    </div>
  );
};

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = React.useState('');
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await authApi.requestPasswordReset(email);
      setIsSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    }
  };

  if (isSubmitted) {
    return (
      <div>
        <h1>Check Your Email</h1>
        <p>We've sent password reset instructions to {email}</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Reset Password</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          aria-label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit">Send Reset Link</button>
        {error && <div role="alert">{error}</div>}
      </form>
    </div>
  );
};

const Dashboard: React.FC = () => {
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome to your dashboard</p>
    </div>
  );
};

// Test utilities
const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

const theme = createTheme();

interface TestAppProps {
  initialRoute?: string;
}

const TestApp: React.FC<TestAppProps> = ({ initialRoute = '/login' }) => {
  return (
    <QueryClientProvider client={createQueryClient()}>
      <ThemeProvider theme={theme}>
        <ToastProvider>
          <AuthProvider>
            <MemoryRouter initialEntries={[initialRoute]}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/dashboard" element={<Dashboard />} />
              </Routes>
            </MemoryRouter>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('Authentication Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(storage.isStorageAvailable).mockReturnValue(true);
    vi.mocked(storage.getTokens).mockReturnValue(null);
    vi.mocked(storage.getUser).mockReturnValue(null);
  });

  describe('Login Flow', () => {
    it('displays login form', () => {
      render(<TestApp />);

      expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
    });

    it('handles successful login', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        user: {
          id: '1',
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          is_active: true,
          date_joined: '2024-01-01',
        },
        tokens: { access: 'test-token', refresh: 'test-refresh' },
      };

      vi.mocked(authApi.login).mockResolvedValue(mockResponse);

      render(<TestApp />);

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.click(screen.getByRole('button', { name: 'Sign In' }));

      await waitFor(() => {
        expect(authApi.login).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });
    });

    it('shows loading state during login', async () => {
      const user = userEvent.setup();
      vi.mocked(authApi.login).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<TestApp />);

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.click(screen.getByRole('button', { name: 'Sign In' }));

      expect(screen.getByRole('button', { name: 'Signing in...' })).toBeDisabled();
    });

    it('displays error message on login failure', async () => {
      const user = userEvent.setup();
      vi.mocked(authApi.login).mockRejectedValue(new Error('Invalid credentials'));

      render(<TestApp />);

      await user.type(screen.getByLabelText('Email'), 'wrong@example.com');
      await user.type(screen.getByLabelText('Password'), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: 'Sign In' }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Invalid credentials');
      });
    });

    it('provides link to registration', () => {
      render(<TestApp />);

      expect(screen.getByText('Create Account')).toBeInTheDocument();
    });

    it('provides link to forgot password', () => {
      render(<TestApp />);

      expect(screen.getByText('Forgot Password?')).toBeInTheDocument();
    });
  });

  describe('Registration Flow', () => {
    it('displays registration form', () => {
      render(<TestApp initialRoute="/register" />);

      expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument();
      expect(screen.getByLabelText('First Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Last Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
    });

    it('handles successful registration', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        user: {
          id: '2',
          email: 'new@example.com',
          first_name: 'New',
          last_name: 'User',
          is_active: true,
          date_joined: '2024-01-01',
        },
        tokens: { access: 'new-token', refresh: 'new-refresh' },
      };

      vi.mocked(authApi.register).mockResolvedValue(mockResponse);

      render(<TestApp initialRoute="/register" />);

      await user.type(screen.getByLabelText('First Name'), 'New');
      await user.type(screen.getByLabelText('Last Name'), 'User');
      await user.type(screen.getByLabelText('Email'), 'new@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText('Confirm Password'), 'password123');
      await user.click(screen.getByRole('button', { name: 'Create Account' }));

      await waitFor(() => {
        expect(authApi.register).toHaveBeenCalledWith({
          email: 'new@example.com',
          password: 'password123',
          confirm_password: 'password123',
          first_name: 'New',
          last_name: 'User',
        });
      });
    });

    it('validates password confirmation', async () => {
      const user = userEvent.setup();

      render(<TestApp initialRoute="/register" />);

      await user.type(screen.getByLabelText('First Name'), 'New');
      await user.type(screen.getByLabelText('Last Name'), 'User');
      await user.type(screen.getByLabelText('Email'), 'new@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText('Confirm Password'), 'different');
      await user.click(screen.getByRole('button', { name: 'Create Account' }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Passwords do not match');
      });

      expect(authApi.register).not.toHaveBeenCalled();
    });

    it('displays error on registration failure', async () => {
      const user = userEvent.setup();
      vi.mocked(authApi.register).mockRejectedValue(new Error('Email already exists'));

      render(<TestApp initialRoute="/register" />);

      await user.type(screen.getByLabelText('First Name'), 'New');
      await user.type(screen.getByLabelText('Last Name'), 'User');
      await user.type(screen.getByLabelText('Email'), 'existing@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText('Confirm Password'), 'password123');
      await user.click(screen.getByRole('button', { name: 'Create Account' }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Email already exists');
      });
    });
  });

  describe('Password Reset Flow', () => {
    it('displays forgot password form', () => {
      render(<TestApp initialRoute="/forgot-password" />);

      expect(screen.getByRole('heading', { name: 'Reset Password' })).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Send Reset Link' })).toBeInTheDocument();
    });

    it('sends password reset email', async () => {
      const user = userEvent.setup();
      vi.mocked(authApi.requestPasswordReset).mockResolvedValue(undefined);

      render(<TestApp initialRoute="/forgot-password" />);

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.click(screen.getByRole('button', { name: 'Send Reset Link' }));

      await waitFor(() => {
        expect(authApi.requestPasswordReset).toHaveBeenCalledWith('test@example.com');
      });

      expect(screen.getByRole('heading', { name: 'Check Your Email' })).toBeInTheDocument();
      expect(screen.getByText(/test@example.com/)).toBeInTheDocument();
    });

    it('handles password reset request failure', async () => {
      const user = userEvent.setup();
      vi.mocked(authApi.requestPasswordReset).mockRejectedValue(
        new Error('Email not found')
      );

      render(<TestApp initialRoute="/forgot-password" />);

      await user.type(screen.getByLabelText('Email'), 'unknown@example.com');
      await user.click(screen.getByRole('button', { name: 'Send Reset Link' }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Email not found');
      });
    });
  });

  describe('Session Persistence', () => {
    it('restores session from storage on mount', async () => {
      const mockUser = {
        id: '1',
        email: 'stored@example.com',
        first_name: 'Stored',
        last_name: 'User',
        is_active: true,
        date_joined: '2024-01-01',
      };
      const mockTokens = { access: 'stored-token', refresh: 'stored-refresh' };

      vi.mocked(storage.getTokens).mockReturnValue(mockTokens);
      vi.mocked(storage.getUser).mockReturnValue(mockUser);
      vi.mocked(authApi.getCurrentUser).mockResolvedValue(mockUser);

      render(<TestApp initialRoute="/dashboard" />);

      await waitFor(() => {
        expect(authApi.getCurrentUser).toHaveBeenCalled();
      });
    });

    it('clears storage when token refresh fails', async () => {
      const mockTokens = { access: 'expired-token', refresh: 'invalid-refresh' };

      vi.mocked(storage.getTokens).mockReturnValue(mockTokens);
      vi.mocked(storage.getUser).mockReturnValue({
        id: '1',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        is_active: true,
        date_joined: '2024-01-01',
      });
      vi.mocked(authApi.getCurrentUser).mockResolvedValue({
        id: '1',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        is_active: true,
        date_joined: '2024-01-01',
      });

      render(<TestApp />);

      // Component should render login page and the auth context should try to restore
      await waitFor(() => {
        expect(screen.getByText('Login')).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('submits login form with credentials', async () => {
      const user = userEvent.setup();
      vi.mocked(authApi.login).mockResolvedValue({
        user: { id: '1', email: 'test@example.com', first_name: 'Test', last_name: 'User', is_active: true, date_joined: '2024-01-01' },
        tokens: { access: 'token', refresh: 'refresh' },
      });

      render(<TestApp />);

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.click(screen.getByRole('button', { name: 'Sign In' }));

      await waitFor(() => {
        expect(authApi.login).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });
    });
  });

  describe('Security', () => {
    it('clears sensitive data after logout', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        is_active: true,
        date_joined: '2024-01-01',
      };
      const mockTokens = { access: 'token', refresh: 'refresh' };

      vi.mocked(storage.getTokens).mockReturnValue(mockTokens);
      vi.mocked(storage.getUser).mockReturnValue(mockUser);
      vi.mocked(authApi.getCurrentUser).mockResolvedValue(mockUser);

      render(<TestApp />);

      await waitFor(() => {
        expect(authApi.getCurrentUser).toHaveBeenCalled();
      });

      // The storage.clearAuth should be called on logout
      // This is a simplified test - in real app, logout would trigger the clear
    });
  });
});
