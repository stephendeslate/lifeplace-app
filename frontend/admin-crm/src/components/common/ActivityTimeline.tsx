// frontend/admin-crm/src/components/common/ActivityTimeline.tsx

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Stack,
  IconButton,
  Collapse,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
} from '@mui/material';
// Simple Timeline components using basic MUI
const Timeline: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box sx={{ position: 'relative' }}>
    {children}
  </Box>
);

const TimelineItem: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box sx={{ display: 'flex', mb: 2 }}>
    {children}
  </Box>
);

const TimelineSeparator: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mr: 2 }}>
    {children}
  </Box>
);

const TimelineConnector: React.FC = () => (
  <Box sx={{ 
    width: 2, 
    height: 40, 
    bgcolor: 'grey.300',
    my: 0.5,
    borderRadius: 1
  }} />
);

const TimelineContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box sx={{ flex: 1 }}>
    {children}
  </Box>
);

const TimelineDot: React.FC<{ 
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
  variant?: 'filled' | 'outlined';
  children?: React.ReactNode;
}> = ({ color = 'primary', variant = 'filled', children }) => (
  <Box sx={{
    width: 24,
    height: 24,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    bgcolor: variant === 'filled' ? `${color}.main` : 'transparent',
    border: variant === 'outlined' ? `2px solid` : 'none',
    borderColor: variant === 'outlined' ? `${color}.main` : 'transparent',
    color: variant === 'filled' ? 'white' : `${color}.main`,
    fontSize: '14px',
  }}>
    {children}
  </Box>
);
import {
  Email as EmailIcon,
  Sms as SmsIcon,
  Payment as PaymentIcon,
  Event as EventIcon,
  Assignment as ContractIcon,
  Receipt as InvoiceIcon,
  Note as NoteIcon,
  Person as ClientIcon,
  Edit as EditIcon,
  CheckCircle as CompletedIcon,
  Schedule as ScheduleIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { format, isToday, isYesterday, differenceInDays } from 'date-fns';

export interface ActivityItem {
  id: string;
  type: 'communication' | 'payment' | 'event' | 'contract' | 'invoice' | 'note' | 'status_change' | 'workflow';
  title: string;
  description?: string;
  timestamp: string;
  status?: 'completed' | 'pending' | 'failed' | 'in_progress';
  metadata?: Record<string, unknown>;
  relatedEntity?: {
    type: 'client' | 'event' | 'payment' | 'contract' | 'invoice';
    id: number;
    name: string;
  };
  user?: {
    name: string;
    avatar?: string;
  };
}

interface ActivityTimelineProps {
  activities: ActivityItem[];
  isLoading?: boolean;
  onRefresh?: () => void;
  showFilters?: boolean;
  maxHeight?: string | number;
  onActivityClick?: (activity: ActivityItem) => void;
}

const getActivityIcon = (type: string, status?: string) => {
  const iconProps = { fontSize: 'small' as const };
  
  switch (type) {
    case 'communication':
      return <EmailIcon {...iconProps} />;
    case 'sms':
      return <SmsIcon {...iconProps} />;
    case 'payment':
      return <PaymentIcon {...iconProps} />;
    case 'event':
      return <EventIcon {...iconProps} />;
    case 'contract':
      return <ContractIcon {...iconProps} />;
    case 'invoice':
      return <InvoiceIcon {...iconProps} />;
    case 'note':
      return <NoteIcon {...iconProps} />;
    case 'status_change':
      return status === 'completed' ? <CompletedIcon {...iconProps} /> : <EditIcon {...iconProps} />;
    case 'workflow':
      return <ScheduleIcon {...iconProps} />;
    default:
      return <EventIcon {...iconProps} />;
  }
};

const getActivityColor = (type: string, status?: string): 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info' => {
  if (status === 'failed') return 'error';
  if (status === 'completed') return 'success';
  if (status === 'pending') return 'warning';
  
  switch (type) {
    case 'communication':
    case 'sms':
      return 'info';
    case 'payment':
      return 'success';
    case 'event':
      return 'primary';
    case 'contract':
    case 'invoice':
      return 'secondary';
    case 'workflow':
      return 'primary';
    default:
      return 'primary';
  }
};

