# Settings Pages Standardization Guide

## Overview
All settings pages have been refactored to use consistent shared components from `src/components/common/`. This ensures a unified user experience, maintainable codebase, and consistent behavior across all settings.

## Completed Standardizations

### ✅ Commerce Settings
- **Categories.tsx** - New dedicated page using shared components
- **Products.tsx** - New dedicated page using shared components  
- **Discounts.tsx** - New dedicated page using shared components
- **ProductsPackages.tsx** - Needs to be updated to route to separate pages

### ✅ Booking Configuration Settings  
- **EventTypes.tsx** - Updated to use ModernTable, ModernDialog, ModernForm

### 🔄 Template Management Settings (In Progress)
- **CommunicationTemplates.tsx** - Partially updated
- **ContractTemplates.tsx** - Needs standardization
- **QuestionnaireTemplates.tsx** - Needs standardization  
- **WorkflowTemplates.tsx** - Needs standardization

### 🔄 Remaining Commerce Settings
- **Sales.tsx** - Needs standardization
- **Payments.tsx** - Needs standardization

### 🔄 Booking Configuration Settings  
- **BookingFlows.tsx** - Needs standardization
- **BookingFlowDetails.tsx** - Needs standardization

## Shared Components Used

### Core Components
- **ModernTable** - Standardized data tables with actions, sorting, filtering
- **ModernDialog** - Consistent dialog/modal behavior
- **ModernForm** - Dynamic form generation with validation
- **ModernPageLayout** - Consistent page layout wrapper
- **ModernPageHeader** - Standardized page headers with breadcrumbs
- **ModernCard** - Consistent card styling with glass effects
- **ModernEmptyState** - Empty state messaging with actions

### Supporting Components  
- **ModernLoadingStates** - Loading skeletons and states
- **ModernSearch** - Search and filtering components
- **ModernEmptyState** - Consistent empty state handling

## Standard Implementation Pattern

### 1. Imports Structure
```typescript
// React and MUI
import React, { useState, useEffect } from 'react';
import { Box, Typography, Chip, TextField, ... } from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, ... } from '@mui/icons-material';

// Hooks and Types
import { useLayout } from '../../../contexts/LayoutContext';
import { useEntityHook } from '../../../hooks/useEntity';
import type { Entity, CreateEntityData, UpdateEntityData, EntityFilters } from '../../../types/entity.types';

// Shared Components
import { ModernSettingsLayout } from '../../../components/common/ModernPageLayout';
import { ModernCard } from '../../../components/common/ModernCard';
import { ModernPageHeader, createAddAction, createRefreshAction } from '../../../components/common/ModernPageHeader';
import { ModernTable, ModernDialog, ModernForm, ModernEmptyState } from '../../../components/common';
import type { ModernTableColumn, ModernTableAction, ModernFormField } from '../../../components/common';
import ModernLoadingStates from '../../../components/common/ModernLoadingStates';
```

### 2. Component State
```typescript
export const EntityPage: React.FC = () => {
  const { setBreadcrumbs } = useLayout();
  const [filters, setFilters] = useState<EntityFilters>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);

  // Breadcrumbs setup
  useEffect(() => {
    setBreadcrumbs([
      { label: 'Settings' },
      { label: 'Category' },
      { label: 'Entity Name' },
    ]);
  }, [setBreadcrumbs]);

  // Hook for data operations
  const {
    entities,
    isLoadingEntities,
    createEntity,
    updateEntity,
    deleteEntity,
    isCreatingEntity,
    isUpdatingEntity,
    isDeletingEntity,
    refetchEntities,
  } = useEntityHook(filters);
```

### 3. Table Configuration
```typescript
  // Table columns configuration
  const tableColumns: ModernTableColumn<Entity>[] = [
    {
      id: 'name',
      label: 'Name',
      sortable: true,
      render: (entity) => (
        <Box display="flex" alignItems="center" gap={1}>
          <EntityIcon fontSize="small" color="primary" />
          <Typography variant="body2" fontWeight="medium">
            {entity.name}
          </Typography>
        </Box>
      ),
    },
    // ... other columns
  ];

  // Table actions configuration  
  const tableActions: ModernTableAction<Entity>[] = [
    {
      label: 'Edit',
      icon: <EditIcon />,
      onClick: handleEdit,
      color: 'primary',
    },
    {
      label: 'Delete',
      icon: <DeleteIcon />,
      onClick: (entity) => handleDelete(entity.id),
      color: 'error',
      confirm: {
        title: 'Delete Entity',
        message: 'Are you sure you want to delete this entity? This action cannot be undone.',
      },
    },
  ];
```

### 4. Form Configuration
```typescript
  // Form fields configuration
  const formFields: ModernFormField[] = [
    {
      name: 'name',
      label: 'Entity Name',
      type: 'text',
      required: true,
      placeholder: 'Enter name',
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      placeholder: 'Enter description',
      rows: 3,
    },
    {
      name: 'is_active',
      label: 'Active',
      type: 'switch',
      helperText: 'Active entities are available for use',
    },
  ];
```

