/**
 * Basic Integration Tests for Messaging System
 */

import React from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material';

// Import components to test
import { MessageInterface } from '../../MessageInterface';

describe('Messaging System Integration', () => {
  it('components import and render without TypeScript errors', () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    expect(() => {
      render(
        <QueryClientProvider client={queryClient}>
          <ThemeProvider theme={createTheme()}>
            <MessageInterface
              userRole="ADMIN"
              title="Integration Test"
            />
          </ThemeProvider>
        </QueryClientProvider>
      );
    }).not.toThrow();
  });
});