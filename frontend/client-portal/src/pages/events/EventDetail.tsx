// frontend/client-portal/src/pages/events/EventDetail.tsx

import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useCurrencySettings } from '../../hooks/useCurrency';
import {
  Box,
  Typography,
  Stack,
  Paper,
  Breadcrumbs,
  Link,
  IconButton,
  Button,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Skeleton,
  Alert,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Share as ShareIcon,
  Settings as SettingsIcon,
  Timeline as TimelineIcon,
  Folder as DocumentsIcon,
  Task as TasksIcon,
  Note as NotesIcon,
  CalendarToday as CalendarIcon,
  Payment as PaymentIcon,
  Assignment as ContractIcon,
  Assignment as QuestionnaireIcon,
  Feedback as FeedbackIcon,
  RequestQuote as RequestQuoteIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { useEventsWithContracts } from '../../hooks/useEventsWithContracts';
import { useEventQuotes } from '../../hooks/useEventQuotes';
import {
  EventStatusBadge,
  EventCountdown,
  EventTimeline,
  EventDocuments,
  EventTasks,
  EventFeedback,
  EventQuestionnaires,
  EventQuotes,
  ContractStatusChip
} from '../../components/events';
import ContractSigningDialog from '../../components/contracts/ContractSigningDialog';
import { contractsApi } from '../../apis/contracts.api';
import type { Contract } from '../../types/contracts.types';

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
      id={`event-tabpanel-${index}`}
      aria-labelledby={`event-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const EventDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const { formatAmount } = useCurrencySettings();
  const location = useLocation();

  // State management - initialize activeTab from navigation state if present
  const [activeTab, setActiveTab] = useState(() => {
    return (location.state as { activeTab?: number })?.activeTab ?? 0;
  });
  const [preferencesDialogOpen, setPreferencesDialogOpen] = useState(false);
  const [preferencesData, setPreferencesData] = useState<Record<string, unknown>>({});
  const [signingDialogOpen, setSigningDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  // Data fetching with contract integration
  const eventId = parseInt(id || '0');
  const { useEventWithContracts, useEventNotes, useUpdatePreferences, useEventContracts } = useEventsWithContracts();
  
  const { 
    data: event, 
    isLoading: isLoadingEvent, 
    error: eventError 
  } = useEventWithContracts(eventId);
  
  const { 
    data: notes = [], 
    isLoading: isLoadingNotes 
  } = useEventNotes(eventId);
  
  // Get contracts for this event
  const {
    contracts: eventContracts,
    isLoading: isLoadingContracts,
    hasContracts,
    needsSignature
  } = useEventContracts(eventId);

  // Get quotes for this event
  const {
    data: quotesData
  } = useEventQuotes(eventId);
  const quotesCount = quotesData?.results?.length || 0;

  // Mutations
  const updatePreferencesMutation = useUpdatePreferences();

  // Event handlers
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleBack = () => {
    navigate('/events');
  };

  const handlePreferencesOpen = () => {
    if (event?.preferences) {
      setPreferencesData(event.preferences);
    }
    setPreferencesDialogOpen(true);
  };

  const handlePreferencesClose = () => {
    setPreferencesDialogOpen(false);
    setPreferencesData({});
  };

  const handlePreferencesSave = async () => {
    await updatePreferencesMutation.mutateAsync({
      id: eventId,
      data: { preferences: preferencesData },
    });
    handlePreferencesClose();
  };

  const handlePreferenceChange = (key: string, value: unknown) => {
    setPreferencesData(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSignContract = async (contract: Contract) => {
    try {
      // Fetch full contract details with content for signing
      const fullContract = await contractsApi.getContract(contract.id);
      setSelectedContract(fullContract);
      setSigningDialogOpen(true);
    } catch (error) {
      console.error('Error fetching contract details for signing:', error);
      // Fallback to showing contract without content
      setSelectedContract(contract);
      setSigningDialogOpen(true);
    }
  };

  const handleSignComplete = () => {
    // Contract signing completed successfully
    setSigningDialogOpen(false);
    setSelectedContract(null);
    // Optionally refresh event data to update contract status
    // The useEventContracts hook should automatically update via React Query
  };

  const handleSignError = (error: string) => {
    console.error('Contract signing error:', error);
    // Error is already shown in the dialog
  };

  // Loading state
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

  // Error state
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

  const PHILIPPINE_TIMEZONE = 'Asia/Manila';

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          component="button"
          variant="body2"
          onClick={handleBack}
          sx={{ textDecoration: 'none' }}
        >
          Events
        </Link>
        <Typography variant="body2" color="text.primary">
          {event.name}
        </Typography>
      </Breadcrumbs>

      {/* Header */}
      <Paper
        sx={{
          p: 3,
          mb: 3,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'center' }}
          spacing={3}
        >
          <Box flex={1}>
            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
              <IconButton
                onClick={handleBack}
                size="small"
                aria-label="Back to events"
              >
                <BackIcon />
              </IconButton>
              <Typography variant="h4" component="h1">
                {event.name}
              </Typography>
            </Stack>

            <Typography variant="h6" color="text.secondary" gutterBottom>
              {event.event_type_name}
            </Typography>

            <Stack direction="row" spacing={2} flexWrap="wrap" gap={1} mb={2}>
              <EventStatusBadge status={event.status} />
              {event.payment_status && (
                <Chip
                  icon={<PaymentIcon fontSize="small" />}
                  label={event.payment_status.replace('_', ' ')}
                  color={
                    event.payment_status === 'PAID' ? 'success' :
                    event.payment_status === 'OVERDUE' ? 'error' :
                    event.payment_status === 'PARTIAL' ? 'warning' :
                    'default'
                  }
                  variant="outlined"
                />
              )}
              <ContractStatusChip
                status={event.contract_status}
                hasContracts={event.has_contracts}
                contractsCount={event.contracts_count}
                pendingSignatureRequired={event.pending_signature_required}
                contractExpiryDays={event.contract_expiry_days}
                size="medium"
                showCount={true}
              />
            </Stack>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {event.start_date && (
                <Box sx={(theme) => ({
                  flexGrow: 0,
                  flexBasis: { xs: '100%', sm: `calc(50% - ${theme.spacing(1)})` },
                })}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CalendarIcon fontSize="small" color="action" />
                    <Typography variant="body1">
                      {formatInTimeZone(event.start_date, PHILIPPINE_TIMEZONE, 'EEEE, MMMM dd, yyyy')}
                      {event.end_date && formatInTimeZone(event.start_date, PHILIPPINE_TIMEZONE, 'yyyy-MM-dd') !== formatInTimeZone(event.end_date, PHILIPPINE_TIMEZONE, 'yyyy-MM-dd') &&
                        ` - ${formatInTimeZone(event.end_date, PHILIPPINE_TIMEZONE, 'MMMM dd, yyyy')}`
                      }
                    </Typography>
                  </Stack>
                </Box>
              )}
              
              {event.current_stage && (
                <Box sx={(theme) => ({
                  flexGrow: 0,
                  flexBasis: { xs: '100%', sm: `calc(50% - ${theme.spacing(1)})` },
                })}>
                  <Typography variant="body1">
                    <strong>Current Stage:</strong> {event.current_stage.name}
                  </Typography>
                </Box>
              )}
              
              {event.total_price && (
                <Box sx={(theme) => ({
                  flexGrow: 0,
                  flexBasis: { xs: '100%', sm: `calc(50% - ${theme.spacing(1)})` },
                })}>
                  <Typography variant="body1">
                    <strong>Total Price:</strong> {formatAmount(event.total_price)}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>

          <Stack spacing={2} alignItems="center">
            {event.days_until_event !== null && event.days_until_event !== undefined && (
              <EventCountdown daysUntil={event.days_until_event} />
            )}
            
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<SettingsIcon />}
                onClick={handlePreferencesOpen}
                size="small"
              >
                Preferences
              </Button>
              <IconButton
                aria-label="Share event"
                size="small"
              >
                <ShareIcon />
              </IconButton>
            </Stack>
          </Stack>
        </Stack>
      </Paper>

      {/* Quick Stats */}
      {(event.upcoming_tasks.length > 0 || event.accessible_documents_count > 0 || event.has_notes) && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          {event.upcoming_tasks.length > 0 && (
            <Box sx={(theme) => ({
              flexGrow: 0,
              flexBasis: { xs: '100%', sm: `calc(33.333% - ${theme.spacing(4/3)})` },
            })}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="warning.main">
                  {event.upcoming_tasks.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Upcoming Tasks
                </Typography>
              </Paper>
            </Box>
          )}
          
          {event.accessible_documents_count > 0 && (
            <Box sx={(theme) => ({
              flexGrow: 0,
              flexBasis: { xs: '100%', sm: `calc(33.333% - ${theme.spacing(4/3)})` },
            })}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="info.main">
                  {event.accessible_documents_count}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Documents
                </Typography>
              </Paper>
            </Box>
          )}
          
          {event.has_notes && (
            <Box sx={(theme) => ({
              flexGrow: 0,
              flexBasis: { xs: '100%', sm: `calc(33.333% - ${theme.spacing(4/3)})` },
            })}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="primary.main">
                  {notes.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Notes
                </Typography>
              </Paper>
            </Box>
          )}
        </Box>
      )}

      {/* Tabs */}
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
            label={`Documents (${event.accessible_documents_count})`}
            icon={<DocumentsIcon />}
            iconPosition="start"
            id="event-tab-2"
            aria-controls="event-tabpanel-2"
          />
          <Tab
            label="Tasks"
            icon={<TasksIcon />}
            iconPosition="start"
            id="event-tab-3"
            aria-controls="event-tabpanel-3"
          />
          <Tab
            label="Feedback"
            icon={<FeedbackIcon />}
            iconPosition="start"
            id="event-tab-4"
            aria-controls="event-tabpanel-4"
          />
          <Tab
            label={`Quotes${quotesCount > 0 ? ` (${quotesCount})` : ''}`}
            icon={<RequestQuoteIcon />}
            iconPosition="start"
            id="event-tab-5"
            aria-controls="event-tabpanel-5"
          />
          {hasContracts && (
            <Tab
              label={`Contracts (${eventContracts.length})`}
              icon={<ContractIcon />}
              iconPosition="start"
              id="event-tab-6"
              aria-controls="event-tabpanel-6"
            />
          )}
          {event.has_notes && (
            <Tab
              label={`Notes (${notes.length})`}
              icon={<NotesIcon />}
              iconPosition="start"
              id={hasContracts ? "event-tab-7" : "event-tab-6"}
              aria-controls={hasContracts ? "event-tabpanel-7" : "event-tabpanel-6"}
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
          <EventDocuments eventId={eventId} />
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          <EventTasks eventId={eventId} />
        </TabPanel>

        <TabPanel value={activeTab} index={4}>
          <EventFeedback eventId={eventId} eventStatus={event.status} />
        </TabPanel>

        <TabPanel value={activeTab} index={5}>
          <EventQuotes eventId={eventId} />
        </TabPanel>

        {hasContracts && (
          <TabPanel value={activeTab} index={6}>
            {isLoadingContracts ? (
              <Box>
                {[1, 2].map((item) => (
                  <Skeleton key={item} variant="rectangular" height={120} sx={{ mb: 2 }} />
                ))}
              </Box>
            ) : (
              <Stack spacing={3}>
                {needsSignature && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      Action Required: Contract Signature Needed
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      You have contracts that require your signature to proceed with your event.
                    </Typography>
                  </Alert>
                )}
                
                {eventContracts.map((contract) => (
                  <Paper key={contract.id} sx={{ p: 3 }}>
                    <Stack spacing={2}>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                        <Box>
                          <Typography variant="h6" gutterBottom>
                            {contract.template.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Event: {contract.event.title}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1}>
                          <ContractStatusChip
                            status={contract.status}
                            hasContracts={true}
                            contractsCount={1}
                            pendingSignatureRequired={contract.can_client_sign}
                            size="small"
                          />
                        </Stack>
                      </Box>
                      
                      {contract.signature_progress && (
                        <Box>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Signature Progress: {contract.signature_progress.signed_count} of {contract.signature_progress.total_required} signatures
                          </Typography>
                          <Box sx={{ width: '100%', bgcolor: 'grey.200', borderRadius: 1, overflow: 'hidden' }}>
                            <Box
                              sx={{
                                width: `${contract.signature_progress.percentage}%`,
                                bgcolor: contract.signature_progress.percentage === 100 ? 'success.main' : 'warning.main',
                                height: 8,
                                transition: 'width 0.3s ease',
                              }}
                            />
                          </Box>
                        </Box>
                      )}
                      
                      <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => navigate(`/contracts/${contract.id}`)}
                        >
                          View Details
                        </Button>
                        {contract.can_client_sign && (
                          <Button
                            variant="contained"
                            size="small"
                            color="warning"
                            onClick={() => handleSignContract(contract)}
                          >
                            Sign Now
                          </Button>
                        )}
                      </Stack>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}
          </TabPanel>
        )}

        {event.has_notes && (
          <TabPanel value={activeTab} index={hasContracts ? 7 : 6}>
            {isLoadingNotes ? (
              <Box>
                {[1, 2, 3].map((item) => (
                  <Skeleton key={item} variant="rectangular" height={100} sx={{ mb: 2 }} />
                ))}
              </Box>
            ) : (
              <Stack spacing={2}>
                {notes.map((note) => (
                  <Paper key={note.id} sx={{ p: 2 }}>
                    <Typography variant="body1" paragraph>
                      {note.content}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {format(new Date(note.created_at), 'MMM dd, yyyy at h:mm a')}
                      {note.created_by && ` • ${note.created_by}`}
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            )}
          </TabPanel>
        )}
      </Paper>

      {/* Preferences Dialog */}
      <Dialog
        open={preferencesDialogOpen}
        onClose={handlePreferencesClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Event Preferences</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            Update your preferences for this event. These settings help us tailor the experience to your needs.
          </Typography>
          
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              label="Special Requests"
              multiline
              rows={3}
              value={(preferencesData.special_requests as string) || ''}
              onChange={(e) => handlePreferenceChange('special_requests', e.target.value)}
              placeholder="Any special requests or requirements..."
              fullWidth
            />
            
            <TextField
              label="Dietary Restrictions"
              value={(preferencesData.dietary_restrictions as string) || ''}
              onChange={(e) => handlePreferenceChange('dietary_restrictions', e.target.value)}
              placeholder="Allergies, dietary preferences, etc."
              fullWidth
            />
            
            <TextField
              label="Communication Preferences"
              value={(preferencesData.communication_preferences as string) || ''}
              onChange={(e) => handlePreferenceChange('communication_preferences', e.target.value)}
              placeholder="Preferred contact method, frequency, etc."
              fullWidth
            />
          </Stack>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handlePreferencesClose}>Cancel</Button>
          <Button
            onClick={handlePreferencesSave}
            variant="contained"
            disabled={updatePreferencesMutation.isPending}
          >
            Save Preferences
          </Button>
        </DialogActions>
      </Dialog>

      {/* Contract Signing Dialog */}
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