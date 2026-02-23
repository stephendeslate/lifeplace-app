import { describe, it, expect } from 'vitest';
import { extractErrorMessage } from './errorHandling';

describe('extractErrorMessage', () => {
  it('extracts detail from Axios error response', () => {
    const error = { response: { data: { detail: 'Not found' } } };
    expect(extractErrorMessage(error)).toBe('Not found');
  });

  it('extracts message from Axios error response', () => {
    const error = { response: { data: { message: 'Server error' } } };
    expect(extractErrorMessage(error)).toBe('Server error');
  });

  it('extracts error string from Axios error response', () => {
    const error = { response: { data: { error: 'Bad request' } } };
    expect(extractErrorMessage(error)).toBe('Bad request');
  });

  it('extracts validation error with array value', () => {
    const error = { response: { data: { name: ['This field is required'] } } };
    expect(extractErrorMessage(error)).toBe('name: This field is required');
  });

  it('extracts validation error with string value', () => {
    const error = { response: { data: { email: 'Invalid email' } } };
    expect(extractErrorMessage(error)).toBe('Invalid email');
  });

  it('returns message from standard Error object', () => {
    const error = new Error('Something broke');
    expect(extractErrorMessage(error)).toBe('Something broke');
  });

  it('returns default message for null', () => {
    expect(extractErrorMessage(null)).toBe('An error occurred');
  });

  it('returns default message for undefined', () => {
    expect(extractErrorMessage(undefined)).toBe('An error occurred');
  });

  it('returns custom default message', () => {
    expect(extractErrorMessage(null, 'Custom error')).toBe('Custom error');
  });

  it('returns default for empty response data object', () => {
    const error = { response: { data: {} } };
    expect(extractErrorMessage(error)).toBe('An error occurred');
  });

  it('returns default for Axios error with response but no data', () => {
    const error = { response: {} };
    expect(extractErrorMessage(error)).toBe('An error occurred');
  });

  it('returns default for non-object error', () => {
    expect(extractErrorMessage('string error')).toBe('An error occurred');
    expect(extractErrorMessage(42)).toBe('An error occurred');
  });

  it('prioritizes detail over message over error fields', () => {
    const error = {
      response: {
        data: { detail: 'Detail wins', message: 'Message', error: 'Error' },
      },
    };
    expect(extractErrorMessage(error)).toBe('Detail wins');
  });
});
