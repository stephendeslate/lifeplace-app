/**
 * Advanced Read Receipts Component
 * 
 * Features:
 * - Real-time read status tracking
 * - Multiple user read receipts
 * - Progressive disclosure for large groups
 * - Timestamp tooltips
 * - Accessibility compliant
 * - Performance optimized
 */

import React, { useMemo, useState } from 'react';
import {
  Box,
  Avatar,
  AvatarGroup,
  Tooltip,
  Typography,
  IconButton,
  Popover,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Chip,
  styled,
  useTheme
} from '@mui/material';
import {
  Done as DoneIcon,
  DoneAll as DoneAllIcon,
  Visibility as VisibilityIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { User, MessageReadReceipt, ReadReceiptUser } from '../../../types/messaging.types';

const ReadReceiptContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  opacity: 0.7,
  transition: 'opacity 0.2s ease-in-out',
  '&:hover': {
    opacity: 1,
  },
}));

const StatusIcon = styled(Box)<{ status: 'sent' | 'delivered' | 'read' }>(({ theme, status }) => ({
  display: 'flex',
  alignItems: 'center',
  color: status === 'read' 
    ? theme.palette.info.main
    : status === 'delivered'
    ? theme.palette.success.main
    : theme.palette.text.secondary,
  fontSize: '1rem',
}));

const ReadAvatar = styled(Avatar)(({ theme }) => ({
  width: 16,
  height: 16,
  fontSize: '0.6rem',
  border: `1.5px solid ${theme.palette.background.paper}`,
  cursor: 'pointer',
  transition: 'transform 0.2s ease-in-out',
  '&:hover': {
    transform: 'scale(1.1)',
  },
}));

export type MessageStatus = 'sent' | 'delivered' | 'read';

interface ReadReceiptsProps {
  /**
   * Message status
   */
  status: MessageStatus;
  
  /**
   * Users who have read the message
   */
  readBy?: ReadReceiptUser[];
  
  /**
   * Users who have received the message (but not read)
   */
  deliveredTo?: User[];
  
  /**
   * Total number of recipients
   */
  totalRecipients?: number;
  
  /**
   * Show detailed receipts
   */
  showDetailed?: boolean;
  
  /**
   * Maximum avatars to show before grouping
   */
  maxAvatars?: number;
  
  /**
   * Size variant
   */
  size?: 'small' | 'medium';
  
  /**
   * Position alignment
   */
  align?: 'left' | 'right';
  
  /**
   * Show timestamp
   */
  showTimestamp?: boolean;
  
  /**
   * Custom styling
   */
  sx?: object;
}

