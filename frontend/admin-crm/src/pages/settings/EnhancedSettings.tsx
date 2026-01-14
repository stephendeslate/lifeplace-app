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
import { ModernCard } from '../../components/common';
import { tokens } from '../../design-system';
import { glassPresets } from '../../design-system/utils/glassmorphism';

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
      <ModernCard
        animation="none"
        sx={{
          mb: 4,
          p: 4,
          ...glassPresets.light,
          border: `1px solid ${tokens.color.borders.glass}`,
          position: 'relative',
          
          // Gradient overlay
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(135deg, ${tokens.color.primary[500]}04 0%, ${tokens.color.secondary[500]}03 100%)`,
            borderRadius: tokens.spacing.radius.xl,
            pointerEvents: 'none',
          },
          
          '& > *': {
            position: 'relative',
            zIndex: 1,
          },
        }}
      >
        <Box display="flex" alignItems="center" gap={3}>
          <Box
            sx={{
              p: 2,
              borderRadius: tokens.spacing.radius.lg,
              background: `linear-gradient(135deg, ${tokens.color.primary[500]} 0%, ${tokens.color.primary[600]} 100%)`,
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
                background: `linear-gradient(135deg, ${tokens.color.primary[600]} 0%, ${tokens.color.secondary[600]} 100%)`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                mb: 1,
              }}
            >
              Settings
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                color: tokens.color.neutral[600],
                fontWeight: 500,
              }}
            >
              Configure your LifePlace experience
            </Typography>
          </Box>
        </Box>

      </ModernCard>


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
                  color: tokens.color.neutral[700],
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
                      variant="glass"
                      animation="none"
                    />
                  ))}
                </Box>
              </Box>
          ))}
        </Box>
      ) : (
        <ModernCard
          animation="none"
          sx={{
            p: 6,
            textAlign: 'center',
            ...glassPresets.light,
          }}
        >
          <Typography 
            variant="h6" 
            sx={{ 
              color: tokens.color.neutral[600],
              mb: 1,
            }}
          >
            No settings found
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              color: tokens.color.neutral[500],
            }}
          >
            No settings available
          </Typography>
        </ModernCard>
      )}
    </Box>
  );
};