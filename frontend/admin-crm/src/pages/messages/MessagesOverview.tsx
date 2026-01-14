/**
 * MessagesOverview - Admin CRM Messages Dashboard
 */

import React, { useEffect } from 'react';
import { Box } from '@mui/material';
import { Message as MessageIcon } from '@mui/icons-material';
import { MessageInterface } from '../../components/messaging/MessageInterface';
import { useLayout } from '../../contexts/LayoutContext';
import { ModernPageLayout } from '../../components/common/ModernPageLayout';
import { ModernPageHeader } from '../../components/common/ModernPageHeader';

export interface MessagesOverviewProps {
  className?: string;
  defaultView?: 'grid' | 'list';
  enableSearch?: boolean;
  enableFilters?: boolean;
}

export const MessagesOverview: React.FC<MessagesOverviewProps> = ({
  className,
}) => {
  const { setBreadcrumbs } = useLayout();

  // Set breadcrumbs
  useEffect(() => {
    setBreadcrumbs([{ label: 'Messages' }]);
  }, [setBreadcrumbs]);

  return (
    <ModernPageLayout backgroundPattern="default">
      {/* Modern Header */}
      <ModernPageHeader
        title="Messages"
        subtitle="Manage client communications"
        icon={<MessageIcon />}
        size="medium"
        gradient
        glass
      />

      {/* Main Content Area - Full height messaging interface */}
      <Box
        className={className}
        sx={{
          height: 'calc(100vh - 200px)',
          minHeight: 500,
          overflow: 'hidden',
        }}
      >
        <MessageInterface />
      </Box>
    </ModernPageLayout>
  );
};

export default MessagesOverview;