### 5. Event Handlers
```typescript
  // Event handlers
  const handleCreateNew = () => {
    setEditingEntity(null);
    setDialogOpen(true);
  };

  const handleEdit = (entity: Entity) => {
    setEditingEntity(entity);
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteEntity(id);
    } catch (error) {
      console.error('Failed to delete entity:', error);
    }
  };

  const handleSubmit = async (data: CreateEntityData | UpdateEntityData) => {
    try {
      if (editingEntity) {
        await updateEntity({ id: editingEntity.id, data: data as UpdateEntityData });
      } else {
        await createEntity(data as CreateEntityData);
      }
      setDialogOpen(false);
    } catch (error) {
      console.error('Failed to save entity:', error);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingEntity(null);
  };

  const handleRefresh = () => {
    refetchEntities();
  };
```

### 6. Render Structure
```typescript
  return (
    <ModernSettingsLayout>
      {/* Page Header */}
      <ModernPageHeader
        title="Entity Management"
        subtitle="Manage your entities"
        icon={<EntityIcon />}
        primaryAction={createAddAction('Create Entity', handleCreateNew)}
        secondaryActions={[createRefreshAction(handleRefresh)]}
        breadcrumbs={[
          { label: 'Settings' },
          { label: 'Category' },
          { label: 'Entities', current: true },
        ]}
      />

      {/* Filters */}
      <ModernCard variant="glass" size="medium">
        {/* Filter controls */}
      </ModernCard>

      {/* Data Table */}
      <ModernCard variant="glass" size="large">
        {isLoadingEntities && entities.length === 0 ? (
          <ModernLoadingStates.ModernTableSkeleton rows={5} columns={4} />
        ) : entities.length === 0 ? (
          <ModernEmptyState
            icon={EntityIcon}
            title="No entities found"
            description="Create your first entity"
            primaryAction={{
              label: 'Create Entity',
              onClick: handleCreateNew,
              icon: <AddIcon />,
              color: 'primary',
            }}
          />
        ) : (
          <ModernTable
            data={entities}
            columns={tableColumns}
            actions={tableActions}
            isLoading={isLoadingEntities}
            onRowClick={handleEdit}
          />
        )}
      </ModernCard>

      {/* Form Dialog */}
      <ModernDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        title={editingEntity ? 'Edit Entity' : 'Create Entity'}
        maxWidth="md"
      >
        <ModernForm
          fields={formFields}
          onSubmit={handleSubmit}
          isLoading={isCreatingEntity || isUpdatingEntity}
          initialData={editingEntity}
          submitLabel={editingEntity ? 'Update Entity' : 'Create Entity'}
          onCancel={handleDialogClose}
        />
      </ModernDialog>
    </ModernSettingsLayout>
  );
```

## Benefits of Standardization

### 🎯 Consistency
- All settings pages have identical user interface patterns
- Consistent behavior for CRUD operations
- Unified styling and animations

### 🔧 Maintainability  
- Single source of truth for common components
- Easy to update behavior across all pages
- Reduced code duplication

### 🚀 Performance
- Shared components are optimized and cached
- Consistent loading states and error handling
- Better bundle optimization

### 👥 Developer Experience
- Clear patterns to follow for new pages
- TypeScript support with proper typing
- Self-documenting component interfaces

### 🧪 Testability
- Shared components can be tested once
- Consistent test patterns across pages  
- Easier to maintain test suites

## Next Steps

1. **Complete Template Management Updates**
   - Apply pattern to remaining template files
   - Ensure consistent functionality

2. **Update Remaining Commerce Settings**
   - Standardize Sales.tsx and Payments.tsx
   - Remove old ProductsPackages.tsx or convert to router

3. **Update Booking Configuration**  
   - Apply pattern to BookingFlows.tsx
   - Standardize BookingFlowDetails.tsx

4. **Testing and QA**
   - Test all CRUD operations
   - Verify consistent behavior
   - Performance testing

## File Status

### ✅ Completed (Using Shared Components)
- `src/pages/settings/booking/EventTypes.tsx`
- `src/pages/settings/commerce/Categories.tsx` 
- `src/pages/settings/commerce/Products.tsx`
- `src/pages/settings/commerce/Discounts.tsx`

### 🔄 In Progress  
- `src/pages/settings/templates/CommunicationTemplates.tsx`

### ⏳ Pending Standardization
- `src/pages/settings/templates/ContractTemplates.tsx`
- `src/pages/settings/templates/QuestionnaireTemplates.tsx`
- `src/pages/settings/templates/WorkflowTemplates.tsx`
- `src/pages/settings/commerce/Sales.tsx`  
- `src/pages/settings/commerce/Payments.tsx`
- `src/pages/settings/booking/BookingFlows.tsx`
- `src/pages/settings/booking/BookingFlowDetails.tsx`

### 🗑️ To Remove/Replace
- `src/pages/settings/commerce/ProductsPackages.tsx` (replaced by separate pages)