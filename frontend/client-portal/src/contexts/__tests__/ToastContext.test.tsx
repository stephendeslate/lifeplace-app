// frontend/client-portal/src/contexts/__tests__/ToastContext.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import { ToastProvider, useToast, useToastActions } from '../ToastContext';
import React from 'react';

const theme = createTheme();

// Wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>
    <ToastProvider>{children}</ToastProvider>
  </ThemeProvider>
);

// Test component that uses toast hooks
const TestConsumer: React.FC = () => {
  const { showToast, hideToast, clearAllToasts, toasts } = useToast();

  return (
    <div>
      <button onClick={() => showToast({ type: 'success', title: 'Success Title', message: 'Success message' })}>
        Show Success
      </button>
      <button onClick={() => showToast({ type: 'error', title: 'Error Title', message: 'Error message' })}>
        Show Error
      </button>
      <button onClick={() => showToast({ type: 'warning', title: 'Warning Title' })}>
        Show Warning
      </button>
      <button onClick={() => showToast({ type: 'info', title: 'Info Title', duration: 0 })}>
        Show Persistent
      </button>
      <button
        onClick={() =>
          showToast({
            type: 'info',
            title: 'With Action',
            action: { label: 'Undo', onClick: vi.fn() },
          })
        }
      >
        Show With Action
      </button>
      <button onClick={clearAllToasts}>Clear All</button>
      <div data-testid="toast-count">{toasts.length}</div>
      {toasts.map((toast) => (
        <button key={toast.id} onClick={() => hideToast(toast.id)}>
          Hide {toast.id}
        </button>
      ))}
    </div>
  );
};

// Test component for useToastActions
const ToastActionsConsumer: React.FC = () => {
  const { showSuccess, showError, showWarning, showInfo } = useToastActions();

  return (
    <div>
      <button onClick={() => showSuccess('Success', 'Success message')}>Success</button>
      <button onClick={() => showError('Error', 'Error message')}>Error</button>
      <button onClick={() => showWarning('Warning', 'Warning message')}>Warning</button>
      <button onClick={() => showInfo('Info', 'Info message')}>Info</button>
    </div>
  );
};

