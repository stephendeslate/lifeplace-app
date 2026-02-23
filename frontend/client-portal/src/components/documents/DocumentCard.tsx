// frontend/client-portal/src/components/documents/DocumentCard.tsx

import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  IconButton,
  Chip,
  Stack,
  Box,
  Tooltip,
  alpha,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Visibility as ViewIcon,
  InsertDriveFile as FileIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  Description as DocIcon,
  Receipt as ReceiptIcon,
  Gavel as ContractIcon,
  Photo as PhotoIcon,
} from '@mui/icons-material';
import { formatInTimeZone } from 'date-fns-tz';
import type { DocumentItem, DocumentType } from '../../types/documents.types';
import { formatFileSize, DOCUMENT_TYPE_CONFIGS } from '../../types/documents.types';

interface DocumentCardProps {
  document: DocumentItem;
  onDownload: (document: DocumentItem) => void;
  onPreview?: (document: DocumentItem) => void;
}

// Get icon for document type
const getDocumentIcon = (doc: DocumentItem): React.ReactNode => {
  // First check file extension for more specific icons
  const ext = doc.fileType.toLowerCase();

  if (ext === 'pdf' || ext.includes('pdf')) {
    return <PdfIcon sx={{ fontSize: 40, color: '#d32f2f' }} />;
  }
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(ext)) {
    return <ImageIcon sx={{ fontSize: 40, color: '#1976d2' }} />;
  }
  if (['doc', 'docx', 'txt', 'rtf'].includes(ext)) {
    return <DocIcon sx={{ fontSize: 40, color: '#1565c0' }} />;
  }

  // Fall back to document type icons
  const typeIcons: Record<DocumentType, React.ReactNode> = {
    CONTRACT: <ContractIcon sx={{ fontSize: 40, color: '#1976d2' }} />,
    UPLOAD: <FileIcon sx={{ fontSize: 40, color: '#2e7d32' }} />,
    RECEIPT: <ReceiptIcon sx={{ fontSize: 40, color: '#ed6c02' }} />,
    PHOTO: <PhotoIcon sx={{ fontSize: 40, color: '#9c27b0' }} />,
    OTHER: <FileIcon sx={{ fontSize: 40, color: '#757575' }} />,
  };

  return typeIcons[doc.type] || <FileIcon sx={{ fontSize: 40, color: '#757575' }} />;
};

export const DocumentCard: React.FC<DocumentCardProps> = ({ document, onDownload, onPreview }) => {
  const PHILIPPINE_TIMEZONE = 'Asia/Manila';
  const config = DOCUMENT_TYPE_CONFIGS[document.type];

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 4,
        },
      }}
    >
      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        {/* Icon and Type Badge */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            py: 2,
            mb: 2,
            backgroundColor: alpha(config.color, 0.08),
            borderRadius: 2,
          }}
        >
          {getDocumentIcon(document)}
        </Box>

        {/* Document Name */}
        <Tooltip title={document.name}>
          <Typography
            variant="subtitle1"
            component="h3"
            sx={{
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              mb: 0.5,
            }}
          >
            {document.name}
          </Typography>
        </Tooltip>

        {/* Event Name */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            mb: 1,
          }}
        >
          {document.eventName}
        </Typography>

        {/* Meta Info */}
        <Stack direction="row" spacing={1} flexWrap="wrap" gap={0.5}>
          <Chip
            label={config.label}
            size="small"
            sx={{
              backgroundColor: alpha(config.color, 0.12),
              color: config.color,
              fontWeight: 500,
              fontSize: '0.7rem',
              height: 22,
            }}
          />
          {document.fileSize > 0 && (
            <Chip
              label={formatFileSize(document.fileSize)}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem', height: 22 }}
            />
          )}
          {document.contractStatus === 'SIGNED' && (
            <Chip
              label="Signed"
              size="small"
              color="success"
              sx={{ fontSize: '0.7rem', height: 22 }}
            />
          )}
        </Stack>

        {/* Date */}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          {formatInTimeZone(document.createdAt, PHILIPPINE_TIMEZONE, 'MMM dd, yyyy')}
        </Typography>
      </CardContent>

      <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
        {onPreview && (
          <Tooltip title="View">
            <IconButton
              size="small"
              onClick={() => onPreview(document)}
              aria-label={`View ${document.name}`}
            >
              <ViewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Download">
          <IconButton
            size="small"
            onClick={() => onDownload(document)}
            color="primary"
            aria-label={`Download ${document.name}`}
          >
            <DownloadIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </CardActions>
    </Card>
  );
};

export default DocumentCard;
