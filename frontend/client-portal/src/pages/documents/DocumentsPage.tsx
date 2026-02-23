// frontend/client-portal/src/pages/documents/DocumentsPage.tsx

import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Stack,
  Chip,
  IconButton,
  TextField,
  MenuItem,
  InputAdornment,
  useTheme,
  useMediaQuery,
  alpha,
  Tooltip,
  Collapse,
  Button,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  CloudUpload as UploadIcon,
  Close as ClearIcon,
  Description as ContractIcon,
  UploadFile as UploadTypeIcon,
  Receipt as ReceiptIcon,
  Photo as PhotoIcon,
  InsertDriveFile as OtherIcon,
} from '@mui/icons-material';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { AnimatedElement } from '../../design-system/components/AnimatedElement';
import { useDocuments } from '../../hooks/useDocuments';
import { useEvents } from '../../hooks/useEvents';
import { contractsApi } from '../../apis/contracts.api';
import { eventsApi } from '../../apis/events.api';
import { DocumentList, DocumentUploadDialog } from '../../components/documents';
import { FileViewerDialog } from '../../components/common/FileViewerDialog';
import type {
  DocumentFilters,
  DocumentType,
  DocumentSortOption,
  DocumentItem,
} from '../../types/documents.types';
import { DOCUMENT_TYPE_CONFIGS } from '../../types/documents.types';

// Sort options
const SORT_OPTIONS: { value: DocumentSortOption; label: string }[] = [
  { value: 'date', label: 'Date (Newest First)' },
  { value: 'name', label: 'Name (A-Z)' },
  { value: 'type', label: 'Type' },
  { value: 'size', label: 'Size (Largest First)' },
];

