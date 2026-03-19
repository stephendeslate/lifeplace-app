import React from 'react';
import { Box, Typography, FormControl, Select, MenuItem } from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type {
  ChartDataPoint,
  SessionStatusEntry,
  FunnelDataPoint,
  MetricType,
} from './useSessionAnalyticsLogic';

interface PerformanceChartsProps {
  chartData: ChartDataPoint[];
  sessionStatusData: SessionStatusEntry[];
  conversionFunnelData: FunnelDataPoint[];
  selectedMetric: MetricType;
  setSelectedMetric: (metric: MetricType) => void;
}

export const PerformanceCharts: React.FC<PerformanceChartsProps> = ({
  chartData,
  sessionStatusData,
  conversionFunnelData,
  selectedMetric,
  setSelectedMetric,
}) => (
  <>
    <Box display="flex" flexWrap="wrap" gap={3}>
      <Box flex="1 1 600px" minWidth={300}>
        <Box sx={{ borderRadius: 1, bgcolor: 'background.paper' }}>
          <Box sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Performance Trends</Typography>
              <FormControl size="small">
                <Select
                  value={selectedMetric}
                  onChange={(e) => setSelectedMetric(e.target.value as MetricType)}
                >
                  <MenuItem value="sessions">Sessions</MenuItem>
                  <MenuItem value="conversions">Conversions</MenuItem>
                  <MenuItem value="revenue">Revenue</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <RechartsTooltip />
                <Line
                  type="monotone"
                  dataKey={selectedMetric}
                  stroke="#1976d2"
                  strokeWidth={2}
                  dot={{ fill: '#1976d2' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </Box>
      </Box>

      <Box flex="1 1 300px" minWidth={300}>
        <Box sx={{ borderRadius: 1, bgcolor: 'background.paper' }}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Session Status
            </Typography>

            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={sessionStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {sessionStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>

            <Box mt={2}>
              {sessionStatusData.map((entry) => (
                <Box key={entry.name} display="flex" alignItems="center" gap={1} mb={1}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: entry.color,
                    }}
                  />
                  <Typography variant="body2">
                    {entry.name}: {entry.value}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>

    <Box sx={{ borderRadius: 1, bgcolor: 'background.paper' }}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Conversion Funnel
        </Typography>

        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={conversionFunnelData} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" domain={[0, 100]} />
            <YAxis dataKey="name" type="category" width={150} />
            <RechartsTooltip formatter={(value) => [`${value}%`, 'Completion Rate']} />
            <Bar dataKey="completionRate" fill="#1976d2" />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  </>
);
