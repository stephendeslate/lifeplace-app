import React from 'react';
import {
  Box,
  Typography,
  Stack,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material';
import { Star as StarIcon, Close as CloseIcon } from '@mui/icons-material';
import { VIPStatusCard, VIPBenefitCard } from '@/components/vip';
import type { ClientVIPStatus } from '@/types/vip.types';

interface VIPRewardsSectionProps {
  vipStatus: ClientVIPStatus;
  benefitsDialogOpen: boolean;
  onSetBenefitsDialogOpen: (open: boolean) => void;
}

const VIPRewardsSection: React.FC<VIPRewardsSectionProps> = ({
  vipStatus,
  benefitsDialogOpen,
  onSetBenefitsDialogOpen,
}) => {
  return (
    <Box>
      <Typography
        variant="h6"
        sx={{
          fontWeight: 600,
          mb: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <StarIcon sx={{ color: 'warning.main' }} />
        LifePlace Rewards
      </Typography>
      <VIPStatusCard status={vipStatus} onViewAllBenefits={() => onSetBenefitsDialogOpen(true)} />

      <Dialog
        open={benefitsDialogOpen}
        onClose={() => onSetBenefitsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          Your Benefits
          <IconButton onClick={() => onSetBenefitsDialogOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            {vipStatus.benefits && vipStatus.benefits.length > 0 ? (
              vipStatus.benefits.map((benefit) => (
                <VIPBenefitCard key={benefit.id} benefit={benefit} />
              ))
            ) : (
              <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
                No benefits available at your current tier.
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => onSetBenefitsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VIPRewardsSection;
