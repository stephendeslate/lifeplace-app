// Gallery Settings Page
// Manages gallery photos for the public-facing website

import React, { useState } from 'react';
import { PhotoLibrary as GalleryIcon, CloudUpload as UploadIcon } from '@mui/icons-material';
import { Box, Chip } from '@mui/material';
import {
  PermissionAwareSettingsPage,
  type SettingsPageConfig,
  type SettingsTableColumn,
} from '../../../components/common/settings';
import { useGalleryPhotos } from '../../../hooks/useGallery';
import { useSettingsPagination } from '../../../hooks/useSettingsPagination';
import { GalleryPhotoFormDialog } from '../../../components/gallery/GalleryPhotoFormDialog';
import { BulkUploadDialog } from '../../../components/gallery/BulkUploadDialog';
import type { GalleryPhoto } from '../../../types/gallery.types';
import { GALLERY_CATEGORIES } from '../../../types/gallery.types';
import type { ModernFormSection } from '../../../components/common/ModernForm';

// Category label lookup
const categoryLabelMap = Object.fromEntries(GALLERY_CATEGORIES.map((c) => [c.value, c.label]));

// Table columns configuration
const columns: SettingsTableColumn<GalleryPhoto>[] = [
  {
    key: 'image',
    label: 'Photo',
    width: '80px',
    render: (value) => (
      <Box
        component="img"
        src={String(value)}
        alt="Gallery thumbnail"
        sx={{
          width: 56,
          height: 40,
          objectFit: 'cover',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
        }}
      />
    ),
  },
  {
    key: 'title',
    label: 'Title',
    sortable: true,
    searchable: true,
  },
  {
    key: 'category',
    label: 'Category',
    render: (value) => (
      <Chip
        label={categoryLabelMap[String(value)] || String(value)}
        size="small"
        variant="outlined"
      />
    ),
  },
  {
    key: 'venue_name',
    label: 'Venue',
    render: (value) => String(value) || '-',
  },
  {
    key: 'is_featured',
    label: 'Featured',
    align: 'center',
    render: (value) => (value ? <Chip label="Featured" size="small" color="primary" /> : '-'),
  },
  {
    key: 'is_active',
    label: 'Status',
    align: 'center',
    render: (value) =>
      value ? (
        <Chip label="Active" size="small" color="success" variant="outlined" />
      ) : (
        <Chip label="Inactive" size="small" color="default" variant="outlined" />
      ),
  },
  {
    key: 'sort_order',
    label: 'Order',
    sortable: true,
    align: 'center',
  },
];

// Empty form sections placeholder - not used since we have customFormRenderer,
// but required by the SettingsPageConfig type
const formSections: ModernFormSection[] = [];

// Default values for new gallery photos
const defaultGalleryPhoto: GalleryPhoto = {
  id: 0,
  image: '',
  title: '',
  description: '',
  category: 'GENERAL',
  venue: null,
  venue_name: null,
  event_type: null,
  event_type_name: null,
  is_featured: false,
  is_active: true,
  sort_order: 0,
  created_at: '',
  updated_at: '',
};

// Settings page configuration
const config: SettingsPageConfig<GalleryPhoto> = {
  page: {
    title: 'Gallery',
    subtitle: 'Manage photos displayed on your public website',
    icon: React.createElement(GalleryIcon),
    breadcrumbs: [
      { label: 'Settings', href: '/settings' },
      { label: 'Content', href: '/settings/content' },
      { label: 'Gallery' },
    ],
  },

  table: {
    columns,
    searchFields: ['title', 'description'],
    filters: [
      {
        key: 'category',
        label: 'Category',
        options: GALLERY_CATEGORIES.map((c) => ({
          value: c.value,
          label: c.label,
        })),
      },
    ],
    defaultSort: { key: 'sort_order', order: 'asc' },
    emptyState: {
      icon: React.createElement(GalleryIcon),
      title: 'No Gallery Photos',
      description: 'Add photos to showcase your venues and events on the public website.',
    },
  },

  form: {
    title: 'Gallery Photo',
    subtitle: 'Upload and configure a gallery photo.',
    sections: formSections,
    maxWidth: 'sm',
  },

  features: {
    create: true,
    edit: true,
    delete: true,
    duplicate: false,
    search: true,
    refresh: true,
  },
};

