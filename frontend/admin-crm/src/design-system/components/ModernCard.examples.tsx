// ModernCard Component Examples
// Comprehensive usage examples and documentation

import React from 'react';
import { Typography, Stack, Box } from '@mui/material';
import { ModernCard, migrateGlassCardProps } from './ModernCard';
import type { CardVariant } from './ModernCard';

/**
 * Example 1: Basic Card Usage
 * Shows the default elevated card with medium size
 */
export const BasicCardExample: React.FC = () => (
  <ModernCard>
    <Typography variant="h6" gutterBottom>
      Basic Card
    </Typography>
    <Typography variant="body2" color="text.secondary">
      This is a basic elevated card with default medium size and no hover effects.
    </Typography>
  </ModernCard>
);

/**
 * Example 2: All Card Variants
 * Demonstrates all six card variants side by side
 */
export const AllVariantsExample: React.FC = () => {
  const variants: CardVariant[] = ['subtle', 'elevated', 'warm', 'terracotta', 'sage', 'outlined'];

  return (
    <Stack spacing={3}>
      <Typography variant="h5">Card Variants</Typography>
      <Stack spacing={2}>
        {variants.map((variant) => (
          <ModernCard key={variant} variant={variant} hover>
            <Typography variant="h6" gutterBottom sx={{ textTransform: 'capitalize' }}>
              {variant} Card
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This card uses the "{variant}" variant with hover effects enabled.
            </Typography>
          </ModernCard>
        ))}
      </Stack>
    </Stack>
  );
};

/**
 * Example 3: Card Sizes
 * Shows small, medium, and large card sizes
 */
export const CardSizesExample: React.FC = () => (
  <Stack spacing={3}>
    <Typography variant="h5">Card Sizes</Typography>

    <ModernCard variant="elevated" size="small" hover>
      <Typography variant="body2" fontWeight={600}>
        Small Card (16px padding)
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Compact card for tight layouts
      </Typography>
    </ModernCard>

    <ModernCard variant="elevated" size="medium" hover>
      <Typography variant="h6">Medium Card (24px padding)</Typography>
      <Typography variant="body2" color="text.secondary">
        Default card size for most use cases
      </Typography>
    </ModernCard>

    <ModernCard variant="elevated" size="large" hover>
      <Typography variant="h5" gutterBottom>
        Large Card (32px padding)
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Generous spacing for important content or feature sections
      </Typography>
    </ModernCard>
  </Stack>
);

/**
 * Example 4: Clickable Cards
 * Demonstrates clickable cards with enhanced hover effects
 */
export const ClickableCardsExample: React.FC = () => {
  const [selectedCard, setSelectedCard] = React.useState<string | null>(null);

  return (
    <Stack spacing={3}>
      <Typography variant="h5">Clickable Cards</Typography>
      <Typography variant="body2" color="text.secondary">
        Selected: {selectedCard || 'None'}
      </Typography>

      <Stack direction="row" spacing={2} flexWrap="wrap">
        {['Option 1', 'Option 2', 'Option 3'].map((option) => (
          <ModernCard
            key={option}
            variant={selectedCard === option ? 'sage' : 'elevated'}
            clickable
            onClick={() => setSelectedCard(option)}
            sx={{ flex: 1, minWidth: '200px' }}
          >
            <Typography variant="h6" align="center">
              {option}
            </Typography>
          </ModernCard>
        ))}
      </Stack>
    </Stack>
  );
};

/**
 * Example 5: Dashboard Stats Cards
 * Real-world example of using cards for dashboard metrics
 */
export const DashboardStatsExample: React.FC = () => (
  <Stack spacing={3}>
    <Typography variant="h5">Dashboard Stats</Typography>

    <Stack direction="row" spacing={2} flexWrap="wrap">
      <ModernCard variant="sage" size="small" hover sx={{ flex: 1, minWidth: '200px' }}>
        <Typography variant="overline" color="text.secondary">
          Total Revenue
        </Typography>
        <Typography variant="h4" fontWeight={700} color="success.dark">
          $48,352
        </Typography>
        <Typography variant="caption" color="success.main">
          +12.5% from last month
        </Typography>
      </ModernCard>

      <ModernCard variant="warm" size="small" hover sx={{ flex: 1, minWidth: '200px' }}>
        <Typography variant="overline" color="text.secondary">
          Active Events
        </Typography>
        <Typography variant="h4" fontWeight={700} color="warning.dark">
          24
        </Typography>
        <Typography variant="caption" color="warning.main">
          6 this week
        </Typography>
      </ModernCard>

      <ModernCard variant="terracotta" size="small" hover sx={{ flex: 1, minWidth: '200px' }}>
        <Typography variant="overline" color="text.secondary">
          Pending Tasks
        </Typography>
        <Typography variant="h4" fontWeight={700} color="error.dark">
          12
        </Typography>
        <Typography variant="caption" color="error.main">
          3 overdue
        </Typography>
      </ModernCard>

      <ModernCard variant="elevated" size="small" hover sx={{ flex: 1, minWidth: '200px' }}>
        <Typography variant="overline" color="text.secondary">
          New Clients
        </Typography>
        <Typography variant="h4" fontWeight={700} color="primary.main">
          8
        </Typography>
        <Typography variant="caption" color="primary.main">
          +2 this week
        </Typography>
      </ModernCard>
    </Stack>
  </Stack>
);

