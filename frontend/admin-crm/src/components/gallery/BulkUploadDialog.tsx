import React, { useState, useCallback } from "react";
import { TextField, MenuItem, Stack, Box, Typography } from "@mui/material";
import {
  ModernDialog,
  createDialogActions,
  GalleryUploadField,
} from "../common";
import { GALLERY_CATEGORIES } from "../../types/gallery.types";
import { glassInputStyles } from "../../design-system/utils/glassmorphism";

interface BulkUploadDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
  isLoading: boolean;
}

const MAX_IMAGES = 20;

export const BulkUploadDialog: React.FC<BulkUploadDialogProps> = ({
  open,
  onClose,
  onSubmit,
  isLoading,
}) => {
  const [category, setCategory] = useState("GENERAL");
  const [files, setFiles] = useState<(string | File)[]>([]);
  const [error, setError] = useState("");

  // Reset state whenever the dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      setCategory("GENERAL");
      setFiles([]);
      setError("");
    }
  }, [open]);

  const handleClose = useCallback(() => {
    if (!isLoading) {
      onClose();
    }
  }, [isLoading, onClose]);

  const handleSubmit = useCallback(() => {
    const imageFiles = files.filter((f): f is File => f instanceof File);
    if (imageFiles.length === 0) {
      setError("Please select at least one image.");
      return;
    }

    const formData = new FormData();
    formData.append("category", category);
    for (const file of imageFiles) {
      formData.append("images", file);
    }

    onSubmit(formData);
  }, [files, category, onSubmit]);

  const actions = createDialogActions(handleClose, handleSubmit, {
    cancelLabel: "Cancel",
    confirmLabel: isLoading
      ? "Uploading..."
      : `Upload ${files.length} Photo${files.length === 1 ? "" : "s"}`,
    isLoading,
    confirmDisabled: isLoading || files.length === 0,
  });

  return (
    <ModernDialog
      open={open}
      onClose={handleClose}
      title="Bulk Upload Photos"
      actions={actions}
      maxWidth="sm"
      fullWidth
    >
      {open && (
        <Box component="form" noValidate>
          <Stack spacing={3}>
            <Typography variant="body2" color="text.secondary">
              Select a category and upload multiple photos at once. Titles will
              be auto-generated from filenames.
            </Typography>

            <TextField
              fullWidth
              select
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              sx={glassInputStyles}
            >
              {GALLERY_CATEGORIES.map((cat) => (
                <MenuItem key={cat.value} value={cat.value}>
                  {cat.label}
                </MenuItem>
              ))}
            </TextField>

            <GalleryUploadField
              label="Photos"
              value={files}
              onChange={(newFiles) => {
                setFiles(newFiles);
                if (error) setError("");
              }}
              maxImages={MAX_IMAGES}
              maxSizeMB={10}
              helperText={error || "JPEG, PNG, GIF, or WebP. Max 10MB each."}
            />
          </Stack>
        </Box>
      )}
    </ModernDialog>
  );
};
