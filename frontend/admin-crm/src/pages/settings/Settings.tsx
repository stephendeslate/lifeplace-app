// frontend/admin-crm/src/pages/settings/Settings.tsx

import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Chip,
} from '@mui/material';
import { Settings as SettingsIcon, ChevronRight } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useLayout } from '../../contexts/LayoutContext';
import { settingsNavigationConfig } from '../../config/settings-navigation';

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { setBreadcrumbs } = useLayout();

  // Set breadcrumbs for settings dashboard
  useEffect(() => {
    setBreadcrumbs([
      { label: 'Settings', path: '/settings' },
    ]);
  }, [setBreadcrumbs]);

  const handleCategoryClick = (path: string) => {
    navigate(path);
  };

  const getImplementationStatus = (groupId: string) => {
    if (groupId === 'account') {
      // Account Settings is ready, Admin Users is coming soon
      return { label: 'Partial', color: 'info' as const };
    }
    return { label: 'Coming Soon', color: 'warning' as const };
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <SettingsIcon color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h4" component="h1" fontWeight="bold">
              Settings
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Configure your LifePlace admin dashboard and system preferences
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Settings Categories */}
      <Box 
        sx={{ 
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 3,
          }}
        >
          {settingsNavigationConfig.map((group) => {
            const status = getImplementationStatus(group.id);
            
            return (
              <Box 
                key={group.id}
                sx={{ 
                  flex: { xs: '1 1 100%', md: '1 1 calc(50% - 12px)', lg: '1 1 calc(33.333% - 16px)' },
                  minWidth: 300,
                }}
              >
              <Card 
                elevation={2}
                sx={{ 
                  height: '100%',
                  transition: 'all 0.2s',
                  '&:hover': {
                    boxShadow: 4,
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                <CardActionArea 
                  onClick={() => handleCategoryClick(group.items[0]?.path || '/settings')}
                  sx={{ height: '100%' }}
                >
                  <CardContent sx={{ p: 3, height: '100%' }}>
                    <Box display="flex" flexDirection="column" height="100%">
                      {/* Header */}
                      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                        <Typography variant="h6" fontWeight="bold">
                          {group.label}
                        </Typography>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Chip
                            label={status.label}
                            size="small"
                            color={status.color}
                            variant="outlined"
                          />
                          <ChevronRight color="action" />
                        </Box>
                      </Box>

                      {/* Items List */}
                      <Box sx={{ flex: 1 }}>
                        {group.items.map((item, index) => (
                          <Box 
                            key={item.id}
                            sx={{ 
                              mb: index < group.items.length - 1 ? 1 : 0,
                              pb: index < group.items.length - 1 ? 1 : 0,
                              borderBottom: index < group.items.length - 1 ? 1 : 0,
                              borderColor: 'divider',
                            }}
                          >
                            <Typography 
                              variant="body2" 
                              fontWeight="medium"
                              sx={{ mb: 0.5 }}
                            >
                              {item.label}
                            </Typography>
                            {item.description && (
                              <Typography 
                                variant="caption" 
                                color="text.secondary"
                                sx={{ display: 'block' }}
                              >
                                {item.description}
                              </Typography>
                            )}
                          </Box>
                        ))}
                      </Box>

                      {/* Footer */}
                      <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                        <Typography variant="caption" color="text.secondary">
                          {group.items.length} setting{group.items.length !== 1 ? 's' : ''} available
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Box>
          );
        })}
        </Box>
      </Box>
    </Box>
  );
};