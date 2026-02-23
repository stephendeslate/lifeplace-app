// frontend/client-portal/src/components/events/EventDocuments.tsx

import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Paper,
  Stack,
  Skeleton,
  Alert,
  Tooltip,
  Chip,
  Button,
  Fab,
} from '@mui/material';
import {
  Download as DownloadIcon,
  InsertDriveFile as FileIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  Description as DocIcon,
  TableChart as SpreadsheetIcon,
  VideoFile as VideoIcon,
  AudioFile as AudioIcon,
  Archive as ArchiveIcon,
  Folder as FolderIcon,
  CloudUpload as UploadIcon,
  Add as AddIcon,
  RemoveRedEye as ViewIcon,
} from '@mui/icons-material';
import { formatInTimeZone } from 'date-fns-tz';
import { useEvents } from '../../hooks/useEvents';
import { eventsApi } from '../../apis/events.api';
import FileUpload from './FileUpload';
import { FileViewerDialog } from '../common/FileViewerDialog';
import type { EventFile } from '../../types/events.types';

interface EventDocumentsProps {
  eventId: number;
  showEmpty?: boolean;
}

const EventDocuments: React.FC<EventDocumentsProps> = ({ eventId, showEmpty = true }) => {
  const PHILIPPINE_TIMEZONE = 'Asia/Manila';
  const { useEventDocuments, useDownloadFile } = useEvents();
  const { data: documents, isLoading, error, refetch } = useEventDocuments(eventId);
  const downloadMutation = useDownloadFile();

  // Upload dialog state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  // View dialog state
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<EventFile | null>(null);

  const handleViewClick = (document: EventFile) => {
    setViewingDocument(document);
    setViewDialogOpen(true);
  };

  const handleViewDialogClose = () => {
    setViewDialogOpen(false);
    setViewingDocument(null);
  };

  const getFileBlob = useCallback(
    async (fileId: number | string) => {
      return eventsApi.getDocumentBlob(eventId, Number(fileId));
    },
    [eventId],
  );

  const getFileIcon = (fileType?: string) => {
    if (!fileType) return <FileIcon color="action" />;
    const type = fileType.toLowerCase();

    if (type.includes('pdf')) return <PdfIcon color="error" />;
    if (
      type.includes('image') ||
      ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'].some((ext) => type.includes(ext))
    ) {
      return <ImageIcon color="info" />;
    }
    if (
      type.includes('video') ||
      ['mp4', 'avi', 'mov', 'wmv', 'flv'].some((ext) => type.includes(ext))
    ) {
      return <VideoIcon color="secondary" />;
    }
    if (type.includes('audio') || ['mp3', 'wav', 'flac', 'aac'].some((ext) => type.includes(ext))) {
      return <AudioIcon color="warning" />;
    }
    if (['doc', 'docx', 'txt', 'rtf'].some((ext) => type.includes(ext))) {
      return <DocIcon color="primary" />;
    }
    if (['xls', 'xlsx', 'csv'].some((ext) => type.includes(ext))) {
      return <SpreadsheetIcon color="success" />;
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].some((ext) => type.includes(ext))) {
      return <ArchiveIcon color="action" />;
    }

    return <FileIcon color="action" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownload = async (document: EventFile) => {
    await downloadMutation.mutateAsync({
      url: document.download_url,
      filename: document.name,
    });
  };

  const handleUploadSuccess = () => {
    refetch(); // Refresh the documents list
  };

  const handleUploadClick = () => {
    setUploadDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Box>
        <List>
          {[1, 2, 3].map((item) => (
            <ListItem key={item} divider>
              <ListItemIcon>
                <Skeleton variant="circular" width={24} height={24} />
              </ListItemIcon>
              <ListItemText
                primary={<Skeleton variant="text" width="70%" />}
                secondary={<Skeleton variant="text" width="50%" />}
              />
              <ListItemSecondaryAction>
                <Skeleton variant="circular" width={40} height={40} />
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Unable to load event documents. Please try again later.
      </Alert>
    );
  }

  if (!documents || documents.length === 0) {
    return showEmpty ? (
      <Box>
        <Paper
          sx={{
            p: 3,
            textAlign: 'center',
            backgroundColor: 'grey.50',
          }}
        >
          <FolderIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No documents available
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Event documents and files will appear here when they are shared with you.
          </Typography>
          <Button variant="contained" startIcon={<UploadIcon />} onClick={handleUploadClick}>
            Upload File
          </Button>
        </Paper>

        <FileUpload
          eventId={eventId}
          open={uploadDialogOpen}
          onClose={() => setUploadDialogOpen(false)}
          onSuccess={handleUploadSuccess}
        />
      </Box>
    ) : null;
  }

  return (
    <Box role="region" aria-label="Event documents">
      {/* Upload Button */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          startIcon={<UploadIcon />}
          onClick={handleUploadClick}
          size="small"
        >
          Upload File
        </Button>
      </Box>

      <List sx={{ width: '100%' }}>
        {documents.map((document) => (
          <ListItem
            key={document.id}
            divider
            sx={{
              py: 2,
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 48 }}>{getFileIcon(document.file_type)}</ListItemIcon>

            <ListItemText
              primary={
                <Typography
                  variant="body1"
                  component="h4"
                  sx={{
                    fontWeight: 500,
                    wordBreak: 'break-word',
                  }}
                >
                  {document.name}
                </Typography>
              }
              secondary={
                <Stack
                  direction="row"
                  spacing={2}
                  alignItems="center"
                  sx={{ flexWrap: 'wrap', gap: 1, display: 'inline-flex' }}
                >
                  <Typography component="span" variant="caption" color="text.secondary">
                    {formatFileSize(document.size)}
                  </Typography>
                  <Typography component="span" variant="caption" color="text.secondary">
                    {formatInTimeZone(document.created_at, PHILIPPINE_TIMEZONE, 'MMM dd, yyyy')}
                  </Typography>
                  {document.file_type && (
                    <Chip
                      label={document.file_type.toUpperCase()}
                      size="small"
                      variant="outlined"
                      sx={{ height: 20, fontSize: '0.6875rem' }}
                    />
                  )}
                </Stack>
              }
              secondaryTypographyProps={{ component: 'div' }}
            />

            <ListItemSecondaryAction>
              <Stack direction="row" spacing={0.5}>
                <Tooltip title="View file">
                  <IconButton
                    onClick={() => handleViewClick(document)}
                    aria-label={`View ${document.name}`}
                    size="small"
                  >
                    <ViewIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Download file">
                  <IconButton
                    onClick={() => handleDownload(document)}
                    disabled={downloadMutation.isPending}
                    aria-label={`Download ${document.name}`}
                    size="small"
                  >
                    <DownloadIcon />
                  </IconButton>
                </Tooltip>
              </Stack>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>

      <Box sx={{ mt: 2, px: 2, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          {documents.length} document{documents.length !== 1 ? 's' : ''} available
        </Typography>
      </Box>

      {/* Upload Dialog */}
      <FileUpload
        eventId={eventId}
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        onSuccess={handleUploadSuccess}
      />

      {/* Floating Action Button for Mobile */}
      <Fab
        color="primary"
        aria-label="upload file"
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          display: { xs: 'flex', sm: 'none' }, // Only show on mobile
        }}
        onClick={handleUploadClick}
      >
        <AddIcon />
      </Fab>

      {/* File Viewer Dialog */}
      <FileViewerDialog
        open={viewDialogOpen}
        onClose={handleViewDialogClose}
        file={
          viewingDocument
            ? {
                id: viewingDocument.id,
                name: viewingDocument.name,
                fileType: viewingDocument.file_type,
                fileSize: viewingDocument.size,
                downloadUrl: viewingDocument.download_url,
              }
            : null
        }
        onDownload={viewingDocument ? () => handleDownload(viewingDocument) : undefined}
        getFileBlob={getFileBlob}
      />
    </Box>
  );
};

export default EventDocuments;
