// design-system/visualizations/EventAvailabilityCalendar/styled.ts

import { Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import { tokens } from '@/design-system/tokens';

export const StyledCalendarContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  maxWidth: '800px',
  margin: '0 auto',
  minWidth: 0, // Allow shrinking in flex/grid contexts
  [theme.breakpoints.down('sm')]: {
    maxWidth: '100%',
  },
}));

export const StyledCalendarHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: tokens.spacing.space[3],
  padding: `0 ${tokens.spacing.space[2]}`,
  [theme.breakpoints.down('sm')]: {
    marginBottom: tokens.spacing.space[2],
    padding: 0,
  },
}));

export const StyledCalendarGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  gap: tokens.spacing.space[1],
  marginBottom: tokens.spacing.space[2],
  minWidth: 0, // Allow grid to shrink below content size
  [theme.breakpoints.down('sm')]: {
    gap: '2px', // Tighter gap on mobile
  },
}));

export const StyledDayHeader = styled(Box)(({ theme }) => ({
  textAlign: 'center',
  fontWeight: 600,
  fontSize: '0.875rem',
  color: tokens.color.base.forest[600],
  padding: tokens.spacing.space[1],
  minWidth: 0, // Allow shrinking
  overflow: 'hidden',
  [theme.breakpoints.down('sm')]: {
    fontSize: '0.75rem',
    padding: '4px 2px',
  },
}));

export const StyledDay = styled(Box, {
  shouldForwardProp: (prop) =>
    ![
      'isAvailable',
      'hasEvents',
      'isSelected',
      'isToday',
      'isCurrentMonth',
      'isBookable',
      'isInRange',
      'isRangeEnd',
      'isOutOfRange',
    ].includes(prop as string),
})<{
  isAvailable?: boolean;
  hasEvents?: boolean;
  isSelected?: boolean;
  isToday?: boolean;
  isCurrentMonth?: boolean;
  isBookable?: boolean;
  isInRange?: boolean;
  isRangeEnd?: boolean;
  isOutOfRange?: boolean;
}>(
  ({
    theme,
    isAvailable = false,
    hasEvents = false,
    isSelected = false,
    isToday = false,
    isCurrentMonth = true,
    isBookable = true,
    isInRange = false,
    isRangeEnd = false,
    isOutOfRange = false,
  }) => ({
    position: 'relative',
    aspectRatio: '1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing.space[1],
    cursor: isBookable && isCurrentMonth && !isOutOfRange ? 'pointer' : 'not-allowed',
    transition: tokens.animation.transition.all,
    borderRadius: tokens.spacing.radius.md,
    border: '2px solid transparent',
    minWidth: 0, // Allow shrinking in grid
    overflow: 'hidden',
    background: (() => {
      if (!isCurrentMonth) return 'transparent';
      if (isOutOfRange) return tokens.color.base.sage[100];
      if (hasEvents && !isAvailable) return tokens.color.semantic.error.subtle;
      if (hasEvents && isAvailable) return tokens.color.semantic.warning.subtle;
      if (isAvailable) return tokens.color.semantic.success.subtle;
      return tokens.color.base.sage[50];
    })(),
    [theme.breakpoints.down('sm')]: {
      padding: '2px',
      borderWidth: '1px',
      borderRadius: tokens.spacing.radius.sm,
    },

    // Range selection styling
    ...(isInRange && {
      background: `${tokens.color.base.forest[50]} !important`,
      borderRadius: 0,
    }),

    ...(isRangeEnd && {
      border: `2px solid ${tokens.color.base.forest[600]}`,
      background: `${tokens.color.base.forest[100]} !important`,
      boxShadow: tokens.shadow.elevation.md,
      borderRadius: tokens.spacing.radius.md,
    }),

    ...(isSelected && {
      border: `2px solid ${tokens.color.base.forest[600]}`,
      background: `${tokens.color.base.forest[100]} !important`,
      boxShadow: tokens.shadow.elevation.md,
      borderRadius: tokens.spacing.radius.md,
    }),

    ...(isToday &&
      !isSelected &&
      !isRangeEnd && {
        border: `2px solid ${tokens.color.base.gold[500]}`,
        boxShadow: tokens.shadow.glow.gold,
      }),

    ...(!isCurrentMonth && {
      opacity: 0.4,
    }),

    ...(isOutOfRange && {
      opacity: 0.5,
    }),

    ...(isBookable &&
      isCurrentMonth &&
      !isOutOfRange && {
        '&:hover': {
          transform: 'scale(1.05)',
          boxShadow: tokens.shadow.elevation.lg,
          background: isAvailable ? tokens.color.base.forest[50] : tokens.color.base.sage[100],
        },
      }),
  }),
);

export const StyledEventIndicator = styled(Box)(() => ({
  position: 'absolute',
  bottom: '2px',
  right: '2px',
  width: '6px',
  height: '6px',
  borderRadius: '50%',
  background: tokens.color.base.forest[600],
}));

export const StyledLegend = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: tokens.spacing.space[2],
  flexWrap: 'wrap',
  justifyContent: 'center',
  padding: tokens.spacing.space[2],
  borderTop: `1px solid ${tokens.color.base.sage[200]}`,
  [theme.breakpoints.down('sm')]: {
    gap: tokens.spacing.space[1],
    padding: tokens.spacing.space[1],
  },
}));
