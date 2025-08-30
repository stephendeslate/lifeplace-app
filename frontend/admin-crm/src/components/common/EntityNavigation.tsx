// frontend/admin-crm/src/components/common/EntityNavigation.tsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Avatar,
  Stack,
  Button,
  IconButton,
  Badge,
} from '@mui/material';
import {
  Person as PersonIcon,
  Event as EventIcon,
  Payment as PaymentIcon,
  Assignment as ContractIcon,
  Receipt as InvoiceIcon,
  Description as QuoteIcon,
  Business as BusinessIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  ArrowForward as ArrowForwardIcon,
  Launch as LaunchIcon,
} from '@mui/icons-material';

export interface EntityReference {
  id: number;
  type: 'client' | 'event' | 'payment' | 'contract' | 'invoice' | 'quote';
  name: string;
  subtitle?: string;
  status?: string;
  statusColor?: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  avatar?: string;
  metadata?: Record<string, unknown>;
  badges?: Array<{ label: string; color?: string; count?: number }>;
}

interface EntityNavigationProps {
  title?: string;
  entities: EntityReference[];
  layout?: 'grid' | 'list' | 'compact';
  maxVisible?: number;
  showViewAll?: boolean;
  onEntityClick?: (entity: EntityReference) => void;
  onViewAll?: (entityType: string) => void;
}

const getEntityIcon = (type: string) => {
  const iconProps = { fontSize: 'medium' as const };
  switch (type) {
    case 'client': return <PersonIcon {...iconProps} />;
    case 'event': return <EventIcon {...iconProps} />;
    case 'payment': return <PaymentIcon {...iconProps} />;
    case 'contract': return <ContractIcon {...iconProps} />;
    case 'invoice': return <InvoiceIcon {...iconProps} />;
    case 'quote': return <QuoteIcon {...iconProps} />;
    default: return <BusinessIcon {...iconProps} />;
  }
};

const getEntityPath = (entity: EntityReference): string => {
  switch (entity.type) {
    case 'client': return `/clients/${entity.id}`;
    case 'event': return `/events/${entity.id}`;
    case 'payment': return `/payments/${entity.id}`;
    case 'contract': return `/contracts/${entity.id}`;
    case 'invoice': return `/invoices/${entity.id}`;
    case 'quote': return `/quotes/${entity.id}`;
    default: return '#';
  }
};

