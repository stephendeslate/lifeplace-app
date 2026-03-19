import React from 'react';
import {
  Box,
  CircularProgress,
  Menu,
  MenuItem,
  Stack,
  Typography,
  useTheme,
  useMediaQuery,
  Alert,
  alpha,
} from '@mui/material';
import {
  History as HistoryIcon,
  MarkEmailRead as OpenedIcon,
  MarkEmailUnread as UnreadIcon,
} from '@mui/icons-material';
import { GlassCard } from '@/design-system/components/GlassCard';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';
import { useCommunicationHistoryLogic } from './useCommunicationHistoryLogic';
import { CommunicationFiltersBar } from './CommunicationFiltersBar';
import { MobileRecordCard } from './MobileRecordCard';
import { DesktopRecordsTable } from './DesktopRecordsTable';
import { MessageDetailDialog } from './MessageDetailDialog';

export const CommunicationHistory: React.FC = () => {
  const {
    filters,
    selectedRecord,
    detailDialogOpen,
    setDetailDialogOpen,
    actionMenuAnchor,
    selectedRecordForAction,
    records,
    isLoading,
    refetch,
    error,
    markAsReadMutation,
    markAsUnreadMutation,
    handleFilterChange,
    handleClearFilters,
    handleViewDetail,
    handleActionMenuClose,
    handleMarkAsRead,
    handleMarkAsUnread,
    hasActiveFilters,
  } = useCommunicationHistoryLogic();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (isLoading) {
    return (
      <AnimatedElement animation="fadeIn">
        <GlassCard variant="light" intensity="subtle" sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Loading communication history...
          </Typography>
        </GlassCard>
      </AnimatedElement>
    );
  }

  if (error) {
    return (
      <AnimatedElement animation="fadeIn">
        <GlassCard variant="light" intensity="medium" sx={{ p: 3 }}>
          <Alert
            severity="error"
            sx={{
              backgroundColor: alpha(theme.palette.error.main, 0.1),
              border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
            }}
          >
            Failed to load communication history. Please try again.
          </Alert>
        </GlassCard>
      </AnimatedElement>
    );
  }

  return (
    <Box>
      <CommunicationFiltersBar
        filters={filters}
        hasActiveFilters={hasActiveFilters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        onRefresh={() => refetch()}
      />

      {records.length === 0 ? (
        <AnimatedElement animation="fadeIn" delay={300}>
          <GlassCard
            variant="light"
            intensity="subtle"
            sx={{
              p: 4,
              textAlign: 'center',
              backgroundColor: alpha(theme.palette.grey[100], 0.3),
              border: `1px solid ${alpha('#fff', 0.2)}`,
            }}
          >
            <HistoryIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No Communication History
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {hasActiveFilters
                ? 'No communications match your current filters.'
                : 'No communications have been sent to you yet.'}
            </Typography>
          </GlassCard>
        </AnimatedElement>
      ) : (
        <AnimatedElement animation="slideUp" delay={300}>
          {isMobile ? (
            <Stack spacing={1.5}>
              {records.map((record) => (
                <MobileRecordCard key={record.id} record={record} onViewDetail={handleViewDetail} />
              ))}
            </Stack>
          ) : (
            <DesktopRecordsTable records={records} onViewDetail={handleViewDetail} />
          )}
        </AnimatedElement>
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={handleActionMenuClose}
        onClick={handleActionMenuClose}
      >
        {selectedRecordForAction && !selectedRecordForAction.is_opened && (
          <MenuItem onClick={handleMarkAsRead} disabled={markAsReadMutation.isPending}>
            <OpenedIcon sx={{ mr: 1 }} />
            Mark as Read
          </MenuItem>
        )}
        {selectedRecordForAction && selectedRecordForAction.is_opened && (
          <MenuItem onClick={handleMarkAsUnread} disabled={markAsUnreadMutation.isPending}>
            <UnreadIcon sx={{ mr: 1 }} />
            Mark as Unread
          </MenuItem>
        )}
      </Menu>

      <MessageDetailDialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        record={selectedRecord}
      />
    </Box>
  );
};
