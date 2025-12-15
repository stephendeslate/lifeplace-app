// frontend/client-portal/src/components/documents/DocumentList.tsx

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Skeleton,
  Button,
  Stack,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  FolderOpen as EmptyIcon,
  CloudUpload as UploadIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { DocumentCard } from './DocumentCard';
import type { DocumentItem } from '../../types/documents.types';

interface DocumentListProps {
  documents: DocumentItem[];
  isLoading?: boolean;
  showEmpty?: boolean;
  onDownload: (document: DocumentItem) => void;
  onPreview?: (document: DocumentItem) => void;
  onUpload?: () => void;
}

// Loading skeleton component
const DocumentCardSkeleton: React.FC = () => (
  <Paper sx={{ p: 2, height: 200 }}>
    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
      <Skeleton variant="circular" width={48} height={48} />
    </Box>
    <Skeleton variant="text" width="80%" height={24} />
    <Skeleton variant="text" width="60%" height={20} />
    <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
      <Skeleton variant="rectangular" width={60} height={22} sx={{ borderRadius: 1 }} />
      <Skeleton variant="rectangular" width={50} height={22} sx={{ borderRadius: 1 }} />
    </Box>
    <Skeleton variant="text" width="40%" height={16} sx={{ mt: 1 }} />
  </Paper>
);

// Empty state component
const EmptyState: React.FC<{ onUpload?: () => void }> = ({ onUpload }) => {
  const navigate = useNavigate();

  return (
    <Paper
      sx={{
        p: 4,
        textAlign: 'center',
        backgroundColor: 'grey.50',
        borderRadius: 3,
      }}
    >
      <EmptyIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
      <Typography variant="h5" gutterBottom color="text.primary">
        No Documents Yet
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
        Your event documents, contracts, receipts, and uploads will appear here.
      </Typography>
      <Stack direction="row" spacing={2} justifyContent="center">
        {onUpload && (
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={onUpload}
          >
            Upload Document
          </Button>
        )}
        <Button
          variant="outlined"
          onClick={() => navigate('/events')}
        >
          View Events
        </Button>
      </Stack>
    </Paper>
  );
};

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  isLoading = false,
  showEmpty = true,
  onDownload,
  onPreview,
  onUpload,
}) => {
  // Loading state
  if (isLoading) {
    return (
      <Grid container spacing={2}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={i}>
            <DocumentCardSkeleton />
          </Grid>
        ))}
      </Grid>
    );
  }

  // Empty state
  if (documents.length === 0) {
    return showEmpty ? <EmptyState onUpload={onUpload} /> : null;
  }

  // Document grid
  return (
    <Grid container spacing={2}>
      {documents.map((document) => (
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={document.id}>
          <DocumentCard
            document={document}
            onDownload={onDownload}
            onPreview={onPreview}
          />
        </Grid>
      ))}
    </Grid>
  );
};

export default DocumentList;
