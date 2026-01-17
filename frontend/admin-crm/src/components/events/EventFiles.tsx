// frontend/admin-crm/src/components/events/EventFiles.tsx

import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Tooltip,
  Menu,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  VisibilityOff as PrivateIcon,
  Folder as FolderIcon,
  InsertDriveFile as FileIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  Description as DocIcon,
  RemoveRedEye as PreviewIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useEventFiles } from '../../hooks/useEvents';
import { FileViewerDialog } from '../common/FileViewerDialog';
import type { Event, EventFile, FileCategory, CreateEventFileData } from '../../types/events.types';

interface EventFilesProps {
  event: Event;
}

const FILE_CATEGORIES = [
  { value: 'CONTRACT', label: 'Contract Document' },
  { value: 'QUOTE', label: 'Quote/Proposal' },
  { value: 'PAYMENT', label: 'Payment Document' },
  { value: 'REQUIREMENTS', label: 'Requirements Doc' },
  { value: 'PHOTO', label: 'Photo' },
  { value: 'OTHER', label: 'Other' },
];

const getFileIcon = (mimeType: string, category: FileCategory) => {
  if (mimeType?.includes('pdf')) return <PdfIcon fontSize="small" />;
  if (mimeType?.includes('image')) return <ImageIcon fontSize="small" />;
  if (mimeType?.includes('doc')) return <DocIcon fontSize="small" />;
  if (category === 'CONTRACT') return <DocIcon fontSize="small" />;
  if (category === 'PHOTO') return <ImageIcon fontSize="small" />;
  return <FileIcon fontSize="small" />;
};

