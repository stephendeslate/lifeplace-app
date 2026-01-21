// frontend/admin-crm/src/components/shared/VariableSuggestionDropdown.tsx
// Dropdown component for variable autocomplete suggestions

import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
  Chip,
} from '@mui/material';
import {
  Person as PersonIcon,
  Event as EventIcon,
  Payments as PaymentsIcon,
  ConfirmationNumber as ConfirmationIcon,
  RequestQuote as QuoteIcon,
  Description as DescriptionIcon,
  AdminPanelSettings as AdminIcon,
  Notifications as NotificationIcon,
  Settings as SystemIcon,
  CheckCircle as RequiredIcon,
  RadioButtonUnchecked as OptionalIcon,
  Business as CompanyIcon,
  Link as LinkIcon,
  Receipt as InvoiceIcon,
  CreditCard as PaymentIcon,
} from '@mui/icons-material';
import type { VariableForInsertion } from '../../types/templates.types';
import { getVariableGroupColor } from '../../hooks/useTemplateVariables';

interface VariableSuggestionDropdownProps {
  items: VariableForInsertion[];
  command: (item: VariableForInsertion) => void;
}

export interface VariableSuggestionDropdownRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

// Icon mapping for variable groups
const getGroupIcon = (groupKey: string): React.ReactNode => {
  const iconProps = { sx: { fontSize: 18 } };
  const icons: Record<string, React.ReactNode> = {
    client: <PersonIcon {...iconProps} />,
    event: <EventIcon {...iconProps} />,
    financial: <PaymentsIcon {...iconProps} />,
    booking: <ConfirmationIcon {...iconProps} />,
    quote: <QuoteIcon {...iconProps} />,
    contract: <DescriptionIcon {...iconProps} />,
    admin: <AdminIcon {...iconProps} />,
    notification: <NotificationIcon {...iconProps} />,
    system: <SystemIcon {...iconProps} />,
    company: <CompanyIcon {...iconProps} />,
    urls: <LinkIcon {...iconProps} />,
    invoice: <InvoiceIcon {...iconProps} />,
    payment: <PaymentIcon {...iconProps} />,
  };
  return icons[groupKey] || <SystemIcon {...iconProps} />;
};

// Convert variable name to human-readable label
export const getVariableLabel = (variableName: string): string => {
  return variableName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
};

export const VariableSuggestionDropdown = forwardRef<
  VariableSuggestionDropdownRef,
  VariableSuggestionDropdownProps
>(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  const selectItem = (index: number) => {
    const item = items[index];
    if (item) {
      command(item);
    }
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((prevIndex) =>
          prevIndex === 0 ? items.length - 1 : prevIndex - 1
        );
        return true;
      }

      if (event.key === 'ArrowDown') {
        setSelectedIndex((prevIndex) =>
          prevIndex === items.length - 1 ? 0 : prevIndex + 1
        );
        return true;
      }

      if (event.key === 'Enter') {
        selectItem(selectedIndex);
        return true;
      }

      return false;
    },
  }));

  if (items.length === 0) {
    return (
      <Paper
        elevation={8}
        sx={{
          p: 2,
          maxWidth: 320,
          borderRadius: 2,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          No variables found
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={8}
      sx={{
        maxWidth: 380,
        maxHeight: 320,
        overflow: 'auto',
        borderRadius: 2,
      }}
    >
      <Box sx={{ px: 1.5, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary" fontWeight={500}>
          Insert Variable
        </Typography>
      </Box>
      <List dense sx={{ py: 0.5 }}>
        {items.map((item, index) => (
          <ListItem key={item.name} disablePadding>
            <ListItemButton
              selected={index === selectedIndex}
              onClick={() => selectItem(index)}
              sx={{
                py: 0.75,
                px: 1.5,
                '&.Mui-selected': {
                  backgroundColor: 'primary.50',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                {getGroupIcon(item.group)}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <Typography variant="body2" fontWeight={500}>
                      {getVariableLabel(item.name)}
                    </Typography>
                    {item.required ? (
                      <RequiredIcon sx={{ fontSize: 12, color: 'success.main' }} />
                    ) : (
                      <OptionalIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                    )}
                  </Box>
                }
                secondary={
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      display: 'block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.description}
                  </Typography>
                }
              />
              <Chip
                label={item.groupLabel}
                size="small"
                color={getVariableGroupColor(item.group)}
                variant="outlined"
                sx={{ ml: 1, height: 20, fontSize: '0.6875rem' }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Paper>
  );
});

VariableSuggestionDropdown.displayName = 'VariableSuggestionDropdown';

export default VariableSuggestionDropdown;
