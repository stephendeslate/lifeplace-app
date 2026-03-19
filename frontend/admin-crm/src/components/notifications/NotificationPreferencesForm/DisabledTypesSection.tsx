import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  FormControlLabel,
  Switch,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Stack,
} from '@mui/material';
import { ExpandMore, Block } from '@mui/icons-material';
import type { NotificationType } from '@/types/notifications.types';

interface DisabledTypesSectionProps {
  notificationTypes: NotificationType[];
  disabledTypes: number[] | undefined;
  onDisabledTypesChange: (typeId: number, disabled: boolean) => void;
}

export const DisabledTypesSection: React.FC<DisabledTypesSectionProps> = ({
  notificationTypes,
  disabledTypes,
  onDisabledTypesChange,
}) => {
  if (notificationTypes.length === 0) {
    return null;
  }

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Box display="flex" alignItems="center" gap={1}>
          <Block fontSize="small" />
          <Typography variant="h6">Disabled Notification Types</Typography>
          {disabledTypes && disabledTypes.length > 0 && (
            <Chip label={disabledTypes.length} size="small" color="primary" />
          )}
        </Box>
      </AccordionSummary>

      <AccordionDetails>
        <Typography variant="body2" color="text.secondary" paragraph>
          Disable specific notification types completely
        </Typography>

        <Stack spacing={1}>
          {notificationTypes.map((type) => (
            <Card key={type.id} variant="outlined" sx={{ bgcolor: 'grey.50' }}>
              <CardContent sx={{ py: 1.5 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={!disabledTypes?.includes(type.id)}
                      onChange={(e) => onDisabledTypesChange(type.id, !e.target.checked)}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {type.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {type.description}
                      </Typography>
                    </Box>
                  }
                />
              </CardContent>
            </Card>
          ))}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
};
