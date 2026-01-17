// frontend/client-portal/src/components/common/FileViewerDialog.tsx

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  Box,
  CircularProgress,
  Stack,
  Chip,
  alpha,
} from '@mui/material';
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  OpenInNew as OpenInNewIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Fullscreen as FullscreenIcon,
  InsertDriveFile as FileIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  Description as DocIcon,
} from '@mui/icons-material';

export interface ViewableFile {
  id: number | string;
  name: string;
  fileType: string;
  fileSize: number;
  downloadUrl?: string;
}

interface FileViewerDialogProps {
  open: boolean;
  onClose: () => void;
  file: ViewableFile | null;
  onDownload?: () => void;
  getFileBlob?: (fileId: number | string) => Promise<Blob>;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

const getFileIcon = (fileType: string): React.ReactNode => {
  const type = fileType?.toLowerCase() || '';
  if (type.includes('pdf')) return <PdfIcon sx={{ fontSize: 64, color: '#d32f2f' }} />;
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'image'].some(ext => type.includes(ext))) {
    return <ImageIcon sx={{ fontSize: 64, color: '#1976d2' }} />;
  }
  if (['doc', 'docx', 'word', 'document'].some(ext => type.includes(ext))) {
    return <DocIcon sx={{ fontSize: 64, color: '#1565c0' }} />;
  }
  return <FileIcon sx={{ fontSize: 64, color: '#757575' }} />;
};

const canPreviewInline = (fileType: string): 'image' | 'pdf' | false => {
  const type = fileType?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].some(ext => type.includes(ext))) {
    return 'image';
  }
  if (type.includes('pdf')) return 'pdf';
  return false;
};

export const FileViewerDialog: React.FC<FileViewerDialogProps> = ({
  open,
  onClose,
  file,
  onDownload,
  getFileBlob,
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);

  // Load blob URL for preview
  useEffect(() => {
    if (!open || !file) {
      setBlobUrl(null);
      setError(null);
      setZoom(100);
      return;
    }

    const previewType = canPreviewInline(file.fileType);
    if (!previewType) {
      return;
    }

    // For images, we can use downloadUrl directly if available
    // For PDFs, we must use blob URL to avoid X-Frame-Options restrictions
    if (previewType === 'image' && file.downloadUrl) {
      setBlobUrl(file.downloadUrl);
      return;
    }

    // Fetch the blob for PDFs (required due to X-Frame-Options) or when downloadUrl is not available
    if (getFileBlob) {
      setLoading(true);
      setError(null);
      getFileBlob(file.id)
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          setBlobUrl(url);
        })
        .catch(() => {
          setError('Failed to load file preview');
        })
        .finally(() => {
          setLoading(false);
        });
    }

    return () => {
      // Clean up blob URL if we created one (not for direct downloadUrl images)
      if (blobUrl && !(previewType === 'image' && file.downloadUrl)) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [open, file, getFileBlob]);

  // Clean up blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrl && file && !file.downloadUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl, file]);

  if (!file) return null;

  const previewType = canPreviewInline(file.fileType);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 25, 200));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 25, 50));
  const handleOpenNewTab = () => {
    if (blobUrl) {
      window.open(blobUrl, '_blank');
    }
  };
  const handleFullscreen = () => {
    const container = document.getElementById('file-preview-container');
    if (container) {
      container.requestFullscreen?.();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          height: '90vh',
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
          py: 1.5,
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="h6" component="div" noWrap sx={{ maxWidth: 400 }}>
            {file.name}
          </Typography>
          <Chip
            label={formatFileSize(file.fileSize)}
            size="small"
            variant="outlined"
          />
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          {previewType === 'image' && (
            <>
              <IconButton size="small" onClick={handleZoomOut} disabled={zoom <= 50}>
                <ZoomOutIcon fontSize="small" />
              </IconButton>
              <Typography variant="caption" sx={{ minWidth: 45, textAlign: 'center' }}>
                {zoom}%
              </Typography>
              <IconButton size="small" onClick={handleZoomIn} disabled={zoom >= 200}>
                <ZoomInIcon fontSize="small" />
              </IconButton>
            </>
          )}
          {previewType && blobUrl && (
            <>
              <IconButton size="small" onClick={handleFullscreen} title="Fullscreen">
                <FullscreenIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={handleOpenNewTab} title="Open in new tab">
                <OpenInNewIcon fontSize="small" />
              </IconButton>
            </>
          )}
          <IconButton size="small" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 0,
          overflow: 'auto',
          backgroundColor: (theme) => alpha(theme.palette.grey[900], 0.03),
        }}
      >
        {loading ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              py: 8,
            }}
          >
            <CircularProgress />
            <Typography color="text.secondary">Loading preview...</Typography>
          </Box>
        ) : error ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              py: 8,
            }}
          >
            <Typography color="error">{error}</Typography>
            {onDownload && (
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={onDownload}
              >
                Download Instead
              </Button>
            )}
          </Box>
        ) : previewType === 'image' && blobUrl ? (
          <Box
            id="file-preview-container"
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              overflow: 'auto',
              p: 2,
            }}
          >
            <img
              src={blobUrl}
              alt={file.name}
              loading="lazy"
              decoding="async"
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                transform: `scale(${zoom / 100})`,
                transition: 'transform 0.2s ease-in-out',
              }}
            />
          </Box>
        ) : previewType === 'pdf' && blobUrl ? (
          <Box
            id="file-preview-container"
            sx={{
              width: '100%',
              height: '100%',
            }}
          >
            <iframe
              src={blobUrl}
              title={file.name}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
              }}
            />
          </Box>
        ) : (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              py: 8,
            }}
          >
            {getFileIcon(file.fileType)}
            <Typography variant="h6" color="text.secondary">
              Preview not available
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This file type cannot be previewed in the browser.
            </Typography>
            {onDownload && (
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={onDownload}
                sx={{ mt: 2 }}
              >
                Download File
              </Button>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ borderTop: '1px solid', borderColor: 'divider', py: 1.5, px: 2 }}>
        <Button onClick={onClose}>Close</Button>
        {onDownload && (
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={onDownload}
          >
            Download
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default FileViewerDialog;
