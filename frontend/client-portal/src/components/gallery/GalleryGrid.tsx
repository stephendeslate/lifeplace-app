import React from "react";
import { Box, Skeleton, Typography } from "@mui/material";
import { tokens } from "../../design-system/tokens";
import { AnimatedElement } from "../../design-system/components/AnimatedElement";
import { OptimizedImage } from "../common/OptimizedImage";
import type { GalleryImage } from "../../types/gallery.types";

interface ResponsiveColumns {
  xs?: number;
  sm?: number;
  md?: number;
  lg?: number;
}

interface GalleryGridProps {
  images: GalleryImage[];
  columns?: ResponsiveColumns;
  gap?: number;
  aspectRatio?: string;
  onImageClick?: (index: number) => void;
  maxVisible?: number;
  loading?: boolean;
  variant?: "uniform" | "masonry";
}

export const GalleryGrid: React.FC<GalleryGridProps> = ({
  images,
  columns = { xs: 2, sm: 3, md: 4 },
  gap = 2,
  aspectRatio = tokens.spacing.layout.aspectRatio.landscape,
  onImageClick,
  maxVisible,
  loading = false,
  variant = "uniform",
}) => {
  if (loading) {
    const skeletonCount = columns.md ?? columns.sm ?? columns.xs ?? 4;
    return (
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: `repeat(${columns.xs ?? 2}, 1fr)`,
            sm: `repeat(${columns.sm ?? columns.xs ?? 3}, 1fr)`,
            md: `repeat(${columns.md ?? columns.sm ?? 4}, 1fr)`,
            lg: `repeat(${columns.lg ?? columns.md ?? 4}, 1fr)`,
          },
          gap,
        }}
      >
        {Array.from({ length: skeletonCount * 2 }).map((_, i) => (
          <Skeleton
            key={i}
            variant="rectangular"
            sx={{
              width: "100%",
              aspectRatio,
              borderRadius: tokens.spacing.radius.image,
              backgroundColor: tokens.color.base.sage[100],
            }}
          />
        ))}
      </Box>
    );
  }

  const visibleImages = maxVisible ? images.slice(0, maxVisible) : images;
  const remainingCount = maxVisible
    ? Math.max(0, images.length - maxVisible)
    : 0;

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: `repeat(${columns.xs ?? 2}, 1fr)`,
          sm: `repeat(${columns.sm ?? columns.xs ?? 3}, 1fr)`,
          md: `repeat(${columns.md ?? columns.sm ?? 4}, 1fr)`,
          lg: `repeat(${columns.lg ?? columns.md ?? 4}, 1fr)`,
        },
        gap,
        ...(variant === "masonry" && {
          gridAutoRows: "10px",
        }),
      }}
    >
      {visibleImages.map((image, index) => {
        const isLastVisible =
          maxVisible &&
          index === visibleImages.length - 1 &&
          remainingCount > 0;

        return (
          <AnimatedElement
            key={`${image.src}-${index}`}
            animation="slideUp"
            delay={index * 80}
            duration={400}
          >
            <Box
              onClick={() => onImageClick?.(index)}
              sx={{
                position: "relative",
                aspectRatio: variant === "masonry" ? undefined : aspectRatio,
                borderRadius: tokens.spacing.radius.image,
                overflow: "hidden",
                cursor: onImageClick ? "pointer" : "default",
                boxShadow: tokens.shadow.elevation.sm,
                transition: tokens.animation.transition.elevate,
                ...(variant === "masonry" && {
                  gridRowEnd: `span ${index % 3 === 0 ? 25 : index % 3 === 1 ? 20 : 30}`,
                }),
                "&:hover": {
                  boxShadow: tokens.shadow.elevation.imageHover,
                  transform: "translateY(-2px)",
                  "& .gallery-image": {
                    transform: "scale(1.05)",
                  },
                },
              }}
            >
              <OptimizedImage
                src={image.src}
                alt={image.alt}
                height="100%"
                objectFit="cover"
                className="gallery-image"
                sx={{
                  transition: `transform 400ms ${tokens.animation.transition.organic}`,
                }}
              />

              {isLastVisible && (
                <Box
                  sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: tokens.color.overlays.darkMedium,
                    zIndex: tokens.spacing.zIndex.base + 1,
                  }}
                >
                  <Typography
                    sx={{
                      color: "#FFFFFF",
                      fontFamily: tokens.typography.families.heading,
                      fontSize: tokens.typography.sizes.xl,
                      fontWeight: tokens.typography.weights.semibold,
                    }}
                  >
                    +{remainingCount} more
                  </Typography>
                </Box>
              )}
            </Box>
          </AnimatedElement>
        );
      })}
    </Box>
  );
};

export default GalleryGrid;
