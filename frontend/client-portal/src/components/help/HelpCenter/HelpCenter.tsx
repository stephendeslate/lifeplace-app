import React from 'react';
import { Box, Tabs, Tab, alpha, useTheme } from '@mui/material';
import {
  QuestionAnswer as FAQIcon,
  VideoLibrary as TutorialIcon,
  Article as GuideIcon,
} from '@mui/icons-material';
import { GlassCard } from '@/design-system/components/GlassCard';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';
import { useHelpCenterLogic } from './useHelpCenterLogic';
import { HelpSearchBar } from './HelpSearchBar';
import { CategoryList } from './CategoryList';
import { TabPanel } from './TabPanel';
import { FAQTab } from './FAQTab';
import { GuidesTab } from './GuidesTab';
import { TutorialsTab } from './TutorialsTab';
import { ContactSupport } from './ContactSupport';

export const HelpCenter: React.FC = () => {
  const theme = useTheme();
  const {
    activeTab,
    searchQuery,
    setSearchQuery,
    expandedAccordion,
    handleAccordionChange,
    handleTabChange,
    handleHelpfulClick,
    filteredContent,
  } = useHelpCenterLogic();

  return (
    <Box sx={{ p: 3 }}>
      <HelpSearchBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      <CategoryList />

      <AnimatedElement animation="slideUp" delay={300}>
        <GlassCard
          variant="light"
          intensity="medium"
          sx={{
            backgroundColor: alpha('#fff', 0.08),
            backdropFilter: 'blur(20px)',
            border: `1px solid ${alpha('#fff', 0.1)}`,
          }}
        >
          <Box sx={{ borderBottom: 1, borderColor: alpha('#fff', 0.1) }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              centered
              sx={{
                '& .MuiTab-root': {
                  color: alpha('#fff', 0.7),
                  '&.Mui-selected': {
                    color: theme.palette.primary.main,
                  },
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: theme.palette.primary.main,
                },
              }}
            >
              <Tab
                label={`FAQs (${filteredContent.faqs.length})`}
                icon={<FAQIcon />}
                iconPosition="start"
              />
              <Tab
                label={`Guides (${filteredContent.articles.length})`}
                icon={<GuideIcon />}
                iconPosition="start"
              />
              <Tab
                label={`Tutorials (${filteredContent.tutorials.length})`}
                icon={<TutorialIcon />}
                iconPosition="start"
              />
            </Tabs>
          </Box>

          <TabPanel value={activeTab} index={0}>
            <Box sx={{ p: 3 }}>
              <FAQTab
                faqs={filteredContent.faqs}
                expandedAccordion={expandedAccordion}
                onAccordionChange={handleAccordionChange}
                onHelpfulClick={handleHelpfulClick}
              />
            </Box>
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            <Box sx={{ p: 3 }}>
              <GuidesTab articles={filteredContent.articles} />
            </Box>
          </TabPanel>

          <TabPanel value={activeTab} index={2}>
            <Box sx={{ p: 3 }}>
              <TutorialsTab tutorials={filteredContent.tutorials} />
            </Box>
          </TabPanel>
        </GlassCard>
      </AnimatedElement>

      <ContactSupport />
    </Box>
  );
};