export const DocumentsPage: React.FC = () => {
  useDocumentTitle('Documents | LifePlace Alfonso');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Filter and sort state
  const [filters, setFilters] = useState<DocumentFilters>({ types: [] });
  const [sortBy, setSortBy] = useState<DocumentSortOption>('date');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(!isMobile);

  // Upload dialog state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  // View dialog state
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<DocumentItem | null>(null);

  // Get events for upload dialog
  const { useEventsList } = useEvents();
  const { data: events = [] } = useEventsList();

  // Computed filters with search
  const computedFilters = useMemo(
    (): DocumentFilters => ({
      ...filters,
      search: searchQuery || undefined,
    }),
    [filters, searchQuery],
  );

  // Get documents data
  const { documents, eventOptions, countsByType, totalCount, isLoading, refetch } = useDocuments({
    filters: computedFilters,
    sortBy,
  });

  // Handle type filter toggle
  const handleTypeToggle = (type: DocumentType) => {
    setFilters((prev) => {
      const types = prev.types?.includes(type)
        ? prev.types.filter((t) => t !== type)
        : [...(prev.types || []), type];
      return { ...prev, types };
    });
  };

  // Handle event filter
  const handleEventFilter = (eventId: number | undefined) => {
    setFilters((prev) => ({ ...prev, eventId }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({ types: [] });
    setSearchQuery('');
  };

  // Handle document download
  const handleDownload = async (document: DocumentItem) => {
    if (document.type === 'CONTRACT' && document.contractId) {
      // Use contracts API for contract downloads
      try {
        const blob = await contractsApi.downloadContractPdf(document.contractId);
        const url = window.URL.createObjectURL(blob);
        const a = window.document.createElement('a');
        a.href = url;
        a.download = `${document.name}.pdf`;
        window.document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        window.document.body.removeChild(a);
      } catch (error) {
        if (import.meta.env.DEV) console.error('Error downloading contract:', error);
      }
    } else if (document.downloadUrl) {
      // Regular file download
      window.open(document.downloadUrl, '_blank');
    }
  };

  // Handle document preview
  const handlePreview = (document: DocumentItem) => {
    setViewingDocument(document);
    setViewDialogOpen(true);
  };

  const handleViewDialogClose = () => {
    setViewDialogOpen(false);
    setViewingDocument(null);
  };

  // Get file blob for preview (extract numeric ID from document ID format "file-123")
  const getFileBlob = useCallback(
    async (fileId: number | string) => {
      if (!viewingDocument) {
        throw new Error('No document selected');
      }

      // For contracts, use the contracts API
      if (viewingDocument.type === 'CONTRACT' && viewingDocument.contractId) {
        return contractsApi.downloadContractPdf(viewingDocument.contractId);
      }

      // For regular files, extract the numeric ID from "file-123" format
      const numericId =
        typeof fileId === 'string' ? parseInt(fileId.replace('file-', ''), 10) : fileId;

      return eventsApi.getDocumentBlob(viewingDocument.eventId, numericId);
    },
    [viewingDocument],
  );

  // Handle upload success
  const handleUploadSuccess = () => {
    refetch();
  };

  // Check if any filters are active
  const hasActiveFilters =
    (filters.types?.length || 0) > 0 || filters.eventId !== undefined || searchQuery;

  // Type icons mapping
  const TYPE_ICONS: Record<DocumentType, React.ElementType> = {
    CONTRACT: ContractIcon,
    UPLOAD: UploadTypeIcon,
    RECEIPT: ReceiptIcon,
    PHOTO: PhotoIcon,
    OTHER: OtherIcon,
  };

  // Event options for upload dialog
  const uploadEventOptions = events.map((e) => ({
    id: e.id,
    name: e.name,
    documentCount: 0,
  }));

  return (
    <>
      <AnimatedElement animation="slideUp" delay={400}>
        <Box sx={{ py: 3, px: { xs: 2, md: 3 } }}>
          {/* Header */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            spacing={2}
            sx={{ mb: 3 }}
          >
            <Box>
              <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
                Documents
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {totalCount === 0
                  ? 'No documents yet'
                  : `${totalCount} document${totalCount !== 1 ? 's' : ''} across your events`}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                startIcon={<UploadIcon />}
                onClick={() => setUploadDialogOpen(true)}
                disabled={events.length === 0}
              >
                Upload
              </Button>
              {isMobile && (
                <Tooltip title="Toggle filters">
                  <IconButton
                    onClick={() => setShowFilters(!showFilters)}
                    color={showFilters ? 'primary' : 'default'}
                  >
                    <FilterIcon />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title="Refresh">
                <IconButton onClick={refetch} disabled={isLoading}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>

          {/* Filters Section */}
          <Collapse in={showFilters}>
            <Box
              sx={{
                mb: 3,
                p: 2,
                backgroundColor: alpha(theme.palette.primary.main, 0.02),
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Stack spacing={2}>
                {/* Search */}
                <TextField
                  placeholder="Search documents..."
                  size="small"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: searchQuery ? (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setSearchQuery('')}>
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ) : null,
                  }}
                  sx={{ maxWidth: 400 }}
                />

                {/* Type Filters */}
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mb: 1, display: 'block' }}
                  >
                    Filter by type
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                    {(Object.keys(DOCUMENT_TYPE_CONFIGS) as DocumentType[]).map((type) => {
                      const config = DOCUMENT_TYPE_CONFIGS[type];
                      const Icon = TYPE_ICONS[type];
                      const count = countsByType[type];
                      const isActive = filters.types?.includes(type);

                      return (
                        <Chip
                          key={type}
                          icon={<Icon sx={{ fontSize: '1rem !important' }} />}
                          label={`${config.pluralLabel} (${count})`}
                          onClick={() => handleTypeToggle(type)}
                          variant={isActive ? 'filled' : 'outlined'}
                          color={isActive ? 'primary' : 'default'}
                          sx={{
                            borderColor: isActive ? undefined : config.color,
                            '& .MuiChip-icon': {
                              color: isActive ? undefined : config.color,
                            },
                          }}
                        />
                      );
                    })}
                  </Stack>
                </Box>

                {/* Event Filter and Sort */}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  {/* Event Filter */}
                  {eventOptions.length > 0 && (
                    <TextField
                      select
                      label="Filter by Event"
                      size="small"
                      value={filters.eventId || ''}
                      onChange={(e) =>
                        handleEventFilter(e.target.value ? Number(e.target.value) : undefined)
                      }
                      sx={{ minWidth: 200 }}
                    >
                      <MenuItem value="">All Events</MenuItem>
                      {eventOptions.map((event) => (
                        <MenuItem key={event.id} value={event.id}>
                          {event.name} ({event.documentCount})
                        </MenuItem>
                      ))}
                    </TextField>
                  )}

                  {/* Sort */}
                  <TextField
                    select
                    label="Sort by"
                    size="small"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as DocumentSortOption)}
                    sx={{ minWidth: 180 }}
                  >
                    {SORT_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>

                  {/* Clear Filters */}
                  {hasActiveFilters && (
                    <Button
                      variant="text"
                      size="small"
                      onClick={clearFilters}
                      startIcon={<ClearIcon />}
                    >
                      Clear Filters
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Box>
          </Collapse>

          {/* Documents Grid */}
          <DocumentList
            documents={documents}
            isLoading={isLoading}
            showEmpty={true}
            onDownload={handleDownload}
            onPreview={handlePreview}
            onUpload={() => setUploadDialogOpen(true)}
          />

          {/* Upload Dialog */}
          <DocumentUploadDialog
            open={uploadDialogOpen}
            onClose={() => setUploadDialogOpen(false)}
            onSuccess={handleUploadSuccess}
            eventOptions={uploadEventOptions}
          />

          {/* File Viewer Dialog */}
          <FileViewerDialog
            open={viewDialogOpen}
            onClose={handleViewDialogClose}
            file={
              viewingDocument
                ? {
                    id: viewingDocument.id,
                    name: viewingDocument.name,
                    fileType: viewingDocument.fileType,
                    fileSize: viewingDocument.fileSize,
                    downloadUrl: viewingDocument.downloadUrl,
                  }
                : null
            }
            onDownload={viewingDocument ? () => handleDownload(viewingDocument) : undefined}
            getFileBlob={getFileBlob}
          />
        </Box>
      </AnimatedElement>
    </>
  );
};

export default DocumentsPage;
