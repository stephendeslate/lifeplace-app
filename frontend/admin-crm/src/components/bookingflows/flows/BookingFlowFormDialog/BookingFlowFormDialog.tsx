// frontend/admin-crm/src/components/bookingflows/flows/BookingFlowFormDialog/BookingFlowFormDialog.tsx

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  CircularProgress,
  Tabs,
  Tab,
} from '@mui/material';
import {
  EventNote as FlowIcon,
  Settings as ConfigIcon,
  Analytics as AnalyticsIcon,
  Email as EmailIcon,
  Payment as PaymentIcon,
} from '@mui/icons-material';
import type { BookingFlowFormDialogProps } from '@/types/bookingflows';
import { useBookingFlowFormLogic } from './useBookingFlowFormLogic';
import { BasicInfoTab } from './BasicInfoTab';
import { ConfigurationTab } from './ConfigurationTab';
import { PaymentTab } from './PaymentTab';
import { TemplatesTab } from './TemplatesTab';
import { AdvancedTab } from './AdvancedTab';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`booking-flow-tabpanel-${index}`}
    aria-labelledby={`booking-flow-tab-${index}`}
    {...other}
  >
    {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
  </div>
);

export const BookingFlowFormDialog: React.FC<BookingFlowFormDialogProps> = (props) => {
  const { open, editingFlow, isLoading } = props;

  const {
    formData,
    errors,
    activeTab,
    firstInputRef,
    submitButtonRef,
    isLoadingDependencies,
    eventTypesData,
    workflowTemplatesData,
    emailTemplatesData,
    discountsData,
    paymentGatewaysData,
    handleInputChange,
    handleSwitchChange,
    handleMultiSelectChange,
    handleTabChange,
    handleClose,
    handleSubmit,
    handleKeyDown,
  } = useBookingFlowFormLogic(props);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          minHeight: '80vh',
          borderRadius: 1,
          bgcolor: 'background.paper',
        },
        onKeyDown: handleKeyDown,
      }}
      disableRestoreFocus={false}
      disableEnforceFocus={false}
      keepMounted={false}
      aria-labelledby="booking-flow-dialog-title"
      aria-describedby="booking-flow-dialog-description"
    >
      {open && (
        <>
          <DialogTitle id="booking-flow-dialog-title">
            <Box display="flex" alignItems="center" gap={1}>
              <FlowIcon color="primary" />
              {editingFlow ? 'Edit Booking Flow' : 'Create New Booking Flow'}
            </Box>
          </DialogTitle>

          <DialogContent id="booking-flow-dialog-description">
            {isLoadingDependencies ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : (
              <Box sx={{ mt: 1 }}>
                {/* Tab Navigation */}
                <Tabs
                  value={activeTab}
                  onChange={handleTabChange}
                  variant="scrollable"
                  scrollButtons="auto"
                >
                  <Tab icon={<FlowIcon />} label="Basic Info" iconPosition="start" />
                  <Tab icon={<ConfigIcon />} label="Configuration" iconPosition="start" />
                  <Tab icon={<PaymentIcon />} label="Payment" iconPosition="start" />
                  <Tab icon={<EmailIcon />} label="Templates" iconPosition="start" />
                  <Tab icon={<AnalyticsIcon />} label="Advanced" iconPosition="start" />
                </Tabs>

                <TabPanel value={activeTab} index={0}>
                  <BasicInfoTab
                    formData={formData}
                    errors={errors}
                    firstInputRef={firstInputRef}
                    eventTypesData={eventTypesData}
                    handleInputChange={handleInputChange}
                    handleSwitchChange={handleSwitchChange}
                  />
                </TabPanel>

                <TabPanel value={activeTab} index={1}>
                  <ConfigurationTab
                    formData={formData}
                    errors={errors}
                    discountsData={discountsData}
                    handleInputChange={handleInputChange}
                    handleSwitchChange={handleSwitchChange}
                    handleMultiSelectChange={handleMultiSelectChange}
                  />
                </TabPanel>

                <TabPanel value={activeTab} index={2}>
                  <PaymentTab
                    formData={formData}
                    errors={errors}
                    paymentGatewaysData={paymentGatewaysData}
                    handleInputChange={handleInputChange}
                    handleSwitchChange={handleSwitchChange}
                    handleMultiSelectChange={handleMultiSelectChange}
                  />
                </TabPanel>

                <TabPanel value={activeTab} index={3}>
                  <TemplatesTab
                    formData={formData}
                    workflowTemplatesData={workflowTemplatesData}
                    emailTemplatesData={emailTemplatesData}
                    handleInputChange={handleInputChange}
                  />
                </TabPanel>

                <TabPanel value={activeTab} index={4}>
                  <AdvancedTab formData={formData} handleInputChange={handleInputChange} />
                </TabPanel>
              </Box>
            )}
          </DialogContent>

          <DialogActions sx={{ p: 3 }}>
            <Button onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              ref={submitButtonRef}
              onClick={handleSubmit}
              variant="contained"
              disabled={isLoading || isLoadingDependencies}
              startIcon={isLoading ? <CircularProgress size={20} /> : undefined}
            >
              {isLoading ? 'Saving...' : editingFlow ? 'Update Flow' : 'Create Flow'}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};
