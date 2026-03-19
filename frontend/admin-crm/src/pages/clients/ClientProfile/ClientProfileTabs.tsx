import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Chip,
  Tab,
  Tabs,
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
} from '@mui/material';
import {
  Event as EventIcon,
  Note as NoteIcon,
  Assignment as ContractIcon,
  AttachMoney as QuoteIcon,
  Payment as InvoiceIcon,
  Schedule as ScheduleIcon,
  Add as AddIcon,
  Message as MessageIcon,
} from '@mui/icons-material';
import { ClientQuotes } from '@/components/clients/ClientQuotes';
import { ClientContracts } from '@/components/clients/ClientContracts';
import { ClientInvoices } from '@/components/clients/ClientInvoices';
import { NotesList } from '@/components/notes';
import { ClientCommunications } from '@/components/clients/ClientCommunications';
import { ActivityTimeline, type ActivityItem } from '@/components/common';
import { ModernEmptyState } from '@/components/common/ModernDesignSystem';
import type { Client, CommunicationRecord } from '@/types/clients.types';
import type { Event } from '@/types/events.types';
import type { EventQuote } from '@/types/sales.types';
import type { EventContract } from '@/types/contracts.types';
import type { Invoice } from '@/types/payments/core.types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return <div hidden={value !== index}>{value === index && <Box>{children}</Box>}</div>;
};

interface ClientProfileTabsProps {
  client: Client;
  clientId: number;
  tabValue: number;
  onTabChange: (newValue: number) => void;
  activityItems: ActivityItem[];
  events: Event[];
  isLoadingEvents: boolean;
  communications: CommunicationRecord[];
  quotes: EventQuote[];
  contracts: EventContract[];
  invoices: Invoice[];
  onRefresh: () => void;
}

export const ClientProfileTabs: React.FC<ClientProfileTabsProps> = ({
  client,
  clientId,
  tabValue,
  onTabChange,
  activityItems,
  events,
  isLoadingEvents,
  communications,
  quotes,
  contracts,
  invoices,
  onRefresh,
}) => {
  const navigate = useNavigate();

  return (
    <Box sx={{ borderRadius: 1, bgcolor: 'background.paper' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => onTabChange(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
        >
          <Tab
            label={`Activity (${activityItems.length})`}
            icon={<ScheduleIcon />}
            iconPosition="start"
          />
          <Tab label={`Events (${events.length})`} icon={<EventIcon />} iconPosition="start" />
          <Tab
            label={`Communications (${communications.length})`}
            icon={<MessageIcon />}
            iconPosition="start"
          />
          <Tab label={`Quotes (${quotes.length})`} icon={<QuoteIcon />} iconPosition="start" />
          <Tab
            label={`Contracts (${contracts.length})`}
            icon={<ContractIcon />}
            iconPosition="start"
          />
          <Tab
            label={`Invoices (${invoices.length})`}
            icon={<InvoiceIcon />}
            iconPosition="start"
          />
          <Tab label="Notes" icon={<NoteIcon />} iconPosition="start" />
        </Tabs>
      </Box>

      <Box sx={{ p: 3 }}>
        {/* Activity Tab */}
        <TabPanel value={tabValue} index={0}>
          <ActivityTimeline
            activities={activityItems}
            maxHeight="600px"
            showFilters={true}
            onRefresh={onRefresh}
          />
        </TabPanel>

        {/* Events Tab */}
        <TabPanel value={tabValue} index={1}>
          {isLoadingEvents ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress size={32} />
            </Box>
          ) : events.length === 0 ? (
            <ModernEmptyState
              icon={EventIcon}
              title="No Events Yet"
              description="This client hasn't been associated with any events yet. Create an event to get started."
              primaryAction={{
                label: 'Create Event',
                onClick: () => navigate(`/events/new?client=${clientId}`),
                icon: <AddIcon />,
                color: 'primary',
              }}
              size="small"
              tip={{
                text: 'Events help you track client bookings, milestones, and deliverables',
                type: 'info',
              }}
              sx={{ py: 4 }}
            />
          ) : (
            <TableContainer component={Paper} sx={{ borderRadius: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 600 }}>Event Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {events.map((event) => (
                    <TableRow
                      key={event.id}
                      sx={{
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                      onClick={() => navigate(`/events/${event.id}`)}
                    >
                      <TableCell>
                        <Typography variant="body1" fontWeight={600}>
                          {event.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {event.event_type_name || 'No type'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {new Date(event.start_date).toLocaleDateString()}
                        </Typography>
                        {event.end_date && (
                          <Typography variant="caption" color="text.secondary">
                            to {new Date(event.end_date).toLocaleDateString()}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={event.status}
                          size="small"
                          color={
                            event.status === 'COMPLETED'
                              ? 'success'
                              : event.status === 'CONFIRMED'
                                ? 'primary'
                                : event.status === 'CANCELLED'
                                  ? 'error'
                                  : 'default'
                          }
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/events/${event.id}`);
                          }}
                          sx={{ textTransform: 'none', fontWeight: 600 }}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        {/* Communications Tab */}
        <TabPanel value={tabValue} index={2}>
          <ClientCommunications client={client} />
        </TabPanel>

        {/* Quotes Tab */}
        <TabPanel value={tabValue} index={3}>
          <ClientQuotes client={client} />
        </TabPanel>

        {/* Contracts Tab */}
        <TabPanel value={tabValue} index={4}>
          <ClientContracts client={client} />
        </TabPanel>

        {/* Invoices Tab */}
        <TabPanel value={tabValue} index={5}>
          <ClientInvoices client={client} />
        </TabPanel>

        {/* Notes Tab */}
        <TabPanel value={tabValue} index={6}>
          <NotesList
            contentType="client"
            objectId={clientId}
            objectName={`${client.first_name} ${client.last_name}`}
            allowCreate={true}
            allowEdit={true}
            allowDelete={true}
          />
        </TabPanel>
      </Box>
    </Box>
  );
};
