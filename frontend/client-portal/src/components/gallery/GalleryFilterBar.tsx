import React from "react";
import { Box, Chip } from "@mui/material";
import { tokens } from "../../design-system/tokens";

interface FilterCategory {
  id: string;
  label: string;
  count?: number;
}

interface GalleryFilterBarProps {
  categories: FilterCategory[];
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

export const GalleryFilterBar: React.FC<GalleryFilterBarProps> = ({
  categories,
  activeCategory,
  onCategoryChange,
}) => {
  return (
    <Box
      sx={{
        display: "flex",
        gap: 1,
        overflowX: "auto",
        scrollbarWidth: "none",
        "&::-webkit-scrollbar": { display: "none" },
        pb: 0.5,
      }}
    >
      {categories.map((category) => {
        const isActive = activeCategory === category.id;
        const label =
          category.count !== undefined
            ? `${category.label} (${category.count})`
            : category.label;

        return (
          <Chip
            key={category.id}
            label={label}
            onClick={() => onCategoryChange(category.id)}
            variant={isActive ? "filled" : "outlined"}
            sx={{
              flexShrink: 0,
              fontFamily: tokens.typography.families.body,
              fontSize: tokens.typography.sizes.sm,
              fontWeight: isActive
                ? tokens.typography.weights.semibold
                : tokens.typography.weights.regular,
              borderRadius: tokens.spacing.radius.chip,
              transition: tokens.animation.transition.smooth,
              ...(isActive
                ? {
                    backgroundColor: tokens.color.base.sage[600],
                    color: "#FFFFFF",
                    borderColor: tokens.color.base.sage[600],
                    "&:hover": {
                      backgroundColor: tokens.color.base.sage[700],
                    },
                  }
                : {
                    backgroundColor: "transparent",
                    color: tokens.color.base.neutral[600],
                    borderColor: tokens.color.base.neutral[300],
                    "&:hover": {
                      backgroundColor: tokens.color.base.sage[50],
                      borderColor: tokens.color.base.sage[400],
                    },
                  }),
            }}
          />
        );
      })}
    </Box>
  );
};

export default GalleryFilterBar;
