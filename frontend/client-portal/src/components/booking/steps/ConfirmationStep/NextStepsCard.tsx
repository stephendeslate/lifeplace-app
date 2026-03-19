// frontend/client-portal/src/components/booking/steps/ConfirmationStep/NextStepsCard.tsx

import React from 'react';
import { Paper, Typography, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { NavigateNext } from '@mui/icons-material';

interface NextStep {
  title: string;
  description?: string;
  icon?: React.ReactNode | string;
}

interface NextStepsCardProps {
  nextSteps: NextStep[];
}

export const NextStepsCard: React.FC<NextStepsCardProps> = ({ nextSteps }) => {
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        What's Next?
      </Typography>
      <List>
        {nextSteps.map((step, index) => (
          <ListItem key={index}>
            <ListItemIcon>
              {step.icon ? (
                typeof step.icon === 'string' ? (
                  <NavigateNext color="primary" />
                ) : (
                  step.icon
                )
              ) : (
                <NavigateNext color="primary" />
              )}
            </ListItemIcon>
            <ListItemText primary={step.title} secondary={step.description} />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};
