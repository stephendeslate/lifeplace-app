import { describe, it, expect } from 'vitest';
import React from 'react';
import {
  getClientRegistrationStatus,
  getClientActiveStatus,
  getClientStatusSummary,
} from './clientStatus';
import type { Client } from '../types/clients.types';

const makeClient = (overrides: Partial<Client> = {}): Client =>
  ({
    id: 1,
    first_name: 'Test',
    last_name: 'Client',
    email: 'test@example.com',
    is_active: true,
    has_account: false,
    ...overrides,
  }) as Client;

describe('getClientRegistrationStatus', () => {
  it('returns Registered/success when has_account is true', () => {
    const result = getClientRegistrationStatus(makeClient({ has_account: true }));
    expect(result.label).toBe('Registered');
    expect(result.color).toBe('success');
    expect(React.isValidElement(result.icon)).toBe(true);
  });

  it('returns Unregistered/warning when has_account is false', () => {
    const result = getClientRegistrationStatus(makeClient({ has_account: false }));
    expect(result.label).toBe('Unregistered');
    expect(result.color).toBe('warning');
    expect(React.isValidElement(result.icon)).toBe(true);
  });
});

describe('getClientActiveStatus', () => {
  it('returns Active/success when is_active is true', () => {
    const result = getClientActiveStatus(makeClient({ is_active: true }));
    expect(result.label).toBe('Active');
    expect(result.color).toBe('success');
  });

  it('returns Inactive/error when is_active is false', () => {
    const result = getClientActiveStatus(makeClient({ is_active: false }));
    expect(result.label).toBe('Inactive');
    expect(result.color).toBe('error');
  });
});

describe('getClientStatusSummary', () => {
  it('active + no account => needsInvitation=true, canLogin=false', () => {
    const result = getClientStatusSummary(makeClient({ is_active: true, has_account: false }));
    expect(result.needsInvitation).toBe(true);
    expect(result.canLogin).toBe(false);
  });

  it('active + has account => needsInvitation=false, canLogin=true', () => {
    const result = getClientStatusSummary(makeClient({ is_active: true, has_account: true }));
    expect(result.needsInvitation).toBe(false);
    expect(result.canLogin).toBe(true);
  });

  it('inactive + has account => canLogin=false', () => {
    const result = getClientStatusSummary(makeClient({ is_active: false, has_account: true }));
    expect(result.needsInvitation).toBe(false);
    expect(result.canLogin).toBe(false);
  });

  it('inactive + no account => both false', () => {
    const result = getClientStatusSummary(makeClient({ is_active: false, has_account: false }));
    expect(result.needsInvitation).toBe(false);
    expect(result.canLogin).toBe(false);
  });
});
