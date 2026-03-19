// Tabbed content section for Event Profile

import React from 'react';
import { Box, Card, CardContent, Tab, Tabs } from '@mui/material';
import {
  Message as MessageIcon,
  Description as ContractIcon,
  Receipt as QuoteIcon,
  Payment as InvoiceIcon,
  Assignment as QuestionnaireIcon,
  Folder as FilesIcon,
  Note as NoteIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { EventCommunications } from '@/components/events/EventCommunications';
import { EventQuestionnaires } from '@/components/events/EventQuestionnaires';
import { EventQuotes } from '@/components/events/EventQuotes';
import { EventContracts } from '@/components/events/EventContracts';
import { EventInvoices } from '@/components/events/EventInvoices';
import { EventFiles } from '@/components/events/EventFiles';
import { NotesList } from '@/components/notes';
import { ActivityTimeline, type ActivityItem } from '@/components/common';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return <div hidden={value !== index}>{value === index && <Box>{children}</Box>}</div>;
};

interface EventProfileTabsProps {
  event: NonNullable<import('./useEventProfileLogic').EventProfileLogic['event']>;
  clientId: number;
  clientEmail: string;
  clientName: string;
  eventId: number;
  tabValue: number;
  onTabChange: (value: number) => void;
  activityItems: ActivityItem[];
  communicationsCount: number;
  questionnairesCount: number;
  onRefresh: () => void;
}

export const EventProfileTabs: React.FC<EventProfileTabsProps> = ({
  event,
  clientId,
  clientEmail,
  clientName,
  eventId,
  tabValue,
  onTabChange,
  activityItems,
  communicationsCount,
  questionnairesCount,
  onRefresh,
}) => {
  return (
    <Card>
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
          <Tab
            label={`Communications (${communicationsCount})`}
            icon={<MessageIcon />}
            iconPosition="start"
          />
          <Tab label="Quotes" icon={<QuoteIcon />} iconPosition="start" />
          <Tab label="Contracts" icon={<ContractIcon />} iconPosition="start" />
          <Tab label="Invoices" icon={<InvoiceIcon />} iconPosition="start" />
          <Tab
            label={`Questionnaires (${questionnairesCount})`}
            icon={<QuestionnaireIcon />}
            iconPosition="start"
          />
          <Tab label="Files" icon={<FilesIcon />} iconPosition="start" />
          <Tab label="Notes" icon={<NoteIcon />} iconPosition="start" />
        </Tabs>
      </Box>

      <CardContent>
        <TabPanel value={tabValue} index={0}>
          <ActivityTimeline
            activities={activityItems}
            maxHeight="600px"
            showFilters={true}
            onRefresh={onRefresh}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <EventCommunications
            event={event}
            clientId={clientId}
            clientEmail={clientEmail}
            clientName={clientName}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <EventQuotes event={event} />
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <EventContracts event={event} />
        </TabPanel>

        <TabPanel value={tabValue} index={4}>
          <EventInvoices event={event} />
        </TabPanel>

        <TabPanel value={tabValue} index={5}>
          <EventQuestionnaires event={event} />
        </TabPanel>

        <TabPanel value={tabValue} index={6}>
          <EventFiles event={event} />
        </TabPanel>

        <TabPanel value={tabValue} index={7}>
          <NotesList
            contentType="event"
            objectId={eventId}
            objectName={event.name || `Event #${event.id}`}
            allowCreate={true}
            allowEdit={true}
            allowDelete={true}
          />
        </TabPanel>
      </CardContent>
    </Card>
  );
};
