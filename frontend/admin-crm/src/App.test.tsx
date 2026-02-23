// frontend/admin-crm/src/App.test.tsx
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App Component', () => {
  it('should render without crashing', () => {
    render(<App />);
    // Add a simple assertion - adjust based on your actual App component
    expect(document.body).toBeTruthy();
  });
});