export const Gallery = () => {
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const paginationState = useSettingsPagination({ defaultPageSize: 25 });

  const {
    galleryPhotos,
    totalCount,
    pageCount,
    isLoadingGalleryPhotos,
    galleryPhotosError,
    createGalleryPhoto,
    updateGalleryPhoto,
    deleteGalleryPhoto,
    bulkCreateGalleryPhotos,
    refetchGalleryPhotos,
    isCreatingGalleryPhoto,
    isUpdatingGalleryPhoto,
    isDeletingGalleryPhoto,
    isBulkCreatingGalleryPhotos,
  } = useGalleryPhotos({
    page: paginationState.page,
    page_size: paginationState.pageSize,
    search: paginationState.search || undefined,
    category: (paginationState.filters.category as string) || undefined,
    ordering: paginationState.ordering || undefined,
  });

  // Action handlers
  const handleRefresh = () => refetchGalleryPhotos();

  const handleCreate = async (_data: GalleryPhoto) => {
    // Create is handled through the custom form dialog
    // This is never called directly since we use customFormRenderer
    return Promise.resolve();
  };

  const handleUpdate = async (_id: string | number, _data: GalleryPhoto) => {
    // Update is handled through the custom form dialog
    return Promise.resolve();
  };

  const handleDelete = async (id: string | number) => {
    return new Promise<void>((resolve, reject) => {
      deleteGalleryPhoto(Number(id), {
        onSuccess: () => resolve(),
        onError: reject,
      });
    });
  };

  const handleFetchItem = async (id: string | number): Promise<GalleryPhoto> => {
    const { galleryApi } = await import('../../../apis/gallery.api');
    return galleryApi.getGalleryPhoto(Number(id));
  };

  return (
    <>
      <PermissionAwareSettingsPage
        config={config}
        requiredPermissions={['can_manage_booking_flows']}
        data={galleryPhotos}
        defaultValues={defaultGalleryPhoto}
        isLoading={isLoadingGalleryPhotos}
        error={galleryPhotosError?.message}
        onRefresh={handleRefresh}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onFetchItem={handleFetchItem}
        isCreating={isCreatingGalleryPhoto}
        isUpdating={isUpdatingGalleryPhoto}
        isDeleting={isDeletingGalleryPhoto}
        pagination={{
          totalCount,
          currentPage: paginationState.currentPage,
          pageSize: paginationState.pageSize,
          pageCount,
          onPageChange: paginationState.onPageChange,
          onPageSizeChange: paginationState.onPageSizeChange,
        }}
        onSearchChange={paginationState.setSearch}
        onFilterChange={paginationState.setFilters}
        onSortChange={paginationState.setOrdering}
        customHeaderActions={[
          {
            icon: React.createElement(UploadIcon),
            label: 'Bulk Upload',
            onClick: () => setBulkUploadOpen(true),
            variant: 'outlined',
            color: 'primary',
            tooltip: 'Upload multiple photos at once',
          },
        ]}
        customFormRenderer={({ open, onClose, item }) => (
          <GalleryPhotoFormDialog
            open={open}
            onClose={onClose}
            editingPhoto={item as GalleryPhoto | null}
            onSubmit={(formData) => {
              const editingItem = item as GalleryPhoto | null;
              if (editingItem && editingItem.id) {
                updateGalleryPhoto(
                  { id: editingItem.id, formData },
                  {
                    onSuccess: () => onClose(),
                  },
                );
              } else {
                createGalleryPhoto(formData, {
                  onSuccess: () => onClose(),
                });
              }
            }}
            isLoading={isCreatingGalleryPhoto || isUpdatingGalleryPhoto}
          />
        )}
      />
      <BulkUploadDialog
        open={bulkUploadOpen}
        onClose={() => setBulkUploadOpen(false)}
        onSubmit={(formData) => {
          bulkCreateGalleryPhotos(formData, {
            onSuccess: () => setBulkUploadOpen(false),
          });
        }}
        isLoading={isBulkCreatingGalleryPhotos}
      />
    </>
  );
};

export default Gallery;
