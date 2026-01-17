import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
} from '@mui/material';
import {
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useLayout } from '../../contexts/LayoutContext';
import { settingsNavigationConfig } from '../../config/settings-navigation';
import { SmartCard, SmartCardSkeleton } from '../../components/settings/SmartCard';

export const EnhancedSettings: React.FC = () => {
  const navigate = useNavigate();
  const { setBreadcrumbs } = useLayout();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Settings' },
    ]);

    // Simulate loading
    setTimeout(() => setLoading(false), 300);
  }, [setBreadcrumbs]);

  const handleItemClick = (path: string) => {
    navigate(path);
  };

  const filteredGroups = settingsNavigationConfig;

  return (
    <Box>
      {/* Clean Header Section */}
      <Box sx={{ mb: 4, p: 4, borderRadius: 1, bgcolor: 'background.paper' }}>
        <Box display="flex" alignItems="center" gap={3}>
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SettingsIcon sx={{ fontSize: 32, color: 'white' }} />
          </Box>

          <Box>
            <Typography
              variant="h3"
              component="h1"
              sx={{
                fontWeight: 700,
                color: 'text.primary',
                mb: 1,
              }}
            >
              Settings
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ fontWeight: 500 }}
            >
              Configure your LifePlace experience
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Clean Settings Grid */}
      {loading ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              lg: 'repeat(3, 1fr)',
            },
            gap: 3,
          }}
        >
          {[1, 2, 3, 4, 5, 6].map(i => (
            <SmartCardSkeleton key={i} />
          ))}
        </Box>
      ) : filteredGroups.length > 0 ? (
        <Box>
          {filteredGroups.map((group) => (
            <Box key={group.id} sx={{ mb: 4 }}>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  mb: 3,
                  color: 'text.primary',
                }}
              >
                {group.label}
              </Typography>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, 1fr)',
                    lg: 'repeat(3, 1fr)',
                  },
                  gap: 3,
                }}
              >
                {group.items.map((item) => (
                  <SmartCard
                    key={item.id}
                    id={item.id}
                    title={item.label}
                    description={item.description}
                    icon={item.icon}
                    onClick={() => handleItemClick(item.path)}
                    variant="outlined"
                    animation="none"
                  />
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      ) : (
        <Box sx={{ p: 6, textAlign: 'center', borderRadius: 1, bgcolor: 'background.paper' }}>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            No settings found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No settings available
          </Typography>
        </Box>
      )}
    </Box>
  );
};
