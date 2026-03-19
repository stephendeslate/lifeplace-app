import React from 'react';
import { Alert, Button } from '@mui/material';
import {
  Add as AddIcon,
  EventNote as EventIcon,
  Refresh as RefreshIcon,
  FileDownload as ExportIcon,
} from '@mui/icons-material';
import { format, startOfWeek as startOfWeekDate, endOfWeek as endOfWeekDate } from 'date-fns';
import { formatInManila } from '@/utils/timezone';
import { useNavigate } from 'react-router-dom';
import { ModernPageLayout } from '@/components/common/ModernPageLayout';
import { ModernPageHeader, type HeaderAction } from '@/components/common/ModernPageHeader';
import ModernLoadingStates from '@/components/common/ModernLoadingStates';

import { useCalendarLogic } from './useCalendarLogic';
import { CalendarControls } from './CalendarControls';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { CalendarLegend } from './CalendarLegend';
import { CalendarDialogs } from './CalendarDialogs';

export const EnterpriseEventsCalendar: React.FC = () => {
  const navigate = useNavigate();
  const logic = useCalendarLogic();

  // Build header actions
  const primaryAction: HeaderAction = {
    icon: <AddIcon />,
    label: 'Add Event',
    onClick: () => logic.setCreateDialogOpen(true),
    variant: 'contained',
  };

  const secondaryActions: HeaderAction[] = [
    {
      icon: <RefreshIcon />,
      label: logic.isLoadingAvailability ? 'Refreshing...' : 'Refresh',
      onClick: logic.handleRefresh,
      variant: 'outlined',
      disabled: logic.isLoadingAvailability,
    },
    {
      icon: <ExportIcon />,
      label: 'Export',
      onClick: logic.handleExport,
      variant: 'outlined',
    },
  ];

  // Loading state
  if (logic.isLoadingEvents && !logic.events.length) {
    return (
      <ModernPageLayout backgroundPattern="default">
        <ModernLoadingStates.ModernLoadingSpinner
          size={40}
          message="Loading calendar..."
          variant="circular"
        />
      </ModernPageLayout>
    );
  }

  return (
    <ModernPageLayout backgroundPattern="default">
      {/* Modern Header */}
      <ModernPageHeader
        title="Calendar"
        subtitle={
          logic.view === 'month'
            ? formatInManila(logic.currentDate, 'MMMM yyyy')
            : `Week of ${format(startOfWeekDate(logic.currentDate), 'MMM d')} - ${format(endOfWeekDate(logic.currentDate), 'MMM d, yyyy')}`
        }
        icon={<EventIcon />}
        primaryAction={primaryAction}
        secondaryActions={secondaryActions}
        size="medium"
      />

      {/* Availability Error Alert */}
      {logic.availabilityError && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Unable to load availability data. Some features may be limited.
          <Button size="small" onClick={() => logic.refetchAvailability()} sx={{ ml: 1 }}>
            Retry
          </Button>
        </Alert>
      )}

      {/* Calendar Controls */}
      <CalendarControls
        currentDate={logic.currentDate}
        view={logic.view}
        searchValue={logic.searchValue}
        setSearchValue={logic.setSearchValue}
        filtersOpen={logic.filtersOpen}
        setFiltersOpen={logic.setFiltersOpen}
        filters={logic.filters}
        availabilityFilters={logic.availabilityFilters}
        eventTypes={logic.eventTypes}
        hasActiveFilters={logic.hasActiveFilters}
        onPrevious={logic.handlePrevious}
        onNext={logic.handleNext}
        onToday={logic.handleToday}
        onViewChange={logic.handleViewChange}
        onFilterChange={logic.handleFilterChange}
        onAvailabilityFilterChange={logic.handleAvailabilityFilterChange}
        onClearFilters={() => {
          logic.handleFilterChange('status', 'all');
          logic.handleFilterChange('event_type', 'all');
          logic.handleAvailabilityFilterChange('show_conflicts', 'all');
          logic.setSearchValue('');
        }}
      />

      {/* Calendar View */}
      {logic.view === 'month' ? (
        <MonthView
          enhancedCalendarDates={logic.enhancedCalendarDates}
          isMobile={logic.isMobile}
          showAvailabilityIndicators={logic.settings.showAvailabilityIndicators}
          getEventsForDate={logic.getEventsForDate}
          getDateCellStyle={logic.getDateCellStyle}
          getStatusColor={logic.getStatusColor}
          getEventTime={logic.getEventTime}
          onDateSelect={logic.handleDateSelect}
          onEventClick={logic.handleEventClick}
          onDateClick={(dateStr) => logic.setSelectedDate(dateStr)}
        />
      ) : (
        <WeekView
          enhancedCalendarDates={logic.enhancedCalendarDates}
          showAvailabilityIndicators={logic.settings.showAvailabilityIndicators}
          getEventsForDate={logic.getEventsForDate}
          getStatusColor={logic.getStatusColor}
          getEventTime={logic.getEventTime}
          onDateSelect={logic.handleDateSelect}
          onEventClick={logic.handleEventClick}
          onMenuOpen={logic.handleMenuOpen}
          onAvailabilityDetailOpen={() => logic.setAvailabilityDetailOpen(true)}
        />
      )}

      {/* Legend */}
      <CalendarLegend
        showAvailabilityIndicators={logic.settings.showAvailabilityIndicators}
        getStatusColor={logic.getStatusColor}
      />

      {/* Dialogs */}
      <CalendarDialogs
        createDialogOpen={logic.createDialogOpen}
        onCloseCreateDialog={() => logic.setCreateDialogOpen(false)}
        isCreatingEvent={logic.isCreatingEvent}
        onCreateEvent={logic.createEvent}
        menuAnchor={logic.menuAnchor}
        selectedEvent={logic.selectedEvent}
        onMenuClose={logic.handleMenuClose}
        onNavigateToEvent={(id) => navigate(`/events/${id}`)}
        availabilityDetailOpen={logic.availabilityDetailOpen}
        onCloseAvailabilityDetail={() => logic.setAvailabilityDetailOpen(false)}
        selectedDate={logic.selectedDate}
        getDateAvailability={logic.getDateAvailability}
        settingsOpen={logic.settingsOpen}
        onCloseSettings={() => logic.setSettingsOpen(false)}
        settings={logic.settings}
        onSettingChange={logic.handleSettingChange}
      />
    </ModernPageLayout>
  );
};

export default EnterpriseEventsCalendar;
