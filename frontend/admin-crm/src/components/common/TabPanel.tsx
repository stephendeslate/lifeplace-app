// frontend/admin-crm/src/components/common/TabPanel.tsx
// Reusable tab panel component for tab interfaces
// Replaces 3 different TabPanel implementations

import React from 'react';
import { Box, type SxProps, type Theme } from '@mui/material';

interface TabPanelProps {
  /** Tab panel content */
  children?: React.ReactNode;
  /** Current selected tab value */
  value: number;
  /** This panel's index */
  index: number;
  /** Custom id attribute */
  id?: string;
  /** aria-labelledby for accessibility */
  'aria-labelledby'?: string;
  /** Additional sx props */
  sx?: SxProps<Theme>;
  /** Whether to keep content mounted when hidden */
  keepMounted?: boolean;
}

export const TabPanel: React.FC<TabPanelProps> = ({
  children,
  value,
  index,
  id,
  'aria-labelledby': ariaLabelledby,
  sx,
  keepMounted = false,
}) => {
  const isActive = value === index;

  // If not keepMounted and not active, don't render content
  if (!keepMounted && !isActive) {
    return null;
  }

  return (
    <Box
      role="tabpanel"
      hidden={!isActive}
      id={id || `tabpanel-${index}`}
      aria-labelledby={ariaLabelledby || `tab-${index}`}
      sx={{
        pt: 3,
        ...sx,
      }}
    >
      {(keepMounted || isActive) && children}
    </Box>
  );
};

/**
 * Helper function to generate a11y props for tabs
 */
export const a11yTabProps = (index: number, idPrefix?: string) => ({
  id: idPrefix ? `${idPrefix}-tab-${index}` : `tab-${index}`,
  'aria-controls': idPrefix ? `${idPrefix}-tabpanel-${index}` : `tabpanel-${index}`,
});

/**
 * Helper function to generate a11y props for tab panels
 */
export const a11yTabPanelProps = (index: number, idPrefix?: string) => ({
  id: idPrefix ? `${idPrefix}-tabpanel-${index}` : `tabpanel-${index}`,
  'aria-labelledby': idPrefix ? `${idPrefix}-tab-${index}` : `tab-${index}`,
});

export default TabPanel;
