// frontend/admin-crm/src/components/analytics/KPIGrid.tsx
// Reusable grid container for KPI cards
// Replaces 6+ repeated KPI card layouts in analytics tabs

import React from "react";
import { Box, type SxProps, type Theme } from "@mui/material";
import {
  KPI_CARD_MIN_WIDTH,
  KPI_CARD_DEFAULT_GAP,
} from "../../constants/analytics.constants";

interface KPIGridProps {
  /** KPICard components to display in the grid */
  children: React.ReactNode;
  /** Number of columns (used for responsive minWidth calculation) */
  columns?: 2 | 3 | 4;
  /** Minimum width for each card */
  minCardWidth?: number;
  /** Gap between cards (MUI spacing units) */
  gap?: number;
  /** Additional sx props */
  sx?: SxProps<Theme>;
}

export const KPIGrid: React.FC<KPIGridProps> = ({
  children,
  // columns is accepted for API consistency with KPIGridFixed but not used in flex layout
  columns: _columns = 4,
  minCardWidth = KPI_CARD_MIN_WIDTH,
  gap = KPI_CARD_DEFAULT_GAP,
  sx,
}) => {
  return (
    <Box
      display="flex"
      gap={gap}
      sx={{
        flexWrap: "wrap",
        "& > *": {
          flex: { xs: "1 1 100%", sm: `1 1 ${minCardWidth}px` },
          minWidth: { xs: 0, sm: minCardWidth },
        },
        mb: 3,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
};

/**
 * KPIGrid with CSS Grid for more consistent column widths
 */
export const KPIGridFixed: React.FC<KPIGridProps> = ({
  children,
  columns = 4,
  gap = KPI_CARD_DEFAULT_GAP,
  sx,
}) => {
  return (
    <Box
      display="grid"
      gap={gap}
      sx={{
        gridTemplateColumns: {
          xs: "1fr",
          sm: "repeat(2, 1fr)",
          md: `repeat(${Math.min(columns, 3)}, 1fr)`,
          lg: `repeat(${columns}, 1fr)`,
        },
        mb: 3,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
};

export default KPIGrid;