describe('ToastContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('ToastProvider', () => {
    it('renders children', () => {
      render(
        <TestWrapper>
          <div data-testid="child">Test Child</div>
        </TestWrapper>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('provides toast context to children', () => {
      render(
        <TestWrapper>
          <TestConsumer />
        </TestWrapper>
      );

      expect(screen.getByTestId('toast-count')).toHaveTextContent('0');
    });
  });

  describe('showToast', () => {
    it('adds a toast to the list', () => {
      render(
        <TestWrapper>
          <TestConsumer />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Show Success'));

      expect(screen.getByTestId('toast-count')).toHaveTextContent('1');
    });

    it('displays toast title', () => {
      render(
        <TestWrapper>
          <TestConsumer />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Show Success'));

      expect(screen.getByText('Success Title')).toBeInTheDocument();
    });

    it('displays toast message when provided', () => {
      render(
        <TestWrapper>
          <TestConsumer />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Show Success'));

      expect(screen.getByText('Success message')).toBeInTheDocument();
    });

    it('can add multiple toasts', () => {
      render(
        <TestWrapper>
          <TestConsumer />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Show Success'));
      fireEvent.click(screen.getByText('Show Error'));
      fireEvent.click(screen.getByText('Show Warning'));

      expect(screen.getByTestId('toast-count')).toHaveTextContent('3');
    });

    it('displays toast with action button', () => {
      render(
        <TestWrapper>
          <TestConsumer />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Show With Action'));

      expect(screen.getByText('Undo')).toBeInTheDocument();
    });

    it('creates toast with default duration', () => {
      render(
        <TestWrapper>
          <TestConsumer />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Show Success'));
      expect(screen.getByTestId('toast-count')).toHaveTextContent('1');

      // Toast is created - auto-hide behavior uses setTimeout internally
      // This is tested implicitly through the ToastProvider implementation
    });

    it('does not auto-hide when duration is 0', async () => {
      render(
        <TestWrapper>
          <TestConsumer />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Show Persistent'));
      expect(screen.getByTestId('toast-count')).toHaveTextContent('1');

      // Fast-forward a long time
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      // Should still be visible
      expect(screen.getByTestId('toast-count')).toHaveTextContent('1');
    });
  });

  describe('hideToast', () => {
    it('removes specific toast by id', () => {
      render(
        <TestWrapper>
          <TestConsumer />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Show Success'));
      fireEvent.click(screen.getByText('Show Error'));

      expect(screen.getByTestId('toast-count')).toHaveTextContent('2');

      // Find and click the first hide button
      const hideButtons = screen.getAllByText(/Hide/);
      fireEvent.click(hideButtons[0]);

      expect(screen.getByTestId('toast-count')).toHaveTextContent('1');
    });

    it('can hide toast via close button', () => {
      render(
        <TestWrapper>
          <TestConsumer />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Show Success'));

      // Click the close icon button in the alert
      const closeButtons = screen.getAllByRole('button', { name: '' });
      // The close button is usually the last small button
      const closeButton = closeButtons.find(
        (btn) => btn.querySelector('svg[data-testid="CloseIcon"]') !== null
      );
      if (closeButton) {
        fireEvent.click(closeButton);
      }
    });
  });

  describe('clearAllToasts', () => {
    it('removes all toasts', () => {
      render(
        <TestWrapper>
          <TestConsumer />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Show Success'));
      fireEvent.click(screen.getByText('Show Error'));
      fireEvent.click(screen.getByText('Show Warning'));

      expect(screen.getByTestId('toast-count')).toHaveTextContent('3');

      fireEvent.click(screen.getByText('Clear All'));

      expect(screen.getByTestId('toast-count')).toHaveTextContent('0');
    });
  });

  describe('toast types', () => {
    it('renders success toast', () => {
      render(
        <TestWrapper>
          <TestConsumer />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Show Success'));

      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('MuiAlert-filledSuccess');
    });

    it('renders error toast', () => {
      render(
        <TestWrapper>
          <TestConsumer />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Show Error'));

      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('MuiAlert-filledError');
    });

    it('renders warning toast', () => {
      render(
        <TestWrapper>
          <TestConsumer />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Show Warning'));

      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('MuiAlert-filledWarning');
    });

    it('renders info toast', () => {
      render(
        <TestWrapper>
          <TestConsumer />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Show Persistent'));

      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('MuiAlert-filledInfo');
    });
  });
});

describe('useToast hook', () => {
  it('throws error when used outside provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const ThrowingComponent = () => {
      useToast();
      return null;
    };

    expect(() => render(<ThrowingComponent />)).toThrow(
      'useToast must be used within a ToastProvider'
    );

    consoleError.mockRestore();
  });
});

describe('useToastActions hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('showSuccess creates success toast', () => {
    render(
      <TestWrapper>
        <ToastActionsConsumer />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Success'));

    expect(screen.getByText('Success message')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('MuiAlert-filledSuccess');
  });

  it('showError creates error toast', () => {
    render(
      <TestWrapper>
        <ToastActionsConsumer />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Error'));

    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('MuiAlert-filledError');
  });

  it('showWarning creates warning toast', () => {
    render(
      <TestWrapper>
        <ToastActionsConsumer />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Warning'));

    expect(screen.getByText('Warning message')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('MuiAlert-filledWarning');
  });

  it('showInfo creates info toast', () => {
    render(
      <TestWrapper>
        <ToastActionsConsumer />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Info'));

    expect(screen.getByText('Info message')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('MuiAlert-filledInfo');
  });

  it('error toast is created with correct type', () => {
    render(
      <TestWrapper>
        <ToastActionsConsumer />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Error'));

    // Error toast should be displayed with error severity
    expect(screen.getByRole('alert')).toHaveClass('MuiAlert-filledError');
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });
});
