// frontend/admin-crm/src/components/events/ClientVIPStatusCard.tsx

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Stack,
  Skeleton,
  alpha,
} from '@mui/material';
import {
  Star as StarIcon,
  MoreVert as MoreVertIcon,
  SwapHoriz as AssignIcon,
  AddCircle as AwardIcon,
  RemoveCircle as AdjustIcon,
} from '@mui/icons-material';
import { useClientVIPStatusByClient, useVIPTiers } from '../../hooks/useVIP';
import { useCurrencySettings } from '../../hooks/useCurrency';
import { formatCurrency } from '../../utils/currency';
import type { VIPTierListItem } from '../../types/vip.types';

// =============================================================================
// TYPES
// =============================================================================

interface ClientVIPStatusCardProps {
  clientId: number;
  clientName?: string;
}

// =============================================================================
// TIER BADGE COMPONENT
// =============================================================================

const TierBadge: React.FC<{ tierName: string | null; tierColor: string | null }> = ({
  tierName,
  tierColor,
}) => {
  const displayName = tierName ? `${tierName} Member` : 'Guest';
  const color = tierColor || '#6B7280';

  return (
    <Chip
      label={displayName}
      size="small"
      sx={{
        bgcolor: alpha(color, 0.15),
        color: color,
        fontWeight: 600,
        borderRadius: 1,
        '& .MuiChip-label': {
          px: 1.5,
        },
      }}
    />
  );
};

// =============================================================================
// STATUS CHIP COMPONENT
// =============================================================================

const StatusChip: React.FC<{ status: string }> = ({ status }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'EXPIRED':
        return 'warning';
      case 'SUSPENDED':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Chip
      label={status}
      size="small"
      color={getStatusColor()}
      variant="outlined"
      sx={{ fontSize: '0.7rem', height: 20 }}
    />
  );
};

// =============================================================================
// STAT BOX COMPONENT
// =============================================================================

const StatBox: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <Box sx={{ textAlign: 'center', flex: 1 }}>
    <Typography variant="h6" fontWeight={700} color="text.primary">
      {value}
    </Typography>
    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
      {label}
    </Typography>
  </Box>
);

// =============================================================================
// ASSIGN TIER DIALOG
// =============================================================================

interface AssignTierDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (tierId: number, reason: string) => void;
  currentTierId: number | null;
  tiers: VIPTierListItem[];
  isLoading: boolean;
}