/**
 * Example 6: Content Card with Actions
 * Complex card with header, content, and actions
 */
export const ContentCardExample: React.FC = () => (
  <ModernCard variant="elevated" size="medium" hover>
    <Stack spacing={2}>
      <Box>
        <Typography variant="h6" gutterBottom>
          Wedding Planning Checklist
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Last updated 2 hours ago
        </Typography>
      </Box>

      <Typography variant="body2" color="text.secondary">
        Track your wedding planning progress with our comprehensive checklist. From venue selection
        to final touches, we've got you covered.
      </Typography>

      <Stack direction="row" spacing={1} sx={{ pt: 1 }}>
        <Box
          component="button"
          sx={{
            px: 2,
            py: 1,
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'primary.main',
            color: 'white',
            fontWeight: 600,
            cursor: 'pointer',
            '&:hover': {
              backgroundColor: 'primary.dark',
            },
          }}
        >
          View Checklist
        </Box>
        <Box
          component="button"
          sx={{
            px: 2,
            py: 1,
            borderRadius: '8px',
            border: '1px solid',
            borderColor: 'divider',
            backgroundColor: 'transparent',
            fontWeight: 600,
            cursor: 'pointer',
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          }}
        >
          Share
        </Box>
      </Stack>
    </Stack>
  </ModernCard>
);

/**
 * Example 7: Migration from GlassCard
 * Shows how to migrate from GlassCard to ModernCard
 */
export const MigrationExample: React.FC = () => {
  // Old GlassCard props
  const oldGlassCardProps = {
    variant: 'success' as const,
    hover: true,
    clickable: true,
    onClick: () => console.log('Clicked!'),
  };

  // Migrate to ModernCard props
  const modernCardProps = migrateGlassCardProps(oldGlassCardProps);

  return (
    <Stack spacing={3}>
      <Typography variant="h5">Migration Example</Typography>

      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Old GlassCard (variant: "success"):
        </Typography>
        <Typography variant="caption" component="pre" color="text.secondary">
          {JSON.stringify(oldGlassCardProps, null, 2)}
        </Typography>
      </Box>

      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Migrated ModernCard props:
        </Typography>
        <Typography variant="caption" component="pre" color="text.secondary">
          {JSON.stringify({ ...modernCardProps, children: undefined }, null, 2)}
        </Typography>
      </Box>

      <ModernCard {...modernCardProps}>
        <Typography variant="h6">Migrated Card</Typography>
        <Typography variant="body2" color="text.secondary">
          This card was automatically migrated from GlassCard "success" variant to ModernCard "sage"
          variant.
        </Typography>
      </ModernCard>
    </Stack>
  );
};

/**
 * Example 8: Outlined Cards for Forms
 * Using outlined variant for form sections
 */
export const FormSectionExample: React.FC = () => (
  <Stack spacing={2}>
    <Typography variant="h5">Form Sections</Typography>

    <ModernCard variant="outlined" size="medium">
      <Stack spacing={2}>
        <Typography variant="h6">Personal Information</Typography>
        <Typography variant="body2" color="text.secondary">
          Please provide your basic contact details below.
        </Typography>
        {/* Form fields would go here */}
      </Stack>
    </ModernCard>

    <ModernCard variant="outlined" size="medium">
      <Stack spacing={2}>
        <Typography variant="h6">Event Details</Typography>
        <Typography variant="body2" color="text.secondary">
          Tell us about your event preferences and requirements.
        </Typography>
        {/* Form fields would go here */}
      </Stack>
    </ModernCard>
  </Stack>
);

/**
 * Complete showcase component with all examples
 */
export const ModernCardShowcase: React.FC = () => (
  <Stack spacing={6} sx={{ p: 4, maxWidth: '1200px', mx: 'auto' }}>
    <Box>
      <Typography variant="h3" gutterBottom>
        ModernCard Component
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        A sophisticated card component using the Modern Organic Luxury design system. Clean, subtle
        elevation replaces heavy glassmorphism for a refined, professional appearance.
      </Typography>
    </Box>

    <BasicCardExample />
    <AllVariantsExample />
    <CardSizesExample />
    <ClickableCardsExample />
    <DashboardStatsExample />
    <ContentCardExample />
    <FormSectionExample />
    <MigrationExample />
  </Stack>
);

export default ModernCardShowcase;
