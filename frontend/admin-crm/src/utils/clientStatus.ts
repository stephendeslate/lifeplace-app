// frontend/admin-crm/src/utils/clientStatus.ts

import {  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
  AccountCircle as RegisteredIcon,
  PersonOff as UnregisteredIcon } from '@mui/icons-material';
import type { Client } from '../types/clients.types';
import React from 'react';

export interface StatusInfo {
  icon: React.ReactElement;
  label: string;
  color: 'success' | 'error' | 'warning' | 'default';
  tooltip?: string;
  description?: string;
}

/**
 * Get consistent registration status across the app
 */
export const getClientRegistrationStatus = (client: Client): StatusInfo => {
  if (client.has_account) {
    return {
      icon: React.createElement(RegisteredIcon, { color: "success" }),
      label: 'Registered',
      color: 'success',
      tooltip: 'Client has created an account and can log in',
      description: 'Client has created an account and can log in to the client portal'
    };
  } else {
    return {
      icon: React.createElement(UnregisteredIcon, { color: "warning" }),
      label: 'Unregistered',
      color: 'warning',
      tooltip: 'Client data imported but no account created yet',
      description: 'Client data exists but no account has been created yet'
    };
  }
};

/**
 * Get consistent active status across the app
 */
export const getClientActiveStatus = (client: Client): StatusInfo => {
  if (client.is_active) {
    return {
      icon: React.createElement(ActiveIcon, { color: "success" }),
      label: 'Active',
      color: 'success',
      tooltip: 'Client account is active'
    };
  } else {
    return {
      icon: React.createElement(InactiveIcon, { color: "error" }),
      label: 'Inactive',
      color: 'error',
      tooltip: 'Client account is deactivated'
    };
  }
};

/**
 * Get combined status summary for client
 */
export const getClientStatusSummary = (client: Client) => {
  const registrationStatus = getClientRegistrationStatus(client);
  const activeStatus = getClientActiveStatus(client);
  
  return {
    registration: registrationStatus,
    active: activeStatus,
    needsInvitation: !client.has_account && client.is_active,
    canLogin: client.has_account && client.is_active
  };
};