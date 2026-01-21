# LifePlace Admin CRM Design System

**Version:** 1.0.0

A comprehensive glassmorphic design system for building consistent, modern, and cohesive UI components across the LifePlace Admin CRM application.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Design Tokens](#design-tokens)
3. [Layout Components](#layout-components)
4. [Card Components](#card-components)
5. [Header Components](#header-components)
6. [Dialog Components](#dialog-components)
7. [Glass Effects](#glass-effects)
8. [Button Patterns](#button-patterns)
9. [Form Field Patterns](#form-field-patterns)
10. [Table Patterns](#table-patterns)
11. [Animation Patterns](#animation-patterns)
12. [Migration Guide](#migration-guide)

---

## Quick Start

### Basic Imports

```tsx
// Core design tokens
import { tokens } from '../../design-system';

// Glass effects utilities
import { glassPresets } from '../../design-system/utils/glassmorphism';

// Animation utilities
import { createTransition } from '../../design-system/utils/animations';

// Layout components
import { ModernPageLayout, ModernSettingsLayout, ModernDashboardLayout } from '../../components/common/ModernPageLayout';

// Card components
import { ModernCard, ModernGlassCard, ModernMetricCard } from '../../components/common/ModernCard';

// Header component
import { ModernPageHeader, createRefreshAction, createAddAction } from '../../components/common/ModernPageHeader';

// Dialog component
import { ModernDialog, createStandardActions, createDeleteActions } from '../../components/common/ModernDialog';

// Empty state component
import { ModernEmptyState } from '../../components/common/ModernEmptyState';

// Table component
import { ModernTable } from '../../components/common';
```

---

## Design Tokens

### Color Tokens

Access colors via `tokens.color`:

```tsx
// Primary colors (blue scale)
tokens.color.primary[50]   // Lightest
tokens.color.primary[100]
tokens.color.primary[200]
tokens.color.primary[300]
tokens.color.primary[400]
tokens.color.primary[500]  // Base
tokens.color.primary[600]
tokens.color.primary[700]
tokens.color.primary[800]
tokens.color.primary[900]  // Darkest

// Other color scales: secondary, success, warning, error, info, neutral

// Glass colors
tokens.color.glass.light
tokens.color.glass.medium
tokens.color.glass.primaryGlass
tokens.color.glass.successGlass
tokens.color.glass.warningGlass
tokens.color.glass.errorGlass

// Border colors
tokens.color.borders.glass
tokens.color.borders.subtle
tokens.color.borders.primary
tokens.color.borders.success
tokens.color.borders.warning
tokens.color.borders.error

// Background gradients
tokens.color.backgrounds.primaryGradient
```

### Spacing Tokens

Access spacing via `tokens.spacing`:

```tsx
// Border radius
tokens.spacing.radius.sm    // 4px
tokens.spacing.radius.md    // 8px
tokens.spacing.radius.lg    // 12px
tokens.spacing.radius.xl    // 16px
tokens.spacing.radius.xxl   // 20px
tokens.spacing.radius.xxxl  // 28px
tokens.spacing.radius.full  // 9999px (pill shape)
```

### Shadow Tokens

Access shadows via `tokens.shadow`:

```tsx
// Elevation shadows
tokens.shadow.elevation.sm
tokens.shadow.elevation.md
tokens.shadow.elevation.lg

// Glass shadows
tokens.shadow.glass.light
tokens.shadow.glass.medium
tokens.shadow.glass.strong
tokens.shadow.glass.floating
tokens.shadow.glass.success
tokens.shadow.glass.warning
tokens.shadow.glass.error

// Component shadows
tokens.shadow.component.modal
tokens.shadow.component.header
tokens.shadow.component.sidebar
tokens.shadow.component.inputFocus
tokens.shadow.component.inputError
```

---

## Layout Components

### ModernPageLayout

Base layout with glassmorphic background patterns.

```tsx
<ModernPageLayout backgroundPattern="default">
  {/* Your page content */}
</ModernPageLayout>
```

**Props:**
- `backgroundPattern`: `'default' | 'minimal' | 'vibrant'`
- `maxWidth`: `'xs' | 'sm' | 'md' | 'lg' | 'xl' | false`
- `disableGutters`: `boolean`
- `paddingY`: `number | object`

### ModernSettingsLayout

Pre-configured for settings pages with minimal background.

```tsx
<ModernSettingsLayout>
  {/* Settings page content */}
</ModernSettingsLayout>
```

### ModernDashboardLayout

Pre-configured for dashboard pages.

```tsx
<ModernDashboardLayout>
  {/* Dashboard content */}
</ModernDashboardLayout>
```

### ModernOverviewLayout

Pre-configured with vibrant background for overview pages.

```tsx
<ModernOverviewLayout>
  {/* Overview content */}
</ModernOverviewLayout>
```

---

## Card Components

### ModernCard

Versatile card component with multiple variants.

```tsx
<ModernCard
  variant="flat"  // Options: 'flat' | 'outlined' | 'minimal'
  size="large"
  color="primary"
  animation="fade"
  title="Card Title"
  subtitle="Card description"
>
  {/* Card content */}
</ModernCard>
```

**Props:**
- `variant`: `'glass' | 'elevated' | 'outlined' | 'minimal'`
- `size`: `'small' | 'medium' | 'large'` (affects padding: 2/3/4)
- `color`: `'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error'`
- `animation`: `'fade' | 'grow' | 'none'`
- `borderRadius`: `'sm' | 'md' | 'lg' | 'xl' | 'xxl'`
- `interactive`: `boolean`
- `loading`: `boolean`
- `title`: `string`
- `subtitle`: `string`
- `actions`: `React.ReactNode`

### ModernMetricCard

Specialized for displaying metrics.

```tsx
<ModernMetricCard
  title="Total Revenue"
  value="$125,000"
  description="This month"
  trend={{ value: 12.5, direction: 'up' }}
  color="success"
  icon={<TrendingUpIcon />}
  size="medium"
/>
```

### Convenience Variants

```tsx
// Glass card (default)
<ModernGlassCard>...</ModernGlassCard>

// Elevated card
<ModernElevatedCard>...</ModernElevatedCard>

// Outlined card
<ModernOutlinedCard>...</ModernOutlinedCard>

// Minimal card
<ModernMinimalCard>...</ModernMinimalCard>

// Interactive card (with hover effects)
<ModernInteractiveCard onClick={handleClick}>...</ModernInteractiveCard>
```

---

## Header Components

### ModernPageHeader

Standardized page header with gradient text, breadcrumbs, and actions.

```tsx
<ModernPageHeader
  title="Page Title"
  subtitle="Page description text"
  icon={<DashboardIcon />}
  breadcrumbs={[
    { label: 'Home' },
    { label: 'Settings' },
    { label: 'Current Page' },
  ]}
  primaryAction={createAddAction('Add Item', handleAdd)}
  secondaryActions={[
    createRefreshAction(handleRefresh),
  ]}
  stats={[
    { label: 'Total', value: 150 },
    { label: 'Active', value: 42 },
  ]}
  status={{ label: 'Active', color: 'success' }}
  size="medium"
  gradient
  glass
/>
```

**Props:**
- `title`: `string` (required)
- `subtitle`: `string`
- `icon`: `React.ReactNode`
- `breadcrumbs`: `BreadcrumbItem[]`
- `primaryAction`: `HeaderAction`
- `secondaryActions`: `HeaderAction[]`
- `stats`: `{ label: string; value: string | number }[]`
- `status`: `{ label: string; color: string; variant?: 'filled' | 'outlined' }`
- `size`: `'small' | 'medium' | 'large'`
- `gradient`: `boolean`
- `glass`: `boolean`

### Quick Action Builders

```tsx
// Refresh button (icon only)
createRefreshAction(onRefresh)

// Filter button with badge
createFilterAction(onFilter, activeFilterCount)

// Export button (outlined)
createExportAction(onExport)

// Settings button (icon only)
createSettingsAction(onSettings)

// Add button (contained with gradient)
createAddAction('Label', onClick, 'primary')
```

---

## Dialog Components

### ModernDialog

Glassmorphic dialog with standardized styling.

```tsx
<ModernDialog
  open={isOpen}
  onClose={handleClose}
  title="Dialog Title"
  maxWidth="sm"
  actions={createStandardActions(handleCancel, handleConfirm, {
    confirmLabel: 'Save',
    isLoading: isSaving,
  })}
>
  {/* Dialog content */}
</ModernDialog>
```

**Props:**
- `open`: `boolean`
- `onClose`: `() => void`
- `title`: `string`
- `maxWidth`: `'xs' | 'sm' | 'md' | 'lg' | 'xl' | false`
- `fullWidth`: `boolean`
- `actions`: `ModernDialogAction[]`
- `showCloseButton`: `boolean`
- `contentSx`: `object`

### Dialog Action Builders

```tsx
// Standard Cancel/Confirm actions
createStandardActions(onCancel, onConfirm, {
  cancelLabel: 'Cancel',
  confirmLabel: 'Save',
  confirmColor: 'primary', // or 'error', 'warning'
  isLoading: false,
  confirmDisabled: false,
})

// Delete confirmation actions
createDeleteActions(onCancel, onDelete, isDeleting)
```

### Dialog Spacing Standards

Always use consistent padding in dialogs:
- `DialogContent`: `p: 4`
- `DialogActions`: `p: 4, gap: 2`

---

## Glass Effects

### Glass Presets

```tsx
import { glassPresets } from '../../design-system/utils/glassmorphism';

// Light glass (subtle, for backgrounds)
glassPresets.light
// opacity: 0.15, blur: 10px

// Medium glass (standard cards)
glassPresets.medium
// opacity: 0.25, blur: 20px

// Strong glass (modals, overlays)
glassPresets.strong
// opacity: 0.35, blur: 30px

// Colored glass variants
glassPresets.primary
glassPresets.success
glassPresets.warning
glassPresets.error
```

### Applying Glass to Custom Components

```tsx
// Manual glass styling
const glassCardSx = {
  ...glassPresets.light,
  border: `1px solid ${tokens.color.borders.glass}`,
  borderRadius: tokens.spacing.radius.xxl,
};
```

### Glass Form Fields

```tsx
const glassTextFieldSx = {
  '& .MuiOutlinedInput-root': {
    ...glassPresets.light,
    borderRadius: tokens.spacing.radius.lg,
    border: `1px solid ${tokens.color.borders.glass}`,
    '&:hover': {
      border: `1px solid ${tokens.color.primary[300]}`,
    },
    '&.Mui-focused': {
      border: `1px solid ${tokens.color.primary[500]}`,
      boxShadow: `0 0 0 3px ${tokens.color.primary[500]}15`,
    },
  },
};
```

---

## Button Patterns

### Primary Gradient Button

```tsx
const gradientButtonSx = {
  background: `linear-gradient(135deg, ${tokens.color.primary[500]} 0%, ${tokens.color.primary[600]} 100%)`,
  borderRadius: tokens.spacing.radius.full,
  px: 4,
  py: 1.25,
  boxShadow: `0 8px 32px ${tokens.color.primary[500]}25`,
  fontWeight: 600,
  '&:hover': {
    background: `linear-gradient(135deg, ${tokens.color.primary[600]} 0%, ${tokens.color.primary[700]} 100%)`,
    boxShadow: `0 12px 40px ${tokens.color.primary[500]}35`,
  },
  '&.Mui-disabled': {
    background: tokens.color.neutral[300],
  },
};
```

### Secondary/Cancel Button

```tsx
const cancelButtonSx = {
  ...glassPresets.light,
  border: `1px solid ${tokens.color.neutral[300]}`,
  borderRadius: tokens.spacing.radius.full,
  px: 4,
  py: 1.25,
  color: tokens.color.neutral[600],
  '&:hover': {
    ...glassPresets.medium,
    borderColor: tokens.color.neutral[400],
  },
};
```

### Danger/Error Button

```tsx
const dangerButtonSx = {
  background: `linear-gradient(135deg, ${tokens.color.error[500]} 0%, ${tokens.color.error[600]} 100%)`,
  borderRadius: tokens.spacing.radius.full,
  px: 4,
  py: 1.25,
  boxShadow: `0 8px 32px ${tokens.color.error[500]}25`,
  fontWeight: 600,
  '&:hover': {
    background: `linear-gradient(135deg, ${tokens.color.error[600]} 0%, ${tokens.color.error[700]} 100%)`,
    boxShadow: `0 12px 40px ${tokens.color.error[500]}35`,
  },
};
```

### Success Button

```tsx
const successButtonSx = {
  background: `linear-gradient(135deg, ${tokens.color.success[500]} 0%, ${tokens.color.success[600]} 100%)`,
  borderRadius: tokens.spacing.radius.full,
  px: 4,
  py: 1.25,
  boxShadow: `0 8px 32px ${tokens.color.success[500]}25`,
  fontWeight: 600,
  '&:hover': {
    background: `linear-gradient(135deg, ${tokens.color.success[600]} 0%, ${tokens.color.success[700]} 100%)`,
    boxShadow: `0 12px 40px ${tokens.color.success[500]}35`,
  },
};
```

---

## Form Field Patterns

### Standard Text Field

```tsx
<TextField
  fullWidth
  label="Field Label"
  sx={{
    '& .MuiOutlinedInput-root': {
      ...glassPresets.light,
      borderRadius: tokens.spacing.radius.lg,
      border: `1px solid ${tokens.color.borders.glass}`,
      '&:hover': {
        border: `1px solid ${tokens.color.primary[300]}`,
      },
      '&.Mui-focused': {
        border: `1px solid ${tokens.color.primary[500]}`,
        boxShadow: `0 0 0 3px ${tokens.color.primary[500]}15`,
      },
    },
  }}
  InputProps={{
    startAdornment: (
      <InputAdornment position="start">
        <Icon sx={{ color: tokens.color.primary[600] }} />
      </InputAdornment>
    ),
  }}
/>
```

---

## Table Patterns

### ModernTable Usage

```tsx
import { ModernTable } from '../../components/common';

<ModernTable
  columns={[
    { key: 'name', label: 'Name', sortable: true, render: (_, row) => <Typography>{row.name}</Typography> },
    { key: 'status', label: 'Status', render: (_, row) => <Chip label={row.status} /> },
  ]}
  data={items}
  actions={[
    { label: 'Edit', icon: <EditIcon />, onClick: handleEdit, color: 'primary' },
    { label: 'Delete', icon: <DeleteIcon />, onClick: handleDelete, color: 'error' },
  ]}
  loading={isLoading}
  emptyState={
    <ModernEmptyState
      icon={ItemIcon}
      title="No Items Found"
      description="Start by adding your first item"
      primaryAction={{ label: 'Add Item', onClick: handleAdd, icon: <AddIcon /> }}
    />
  }
/>
```

---

## Animation Patterns

### Transitions

```tsx
import { createTransition } from '../../design-system/utils/animations';

// Single property
transition: createTransition('all', 'fast')

// Multiple properties
transition: createTransition(['transform', 'background', 'box-shadow'], 'fast')

// Duration options: 'instant', 'fast', 'normal', 'slow'
```

### Stagger Animations with Fade

```tsx
import { Fade } from '@mui/material';

{items.map((item, index) => (
  <Fade in timeout={300 + index * 100}>
    <Box>{item}</Box>
  </Fade>
))}
```

---

## Migration Guide

### From Legacy MUI to Modern Design System

**Before (Legacy):**
```tsx
<Box>
  <Typography variant="h4">Page Title</Typography>
  <Paper sx={{ p: 3 }}>
    {/* Content */}
  </Paper>
</Box>
```

**After (Modern):**
```tsx
<ModernPageLayout backgroundPattern="default">
  <ModernPageHeader
    title="Page Title"
    icon={<PageIcon />}
    size="medium"
  />
  <ModernCard variant="flat" size="large" animation="fade">
    {/* Content */}
  </ModernCard>
</ModernPageLayout>
```

### Dialog Migration

**Before:**
```tsx
<Dialog open={open} onClose={onClose}>
  <DialogTitle>Title</DialogTitle>
  <DialogContent sx={{ p: 3 }}>Content</DialogContent>
  <DialogActions>
    <Button onClick={onCancel}>Cancel</Button>
    <Button onClick={onConfirm}>Confirm</Button>
  </DialogActions>
</Dialog>
```

**After:**
```tsx
<Dialog
  open={open}
  onClose={onClose}
  PaperProps={{
    sx: {
      ...glassPresets.medium,
      borderRadius: tokens.spacing.radius.xxl,
      border: `1px solid ${tokens.color.borders.glass}`,
    },
  }}
>
  <DialogTitle sx={{
    background: `linear-gradient(135deg, ${tokens.color.primary[600]} 0%, ${tokens.color.primary[500]} 100%)`,
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    color: 'transparent',
    fontWeight: 700,
  }}>
    Title
  </DialogTitle>
  <DialogContent sx={{ p: 4 }}>Content</DialogContent>
  <DialogActions sx={{ p: 4, gap: 2 }}>
    <Button sx={cancelButtonSx}>Cancel</Button>
    <Button sx={gradientButtonSx}>Confirm</Button>
  </DialogActions>
</Dialog>
```

### Checklist for Migrating a Page

1. Replace `<Box>` wrapper with `<ModernPageLayout backgroundPattern="default">`
2. Replace manual headers with `<ModernPageHeader>`
3. Replace `<Paper sx={{ p: N }}>` with `<ModernCard variant="flat" size="large">`
4. Apply glass styling to form fields using `glassTextFieldSx`
5. Apply gradient styling to primary buttons using `gradientButtonSx`
6. Apply cancel styling to secondary buttons using `cancelButtonSx`
7. Replace `<TableContainer component={Paper}>` with `<ModernCard variant="flat">`
8. Standardize dialog paddings to `p: 4`
9. Add `Fade` animations with staggered timeouts for lists
10. Use design tokens for all colors and spacing

---

## Best Practices

1. **Always use tokens** - Never hardcode colors or spacing
2. **Consistent padding** - Use `size` prop on cards for consistent padding
3. **Glass effects** - Use `glassPresets` for consistent glass styling
4. **Gradient buttons** - Primary actions should use gradient styling
5. **Animations** - Add subtle fade/grow animations for polished feel
6. **Dialog standards** - Always use `p: 4` for dialog content and actions
7. **Empty states** - Use `ModernEmptyState` for consistent empty state UI
8. **Loading states** - Use the `loading` prop on cards for consistent spinners

---

## Files Reference

- **Tokens:** `src/design-system/tokens/`
- **Glass Utilities:** `src/design-system/utils/glassmorphism.ts`
- **Animation Utilities:** `src/design-system/utils/animations.ts`
- **Layout Components:** `src/components/common/ModernPageLayout.tsx`
- **Card Components:** `src/components/common/ModernCard.tsx`
- **Header Component:** `src/components/common/ModernPageHeader.tsx`
- **Dialog Component:** `src/components/common/ModernDialog.tsx`
- **Empty State:** `src/components/common/ModernEmptyState.tsx`
- **Table Component:** `src/components/common/ModernTable.tsx`
