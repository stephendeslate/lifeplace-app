import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ErrorBoundary, useErrorHandler, withErrorBoundary } from './ErrorBoundary';

// Suppress React error boundary console output in tests
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Error Boundary') ||
        args[0].includes('The above error occurred') ||
        args[0].includes('Error: Uncaught'))
    ) {
      return;
    }
    originalConsoleError(...args);
  };
});

// Component that throws on demand
const ThrowingComponent: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = false }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>Normal content</div>;
};

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Hello World</div>
      </ErrorBoundary>,
    );

    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('catches error and shows fallback UI', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
  });

  it('shows Try Again and Go to Dashboard buttons', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Try Again')).toBeInTheDocument();
    expect(screen.getByText('Go to Dashboard')).toBeInTheDocument();
  });

  it('resets error state when Try Again is clicked', () => {
    // Use mutable variable so we can stop throwing before the boundary re-renders children
    let shouldThrow = true;
    const DynamicComponent = () => {
      if (shouldThrow) throw new Error('Test error message');
      return <div>Normal content</div>;
    };

    render(
      <ErrorBoundary>
        <DynamicComponent />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();

    // Stop throwing before clicking Try Again so the re-render succeeds
    shouldThrow = false;
    fireEvent.click(screen.getByText('Try Again'));

    expect(screen.getByText('Normal content')).toBeInTheDocument();
  });

  it('uses custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom error fallback</div>}>
        <ThrowingComponent shouldThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Custom error fallback')).toBeInTheDocument();
    expect(screen.queryByText('Oops! Something went wrong')).not.toBeInTheDocument();
  });

  it('calls onError callback when error occurs', () => {
    const onError = vi.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowingComponent shouldThrow />
      </ErrorBoundary>,
    );

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.any(String) }),
    );
  });

  it('shows error description text', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByText(/We encountered an unexpected error/)).toBeInTheDocument();
  });
});

describe('withErrorBoundary HOC', () => {
  it('wraps component and catches errors', () => {
    const WrappedComponent = withErrorBoundary(ThrowingComponent);

    render(<WrappedComponent shouldThrow />);

    expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
  });

  it('renders wrapped component normally when no error', () => {
    const WrappedComponent = withErrorBoundary(ThrowingComponent);

    render(<WrappedComponent shouldThrow={false} />);

    expect(screen.getByText('Normal content')).toBeInTheDocument();
  });

  it('uses custom fallback when provided to HOC', () => {
    const WrappedComponent = withErrorBoundary(ThrowingComponent, <div>HOC custom fallback</div>);

    render(<WrappedComponent shouldThrow />);

    expect(screen.getByText('HOC custom fallback')).toBeInTheDocument();
  });
});

describe('useErrorHandler', () => {
  it('returns a function that throws the provided error', () => {
    // useErrorHandler returns a throw function — must be called during render
    // (event handler throws are not caught by error boundaries)
    const TestComponent: React.FC = () => {
      const throwError = useErrorHandler();
      const [error, setError] = React.useState<Error | null>(null);

      if (error) throwError(error);

      return <button onClick={() => setError(new Error('Manual error'))}>Trigger Error</button>;
    };

    render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>,
    );

    fireEvent.click(screen.getByText('Trigger Error'));

    expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
  });
});