const getCategoryColor = (category: FileCategory) => {
  switch (category) {
    case 'CONTRACT':
      return 'primary';
    case 'QUOTE':
      return 'info';
    case 'PAYMENT':
      return 'success';
    case 'REQUIREMENTS':
      return 'warning';
    case 'PHOTO':
      return 'secondary';
    default:
      return 'default';
  }
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

export const EventFiles: React.FC<EventFilesProps> = ({ event }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedFile, setSelectedFile] = useState<EventFile | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingFile, setViewingFile] = useState<EventFile | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Upload form state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileDescription, setFileDescription] = useState('');
  const [fileCategory, setFileCategory] = useState<FileCategory>('OTHER');
  const [isPublic, setIsPublic] = useState(false);

  const {
    files,
    isLoading,
    createFile,
    isCreating,
    updateFile,
    isUpdating,
    deleteFile,
    isDeleting,
    downloadFile,
    getFileBlob,
  } = useEventFiles(event.id, selectedCategory);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, file: EventFile) => {
    setAnchorEl(event.currentTarget);
    setSelectedFile(file);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedFile(null);
  };

  const handleUploadClick = () => {
    setUploadDialogOpen(true);
    setFileName('');
    setFileDescription('');
    setFileCategory('OTHER');
    setIsPublic(false);
    setUploadFile(null);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadFile(file);
      if (!fileName) {
        setFileName(file.name);
      }
    }
  };

  const handleUploadSubmit = () => {
    if (uploadFile) {
      const data: CreateEventFileData = {
        event: event.id,
        category: fileCategory,
        name: fileName || uploadFile.name,
        description: fileDescription,
        is_public: isPublic,
      };
      
      createFile(
        { data, file: uploadFile },
        {
          onSuccess: () => {
            setUploadDialogOpen(false);
            setUploadFile(null);
          },
        }
      );
    }
  };

  const handleEditClick = () => {
    if (selectedFile) {
      setFileName(selectedFile.name);
      setFileDescription(selectedFile.description);
      setFileCategory(selectedFile.category);
      setIsPublic(selectedFile.is_public);
      setEditDialogOpen(true);
    }
    // Only close the menu, don't clear selectedFile (needed for save)
    setAnchorEl(null);
  };

  const handleEditSubmit = () => {
    if (selectedFile) {
      updateFile(
        {
          id: selectedFile.id,
          data: {
            name: fileName,
            description: fileDescription,
            category: fileCategory,
            is_public: isPublic,
          },
        },
        {
          onSuccess: () => {
            setEditDialogOpen(false);
            setSelectedFile(null);
          },
        }
      );
    }
  };

  const handleDeleteClick = () => {
    if (selectedFile) {
      deleteFile(selectedFile.id);
    }
    handleMenuClose();
  };

  const handleDownloadClick = (file: EventFile) => {
    downloadFile(file);
  };

  const handleViewClick = (file: EventFile) => {
    setViewingFile(file);
    setViewDialogOpen(true);
    handleMenuClose();
  };

  const handleViewDialogClose = () => {
    setViewDialogOpen(false);
    setViewingFile(null);
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (files.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <FolderIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Files Yet
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Upload files related to this event such as contracts, photos, or documents.
        </Typography>
        <Button
          variant="contained"
          startIcon={<UploadIcon />}
          onClick={handleUploadClick}
        >
          Upload File
        </Button>
      </Paper>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="h6">Event Files</Typography>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              label="Category"
            >
              <MenuItem value="">All Categories</MenuItem>
              {FILE_CATEGORIES.map((cat) => (
                <MenuItem key={cat.value} value={cat.value}>
                  {cat.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
        <Button
          variant="contained"
          startIcon={<UploadIcon />}
          onClick={handleUploadClick}
        >
          Upload File
        </Button>
      </Box>

      {/* Files Table */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>File Name</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Size</TableCell>
              <TableCell>Visibility</TableCell>
              <TableCell>Uploaded</TableCell>
              <TableCell>Version</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {files.map((file) => (
              <TableRow key={file.id} hover>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {getFileIcon(file.mime_type, file.category)}
                    <Typography variant="body2">{file.name}</Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Chip
                    label={FILE_CATEGORIES.find((c) => c.value === file.category)?.label || file.category}
                    size="small"
                    color={getCategoryColor(file.category) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {file.description || '-'}
                  </Typography>
                </TableCell>
                <TableCell>{formatFileSize(file.size)}</TableCell>
                <TableCell>
                  <Chip
                    icon={file.is_public ? <ViewIcon /> : <PrivateIcon />}
                    label={file.is_public ? 'Public' : 'Private'}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {format(new Date(file.created_at), 'MMM dd, yyyy')}
                  </Typography>
                  {file.uploaded_by_name && (
                    <Typography variant="caption" color="text.secondary">
                      by {file.uploaded_by_name}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">v{file.version}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Tooltip title="View">
                      <IconButton
                        size="small"
                        onClick={() => handleViewClick(file)}
                      >
                        <PreviewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Download">
                      <IconButton
                        size="small"
                        onClick={() => handleDownloadClick(file)}
                      >
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, file)}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => selectedFile && handleViewClick(selectedFile)}>
          <ListItemIcon>
            <PreviewIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View File</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleEditClick}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit Details</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => selectedFile && handleDownloadClick(selectedFile)}>
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Download</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDeleteClick} disabled={isDeleting}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload File</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadIcon />}
              fullWidth
            >
              {uploadFile ? uploadFile.name : 'Select File'}
              <input
                type="file"
                hidden
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />
            </Button>
            <TextField
              fullWidth
              label="File Name"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
            />
            <TextField
              fullWidth
              label="Description"
              value={fileDescription}
              onChange={(e) => setFileDescription(e.target.value)}
              multiline
              rows={2}
            />
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={fileCategory}
                onChange={(e) => setFileCategory(e.target.value as FileCategory)}
                label="Category"
              >
                {FILE_CATEGORIES.map((cat) => (
                  <MenuItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
              }
              label="Make file visible to client"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleUploadSubmit}
            variant="contained"
            disabled={!uploadFile || !fileName || isCreating}
          >
            {isCreating ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit File Details</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="File Name"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
            />
            <TextField
              fullWidth
              label="Description"
              value={fileDescription}
              onChange={(e) => setFileDescription(e.target.value)}
              multiline
              rows={2}
            />
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={fileCategory}
                onChange={(e) => setFileCategory(e.target.value as FileCategory)}
                label="Category"
              >
                {FILE_CATEGORIES.map((cat) => (
                  <MenuItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
              }
              label="Make file visible to client"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleEditSubmit}
            variant="contained"
            disabled={!fileName || isUpdating}
          >
            {isUpdating ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Summary Card */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            File Summary
          </Typography>
          <Stack direction="row" spacing={3}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Total Files
              </Typography>
              <Typography variant="h6">{files.length}</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Public Files
              </Typography>
              <Typography variant="h6">
                {files.filter((f) => f.is_public).length}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Total Size
              </Typography>
              <Typography variant="h6">
                {formatFileSize(files.reduce((sum, f) => sum + f.size, 0))}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* File Viewer Dialog */}
      <FileViewerDialog
        open={viewDialogOpen}
        onClose={handleViewDialogClose}
        file={viewingFile}
        onDownload={viewingFile ? () => downloadFile(viewingFile) : undefined}
        getFileBlob={getFileBlob}
      />
    </Box>
  );
};