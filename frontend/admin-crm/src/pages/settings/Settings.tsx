// frontend/admin-crm/src/pages/settings/Settings.tsx

import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Divider,
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

  const handleItemClick = (path: string) => {
    navigate(path);
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
          {settingsNavigationConfig.map((group) => (
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
                <CardContent sx={{ p: 3, height: '100%' }}>
                  <Box display="flex" flexDirection="column" height="100%">
                    {/* Header */}
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                      <Typography variant="h6" fontWeight="bold">
                        {group.label}
                      </Typography>
                    </Box>

                    {/* Items List */}
                    <Box sx={{ flex: 1 }}>
                      {group.items.map((item, index) => (
                        <Box key={item.id}>
                          <Button
                            fullWidth
                            onClick={() => handleItemClick(item.path)}
                            sx={{
                              justifyContent: 'space-between',
                              p: 2,
                              mb: index < group.items.length - 1 ? 1 : 0,
                              bgcolor: 'transparent',
                              border: 1,
                              borderColor: 'divider',
                              borderRadius: 1,
                              color: 'text.primary',
                              '&:hover': {
                                bgcolor: 'action.hover',
                                borderColor: 'primary.main',
                              },
                            }}
                          >
                            <Box sx={{ textAlign: 'left', flex: 1 }}>
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
                                  sx={{ display: 'block', textAlign: 'left' }}
                                >
                                  {item.description}
                                </Typography>
                              )}
                            </Box>
                            <ChevronRight color="action" sx={{ ml: 1 }} />
                          </Button>
                        </Box>
                      ))}
                    </Box>

                    {/* Footer */}
                    <Box sx={{ mt: 2, pt: 2 }}>
                      <Divider sx={{ mb: 2 }} />
                      <Typography variant="caption" color="text.secondary">
                        {group.items.length} setting{group.items.length !== 1 ? 's' : ''} available
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};