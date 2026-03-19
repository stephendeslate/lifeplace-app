import React from 'react';
import {
  Email as EmailIcon,
  Sms as SmsIcon,
  MarkEmailRead as OpenedIcon,
  MarkEmailUnread as UnreadIcon,
} from '@mui/icons-material';

export const getChannelIcon = (channel: string) => {
  return channel === 'EMAIL'
    ? React.createElement(EmailIcon, { fontSize: 'small' })
    : React.createElement(SmsIcon, { fontSize: 'small' });
};

export const getStatusIcon = (isOpened: boolean) => {
  return isOpened
    ? React.createElement(OpenedIcon, { color: 'success' })
    : React.createElement(UnreadIcon, { color: 'info' });
};

export const getStatusColor = (isOpened: boolean): 'success' | 'info' => {
  return isOpened ? 'success' : 'info';
};

export const getCategoryColor = (category: string) => {
  switch (category) {
    case 'SYSTEM':
      return 'primary';
    case 'AUTO':
      return 'secondary';
    case 'MANUAL':
      return 'default';
    default:
      return 'default';
  }
};
