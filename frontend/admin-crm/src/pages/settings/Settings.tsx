// frontend/admin-crm/src/pages/settings/Settings.tsx

import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Divider,
} from '@mui/material';
import { ChevronRight } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useLayout } from '../../contexts/LayoutContext';
import { settingsNavigationConfig } from '../../config/settings-navigation';

// Modern Design System imports
import { ModernSettingsLayout } from '../../components/common/ModernPageLayout';
import { ModernCard } from '../../components/common/ModernCard';
import { tokens } from '../../design-system';
import { glassPresets } from '../../design-system/utils/glassmorphism';

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { setBreadcrumbs } = useLayout();

  // Set breadcrumbs for settings dashboard
  useEffect(() => {
    setBreadcrumbs([
      { label: 'Settings' },
    ]);
  }, [setBreadcrumbs]);

  const handleItemClick = (path: string) => {
    navigate(path);
  };

  return (
    <ModernSettingsLayout>
      {/* Settings Categories */}
      <Box 
        sx={{ 
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
        }}
      >
        {settingsNavigationConfig.map((group) => (
          <Box 
            key={group.id}
            sx={{ 
              flex: { xs: '1 1 100%', md: '1 1 calc(50% - 16px)', lg: '1 1 calc(33.333% - 24px)' },
              minWidth: 320,
            }}
          >
            <ModernCard
              variant="glass"
              size="large"
              color="primary"
              animation="none"
              title={group.label}
              sx={{
                height: '100%',
                '&::before': {
                  background: `linear-gradient(135deg, ${tokens.color.primary[500]}06 0%, ${tokens.color.primary[600]}04 100%)`,
                },
                '&:hover': {
                  transform: 'translateY(-4px)',
                  '&::before': {
                    background: `linear-gradient(135deg, ${tokens.color.primary[500]}08 0%, ${tokens.color.primary[600]}06 100%)`,
                  },
                },
              }}
            >
              <Box display="flex" flexDirection="column" height="100%">
                {/* Items List */}
                <Box sx={{ flex: 1, mb: 3 }}>
                  {group.items.map((item, index) => (
                    <Button
                      key={item.id}
                      fullWidth
                      onClick={() => handleItemClick(item.path)}
                      sx={{
                        justifyContent: 'space-between',
                        p: 2.5,
                        mb: index < group.items.length - 1 ? 2 : 0,
                        ...glassPresets.light,
                        borderRadius: tokens.spacing.radius.lg,
                        border: `1px solid ${tokens.color.borders.glass}`,
                        color: tokens.color.neutral[800],
                        textTransform: 'none',
                        '&:hover': {
                          ...glassPresets.medium,
                          border: `1px solid ${tokens.color.primary[300]}`,
                          transform: 'translateY(-1px)',
                          boxShadow: `0 8px 32px ${tokens.color.primary[500]}15`,
                        },
                        '&:active': {
                          transform: 'translateY(0)',
                        },
                      }}
                    >
                      <Box sx={{ textAlign: 'left', flex: 1 }}>
                        <Typography 
                          variant="body2" 
                          fontWeight="600"
                          sx={{ 
                            mb: 0.5,
                            color: tokens.color.neutral[800],
                          }}
                        >
                          {item.label}
                        </Typography>
                        {item.description && (
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              display: 'block', 
                              textAlign: 'left',
                              color: tokens.color.neutral[600],
                              lineHeight: 1.4,
                            }}
                          >
                            {item.description}
                          </Typography>
                        )}
                      </Box>
                      <ChevronRight 
                        sx={{ 
                          ml: 2, 
                          color: tokens.color.primary[600],
                          transition: 'transform 0.2s ease',
                        }} 
                      />
                    </Button>
                  ))}
                </Box>

                {/* Footer */}
                <Box sx={{ pt: 2 }}>
                  <Divider sx={{ 
                    mb: 2, 
                    borderColor: tokens.color.borders.glass,
                    opacity: 0.6,
                  }} />
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: tokens.color.neutral[600],
                      fontWeight: 500,
                    }}
                  >
                    {group.items.length} setting{group.items.length !== 1 ? 's' : ''} available
                  </Typography>
                </Box>
              </Box>
            </ModernCard>
          </Box>
        ))}
      </Box>
    </ModernSettingsLayout>
  );
};