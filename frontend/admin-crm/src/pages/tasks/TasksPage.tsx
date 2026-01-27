// Modern Tasks Overview Page
// Following the same patterns as Events, Clients, and Payments pages

import React, { useEffect, useState } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Chip,
  Typography,
  useTheme,
  useMediaQuery,
  Stack,
  CircularProgress,
} from '@mui/material';
import {
  Assignment as TasksIcon,
  RequestQuote,
  Description,
  Payment,
  Email,
  Refresh as RefreshIcon,
  SupportAgent,
} from '@mui/icons-material';
import { useLayout } from '../../contexts/LayoutContext';
import { useTasks } from '../../hooks/useTasks';
import { useSendQuote } from '../../hooks/useSales';
import { TaskSection } from '../../components/tasks';
import { ModernPageLayout, ModernPageHeader, ModernEmptyState } from '../../components/common';
import { tokens } from '../../design-system';
import type { TaskDomain } from '../../types/tasks.types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tasks-tabpanel-${index}`}
      aria-labelledby={`tasks-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ position: 'relative', zIndex: 1 }}>{children}</Box>}
    </div>
  );
};

// Tab configuration
const tabConfig: Array<{ domain: TaskDomain; label: string; icon: React.ElementType }> = [
  { domain: 'quotes', label: 'Quotes', icon: RequestQuote },
  { domain: 'contracts', label: 'Contracts', icon: Description },
  { domain: 'payments', label: 'Payments', icon: Payment },
  { domain: 'communications', label: 'Communications', icon: Email },
  { domain: 'support', label: 'Support', icon: SupportAgent },
];

export const TasksPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { setBreadcrumbs } = useLayout();

  const [activeTab, setActiveTab] = useState(0);

  // Set breadcrumbs
  useEffect(() => {
    setBreadcrumbs([{ label: 'Tasks' }]);
  }, [setBreadcrumbs]);

  // Hooks
  const { tasksByDomain, counts, isLoading } = useTasks();
  const { mutate: sendQuote } = useSendQuote();

  // Tab change handler
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleSendQuote = (id: number) => {
    sendQuote(id);
  };

  // Render empty state
  const renderEmptyState = () => (
    <ModernEmptyState
      icon={TasksIcon}
      title="No Pending Tasks"
      description="You're all caught up! All quotes, contracts, payments, communications, and support inquiries are up to date."
      size="medium"
      color="success"
    />
  );

  // Render all tasks view (default)
  const renderAllTasks = () => (
    <Stack spacing={3}>
      {counts.total === 0 ? (
        renderEmptyState()
      ) : (
        <>
          {counts.quotes > 0 && (
            <TaskSection
              domain="quotes"
              tasks={tasksByDomain.quotes}
              onSendQuote={handleSendQuote}
            />
          )}
          {counts.contracts > 0 && (
            <TaskSection
              domain="contracts"
              tasks={tasksByDomain.contracts}
            />
          )}
          {counts.payments > 0 && (
            <TaskSection
              domain="payments"
              tasks={tasksByDomain.payments}
            />
          )}
          {counts.communications > 0 && (
            <TaskSection
              domain="communications"
              tasks={tasksByDomain.communications}
            />
          )}
          {counts.support > 0 && (
            <TaskSection
              domain="support"
              tasks={tasksByDomain.support}
            />
          )}
        </>
      )}
    </Stack>
  );

  // Render specific domain tab
  const renderDomainTab = (domain: TaskDomain) => (
    <TaskSection
      domain={domain}
      tasks={tasksByDomain[domain]}
      defaultExpanded={true}
      onSendQuote={domain === 'quotes' ? handleSendQuote : undefined}
    />
  );

  if (isLoading) {
    return (
      <ModernPageLayout backgroundPattern="default">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
          <CircularProgress />
        </Box>
      </ModernPageLayout>
    );
  }

  return (
    <ModernPageLayout backgroundPattern="default">
      {/* Page Header - consistent with other overview pages */}
      <ModernPageHeader
        title="Tasks"
        subtitle={`${counts.total} item${counts.total !== 1 ? 's' : ''} need${counts.total === 1 ? 's' : ''} attention`}
        icon={<TasksIcon />}
        size="medium"
        secondaryActions={[
          {
            label: 'Refresh',
            icon: <RefreshIcon />,
            onClick: handleRefresh,
            variant: 'icon',
            tooltip: 'Refresh tasks',
          },
        ]}
      />

      {/* Stats Row */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 4 }}>
        <Box
          sx={{
            px: 2,
            py: 1,
            borderRadius: tokens.spacing.radius.md,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="body2" color="text.secondary">Total Tasks</Typography>
          <Typography variant="h6" fontWeight="bold">{counts.total}</Typography>
        </Box>
        <Box
          sx={{
            px: 2,
            py: 1,
            borderRadius: tokens.spacing.radius.md,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="body2" color="text.secondary">Quotes</Typography>
          <Typography variant="h6" fontWeight="bold">{counts.quotes}</Typography>
        </Box>
        <Box
          sx={{
            px: 2,
            py: 1,
            borderRadius: tokens.spacing.radius.md,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="body2" color="text.secondary">Contracts</Typography>
          <Typography variant="h6" fontWeight="bold">{counts.contracts}</Typography>
        </Box>
        <Box
          sx={{
            px: 2,
            py: 1,
            borderRadius: tokens.spacing.radius.md,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="body2" color="text.secondary">Payments</Typography>
          <Typography variant="h6" fontWeight="bold">{counts.payments}</Typography>
        </Box>
        <Box
          sx={{
            px: 2,
            py: 1,
            borderRadius: tokens.spacing.radius.md,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="body2" color="text.secondary">Support</Typography>
          <Typography variant="h6" fontWeight="bold">{counts.support}</Typography>
        </Box>
      </Box>

      {/* Main Content Card */}
      <Box
        sx={{
          borderRadius: tokens.spacing.radius.md,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'visible',
          position: 'relative',
        }}
      >
        {/* Tab System */}
        <Box
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            aria-label="tasks tabs"
            variant={isMobile ? 'scrollable' : 'standard'}
            scrollButtons="auto"
          >
            <Tab
              label={
                <Box display="flex" alignItems="center" gap={1.5}>
                  <TasksIcon fontSize="small" />
                  <span>All Tasks</span>
                  {counts.total > 0 && (
                    <Chip
                      label={counts.total}
                      size="small"
                      color="primary"
                      sx={{
                        height: 20,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}
                    />
                  )}
                </Box>
              }
            />
            {tabConfig.map(({ domain, label, icon: Icon }) => (
              <Tab
                key={domain}
                label={
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <Icon fontSize="small" />
                    <span>{label}</span>
                    {counts[domain] > 0 && (
                      <Chip
                        label={counts[domain]}
                        size="small"
                        variant="outlined"
                        sx={{
                          height: 20,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}
                      />
                    )}
                  </Box>
                }
              />
            ))}
          </Tabs>
        </Box>

        {/* Tab Content */}
        <Box sx={{ p: 3, position: 'relative' }}>
          <TabPanel value={activeTab} index={0}>
            {renderAllTasks()}
          </TabPanel>
          {tabConfig.map(({ domain }, index) => (
            <TabPanel key={domain} value={activeTab} index={index + 1}>
              {renderDomainTab(domain)}
            </TabPanel>
          ))}
        </Box>
      </Box>
    </ModernPageLayout>
  );
};
