/**
 * PermissionEditor - UI component for editing admin permissions.
 *
 * Features:
 * - Dropdown for presets (Full Admin, Limited Admin)
 * - Expandable checkbox list for custom permissions
 * - Chip showing permission count (e.g., "3/9 enabled")
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Chip,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import type { AdminPermissions, AdminPermissionKey } from '../../types/permissions.types';
import {
  DEFAULT_ADMIN_PERMISSIONS,
  FULL_ADMIN_PERMISSIONS,
  PERMISSION_LABELS,
  PERMISSION_DESCRIPTIONS,
  ALL_PERMISSION_KEYS,
} from '../../types/permissions.types';
import { tokens } from '../../design-system';

interface PermissionEditorProps {
  /** Current permission values */
  value: AdminPermissions;

  /** Callback when permissions change */
  onChange: (permissions: AdminPermissions) => void;

  /** Whether the editor is disabled */
  disabled?: boolean;

  /** Whether to show the accordion expanded by default */
  defaultExpanded?: boolean;
}

export const PermissionEditor: React.FC<PermissionEditorProps> = ({
  value,
  onChange,
  disabled = false,
  defaultExpanded = false,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>('custom');
  const [expanded, setExpanded] = useState(defaultExpanded);

  // Detect current preset based on permissions
  useEffect(() => {
    const isFullAdmin = ALL_PERMISSION_KEYS.every((key) => value[key] === true);
    const isLimitedAdmin = ALL_PERMISSION_KEYS.every((key) => value[key] === false);

    if (isFullAdmin) {
      setSelectedPreset('full_admin');
    } else if (isLimitedAdmin) {
      setSelectedPreset('limited_admin');
    } else {
      setSelectedPreset('custom');
    }
  }, [value]);

  const handlePresetChange = (event: SelectChangeEvent<string>) => {
    const presetKey = event.target.value;
    setSelectedPreset(presetKey);

    if (presetKey === 'full_admin') {
      onChange({ ...FULL_ADMIN_PERMISSIONS });
    } else if (presetKey === 'limited_admin') {
      onChange({ ...DEFAULT_ADMIN_PERMISSIONS });
    }
    // For 'custom', don't change anything
  };

  const handlePermissionChange = (permission: AdminPermissionKey, checked: boolean) => {
    const newPermissions = { ...value, [permission]: checked };
    onChange(newPermissions);
    // Preset will auto-update via useEffect
  };

  const permissionCount = useMemo(() => {
    return ALL_PERMISSION_KEYS.filter((key) => value[key]).length;
  }, [value]);

  const totalPermissions = ALL_PERMISSION_KEYS.length;

  return (
    <Box>
      {/* Preset Selector */}
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel id="permission-preset-label">Permission Level</InputLabel>
        <Select
          labelId="permission-preset-label"
          id="permission-preset"
          value={selectedPreset}
          onChange={handlePresetChange}
          label="Permission Level"
          disabled={disabled}
        >
          <MenuItem value="full_admin">
            <Box>
              <Typography variant="body1" fontWeight={500}>
                Full Admin
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Full access to all settings and features
              </Typography>
            </Box>
          </MenuItem>
          <MenuItem value="limited_admin">
            <Box>
              <Typography variant="body1" fontWeight={500}>
                Limited Admin
              </Typography>
              <Typography variant="caption" color="text.secondary">
                View-only access to settings, basic operations
              </Typography>
            </Box>
          </MenuItem>
          <MenuItem value="custom">
            <Box>
              <Typography variant="body1" fontWeight={500}>
                Custom
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Configure individual permissions below
              </Typography>
            </Box>
          </MenuItem>
        </Select>
      </FormControl>

      {/* Expandable Permission Checkboxes */}
      <Accordion
        expanded={expanded}
        onChange={() => setExpanded(!expanded)}
        sx={{
          backgroundColor: tokens.color.neutral[50],
          '&:before': { display: 'none' },
          borderRadius: `${tokens.spacing.radius.md} !important`,
          border: `1px solid ${tokens.color.neutral[200]}`,
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="subtitle2">Individual Permissions</Typography>
            <Chip
              label={`${permissionCount}/${totalPermissions} enabled`}
              size="small"
              color={
                permissionCount === totalPermissions
                  ? 'success'
                  : permissionCount === 0
                    ? 'default'
                    : 'primary'
              }
              sx={{ fontWeight: 500 }}
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {ALL_PERMISSION_KEYS.map((permission) => (
              <FormControlLabel
                key={permission}
                control={
                  <Checkbox
                    checked={value[permission]}
                    onChange={(e) => handlePermissionChange(permission, e.target.checked)}
                    disabled={disabled}
                    size="small"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={500}>
                      {PERMISSION_LABELS[permission]}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {PERMISSION_DESCRIPTIONS[permission]}
                    </Typography>
                  </Box>
                }
                sx={{
                  alignItems: 'flex-start',
                  '& .MuiFormControlLabel-label': { ml: 0.5 },
                }}
              />
            ))}
          </Box>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default PermissionEditor;
