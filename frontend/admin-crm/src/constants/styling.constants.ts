// frontend/admin-crm/src/constants/styling.constants.ts
// Centralized styling constants using design tokens for consistent appearance

import { tokens } from '../design-system';

/**
 * Standard section card styling
 * Replaces 50+ duplicate { borderRadius: 1, bgcolor: 'background.paper', p: 3 } patterns
 */
export const SECTION_CARD_SX = {
  borderRadius: tokens.spacing.radius.lg,
  bgcolor: 'background.paper',
  border: `1px solid ${tokens.color.borders.subtle}`,
  p: 3,
} as const;

/**
 * Compact section card styling
 */
export const SECTION_CARD_COMPACT_SX = {
  borderRadius: tokens.spacing.radius.md,
  bgcolor: 'background.paper',
  border: `1px solid ${tokens.color.borders.subtle}`,
  p: 2,
} as const;

/**
 * Loading overlay styling
 * Replaces 5+ identical loading overlay patterns
 */
export const LOADING_OVERLAY_SX = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  bgcolor: tokens.color.glass.light,
  backdropFilter: 'blur(4px)',
  zIndex: 10,
  borderRadius: 'inherit',
} as const;

/**
 * Glass effect background
 */
export const GLASS_BACKGROUND_SX = {
  bgcolor: tokens.color.glass.light,
  backdropFilter: 'blur(10px)',
  border: `1px solid ${tokens.color.borders.subtle}`,
} as const;

/**
 * Standard form field spacing
 */
export const FORM_FIELD_SX = {
  mb: 2,
} as const;

/**
 * KPI card grid container
 */
export const KPI_GRID_SX = {
  display: 'flex',
  gap: 2,
  flexWrap: 'wrap',
  '& > *': {
    flex: '1 1 180px',
    minWidth: 180,
  },
} as const;

/**
 * Table container styling
 */
export const TABLE_CONTAINER_SX = {
  borderRadius: tokens.spacing.radius.md,
  border: `1px solid ${tokens.color.borders.subtle}`,
} as const;

/**
 * Empty state container styling
 */
export const EMPTY_STATE_SX = {
  p: 4,
  textAlign: 'center',
  borderRadius: tokens.spacing.radius.lg,
} as const;

/**
 * Dialog paper styling
 */
export const DIALOG_PAPER_SX = {
  borderRadius: tokens.spacing.radius.xl,
  bgcolor: 'background.paper',
} as const;

/**
 * Scrollable content area
 */
export const SCROLLABLE_CONTENT_SX = {
  maxHeight: 400,
  overflow: 'auto',
  '&::-webkit-scrollbar': {
    width: 6,
  },
  '&::-webkit-scrollbar-thumb': {
    borderRadius: tokens.spacing.radius.full,
    bgcolor: tokens.color.neutral[300],
  },
} as const;

/**
 * Action bar (button row at bottom of cards/dialogs)
 */
export const ACTION_BAR_SX = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 1,
  pt: 2,
  mt: 2,
  borderTop: `1px solid ${tokens.color.borders.subtle}`,
} as const;

/**
 * Section header with action buttons
 */
export const SECTION_HEADER_SX = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  mb: 2,
} as const;

/**
 * Chip/badge styling presets
 */
export const STATUS_CHIP_SX = {
  fontWeight: 600,
  fontSize: '0.75rem',
} as const;

/**
 * Icon button in table rows
 */
export const TABLE_ICON_BUTTON_SX = {
  p: 0.5,
  '&:hover': {
    bgcolor: tokens.color.glass.light,
  },
} as const;