const EntityCard: React.FC<{
  entity: EntityReference;
  layout: 'grid' | 'list' | 'compact';
  onClick?: (entity: EntityReference) => void;
}> = ({ entity, layout, onClick }) => {
  const navigate = useNavigate();
  
  const handleClick = () => {
    if (onClick) {
      onClick(entity);
    } else {
      navigate(getEntityPath(entity));
    }
  };

  const handleLaunch = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(getEntityPath(entity));
  };

  if (layout === 'compact') {
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        p={1.5}
        sx={{
          cursor: 'pointer',
          borderRadius: 1,
          '&:hover': { bgcolor: 'action.hover' },
          border: '1px solid',
          borderColor: 'divider',
        }}
        onClick={handleClick}
      >
        <Box display="flex" alignItems="center" gap={1.5}>
          {entity.avatar ? (
            <Avatar src={entity.avatar} sx={{ width: 32, height: 32 }}>
              {entity.name.charAt(0)}
            </Avatar>
          ) : (
            <Box sx={{ color: 'primary.main' }}>
              {getEntityIcon(entity.type)}
            </Box>
          )}
          <Box>
            <Typography variant="body2" fontWeight="medium">
              {entity.name}
            </Typography>
            {entity.subtitle && (
              <Typography variant="caption" color="text.secondary">
                {entity.subtitle}
              </Typography>
            )}
          </Box>
        </Box>
        
        <Box display="flex" alignItems="center" gap={1}>
          {entity.badges?.map((badge, index) => (
            <Badge key={index} badgeContent={badge.count} color="error">
              <Chip
                label={badge.label}
                size="small"
                variant="outlined"
                color={(badge.color as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning') || 'default'}
              />
            </Badge>
          ))}
          {entity.status && (
            <Chip
              label={entity.status}
              size="small"
              color={entity.statusColor || 'default'}
              variant="outlined"
            />
          )}
          <IconButton size="small" onClick={handleLaunch}>
            <LaunchIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>
    );
  }

  if (layout === 'list') {
    return (
      <Card 
        variant="outlined" 
        sx={{ 
          cursor: 'pointer',
          '&:hover': { boxShadow: 2 },
          transition: 'box-shadow 0.2s',
        }}
        onClick={handleClick}
      >
        <CardContent sx={{ p: 2 }}>
          <Box display="flex" alignItems="start" justifyContent="space-between">
            <Box display="flex" gap={2} flex={1}>
              {entity.avatar ? (
                <Avatar src={entity.avatar}>
                  {entity.name.charAt(0)}
                </Avatar>
              ) : (
                <Avatar sx={{ bgcolor: 'primary.light' }}>
                  {getEntityIcon(entity.type)}
                </Avatar>
              )}
              
              <Box flex={1}>
                <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                  <Typography variant="subtitle1" fontWeight="medium">
                    {entity.name}
                  </Typography>
                  {entity.status && (
                    <Chip
                      label={entity.status}
                      size="small"
                      color={entity.statusColor || 'default'}
                      variant="filled"
                    />
                  )}
                </Box>
                
                {entity.subtitle && (
                  <Typography variant="body2" color="text.secondary" mb={1}>
                    {entity.subtitle}
                  </Typography>
                )}
                
                {entity.badges && entity.badges.length > 0 && (
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {entity.badges.map((badge, index) => (
                      <Badge key={index} badgeContent={badge.count} color="error">
                        <Chip
                          label={badge.label}
                          size="small"
                          variant="outlined"
                          color={(badge.color as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning') || 'default'}
                        />
                      </Badge>
                    ))}
                  </Stack>
                )}

                {entity.metadata && Object.keys(entity.metadata).length > 0 && (
                  <Box mt={1}>
                    <Stack direction="row" spacing={2} flexWrap="wrap">
                      {Object.entries(entity.metadata).slice(0, 3).map(([key, value]) => (
                        <Box key={key} display="flex" alignItems="center" gap={0.5}>
                          {key === 'email' && <EmailIcon fontSize="small" color="action" />}
                          {key === 'phone' && <PhoneIcon fontSize="small" color="action" />}
                          <Typography variant="caption" color="text.secondary">
                            {String(value)}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                )}
              </Box>
            </Box>
            
            <IconButton size="small" onClick={handleLaunch}>
              <ArrowForwardIcon />
            </IconButton>
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Grid layout (default)
  return (
    <Card 
      variant="outlined" 
      sx={{ 
        height: '100%',
        cursor: 'pointer',
        '&:hover': { boxShadow: 2 },
        transition: 'box-shadow 0.2s',
      }}
      onClick={handleClick}
    >
      <CardContent>
        <Stack spacing={1.5} height="100%">
          <Box display="flex" justifyContent="space-between" alignItems="start">
            {entity.avatar ? (
              <Avatar src={entity.avatar} sx={{ width: 48, height: 48 }}>
                {entity.name.charAt(0)}
              </Avatar>
            ) : (
              <Avatar sx={{ width: 48, height: 48, bgcolor: 'primary.light' }}>
                {getEntityIcon(entity.type)}
              </Avatar>
            )}
            
            <IconButton size="small" onClick={handleLaunch}>
              <LaunchIcon fontSize="small" />
            </IconButton>
          </Box>
          
          <Box>
            <Typography variant="h6" fontWeight="medium" noWrap>
              {entity.name}
            </Typography>
            {entity.subtitle && (
              <Typography variant="body2" color="text.secondary" noWrap>
                {entity.subtitle}
              </Typography>
            )}
          </Box>
          
          <Box display="flex" flexWrap="wrap" gap={0.5} mt="auto">
            {entity.status && (
              <Chip
                label={entity.status}
                size="small"
                color={entity.statusColor || 'default'}
                variant="outlined"
              />
            )}
            {entity.badges?.slice(0, 2).map((badge, index) => (
              <Badge key={index} badgeContent={badge.count} color="error">
                <Chip
                  label={badge.label}
                  size="small"
                  variant="outlined"
                  color={(badge.color as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning') || 'default'}
                />
              </Badge>
            ))}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

export const EntityNavigation: React.FC<EntityNavigationProps> = ({
  title,
  entities,
  layout = 'grid',
  maxVisible = 6,
  showViewAll = true,
  onEntityClick,
  onViewAll,
}) => {
  const visibleEntities = entities.slice(0, maxVisible);
  const remainingCount = Math.max(0, entities.length - maxVisible);
  
  const handleViewAll = () => {
    if (onViewAll && entities.length > 0) {
      onViewAll(entities[0].type);
    }
  };

  if (entities.length === 0) {
    return (
      <Card>
        <CardContent>
          <Box textAlign="center" py={3}>
            <BusinessIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Related Items
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Related {title?.toLowerCase() || 'items'} will appear here when available.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        {title && (
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">{title}</Typography>
            {showViewAll && remainingCount > 0 && (
              <Button
                variant="text"
                size="small"
                endIcon={<ArrowForwardIcon />}
                onClick={handleViewAll}
              >
                View All ({entities.length})
              </Button>
            )}
          </Box>
        )}

        {layout === 'grid' ? (
          <Box 
            display="grid" 
            gridTemplateColumns={{ xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }}
            gap={2}
          >
            {visibleEntities.map((entity) => (
              <EntityCard
                key={`${entity.type}-${entity.id}`}
                entity={entity}
                layout={layout}
                onClick={onEntityClick}
              />
            ))}
          </Box>
        ) : (
          <Stack spacing={layout === 'compact' ? 1 : 2}>
            {visibleEntities.map((entity) => (
              <EntityCard
                key={`${entity.type}-${entity.id}`}
                entity={entity}
                layout={layout}
                onClick={onEntityClick}
              />
            ))}
          </Stack>
        )}

        {showViewAll && remainingCount > 0 && (
          <Box textAlign="center" mt={2}>
            <Button
              variant="outlined"
              onClick={handleViewAll}
              startIcon={<ArrowForwardIcon />}
            >
              View {remainingCount} More
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

// Utility functions to create entity references from data
interface ClientData {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  has_account: boolean;
  profile?: {
    avatar?: string;
    phone?: string;
    company?: string;
  };
}

interface EventData {
  id: number;
  name: string;
  event_type_name?: string;
  status: string;
  client_name?: string;
  start_date: string;
  total_price?: string | null;
  total_amount_due?: string | number | null;
}

interface PaymentData {
  id: number;
  payment_number: string;
  status: string;
  amount: string;
  due_date: string;
  event_details?: {
    name: string;
    client_name: string;
  };
}

export const createClientReference = (client: ClientData): EntityReference => ({
  id: client.id,
  type: 'client',
  name: `${client.first_name} ${client.last_name}`,
  subtitle: client.email,
  status: client.has_account ? 'Active' : 'Invited',
  statusColor: client.has_account ? 'success' : 'warning',
  avatar: client.profile?.avatar,
  metadata: {
    email: client.email,
    phone: client.profile?.phone,
    company: client.profile?.company,
  },
});

export const createEventReference = (event: EventData): EntityReference => ({
  id: event.id,
  type: 'event',
  name: event.name,
  subtitle: event.event_type_name || 'No Event Type',
  status: event.status,
  statusColor: event.status === 'CONFIRMED' ? 'success' : event.status === 'COMPLETED' ? 'default' : 'primary',
  metadata: {
    client: event.client_name || 'Unknown Client',
    date: new Date(event.start_date).toLocaleDateString(),
    value: event.total_price ? `$${parseFloat(String(event.total_price)).toLocaleString()}` : null,
  },
  badges: (event.total_amount_due && parseFloat(String(event.total_amount_due)) > 0) ? [{ label: 'Payment Due', color: 'warning' }] : [],
});

export const createPaymentReference = (payment: PaymentData): EntityReference => ({
  id: payment.id,
  type: 'payment',
  name: `Payment ${payment.payment_number}`,
  subtitle: payment.event_details?.name,
  status: payment.status,
  statusColor: payment.status === 'COMPLETED' ? 'success' : payment.status === 'FAILED' ? 'error' : 'warning',
  metadata: {
    amount: `$${parseFloat(payment.amount).toLocaleString()}`,
    due: new Date(payment.due_date).toLocaleDateString(),
    client: payment.event_details?.client_name,
  },
});