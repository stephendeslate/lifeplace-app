// VIP & Loyalty Program Settings Page
// Orchestrator component — imports tab sub-components

import {
  Star as StarIcon,
  Settings as SettingsIcon,
  EmojiEvents as TierIcon,
  CardGiftcard as BenefitIcon,
} from '@mui/icons-material';
import { Box, Tab, Tabs } from '@mui/material';

import { ModernPageHeader, ModernSettingsLayout } from '@/components/common';

import { useVIPProgramLogic } from './useVIPProgramLogic';
import { TabPanel } from './TabPanel';
import { ProgramSettingsTab } from './ProgramSettingsTab';
import { TiersTab } from './TiersTab';
import { BenefitsTab } from './BenefitsTab';

export const VIPProgram = () => {
  const { activeTab, settings, handleTabChange } = useVIPProgramLogic();

  return (
    <ModernSettingsLayout>
      <ModernPageHeader
        title="VIP & Loyalty Program"
        subtitle="Configure VIP tiers, benefits, and loyalty rewards"
        icon={<StarIcon />}
        breadcrumbs={[{ label: 'Settings' }, { label: 'Commerce' }, { label: 'VIP & Loyalty' }]}
        stats={[
          {
            label: 'Program Status',
            value: settings?.is_program_enabled ? 'Enabled' : 'Disabled',
          },
        ]}
        size="medium"
      />

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="VIP program tabs">
          <Tab
            icon={<SettingsIcon />}
            iconPosition="start"
            label="Program Settings"
            id="vip-tab-0"
            aria-controls="vip-tabpanel-0"
          />
          <Tab
            icon={<TierIcon />}
            iconPosition="start"
            label="Tiers"
            id="vip-tab-1"
            aria-controls="vip-tabpanel-1"
          />
          <Tab
            icon={<BenefitIcon />}
            iconPosition="start"
            label="Benefits"
            id="vip-tab-2"
            aria-controls="vip-tabpanel-2"
          />
        </Tabs>
      </Box>

      <TabPanel value={activeTab} index={0}>
        <ProgramSettingsTab />
      </TabPanel>
      <TabPanel value={activeTab} index={1}>
        <TiersTab />
      </TabPanel>
      <TabPanel value={activeTab} index={2}>
        <BenefitsTab />
      </TabPanel>
    </ModernSettingsLayout>
  );
};

export default VIPProgram;
