import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
} from '@mui/material';
import type { StepAnalytics } from './useSessionAnalyticsLogic';
import { formatDuration } from './useSessionAnalyticsLogic';

interface StepPerformanceTableProps {
  stepAnalytics: StepAnalytics[];
}

export const StepPerformanceTable: React.FC<StepPerformanceTableProps> = ({ stepAnalytics }) => (
  <Box sx={{ borderRadius: 1, bgcolor: 'background.paper' }}>
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Step Performance
      </Typography>

      <TableContainer
        sx={{
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Step</TableCell>
              <TableCell>Type</TableCell>
              <TableCell align="center">Completion Rate</TableCell>
              <TableCell align="center">Drop-off Rate</TableCell>
              <TableCell align="center">Avg. Time</TableCell>
              <TableCell align="center">Error Rate</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {stepAnalytics.map((step) => (
              <TableRow key={step.stepId}>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {step.stepName}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip label={step.stepType} size="small" variant="outlined" color="primary" />
                </TableCell>
                <TableCell align="center">
                  <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                    <Typography variant="body2">{step.completionRate.toFixed(1)}%</Typography>
                    <Box sx={{ width: 60 }}>
                      <LinearProgress
                        variant="determinate"
                        value={step.completionRate}
                        sx={{ height: 4 }}
                      />
                    </Box>
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Typography
                    variant="body2"
                    color={step.dropOffRate > 20 ? 'error' : 'text.primary'}
                  >
                    {step.dropOffRate.toFixed(1)}%
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2">{formatDuration(step.averageTimeSpent)}</Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2" color={step.errorRate > 3 ? 'error' : 'text.primary'}>
                    {step.errorRate.toFixed(1)}%
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  </Box>
);
