// frontend/admin-crm/src/contexts/ToastContext.test.tsx

import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import { ToastProvider, useToast, useToastActions } from './ToastContext'
import { modernTheme } from '../design-system/theme/modernTheme'

// Wrapper with MUI ThemeProvider for toast tests
const ToastTestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider theme={modernTheme}>
    <ToastProvider>{children}</ToastProvider>
  </ThemeProvider>
)

// Test consumer component for useToast
const ToastConsumer = () => {
  const { toasts, showToast, hideToast, clearAllToasts } = useToast()

  return (
    <div>
      <span data-testid="toast-count">{toasts.length}</span>
      <button
        data-testid="show-toast-btn"
        onClick={() =>
          showToast({ type: 'success', title: 'Success', message: 'Test message' })
        }
      >
        Show Toast
      </button>
      <button
        data-testid="show-persistent-btn"
        onClick={() =>
          showToast({
            type: 'error',
            title: 'Error',
            message: 'Error message',
            duration: 0, // Persistent
          })
        }
      >
        Show Persistent
      </button>
      <button data-testid="clear-all-btn" onClick={clearAllToasts}>
        Clear All
      </button>
      {toasts.map((toast) => (
        <div key={toast.id} data-testid={`toast-${toast.id}`}>
          <span data-testid="toast-title">{toast.title}</span>
          <span data-testid="toast-message">{toast.message}</span>
          <button data-testid="hide-toast-btn" onClick={() => hideToast(toast.id)}>
            Hide
          </button>
        </div>
      ))}
    </div>
  )
}

// Test consumer for useToastActions
const ToastActionsConsumer = () => {
  const { showSuccess, showError, showWarning, showInfo } = useToastActions()

  return (
    <div>
      <button
        data-testid="success-btn"
        onClick={() => showSuccess('Success Title', 'Success message')}
      >
        Success
      </button>
      <button
        data-testid="error-btn"
        onClick={() => showError('Error Title', 'Error message')}
      >
        Error
      </button>
      <button
        data-testid="warning-btn"
        onClick={() => showWarning('Warning Title', 'Warning message')}
      >
        Warning
      </button>
      <button
        data-testid="info-btn"
        onClick={() => showInfo('Info Title', 'Info message')}
      >
        Info
      </button>
    </div>
  )
}