const formatRelativeTime = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = differenceInDays(now, date);
  
  if (isToday(date)) {
    return `Today at ${format(date, 'h:mm a')}`;
  } else if (isYesterday(date)) {
    return `Yesterday at ${format(date, 'h:mm a')}`;
  } else if (diffDays < 7) {
    return format(date, 'EEEE \'at\' h:mm a');
  } else {
    return format(date, 'MMM d, yyyy \'at\' h:mm a');
  }
};

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  activities,
  onRefresh,
  showFilters = true,
  maxHeight = '600px',
  onActivityClick,
}) => {
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Filter activities
  const filteredActivities = activities.filter(activity => {
    if (typeFilter !== 'all' && activity.type !== typeFilter) return false;
    if (statusFilter !== 'all' && activity.status !== statusFilter) return false;
    if (searchTerm && !activity.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !activity.description?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const handleExpandItem = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const uniqueTypes = [...new Set(activities.map(a => a.type))];
  const uniqueStatuses = [...new Set(activities.map(a => a.status).filter(Boolean))];

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Recent Activity</Typography>
          <Stack direction="row" spacing={1}>
            {onRefresh && (
              <IconButton onClick={onRefresh} size="small">
                <RefreshIcon />
              </IconButton>
            )}
            {showFilters && (
              <IconButton 
                onClick={() => setShowFiltersPanel(!showFiltersPanel)}
                size="small"
                color={showFiltersPanel ? 'primary' : 'default'}
              >
                <FilterIcon />
              </IconButton>
            )}
          </Stack>
        </Box>

        {/* Filters Panel */}
        <Collapse in={showFiltersPanel}>
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Search activities"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={typeFilter}
                    label="Type"
                    onChange={(e) => setTypeFilter(e.target.value)}
                  >
                    <MenuItem value="all">All Types</MenuItem>
                    {uniqueTypes.map(type => (
                      <MenuItem key={type} value={type}>
                        {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status"
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <MenuItem value="all">All Statuses</MenuItem>
                    {uniqueStatuses.map(status => (
                      <MenuItem key={status} value={status}>
                        {status?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setTypeFilter('all');
                    setStatusFilter('all');
                    setSearchTerm('');
                  }}
                  size="small"
                >
                  Clear
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Collapse>

        {/* Activity Timeline */}
        <Box sx={{ maxHeight, overflowY: 'auto' }}>
          {filteredActivities.length === 0 ? (
            <Box textAlign="center" py={4}>
              <Typography variant="body2" color="text.secondary">
                {activities.length === 0 ? 'No activities yet' : 'No activities match your filters'}
              </Typography>
            </Box>
          ) : (
            <Timeline>
              {filteredActivities.map((activity, index) => {
                const isExpanded = expandedItems.has(activity.id);
                const hasDetails = activity.description || activity.metadata || activity.relatedEntity;
                
                return (
                  <TimelineItem key={activity.id}>
                    <TimelineSeparator>
                      <TimelineDot 
                        color={getActivityColor(activity.type, activity.status)}
                        variant={activity.status === 'completed' ? 'filled' : 'outlined'}
                      >
                        {getActivityIcon(activity.type, activity.status)}
                      </TimelineDot>
                      {index < filteredActivities.length - 1 && <TimelineConnector />}
                    </TimelineSeparator>
                    <TimelineContent>
                      <Card 
                        variant="outlined" 
                        sx={{ 
                          mb: 2,
                          cursor: onActivityClick ? 'pointer' : 'default',
                          '&:hover': onActivityClick ? { bgcolor: 'action.hover' } : {}
                        }}
                        onClick={onActivityClick ? () => onActivityClick(activity) : undefined}
                      >
                        <CardContent sx={{ pb: hasDetails ? 1 : 2 }}>
                          <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
                            <Typography variant="subtitle2" fontWeight="medium">
                              {activity.title}
                            </Typography>
                            <Stack direction="row" spacing={1} alignItems="center">
                              {activity.status && (
                                <Chip
                                  label={activity.status.replace('_', ' ')}
                                  size="small"
                                  color={getActivityColor(activity.type, activity.status)}
                                  variant="outlined"
                                />
                              )}
                              {hasDetails && (
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleExpandItem(activity.id);
                                  }}
                                >
                                  {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                </IconButton>
                              )}
                            </Stack>
                          </Box>
                          
                          <Typography variant="caption" color="text.secondary">
                            {formatRelativeTime(activity.timestamp)}
                            {activity.user && ` • by ${activity.user.name}`}
                          </Typography>

                          {activity.relatedEntity && (
                            <Box mt={1}>
                              <Chip
                                label={`${activity.relatedEntity.type}: ${activity.relatedEntity.name}`}
                                size="small"
                                variant="outlined"
                                color="primary"
                                icon={activity.relatedEntity.type === 'client' ? <ClientIcon /> : <EventIcon />}
                              />
                            </Box>
                          )}

                          <Collapse in={isExpanded}>
                            <Box mt={2} pt={1} borderTop="1px solid" borderColor="divider">
                              {activity.description && (
                                <Typography variant="body2" color="text.secondary" mb={1}>
                                  {activity.description}
                                </Typography>
                              )}
                              
                              {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                                <Stack spacing={0.5}>
                                  {Object.entries(activity.metadata).map(([key, value]) => (
                                    <Box key={key} display="flex" justifyContent="space-between">
                                      <Typography variant="caption" color="text.secondary">
                                        {key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                                      </Typography>
                                      <Typography variant="caption">
                                        {typeof value === 'string' ? value : JSON.stringify(value)}
                                      </Typography>
                                    </Box>
                                  ))}
                                </Stack>
                              )}
                            </Box>
                          </Collapse>
                        </CardContent>
                      </Card>
                    </TimelineContent>
                  </TimelineItem>
                );
              })}
            </Timeline>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};