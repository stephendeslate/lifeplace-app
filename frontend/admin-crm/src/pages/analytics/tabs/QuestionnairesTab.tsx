// frontend/admin-crm/src/pages/analytics/tabs/QuestionnairesTab.tsx
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
  Chip,
  LinearProgress,
  Slider,
  Alert,
} from '@mui/material';
import { ModernCard } from '../../../components/common/ModernCard';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import { KPICard } from '../../../components/analytics';
import {
  useQuestionnaireSummary,
  useQuestionnaireFieldHeatmap,
  useQuestionnaireProblemFields,
} from '../../../hooks/useAnalytics';
import type { DateRange } from '../../../types/analytics.types';
import { tokens } from '../../../design-system';

interface QuestionnairesTabProps {
  dateRange: DateRange;
}

const getCompletionColor = (rate: number): string => {
  if (rate >= 80) return tokens.color.success[500];
  if (rate >= 60) return tokens.color.warning[500];
  return tokens.color.error[500];
};

export const QuestionnairesTab: React.FC<QuestionnairesTabProps> = ({ dateRange }) => {
  const [selectedQuestionnaireId, setSelectedQuestionnaireId] = useState<number | null>(null);
  const [threshold, setThreshold] = useState<number>(80);

  const { data: summary, isLoading: summaryLoading } = useQuestionnaireSummary(dateRange);
  const { data: heatmap, isLoading: heatmapLoading } = useQuestionnaireFieldHeatmap(
    selectedQuestionnaireId,
    dateRange
  );
  const { data: problemFields, isLoading: problemsLoading } = useQuestionnaireProblemFields(
    dateRange,
    threshold
  );

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  return (
    <Box>
      {/* Overall Summary */}
      <Box mb={4}>
        <Typography variant="h6" mb={2}>
          Questionnaire Completion Overview
        </Typography>
        {summaryLoading ? (
          <Box display="flex" gap={2} flexWrap="wrap">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} variant="rectangular" width={180} height={100} />
            ))}
          </Box>
        ) : summary?.overall ? (
          <Box
            display="flex"
            gap={2}
            sx={{
              flexWrap: 'wrap',
              '& > *': {
                flex: '1 1 180px',
                minWidth: 180,
              },
            }}
          >
            <KPICard
              title="Events with Responses"
              value={summary.overall.total_events_with_responses}
              isLoading={summaryLoading}
              color="primary"
            />
            <KPICard
              title="Complete Responses"
              value={summary.overall.total_complete}
              isLoading={summaryLoading}
              color="success"
            />
            <KPICard
              title="Incomplete Responses"
              value={summary.overall.total_incomplete}
              isLoading={summaryLoading}
              color="warning"
            />
            <KPICard
              title="Overall Completion Rate"
              value={formatPercent(summary.overall.overall_completion_rate)}
              isLoading={summaryLoading}
              color={summary.overall.overall_completion_rate >= 80 ? 'success' : 'warning'}
            />
          </Box>
        ) : (
          <ModernCard variant="glass" size="small" sx={{ textAlign: 'center' }}>
            <Typography color="text.secondary">
              No questionnaire data available for the selected period
            </Typography>
          </ModernCard>
        )}
      </Box>

      {/* Per-Questionnaire Summary */}
      <Box mb={4}>
        <Typography variant="h6" mb={2}>
          Completion by Questionnaire
        </Typography>
        {summaryLoading ? (
          <Skeleton variant="rectangular" height={300} />
        ) : summary?.by_questionnaire && summary.by_questionnaire.length > 0 ? (
          <>
            <ModernCard variant="glass" size="medium" sx={{ mb: 2 }}>
              <Box sx={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart
                    data={summary.by_questionnaire}
                    layout="vertical"
                    margin={{ top: 20, right: 30, left: 150, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <YAxis
                      type="category"
                      dataKey="questionnaire_name"
                      tick={{ fontSize: 12 }}
                      width={140}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatPercent(value), 'Completion Rate']}
                    />
                    <Bar dataKey="completion_rate" name="Completion Rate">
                      {summary.by_questionnaire.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getCompletionColor(entry.completion_rate)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </ModernCard>
            <ModernCard variant="glass" size="medium">
              <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Questionnaire</TableCell>
                    <TableCell align="center">Total Fields</TableCell>
                    <TableCell align="center">Required Fields</TableCell>
                    <TableCell align="center">Events</TableCell>
                    <TableCell align="center">Complete</TableCell>
                    <TableCell align="center">Incomplete</TableCell>
                    <TableCell align="center">Completion Rate</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {summary.by_questionnaire.map((q) => (
                    <TableRow
                      key={q.questionnaire_id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => setSelectedQuestionnaireId(q.questionnaire_id)}
                      selected={selectedQuestionnaireId === q.questionnaire_id}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {q.questionnaire_name}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">{q.total_fields}</TableCell>
                      <TableCell align="center">{q.required_fields}</TableCell>
                      <TableCell align="center">{q.events_with_responses}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={q.complete_responses}
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={q.incomplete_responses}
                          size="small"
                          color={q.incomplete_responses > 0 ? 'warning' : 'default'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                          <LinearProgress
                            variant="determinate"
                            value={q.completion_rate}
                            sx={{
                              width: 60,
                              height: 8,
                              borderRadius: 4,
                              bgcolor: tokens.color.neutral[200],
                              '& .MuiLinearProgress-bar': {
                                bgcolor: getCompletionColor(q.completion_rate),
                              },
                            }}
                          />
                          <Typography variant="body2">{formatPercent(q.completion_rate)}</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </TableContainer>
            </ModernCard>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Click on a questionnaire row to view field-level completion details
            </Typography>
          </>
        ) : (
          <ModernCard variant="glass" size="small" sx={{ textAlign: 'center' }}>
            <Typography color="text.secondary">
              No questionnaire data available
            </Typography>
          </ModernCard>
        )}
      </Box>

      {/* Field Heatmap for Selected Questionnaire */}
      {selectedQuestionnaireId && (
        <Box mb={4}>
          <Typography variant="h6" mb={2}>
            Field Completion Heatmap
            {summary?.by_questionnaire && (
              <Typography component="span" color="text.secondary" sx={{ ml: 1, fontWeight: 'normal' }}>
                - {summary.by_questionnaire.find((q) => q.questionnaire_id === selectedQuestionnaireId)?.questionnaire_name}
              </Typography>
            )}
          </Typography>
          {heatmapLoading ? (
            <Skeleton variant="rectangular" height={300} />
          ) : heatmap && heatmap.length > 0 ? (
            <ModernCard variant="glass" size="medium">
              <Box sx={{ width: '100%', height: Math.max(300, heatmap.length * 40) }}>
                <ResponsiveContainer>
                  <BarChart
                    data={heatmap}
                    layout="vertical"
                    margin={{ top: 20, right: 30, left: 180, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <YAxis
                      type="category"
                      dataKey="field_name"
                      tick={{ fontSize: 11 }}
                      width={170}
                    />
                    <Tooltip
                      formatter={(value: number, _name: string, props: { payload?: { response_count: number } }) => [
                        formatPercent(value),
                        `${props.payload?.response_count ?? 0} responses`,
                      ]}
                      labelFormatter={(label) => `Field: ${label}`}
                    />
                    <Bar dataKey="completion_rate" name="Completion Rate">
                      {heatmap.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getCompletionColor(entry.completion_rate)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
              <TableContainer sx={{ mt: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Field</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell align="center">Required</TableCell>
                      <TableCell align="center">Responses</TableCell>
                      <TableCell align="center">Completion Rate</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {heatmap.map((field) => (
                      <TableRow key={field.field_id}>
                        <TableCell>{field.field_name}</TableCell>
                        <TableCell>
                          <Chip label={field.field_type} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell align="center">
                          {field.required ? (
                            <CheckCircleIcon fontSize="small" color="success" />
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell align="center">{field.response_count}</TableCell>
                        <TableCell align="center">
                          <Chip
                            label={formatPercent(field.completion_rate)}
                            size="small"
                            sx={{
                              bgcolor: getCompletionColor(field.completion_rate),
                              color: 'white',
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </ModernCard>
          ) : (
            <ModernCard variant="glass" size="small" sx={{ textAlign: 'center' }}>
              <Typography color="text.secondary">
                No field data available for this questionnaire
              </Typography>
            </ModernCard>
          )}
        </Box>
      )}

      {/* Problem Fields */}
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            Problem Fields
            <Typography component="span" color="text.secondary" sx={{ ml: 1, fontWeight: 'normal', fontSize: '0.875rem' }}>
              (completion rate below threshold)
            </Typography>
          </Typography>
          <Box display="flex" alignItems="center" gap={2} sx={{ minWidth: 300 }}>
            <Typography variant="body2" color="text.secondary">
              Threshold:
            </Typography>
            <Slider
              value={threshold}
              onChange={(_, value) => setThreshold(value as number)}
              min={50}
              max={100}
              step={5}
              marks={[
                { value: 50, label: '50%' },
                { value: 80, label: '80%' },
                { value: 100, label: '100%' },
              ]}
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => `${v}%`}
              sx={{ width: 200 }}
            />
          </Box>
        </Box>
        {problemsLoading ? (
          <Skeleton variant="rectangular" height={200} />
        ) : problemFields && problemFields.length > 0 ? (
          <>
            <Alert severity="warning" sx={{ mb: 2 }}>
              {problemFields.length} field{problemFields.length !== 1 ? 's' : ''} found with completion
              rate below {threshold}%. Consider simplifying these fields or making them optional.
            </Alert>
            <ModernCard variant="glass" size="medium">
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Questionnaire</TableCell>
                      <TableCell>Field Name</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell align="center">Completion Rate</TableCell>
                      <TableCell align="center">Gap from Threshold</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {problemFields.map((field, index) => (
                      <TableRow key={index}>
                        <TableCell>{field.questionnaire_name}</TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <WarningIcon fontSize="small" color="warning" />
                            {field.field_name}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip label={field.field_type} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={formatPercent(field.completion_rate)}
                            size="small"
                            color="error"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" color="error">
                            -{formatPercent(field.gap_from_threshold)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </ModernCard>
          </>
        ) : (
          <ModernCard variant="glass" size="small" sx={{ textAlign: 'center' }}>
            <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
              <CheckCircleIcon color="success" />
              <Typography color="success.main">
                No fields below the {threshold}% completion threshold
              </Typography>
            </Box>
          </ModernCard>
        )}
      </Box>
    </Box>
  );
};

export default QuestionnairesTab;
