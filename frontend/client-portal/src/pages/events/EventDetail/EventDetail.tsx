import React from 'react';
import { Box, Typography, Stack, Paper, Button, Tabs, Tab, Skeleton, Alert } from '@mui/material';
import {
  ArrowBack as BackIcon,
  Timeline as TimelineIcon,
  Folder as DocumentsIcon,
  Task as TasksIcon,
  Assignment as ContractIcon,
  Assignment as QuestionnaireIcon,
  Feedback as FeedbackIcon,
  RequestQuote as RequestQuoteIcon,
  Receipt as InvoiceIcon,
  Login as CheckInIcon,
  Note as NotesIcon,
} from '@mui/icons-material';
import {
  EventTimeline,
  EventDocuments,
  EventTasks,
  EventFeedback,
  EventQuestionnaires,
  EventQuotes,
  EventInvoices,
  EventNotes,
  EventMilestones,
} from '@/components/events';
import { EventCheckIn } from '@/components/events/EventCheckIn';
import ContractSigningDialog from '@/components/contracts/ContractSigningDialog';
import { useEventDetailLogic } from './useEventDetailLogic';
import { TabPanel } from './TabPanel';
import { EventDetailHeader } from './EventDetailHeader';
import { ContractsTabContent } from './ContractsTabContent';
import { PreferencesDialog } from './PreferencesDialog';

const EventDetail: React.FC = () => {
  const {
    eventId,
    event,
    isLoadingEvent,
    eventError,
    eventContracts,
    isLoadingContracts,
    needsSignature,
    quotesCount,
    invoicesCount,
    activeTab,
    handleTabChange,
    handleBack,
    formatAmount,
    navigate,
    preferencesDialogOpen,
    preferencesData,
    handlePreferencesOpen,
    handlePreferencesClose,
    handlePreferencesSave,
    handlePreferenceChange,
    updatePreferencesMutation,
    signingDialogOpen,
    setSigningDialogOpen,
    selectedContract,
    setSelectedContract,
    handleSignContract,
    handleSignComplete,
    handleSignError,
  } = useEventDetailLogic();

  if (isLoadingEvent) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        <Stack spacing={3}>
          <Skeleton variant="text" width={200} height={24} />
          <Skeleton variant="rectangular" height={200} />
          <Skeleton variant="text" width="100%" height={48} />
          <Skeleton variant="rectangular" height={400} />
        </Stack>
      </Box>
    );
  }

  if (eventError || !event) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {eventError ? 'Unable to load event details.' : 'Event not found.'}
        </Alert>
        <Button startIcon={<BackIcon />} onClick={handleBack}>
          Back to Events
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      <EventDetailHeader
        event={event}
        formatAmount={formatAmount}
        onBack={handleBack}
        onPreferencesOpen={handlePreferencesOpen}
      />

      <EventMilestones event={event} />

      {event.upcoming_tasks.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          <Box
            sx={(theme) => ({
              flexGrow: 0,
              flexBasis: { xs: '100%', sm: `calc(50% - ${theme.spacing(1)})` },
            })}
          >
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">
                {event.upcoming_tasks.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Upcoming Tasks
              </Typography>
            </Paper>
          </Box>
        </Box>
      )}

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab
            label="Timeline"
            icon={<TimelineIcon />}
            iconPosition="start"
            id="event-tab-0"
            aria-controls="event-tabpanel-0"
          />
          <Tab
            label="Questionnaires"
            icon={<QuestionnaireIcon />}
            iconPosition="start"
            id="event-tab-1"
            aria-controls="event-tabpanel-1"
          />
          <Tab
            label={`Contracts${eventContracts.length > 0 ? ` (${eventContracts.length})` : ''}`}
            icon={<ContractIcon />}
            iconPosition="start"
            id="event-tab-2"
            aria-controls="event-tabpanel-2"
          />
          <Tab
            label={`Documents (${event.accessible_documents_count})`}
            icon={<DocumentsIcon />}
            iconPosition="start"
            id="event-tab-3"
            aria-controls="event-tabpanel-3"
          />
          <Tab
            label="Tasks"
            icon={<TasksIcon />}
            iconPosition="start"
            id="event-tab-4"
            aria-controls="event-tabpanel-4"
          />
          <Tab
            label="Feedback"
            icon={<FeedbackIcon />}
            iconPosition="start"
            id="event-tab-5"
            aria-controls="event-tabpanel-5"
          />
          <Tab
            label={`Quotes${quotesCount > 0 ? ` (${quotesCount})` : ''}`}
            icon={<RequestQuoteIcon />}
            iconPosition="start"
            id="event-tab-6"
            aria-controls="event-tabpanel-6"
          />
          <Tab
            label={`Invoices${invoicesCount > 0 ? ` (${invoicesCount})` : ''}`}
            icon={<InvoiceIcon />}
            iconPosition="start"
            id="event-tab-7"
            aria-controls="event-tabpanel-7"
          />
          <Tab
            label="Check-in"
            icon={<CheckInIcon />}
            iconPosition="start"
            id="event-tab-8"
            aria-controls="event-tabpanel-8"
          />
          {event.has_notes && (
            <Tab
              label="Notes"
              icon={<NotesIcon />}
              iconPosition="start"
              id="event-tab-9"
              aria-controls="event-tabpanel-9"
            />
          )}
        </Tabs>

        <TabPanel value={activeTab} index={0}>
          <EventTimeline eventId={eventId} />
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <EventQuestionnaires eventId={eventId} />
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <ContractsTabContent
            eventContracts={eventContracts}
            isLoadingContracts={isLoadingContracts}
            needsSignature={needsSignature}
            onViewContract={(contractId) => navigate(`/contracts/${contractId}`)}
            onSignContract={handleSignContract}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          <EventDocuments eventId={eventId} />
        </TabPanel>

        <TabPanel value={activeTab} index={4}>
          <EventTasks eventId={eventId} />
        </TabPanel>

        <TabPanel value={activeTab} index={5}>
          <EventFeedback eventId={eventId} eventStatus={event.status} />
        </TabPanel>

        <TabPanel value={activeTab} index={6}>
          <EventQuotes eventId={eventId} />
        </TabPanel>

        <TabPanel value={activeTab} index={7}>
          <EventInvoices eventId={eventId} />
        </TabPanel>

        <TabPanel value={activeTab} index={8}>
          <EventCheckIn eventId={eventId} event={event} />
        </TabPanel>

        {event.has_notes && (
          <TabPanel value={activeTab} index={9}>
            <EventNotes eventId={eventId} />
          </TabPanel>
        )}
      </Paper>

      <PreferencesDialog
        open={preferencesDialogOpen}
        onClose={handlePreferencesClose}
        onSave={handlePreferencesSave}
        isSaving={updatePreferencesMutation.isPending}
        preferencesData={preferencesData}
        onPreferenceChange={handlePreferenceChange}
      />

      <ContractSigningDialog
        open={signingDialogOpen}
        onClose={() => {
          setSigningDialogOpen(false);
          setSelectedContract(null);
        }}
        contract={selectedContract}
        onSignComplete={handleSignComplete}
        onError={handleSignError}
      />
    </Box>
  );
};

export default EventDetail;
