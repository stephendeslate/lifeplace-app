import React from 'react';
import {
  Box,
  Typography,
  Stack,
  Button,
  Avatar,
  CircularProgress,
  type Theme,
} from '@mui/material';
import { Download as DownloadIcon, Description as DocumentIcon } from '@mui/icons-material';
import { GlassCard } from '@/design-system/components/GlassCard';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';
import type { ContractDocument } from '@/types/contracts.types';

interface DocumentsTabPanelProps {
  documents: ContractDocument[];
  isLoading: boolean;
  theme: Theme;
}

export const DocumentsTabPanel: React.FC<DocumentsTabPanelProps> = ({
  documents,
  isLoading,
  theme,
}) => (
  <AnimatedElement animation="fadeIn">
    {isLoading ? (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    ) : documents.length > 0 ? (
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Contract Documents
        </Typography>
        <Stack spacing={2}>
          {documents.map((doc) => (
            <GlassCard key={doc.id} variant="light" intensity="medium" sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                    <DocumentIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                      {doc.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {doc.document_type_display} - v{doc.version}
                    </Typography>
                    {doc.description && (
                      <Typography variant="body2" color="text.secondary">
                        {doc.description}
                      </Typography>
                    )}
                  </Box>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<DownloadIcon />}
                  href={doc.file}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Download
                </Button>
              </Stack>
            </GlassCard>
          ))}
        </Stack>
      </Box>
    ) : (
      <GlassCard variant="light" intensity="subtle" sx={{ p: 4, textAlign: 'center' }}>
        <DocumentIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          No Documents
        </Typography>
        <Typography variant="body2" color="text.secondary">
          No additional documents attached to this contract.
        </Typography>
      </GlassCard>
    )}
  </AnimatedElement>
);