const ReadReceipts: React.FC<ReadReceiptsProps> = ({
  status,
  readBy = [],
  deliveredTo = [],
  totalRecipients,
  showDetailed = true,
  maxAvatars = 3,
  size = 'small',
  align = 'right',
  showTimestamp = true,
  sx
}) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
    if (showDetailed && (readBy.length > 0 || deliveredTo.length > 0)) {
      setAnchorEl(event.currentTarget);
    }
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);
  };

  const isPopoverOpen = Boolean(anchorEl);

  // Calculate read statistics
  const stats = useMemo(() => {
    const readCount = readBy.length;
    const deliveredCount = deliveredTo.length;
    const total = totalRecipients || readCount + deliveredCount;
    const undeliveredCount = Math.max(0, total - readCount - deliveredCount);

    return {
      readCount,
      deliveredCount,
      undeliveredCount,
      total,
      readPercentage: total > 0 ? (readCount / total) * 100 : 0,
    };
  }, [readBy, deliveredTo, totalRecipients]);

  // Get status icon
  const getStatusIcon = () => {
    switch (status) {
      case 'read':
        return <DoneAllIcon fontSize={size === 'small' ? 'small' : 'medium'} />;
      case 'delivered':
        return <DoneIcon fontSize={size === 'small' ? 'small' : 'medium'} />;
      default:
        return <ScheduleIcon fontSize={size === 'small' ? 'small' : 'medium'} />;
    }
  };

  // Get status tooltip
  const getStatusTooltip = () => {
    if (status === 'read' && stats.readCount > 0) {
      return `Read by ${stats.readCount} of ${stats.total} recipients`;
    } else if (status === 'delivered' && stats.deliveredCount > 0) {
      return `Delivered to ${stats.deliveredCount} of ${stats.total} recipients`;
    }
    return 'Message sent';
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'Recently';
    }
  };

  return (
    <ReadReceiptContainer
      sx={{
        flexDirection: align === 'left' ? 'row' : 'row-reverse',
        ...sx
      }}
      onMouseEnter={handlePopoverOpen}
      onMouseLeave={handlePopoverClose}
    >
      {/* Status Icon */}
      <Tooltip title={getStatusTooltip()} placement={align === 'left' ? 'right' : 'left'}>
        <StatusIcon status={status}>
          {getStatusIcon()}
        </StatusIcon>
      </Tooltip>

      {/* Read Receipts Avatars */}
      {showDetailed && readBy.length > 0 && (
        <AvatarGroup
          max={maxAvatars}
          sx={{
            '& .MuiAvatar-root': {
              width: size === 'small' ? 16 : 20,
              height: size === 'small' ? 16 : 20,
              fontSize: size === 'small' ? '0.6rem' : '0.7rem',
            }
          }}
        >
          {readBy.slice(0, maxAvatars).map(user => (
            <Tooltip
              key={user.id}
              title={`${user.first_name || user.name} read ${formatTimestamp(user.readAt)}`}
              placement="top"
            >
              <ReadAvatar
                alt={user.first_name || user.name}
                src={user.avatar_url}
                sx={{
                  width: size === 'small' ? 16 : 20,
                  height: size === 'small' ? 16 : 20,
                }}
              >
                {(user.first_name?.[0] || user.name?.[0] || 'U').toUpperCase()}
              </ReadAvatar>
            </Tooltip>
          ))}
        </AvatarGroup>
      )}

      {/* Read Count Badge */}
      {stats.readCount > maxAvatars && (
        <Chip
          size="small"
          label={`+${stats.readCount - maxAvatars}`}
          sx={{
            height: size === 'small' ? 18 : 20,
            fontSize: '0.65rem',
            backgroundColor: theme.palette.info.main,
            color: theme.palette.info.contrastText,
            cursor: 'pointer',
          }}
          onClick={handlePopoverOpen}
        />
      )}

      {/* Detailed Popover */}
      {showDetailed && (
        <Popover
          open={isPopoverOpen}
          anchorEl={anchorEl}
          onClose={handlePopoverClose}
          anchorOrigin={{
            vertical: 'top',
            horizontal: align === 'left' ? 'left' : 'right',
          }}
          transformOrigin={{
            vertical: 'bottom',
            horizontal: align === 'left' ? 'left' : 'right',
          }}
          sx={{
            pointerEvents: 'auto',
          }}
          PaperProps={{
            sx: {
              maxWidth: 300,
              maxHeight: 400,
              overflow: 'auto',
            }
          }}
        >
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Message Status
            </Typography>
            
            {/* Read Section */}
            {readBy.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <VisibilityIcon sx={{ fontSize: 14, mr: 0.5 }} />
                  Read by {readBy.length}
                </Typography>
                <List dense>
                  {readBy.map(user => (
                    <ListItem key={user.id} sx={{ py: 0.5 }}>
                      <ListItemAvatar>
                        <Avatar
                          src={user.avatar_url}
                          sx={{ width: 24, height: 24, fontSize: '0.7rem' }}
                        >
                          {(user.first_name?.[0] || user.name?.[0] || 'U').toUpperCase()}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={user.first_name || user.name}
                        secondary={formatTimestamp(user.readAt)}
                        primaryTypographyProps={{ fontSize: '0.85rem' }}
                        secondaryTypographyProps={{ fontSize: '0.75rem' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {/* Delivered Section */}
            {deliveredTo.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <DoneIcon sx={{ fontSize: 14, mr: 0.5 }} />
                  Delivered to {deliveredTo.length}
                </Typography>
                <List dense>
                  {deliveredTo.map(user => (
                    <ListItem key={user.id} sx={{ py: 0.5 }}>
                      <ListItemAvatar>
                        <Avatar
                          src={user.avatar_url}
                          sx={{ width: 24, height: 24, fontSize: '0.7rem' }}
                        >
                          {(user.first_name?.[0] || user.name?.[0] || 'U').toUpperCase()}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={user.first_name || user.name}
                        secondary="Delivered"
                        primaryTypographyProps={{ fontSize: '0.85rem' }}
                        secondaryTypographyProps={{ fontSize: '0.75rem' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {/* Statistics */}
            {stats.total > 0 && (
              <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
                <Typography variant="body2" color="text.secondary">
                  {Math.round(stats.readPercentage)}% read rate
                </Typography>
              </Box>
            )}
          </Box>
        </Popover>
      )}
    </ReadReceiptContainer>
  );
};

export default React.memo(ReadReceipts);
export { ReadReceipts };

// Hook for managing read receipts
export const useReadReceipts = (messageId: string) => {
  const [readReceipts, setReadReceipts] = useState<MessageReadReceipt[]>([]);
  const [status, setStatus] = useState<MessageStatus>('sent');

  const addReadReceipt = React.useCallback((receipt: MessageReadReceipt) => {
    setReadReceipts(prev => {
      const existing = prev.find(r => r.user_id === receipt.user_id);
      if (existing) {
        return prev.map(r => 
          r.user_id === receipt.user_id 
            ? { ...receipt, read_at: receipt.read_at || new Date().toISOString() }
            : r
        );
      }
      return [...prev, { ...receipt, read_at: receipt.read_at || new Date().toISOString() }];
    });
  }, []);

  const updateStatus = React.useCallback((newStatus: MessageStatus) => {
    setStatus(newStatus);
  }, []);

  const getReadByUsers = React.useCallback((): ReadReceiptUser[] => {
    return readReceipts.map(receipt => ({
      id: receipt.user_id,
      name: receipt.user_name || `User ${receipt.user_id}`,
      first_name: receipt.user_name?.split(' ')[0],
      email: '',
      readAt: receipt.read_at,
      avatar_url: receipt.user_avatar,
    }));
  }, [readReceipts]);

  return {
    readReceipts,
    status,
    addReadReceipt,
    updateStatus,
    getReadByUsers,
    readCount: readReceipts.length,
  };
};