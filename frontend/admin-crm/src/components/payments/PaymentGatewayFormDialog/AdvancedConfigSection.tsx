// frontend/admin-crm/src/components/payments/PaymentGatewayFormDialog/AdvancedConfigSection.tsx

import React from 'react';
import { TextField, Box, Typography, Collapse, Button } from '@mui/material';
import { ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon } from '@mui/icons-material';

interface AdvancedConfigSectionProps {
  showAdvanced: boolean;
  onToggle: () => void;
  configJson: string;
  onConfigJsonChange: (jsonString: string) => void;
}

export const AdvancedConfigSection: React.FC<AdvancedConfigSectionProps> = ({
  showAdvanced,
  onToggle,
  configJson,
  onConfigJsonChange,
}) => (
  <Box sx={{ mt: 3 }}>
    <Button
      onClick={onToggle}
      endIcon={showAdvanced ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      variant="text"
      color="primary"
    >
      Advanced Configuration
    </Button>

    <Collapse in={showAdvanced}>
      <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          For custom gateway configurations, add JSON configuration here.
        </Typography>

        <TextField
          fullWidth
          label="Custom Configuration (JSON)"
          value={configJson}
          onChange={(e) => onConfigJsonChange(e.target.value)}
          multiline
          rows={6}
          variant="outlined"
          sx={{ fontFamily: 'monospace' }}
        />
      </Box>
    </Collapse>
  </Box>
);
