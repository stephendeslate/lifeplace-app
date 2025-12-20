// Modern Tasks Overview Page
// Following the same patterns as Events, Clients, and Payments pages

import React, { useEffect, useState } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Chip,
  useTheme,
  useMediaQuery,
  Stack,
} from '@mui/material';
import {
  Assignment as TasksIcon,
  RequestQuote,
  Description,
  Payment,
  Email,
} from '@mui/icons-material';
import { useLayout } from '../../contexts/LayoutContext';
import { useTasks } from '../../hooks/useTasks';
import { useSendQuote } from '../../hooks/useSales';
import { TaskSection } from '../../components/tasks';
import type { TaskDomain } from '../../types/tasks.types';

// Modern Design System Components
import {
  ModernOverviewLayout,
  ModernOverviewHeader,
  ModernGlassCard,
  ModernEmptyState,
  ModernLoadingSpinner,
  createRefreshAction,
} from '../../components/common/ModernDesignSystem';
import { tokens } from '../../design-system';
import { glassPresets } from '../../design-system/utils/glassmorphism';
import { createTransition } from '../../design-system/utils/animations';

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

  // Render all tasks view (default)
  const renderAllTasks = () => (
    <Stack spacing={3}>
      {counts.total === 0 ? (
        <ModernEmptyState
          icon={TasksIcon}
          title="No Pending Tasks"
          description="You're all caught up! All quotes, contracts, payments, and communications are up to date."
          size="medium"
          illustration="gradient"
        />
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
      <ModernOverviewLayout>
        <ModernLoadingSpinner
          size={48}
          message="Loading tasks..."
          variant="circular"
          glass
        />
      </ModernOverviewLayout>
    );
  }

  return (
    <ModernOverviewLayout>
      {/* Modern Overview Header */}
      <ModernOverviewHeader
        title="Tasks"
        subtitle={`${counts.total} item${counts.total !== 1 ? 's' : ''} need${counts.total === 1 ? 's' : ''} attention`}
        icon={<TasksIcon />}
        secondaryActions={[
          createRefreshAction(handleRefresh),
        ]}
        stats={[
          { label: 'Total Tasks', value: counts.total },
          { label: 'Quotes', value: counts.quotes },
          { label: 'Contracts', value: counts.contracts },
          { label: 'Payments', value: counts.payments },
        ]}
      />

      {/* Main Content Card */}
      <ModernGlassCard
        size="medium"
        sx={{
          overflow: 'visible',
          position: 'relative',
        }}
      >
        {/* Tab System */}
        <Box
          sx={{
            borderBottom: `1px solid ${tokens.color.borders.glass}`,
            position: 'relative',
            ...glassPresets.light,
            borderRadius: `${tokens.spacing.radius.xxl} ${tokens.spacing.radius.xxl} 0 0`,
          }}
        >
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            aria-label="tasks tabs"
            variant={isMobile ? 'scrollable' : 'standard'}
            scrollButtons="auto"
            sx={{
              '& .MuiTabs-indicator': {
                backgroundColor: tokens.color.primary[500],
                height: 3,
                borderRadius: '3px 3px 0 0',
              },
              '& .MuiTab-root': {
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: `${tokens.spacing.radius.lg} ${tokens.spacing.radius.lg} 0 0`,
                transition: createTransition(['background', 'color'], 'fast'),

                '&:hover': {
                  backgroundColor: `${tokens.color.primary[500]}08`,
                },

                '&.Mui-selected': {
                  backgroundColor: `${tokens.color.primary[500]}12`,
                  color: tokens.color.primary[700],
                },
              },
            }}
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
                      sx={{
                        height: 20,
                        fontSize: '0.75rem',
                        background: `linear-gradient(135deg, ${tokens.color.primary[500]} 0%, ${tokens.color.primary[600]} 100%)`,
                        color: 'white',
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
                        sx={{
                          height: 20,
                          fontSize: '0.75rem',
                          backgroundColor: `${tokens.color.neutral[500]}20`,
                          color: tokens.color.neutral[700],
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
      </ModernGlassCard>
    </ModernOverviewLayout>
  );
};
