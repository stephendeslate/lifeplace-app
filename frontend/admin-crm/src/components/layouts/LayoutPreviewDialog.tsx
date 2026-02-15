// frontend/admin-crm/src/components/layouts/LayoutPreviewDialog.tsx

import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Stack,
  Typography,
  CircularProgress,
  IconButton,
  Paper,
} from "@mui/material";
import {
  Close as CloseIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import { useLayouts } from "../../hooks/useLayouts";
import type { EmailLayout } from "../../types/layouts.types";

interface LayoutPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  layout: EmailLayout;
}

export const LayoutPreviewDialog: React.FC<LayoutPreviewDialogProps> = ({
  open,
  onClose,
  layout,
}) => {
  const [headerTitle, setHeaderTitle] = useState("Email Preview");
  const [headerSubtitle, setHeaderSubtitle] = useState("");
  const [sampleContent, setSampleContent] = useState(
    '<h2 style="color: #333; margin-bottom: 16px;">Hello John!</h2>\n<p style="color: #666; line-height: 1.6;">This is a preview of how your email content will look within this layout.</p>\n<p style="color: #666; line-height: 1.6;">The layout wraps your content with consistent headers, footers, and styling.</p>',
  );

  const { usePreviewLayout } = useLayouts();
  const {
    mutate: previewLayout,
    data: previewResult,
    isPending: isPreviewing,
  } = usePreviewLayout();

  useEffect(() => {
    if (open && layout) {
      previewLayout({
        id: layout.id,
        data: {
          sample_content: sampleContent,
          header_title: headerTitle,
          header_subtitle: headerSubtitle,
        },
      });
    }
  }, [open, layout, previewLayout, sampleContent, headerTitle, headerSubtitle]);

  const handleRefreshPreview = () => {
    if (layout) {
      previewLayout({
        id: layout.id,
        data: {
          sample_content: sampleContent,
          header_title: headerTitle,
          header_subtitle: headerSubtitle,
        },
      });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h6">Preview: {layout.name}</Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: 3,
            height: { xs: "auto", md: "70vh" },
          }}
        >
          {/* Preview Controls */}
          <Paper
            variant="outlined"
            sx={{ width: { xs: "100%", md: 300 }, p: 2, flexShrink: 0 }}
          >
            <Typography variant="subtitle2" gutterBottom>
              Preview Options
            </Typography>

            <Stack spacing={2}>
              <TextField
                label="Header Title"
                value={headerTitle}
                onChange={(e) => setHeaderTitle(e.target.value)}
                size="small"
                fullWidth
              />

              <TextField
                label="Header Subtitle"
                value={headerSubtitle}
                onChange={(e) => setHeaderSubtitle(e.target.value)}
                size="small"
                fullWidth
              />

              <TextField
                label="Sample Content"
                value={sampleContent}
                onChange={(e) => setSampleContent(e.target.value)}
                multiline
                rows={8}
                size="small"
                fullWidth
                InputProps={{
                  sx: { fontFamily: "monospace", fontSize: 12 },
                }}
              />

              <Button
                variant="outlined"
                startIcon={
                  isPreviewing ? (
                    <CircularProgress size={16} />
                  ) : (
                    <RefreshIcon />
                  )
                }
                onClick={handleRefreshPreview}
                disabled={isPreviewing}
              >
                Refresh Preview
              </Button>
            </Stack>
          </Paper>

          {/* Preview Frame */}
          <Box
            sx={{
              flex: 1,
              bgcolor: "#f5f5f5",
              borderRadius: 1,
              overflow: "hidden",
            }}
          >
            {isPreviewing ? (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                }}
              >
                <CircularProgress />
              </Box>
            ) : previewResult?.html ? (
              <iframe
                srcDoc={previewResult.html}
                title="Layout Preview"
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                  backgroundColor: "white",
                }}
              />
            ) : (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                }}
              >
                <Typography color="text.secondary">
                  Click "Refresh Preview" to generate preview
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default LayoutPreviewDialog;
