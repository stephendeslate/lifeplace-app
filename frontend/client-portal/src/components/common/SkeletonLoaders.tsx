// frontend/client-portal/src/components/common/SkeletonLoaders.tsx

import React from 'react';
import {
  Card,
  CardContent,
  Skeleton,
  Box,
  Stack,
  Paper,
} from '@mui/material';

// Card skeleton for event cards, booking steps, etc.
interface CardSkeletonProps {
  count?: number;
  height?: number;
  showActions?: boolean;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({
  count = 3,
  height = 200,
  showActions = true,
}) => {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: 2,
      }}
    >
      {Array.from({ length: count }).map((_, index) => (
        <Card key={`card-${index}`}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="70%" />
                <Skeleton variant="text" width="40%" />
              </Box>
            </Box>
            <Skeleton variant="rectangular" height={height} sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Skeleton variant="text" width="40%" />
              {showActions && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Skeleton variant="rectangular" width={80} height={32} />
                  <Skeleton variant="rectangular" width={60} height={32} />
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};

// List skeleton for event lists, message lists, etc.
interface ListSkeletonProps {
  items?: number;
  showAvatar?: boolean;
  showStatus?: boolean;
}

export const ListSkeleton: React.FC<ListSkeletonProps> = ({
  items = 5,
  showAvatar = true,
  showStatus = false,
}) => {
  return (
    <Stack spacing={1}>
      {Array.from({ length: items }).map((_, index) => (
        <Paper
          key={`list-item-${index}`}
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          {showAvatar && (
            <Skeleton variant="circular" width={48} height={48} />
          )}
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="60%" height={24} />
            <Skeleton variant="text" width="80%" height={20} />
            <Skeleton variant="text" width="40%" height={16} />
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
            {showStatus && (
              <Skeleton variant="rectangular" width={80} height={24} sx={{ borderRadius: 1 }} />
            )}
            <Skeleton variant="text" width={60} />
          </Box>
        </Paper>
      ))}
    </Stack>
  );
};

// Form skeleton for booking forms
interface FormSkeletonProps {
  fields?: number;
  showButtons?: boolean;
}

export const FormSkeleton: React.FC<FormSkeletonProps> = ({ 
  fields = 6,
  showButtons = true 
}) => {
  return (
    <Box>
      <Stack spacing={3}>
        {Array.from({ length: fields }).map((_, index) => (
          <Box key={`field-${index}`}>
            <Skeleton variant="text" width="30%" height={20} sx={{ mb: 1 }} />
            <Skeleton variant="rectangular" height={56} />
          </Box>
        ))}
        {showButtons && (
          <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
            <Skeleton variant="rectangular" width={100} height={40} />
            <Skeleton variant="rectangular" width={120} height={40} />
          </Box>
        )}
      </Stack>
    </Box>
  );
};

// Booking step skeleton for multi-step forms
interface BookingStepSkeletonProps {
  showProgress?: boolean;
  showNavigation?: boolean;
}

export const BookingStepSkeleton: React.FC<BookingStepSkeletonProps> = ({
  showProgress = true,
  showNavigation = true,
}) => {
  return (
    <Box>
      {showProgress && (
        <Box sx={{ mb: 4 }}>
          <Skeleton variant="text" width="40%" height={24} sx={{ mb: 2 }} />
          <Skeleton variant="rectangular" height={8} sx={{ borderRadius: 1 }} />
        </Box>
      )}
      
      <Card>
        <CardContent>
          <Skeleton variant="text" width="60%" height={32} sx={{ mb: 3 }} />
          <FormSkeleton fields={4} showButtons={false} />
        </CardContent>
      </Card>
      
      {showNavigation && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Skeleton variant="rectangular" width={80} height={40} />
          <Skeleton variant="rectangular" width={100} height={40} />
        </Box>
      )}
    </Box>
  );
};

// Event timeline skeleton
export const TimelineSkeleton: React.FC<{ items?: number }> = ({ items = 4 }) => {
  return (
    <Box>
      {Array.from({ length: items }).map((_, index) => (
        <Box
          key={`timeline-${index}`}
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            mb: 3,
            position: 'relative',
            '&:not(:last-child)::before': {
              content: '""',
              position: 'absolute',
              left: 19,
              top: 40,
              width: 2,
              height: 40,
              bgcolor: 'divider',
            },
          }}
        >
          <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2, flexShrink: 0 }} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="70%" height={20} />
            <Skeleton variant="text" width="50%" height={16} sx={{ mt: 0.5, mb: 1 }} />
            <Skeleton variant="text" width="90%" height={16} />
            <Skeleton variant="text" width="60%" height={16} />
          </Box>
        </Box>
      ))}
    </Box>
  );
};

// Mobile-specific skeletons
export const MobileCardSkeleton: React.FC<{ count?: number }> = ({ count = 2 }) => {
  return (
    <Stack spacing={2}>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={`mobile-card-${index}`}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Skeleton variant="circular" width={32} height={32} sx={{ mr: 1 }} />
              <Skeleton variant="text" width="50%" />
            </Box>
            <Skeleton variant="rectangular" height={120} sx={{ mb: 2 }} />
            <Skeleton variant="text" width="80%" />
            <Skeleton variant="text" width="60%" />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
              <Skeleton variant="text" width="30%" />
              <Skeleton variant="rectangular" width={70} height={28} />
            </Box>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
};