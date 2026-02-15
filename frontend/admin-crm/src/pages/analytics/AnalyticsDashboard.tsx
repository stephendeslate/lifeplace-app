// frontend/admin-crm/src/pages/analytics/AnalyticsDashboard.tsx
import React, { useEffect } from "react";
import { Box, Tabs, Tab, Divider } from "@mui/material";
import AssessmentIcon from "@mui/icons-material/Assessment";
import EventIcon from "@mui/icons-material/Event";
import PeopleIcon from "@mui/icons-material/People";
import BusinessIcon from "@mui/icons-material/Business";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import PercentIcon from "@mui/icons-material/Percent";
import TimelineIcon from "@mui/icons-material/Timeline";
import QuizIcon from "@mui/icons-material/Quiz";

import { KPICard, DateRangeFilter } from "../../components/analytics";
import { useDashboardKPIs, useDateRange } from "../../hooks/useAnalytics";
import { useLayout } from "../../contexts/LayoutContext";
import { ModernPageLayout } from "../../components/common/ModernPageLayout";
import { ModernCard } from "../../components/common/ModernCard";
import { ModernPageHeader } from "../../components/common/ModernPageHeader";
import { SalesReportsTab } from "./tabs/SalesReportsTab";
import { EventsReportsTab } from "./tabs/EventsReportsTab";
import { CustomersReportsTab } from "./tabs/CustomersReportsTab";
import { OperationsReportsTab } from "./tabs/OperationsReportsTab";
import { BookingFlowTab } from "./tabs/BookingFlowTab";
import { QuestionnairesTab } from "./tabs/QuestionnairesTab";
import { CommunicationsTab } from "./tabs/CommunicationsTab";
import EmailIcon from "@mui/icons-material/Email";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
  </div>
);

export const AnalyticsDashboard: React.FC = () => {
  const { setBreadcrumbs } = useLayout();
  const { dateRange, setDateRange, presets } = useDateRange(30);
  const { data: kpis, isLoading: kpisLoading } = useDashboardKPIs(dateRange);
  const [activeTab, setActiveTab] = React.useState(0);

  // Set breadcrumbs
  useEffect(() => {
    setBreadcrumbs([{ label: "Analytics" }]);
  }, [setBreadcrumbs]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <ModernPageLayout backgroundPattern="default">
      {/* Modern Header */}
      <ModernPageHeader
        title="Analytics Dashboard"
        subtitle="Track performance metrics and insights"
        icon={<AssessmentIcon />}
        size="medium"
      />

      {/* Date Range Filter */}
      <Box display="flex" justifyContent="flex-end" mb={3}>
        <DateRangeFilter
          dateRange={dateRange}
          onChange={setDateRange}
          presets={presets}
        />
      </Box>

      {/* KPI Summary Cards */}
      <Box
        display="flex"
        gap={2}
        mb={4}
        sx={{
          flexWrap: "wrap",
          "& > *": {
            flex: "1 1 200px",
            minWidth: 200,
            maxWidth: {
              xs: "100%",
              sm: "calc(50% - 8px)",
              md: "calc(25% - 12px)",
            },
          },
        }}
      >
        <KPICard
          title="Total Bookings"
          value={kpis?.total_bookings ?? 0}
          subtitle="this period"
          isLoading={kpisLoading}
          color="primary"
          icon={<EventIcon />}
        />
        <KPICard
          title="Total Revenue"
          value={formatCurrency(kpis?.total_revenue ?? 0)}
          trend={kpis?.total_revenue_trend}
          trendLabel="vs previous period"
          isLoading={kpisLoading}
          color="success"
          icon={<AttachMoneyIcon />}
        />
        <KPICard
          title="Conversion Rate"
          value={`${kpis?.conversion_rate ?? 0}%`}
          subtitle={`${kpis?.completed_sessions ?? 0} of ${kpis?.booking_sessions ?? 0} sessions`}
          isLoading={kpisLoading}
          color="info"
          icon={<PercentIcon />}
        />
        <KPICard
          title="New Clients"
          value={kpis?.new_clients ?? 0}
          subtitle="this period"
          isLoading={kpisLoading}
          color="warning"
          icon={<GroupAddIcon />}
        />
      </Box>

      {/* Secondary KPIs */}
      <Box
        display="flex"
        gap={2}
        mb={4}
        sx={{
          flexWrap: "wrap",
          "& > *": {
            flex: "1 1 150px",
            minWidth: 150,
            maxWidth: {
              xs: "100%",
              sm: "calc(33% - 11px)",
              md: "calc(25% - 12px)",
            },
          },
        }}
      >
        <KPICard
          title="Confirmed"
          value={kpis?.confirmed_bookings ?? 0}
          isLoading={kpisLoading}
          color="primary"
        />
        <KPICard
          title="Completed"
          value={kpis?.completed_bookings ?? 0}
          isLoading={kpisLoading}
          color="success"
        />
        <KPICard
          title="Cancelled"
          value={kpis?.cancelled_bookings ?? 0}
          isLoading={kpisLoading}
          color="error"
        />
        <KPICard
          title="Avg. Booking Value"
          value={formatCurrency(kpis?.avg_booking_value ?? 0)}
          isLoading={kpisLoading}
          color="info"
        />
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Report Tabs */}
      <ModernCard variant="flat" size="medium" sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            "& .MuiTab-root": {
              minHeight: 56,
              textTransform: "none",
            },
          }}
        >
          <Tab
            icon={<AttachMoneyIcon />}
            iconPosition="start"
            label="Sales & Reservations"
          />
          <Tab
            icon={<EventIcon />}
            iconPosition="start"
            label="Events & Guests"
          />
          <Tab
            icon={<PeopleIcon />}
            iconPosition="start"
            label="Customers & Leads"
          />
          <Tab
            icon={<BusinessIcon />}
            iconPosition="start"
            label="Operations"
          />
          <Tab
            icon={<TimelineIcon />}
            iconPosition="start"
            label="Booking Flows"
          />
          <Tab
            icon={<QuizIcon />}
            iconPosition="start"
            label="Questionnaires"
          />
          <Tab
            icon={<EmailIcon />}
            iconPosition="start"
            label="Communications"
          />
        </Tabs>
      </ModernCard>

      {/* Tab Content */}
      <TabPanel value={activeTab} index={0}>
        <SalesReportsTab dateRange={dateRange} />
      </TabPanel>
      <TabPanel value={activeTab} index={1}>
        <EventsReportsTab dateRange={dateRange} />
      </TabPanel>
      <TabPanel value={activeTab} index={2}>
        <CustomersReportsTab dateRange={dateRange} />
      </TabPanel>
      <TabPanel value={activeTab} index={3}>
        <OperationsReportsTab dateRange={dateRange} />
      </TabPanel>
      <TabPanel value={activeTab} index={4}>
        <BookingFlowTab dateRange={dateRange} />
      </TabPanel>
      <TabPanel value={activeTab} index={5}>
        <QuestionnairesTab dateRange={dateRange} />
      </TabPanel>
      <TabPanel value={activeTab} index={6}>
        <CommunicationsTab dateRange={dateRange} />
      </TabPanel>
    </ModernPageLayout>
  );
};

export default AnalyticsDashboard;