describe('ToastContext', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('ToastProvider', () => {
    it('provides toast context to children', () => {
      render(
        <ToastTestWrapper>
          <ToastConsumer />
        </ToastTestWrapper>
      )

      expect(screen.getByTestId('toast-count')).toHaveTextContent('0')
    })
  })

  describe('useToast', () => {
    it('throws error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        render(<ToastConsumer />)
      }).toThrow('useToast must be used within a ToastProvider')

      consoleSpy.mockRestore()
    })

    it('shows a toast when showToast is called', async () => {
      render(
        <ToastTestWrapper>
          <ToastConsumer />
        </ToastTestWrapper>
      )

      expect(screen.getByTestId('toast-count')).toHaveTextContent('0')

      act(() => {
        fireEvent.click(screen.getByTestId('show-toast-btn'))
      })

      expect(screen.getByTestId('toast-count')).toHaveTextContent('1')
      expect(screen.getByTestId('toast-title')).toHaveTextContent('Success')
      expect(screen.getByTestId('toast-message')).toHaveTextContent('Test message')
    })

    it('hides toast when hideToast is called', async () => {
      render(
        <ToastTestWrapper>
          <ToastConsumer />
        </ToastTestWrapper>
      )

      // Show a persistent toast
      act(() => {
        fireEvent.click(screen.getByTestId('show-persistent-btn'))
      })
      expect(screen.getByTestId('toast-count')).toHaveTextContent('1')

      // Hide it
      act(() => {
        fireEvent.click(screen.getByTestId('hide-toast-btn'))
      })
      expect(screen.getByTestId('toast-count')).toHaveTextContent('0')
    })

    it('clears all toasts when clearAllToasts is called', async () => {
      render(
        <ToastTestWrapper>
          <ToastConsumer />
        </ToastTestWrapper>
      )

      // Show multiple toasts
      act(() => {
        fireEvent.click(screen.getByTestId('show-persistent-btn'))
      })
      act(() => {
        fireEvent.click(screen.getByTestId('show-persistent-btn'))
      })
      expect(screen.getByTestId('toast-count')).toHaveTextContent('2')

      // Clear all
      act(() => {
        fireEvent.click(screen.getByTestId('clear-all-btn'))
      })
      expect(screen.getByTestId('toast-count')).toHaveTextContent('0')
    })

    it('auto-hides toast after duration', async () => {
      render(
        <ToastTestWrapper>
          <ToastConsumer />
        </ToastTestWrapper>
      )

      act(() => {
        fireEvent.click(screen.getByTestId('show-toast-btn'))
      })
      expect(screen.getByTestId('toast-count')).toHaveTextContent('1')

      // Advance time past default duration (6000ms)
      act(() => {
        vi.advanceTimersByTime(6500)
      })

      expect(screen.getByTestId('toast-count')).toHaveTextContent('0')
    })

    it('does not auto-hide toast with duration 0', async () => {
      render(
        <ToastTestWrapper>
          <ToastConsumer />
        </ToastTestWrapper>
      )

      act(() => {
        fireEvent.click(screen.getByTestId('show-persistent-btn'))
      })
      expect(screen.getByTestId('toast-count')).toHaveTextContent('1')

      // Advance time significantly
      act(() => {
        vi.advanceTimersByTime(60000)
      })

      // Toast should still be there
      expect(screen.getByTestId('toast-count')).toHaveTextContent('1')
    })
  })

  describe('useToastActions', () => {
    it('showSuccess creates success toast', async () => {
      render(
        <ToastTestWrapper>
          <ToastActionsConsumer />
          <ToastConsumer />
        </ToastTestWrapper>
      )

      act(() => {
        fireEvent.click(screen.getByTestId('success-btn'))
      })

      expect(screen.getByTestId('toast-count')).toHaveTextContent('1')
      expect(screen.getByTestId('toast-title')).toHaveTextContent('Success Title')
    })

    it('showError creates error toast with longer duration', async () => {
      render(
        <ToastTestWrapper>
          <ToastActionsConsumer />
          <ToastConsumer />
        </ToastTestWrapper>
      )

      act(() => {
        fireEvent.click(screen.getByTestId('error-btn'))
      })

      expect(screen.getByTestId('toast-count')).toHaveTextContent('1')
      expect(screen.getByTestId('toast-title')).toHaveTextContent('Error Title')

      // Error toast has 8000ms duration, verify it's still there at 6500ms
      act(() => {
        vi.advanceTimersByTime(6500)
      })
      expect(screen.getByTestId('toast-count')).toHaveTextContent('1')

      // But gone after 8500ms total
      act(() => {
        vi.advanceTimersByTime(2000)
      })
      expect(screen.getByTestId('toast-count')).toHaveTextContent('0')
    })

    it('showWarning creates warning toast', async () => {
      render(
        <ToastTestWrapper>
          <ToastActionsConsumer />
          <ToastConsumer />
        </ToastTestWrapper>
      )

      act(() => {
        fireEvent.click(screen.getByTestId('warning-btn'))
      })

      expect(screen.getByTestId('toast-title')).toHaveTextContent('Warning Title')
    })

    it('showInfo creates info toast', async () => {
      render(
        <ToastTestWrapper>
          <ToastActionsConsumer />
          <ToastConsumer />
        </ToastTestWrapper>
      )

      act(() => {
        fireEvent.click(screen.getByTestId('info-btn'))
      })

      expect(screen.getByTestId('toast-title')).toHaveTextContent('Info Title')
    })
  })

  describe('Toast rendering', () => {
    it('renders toast with alert role', () => {
      // Use real timers for this test since MUI animations need them
      vi.useRealTimers()

      render(
        <ToastTestWrapper>
          <ToastConsumer />
        </ToastTestWrapper>
      )

      act(() => {
        fireEvent.click(screen.getByTestId('show-persistent-btn'))
      })

      // The provider renders actual MUI Snackbar/Alert components
      // Check for alert elements
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })
})