const AssignTierDialog: React.FC<AssignTierDialogProps> = ({
  open,
  onClose,
  onSubmit,
  currentTierId,
  tiers,
  isLoading,
}) => {
  const [selectedTierId, setSelectedTierId] = useState<number | ''>('');
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    if (selectedTierId !== '') {
      onSubmit(selectedTierId, reason);
      setSelectedTierId('');
      setReason('');
    }
  };

  const handleClose = () => {
    setSelectedTierId('');
    setReason('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Assign VIP Tier</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Select Tier</InputLabel>
            <Select
              value={selectedTierId}
              onChange={(e) => setSelectedTierId(e.target.value as number)}
              label="Select Tier"
            >
              {tiers.map((tier) => (
                <MenuItem
                  key={tier.id}
                  value={tier.id}
                  disabled={tier.id === currentTierId}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        bgcolor: tier.color,
                      }}
                    />
                    {tier.name}
                    {tier.id === currentTierId && ' (Current)'}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            multiline
            rows={2}
            size="small"
            placeholder="e.g., VIP customer upgrade, Loyalty reward"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={selectedTierId === '' || isLoading}
        >
          {isLoading ? 'Assigning...' : 'Assign Tier'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// =============================================================================
// AWARD POINTS DIALOG
// =============================================================================

interface PointsDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (points: number, description: string) => void;
  currentBalance: number;
  isLoading: boolean;
  mode: 'award' | 'adjust';
}

const PointsDialog: React.FC<PointsDialogProps> = ({
  open,
  onClose,
  onSubmit,
  currentBalance,
  isLoading,
  mode,
}) => {
  const [points, setPoints] = useState<string>('');
  const [description, setDescription] = useState('');

  const isAward = mode === 'award';
  const title = isAward ? 'Award Points' : 'Adjust Points';
  const buttonText = isAward ? 'Award Points' : 'Adjust Points';

  const handleSubmit = () => {
    const pointsValue = parseInt(points, 10);
    if (!isNaN(pointsValue) && pointsValue !== 0 && description.trim()) {
      onSubmit(pointsValue, description.trim());
      setPoints('');
      setDescription('');
    }
  };

  const handleClose = () => {
    setPoints('');
    setDescription('');
    onClose();
  };

  const pointsValue = parseInt(points, 10) || 0;
  const newBalance = currentBalance + pointsValue;
  const isNegativeAdjust = !isAward && pointsValue < 0;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Current Balance
            </Typography>
            <Typography variant="h6" fontWeight={600}>
              {currentBalance} points
            </Typography>
          </Box>

          <TextField
            label={isAward ? 'Points to Award' : 'Points Adjustment'}
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            type="number"
            size="small"
            inputProps={isAward ? { min: 1 } : {}}
            helperText={
              isAward
                ? 'Enter a positive number'
                : 'Enter positive to add, negative to subtract'
            }
          />

          {points && (
            <Box
              sx={{
                p: 1.5,
                bgcolor: isNegativeAdjust ? alpha('#ef4444', 0.1) : alpha('#22c55e', 0.1),
                borderRadius: 1,
              }}
            >
              <Typography variant="caption" color="text.secondary">
                New Balance
              </Typography>
              <Typography
                variant="body1"
                fontWeight={600}
                color={isNegativeAdjust ? 'error.main' : 'success.main'}
              >
                {newBalance} points
              </Typography>
            </Box>
          )}

          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            rows={2}
            size="small"
            required
            placeholder={
              isAward
                ? 'e.g., Birthday bonus, Referral reward'
                : 'e.g., Correction for error, Refund adjustment'
            }
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color={isNegativeAdjust ? 'error' : 'primary'}
          disabled={
            !points ||
            (isAward && pointsValue <= 0) ||
            (!isAward && pointsValue === 0) ||
            !description.trim() ||
            isLoading
          }
        >
          {isLoading ? 'Processing...' : buttonText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// =============================================================================
// LOADING SKELETON
// =============================================================================

const LoadingSkeleton: React.FC = () => (
  <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3, height: '100%' }}>
    <Stack spacing={2}>
      <Box display="flex" alignItems="center" gap={2}>
        <Skeleton variant="circular" width={24} height={24} />
        <Skeleton variant="text" width={140} height={28} />
      </Box>
      <Box display="flex" alignItems="center" gap={1}>
        <Skeleton variant="rounded" width={100} height={24} />
        <Skeleton variant="rounded" width={60} height={20} />
      </Box>
      <Box display="flex" justifyContent="space-around" sx={{ py: 2 }}>
        <Skeleton variant="text" width={60} height={50} />
        <Skeleton variant="text" width={60} height={50} />
        <Skeleton variant="text" width={60} height={50} />
      </Box>
    </Stack>
  </Box>
);

// =============================================================================
// EMPTY STATE
// =============================================================================

const EmptyState: React.FC<{ clientName?: string }> = ({ clientName }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      py: 3,
      px: 2,
      textAlign: 'center',
    }}
  >
    <StarIcon sx={{ fontSize: 40, color: 'action.disabled', mb: 1 }} />
    <Typography variant="body2" color="text.secondary">
      {clientName ? `${clientName} has no VIP record yet.` : 'No VIP record found.'}
    </Typography>
    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
      VIP status will be created automatically on their first booking.
    </Typography>
  </Box>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const ClientVIPStatusCard: React.FC<ClientVIPStatusCardProps> = ({
  clientId,
  clientName,
}) => {
  const {
    clientStatus,
    isLoading,
    assignTier,
    awardPoints,
    adjustPoints,
    isAssigningTier,
    isAwardingPoints,
    isAdjustingPoints,
  } = useClientVIPStatusByClient(clientId);

  const { activeTiers, isLoadingActiveTiers } = useVIPTiers();
  const { settings: currencySettings } = useCurrencySettings();

  // Menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);

  // Dialog states
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [awardDialogOpen, setAwardDialogOpen] = useState(false);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);

  // Menu handlers
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Action handlers
  const handleAssignTier = async (tierId: number, reason: string) => {
    if (clientStatus) {
      await assignTier(clientStatus.id, { tier_id: tierId, reason });
      setAssignDialogOpen(false);
    }
  };

  const handleAwardPoints = async (points: number, description: string) => {
    if (clientStatus) {
      await awardPoints(clientStatus.id, { points, description });
      setAwardDialogOpen(false);
    }
  };

  const handleAdjustPoints = async (points: number, description: string) => {
    if (clientStatus) {
      await adjustPoints(clientStatus.id, { points, description });
      setAdjustDialogOpen(false);
    }
  };

  // Format currency helper
  const formatAmount = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return formatCurrency(numAmount, currencySettings.defaultCurrency);
  };

  // Loading state
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3, height: '100%' }}>
      <Stack spacing={2}>
        {/* Header */}
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <StarIcon sx={{ color: 'warning.main' }} />
            <Typography variant="h6" fontWeight="bold">
              LifePlace Rewards
            </Typography>
          </Box>
          {clientStatus && (
            <IconButton size="small" onClick={handleMenuOpen}>
              <MoreVertIcon />
            </IconButton>
          )}
        </Box>

        {/* Content */}
        {clientStatus ? (
          <>
            {/* Tier Badge and Status */}
            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
              <TierBadge
                tierName={clientStatus.current_tier_name}
                tierColor={clientStatus.tier_color}
              />
              <StatusChip status={clientStatus.status} />
            </Box>

            {/* Stats */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-around',
                py: 2,
                borderTop: 1,
                borderBottom: 1,
                borderColor: 'divider',
              }}
            >
              <StatBox label="Points" value={clientStatus.points_balance} />
              <StatBox label="Bookings" value={clientStatus.completed_bookings_count} />
              <StatBox label="Spent" value={formatAmount(clientStatus.total_spent)} />
            </Box>
          </>
        ) : (
          <EmptyState clientName={clientName} />
        )}
      </Stack>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          onClick={() => {
            handleMenuClose();
            setAssignDialogOpen(true);
          }}
        >
          <ListItemIcon>
            <AssignIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Assign Tier</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleMenuClose();
            setAwardDialogOpen(true);
          }}
        >
          <ListItemIcon>
            <AwardIcon fontSize="small" color="success" />
          </ListItemIcon>
          <ListItemText>Award Points</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleMenuClose();
            setAdjustDialogOpen(true);
          }}
        >
          <ListItemIcon>
            <AdjustIcon fontSize="small" color="warning" />
          </ListItemIcon>
          <ListItemText>Adjust Points</ListItemText>
        </MenuItem>
      </Menu>

      {/* Dialogs */}
      <AssignTierDialog
        open={assignDialogOpen}
        onClose={() => setAssignDialogOpen(false)}
        onSubmit={handleAssignTier}
        currentTierId={clientStatus?.current_tier || null}
        tiers={activeTiers}
        isLoading={isAssigningTier || isLoadingActiveTiers}
      />

      <PointsDialog
        open={awardDialogOpen}
        onClose={() => setAwardDialogOpen(false)}
        onSubmit={handleAwardPoints}
        currentBalance={clientStatus?.points_balance || 0}
        isLoading={isAwardingPoints}
        mode="award"
      />

      <PointsDialog
        open={adjustDialogOpen}
        onClose={() => setAdjustDialogOpen(false)}
        onSubmit={handleAdjustPoints}
        currentBalance={clientStatus?.points_balance || 0}
        isLoading={isAdjustingPoints}
        mode="adjust"
      />
    </Box>
  );
};

export default ClientVIPStatusCard;
