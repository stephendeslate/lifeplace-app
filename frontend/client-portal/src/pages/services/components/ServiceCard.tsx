// pages/services/components/ServiceCard.tsx
// Modern Organic Luxury redesigned service card with optional featured image

import React from "react";
import { Box, Typography, Stack } from "@mui/material";
import { ArrowForward, Collections } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import {
  ModernCard,
  AnimatedElement,
  ImageWithOverlay,
  tokens,
} from "../../../design-system";
import { Button } from "../../../design-system";
import type { ServiceCardProps as BaseServiceCardProps } from "../types/services.types";

/** Extended props adding featured image and booking navigation to the base ServiceCardProps */
interface ServiceCardWithImageProps extends BaseServiceCardProps {
  /** Absolute URL to a featured image for this service, or null/undefined for icon fallback */
  featuredImage?: string | null;
  /** Callback to navigate the user to the booking flow */
  onNavigateToBooking?: () => void;
}

/**
 * Map an event type name to a gallery category URL parameter.
 * Uses explicit mappings for known types, falls back to a slug transform.
 */
const getGalleryCategoryParam = (name: string): string => {
  const categoryMap: Record<string, string> = {
    Wedding: "weddings",
    "Team Building": "team-building",
    Retreat: "retreats",
    Workshop: "workshops",
    Camping: "retreats",
  };

  return categoryMap[name] || name.toLowerCase().replace(/\s+/g, "-");
};

/**
 * Get accent color based on service type
 * Maps service IDs to appropriate color schemes for visual variety
 */
const getServiceAccentColor = (serviceId: string) => {
  const colorMap: Record<string, { icon: string; bg: string }> = {
    "camps-retreats": {
      icon: tokens.color.base.sage[600],
      bg: tokens.color.base.neutral[100],
    },
    "team-building": {
      icon: tokens.color.base.terracotta[600],
      bg: tokens.color.base.neutral[100],
    },
    workshops: {
      icon: tokens.color.base.olive[600],
      bg: tokens.color.base.neutral[100],
    },
    weddings: {
      icon: tokens.color.base.terracotta[500],
      bg: tokens.color.base.neutral[100],
    },
  };

  return colorMap[serviceId] || colorMap["camps-retreats"];
};

/**
 * ServiceCard Component
 *
 * Displays individual service information using Modern Organic Luxury design system.
 *
 * Features:
 * - Featured image via ImageWithOverlay when available, icon fallback otherwise
 * - Modern elevated card with hover effects
 * - Service-type specific accent colors
 * - Feature list with bullet points
 * - "View Gallery" cross-link button
 * - "Book Now" CTA button
 * - Staggered slideUp animations
 * - WCAG AA compliant contrast ratios
 * - Responsive layout
 */
export const ServiceCard: React.FC<ServiceCardWithImageProps> = ({
  service,
  index = 0,
  featuredImage,
  onNavigateToBooking,
}) => {
  const accentColors = getServiceAccentColor(service.id);
  const navigate = useNavigate();

  const galleryPath = `/gallery?category=${getGalleryCategoryParam(service.name)}`;

  const handleViewGallery = () => {
    navigate(galleryPath);
  };

  return (
    <AnimatedElement animation="slideUp" delay={200 + index * 100}>
      <ModernCard
        variant="elevated"
        size="large"
        hover
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <Stack
          spacing={3}
          sx={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Featured Image or Icon Fallback */}
          {featuredImage ? (
            <Box sx={{ mx: -3, mt: -3 }}>
              <ImageWithOverlay
                image={featuredImage}
                alt={`${service.name} at LifePlace Alfonso`}
                overlay="gradient"
                overlayOpacity={0.35}
                height={{ xs: "200px", md: "240px" }}
                sx={{
                  borderRadius: 0,
                }}
              >
                <Typography
                  variant="h4"
                  component="span"
                  sx={{
                    color: "#FFFFFF",
                    fontWeight: tokens.typography.weights.semibold,
                    textShadow: "0 2px 8px rgba(0,0,0,0.3)",
                    position: "absolute",
                    bottom: tokens.spacing.space[4],
                    left: tokens.spacing.space[4],
                  }}
                >
                  {service.name}
                </Typography>
              </ImageWithOverlay>
            </Box>
          ) : (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "80px",
                height: "80px",
                borderRadius: tokens.spacing.radius.full,
                backgroundColor: accentColors.bg,
                transition: tokens.animation.transition.all,
                flexShrink: 0,
                color: accentColors.icon,
              }}
              aria-hidden="true"
            >
              {service.icon}
            </Box>
          )}

          {/* Service Name (shown below card when using icon fallback) */}
          {!featuredImage && (
            <Typography
              variant="h4"
              component="h3"
              sx={{
                fontWeight: tokens.typography.weights.semibold,
                color: tokens.color.base.sage[900],
                lineHeight: tokens.typography.lineHeights.tight,
              }}
            >
              {service.name}
            </Typography>
          )}

          {/* Service Description */}
          <Typography
            variant="body1"
            sx={{
              color: tokens.color.base.neutral[700],
              lineHeight: tokens.typography.lineHeights.relaxed,
            }}
          >
            {service.description}
          </Typography>

          {/* Features List */}
          <Stack
            spacing={2}
            sx={{
              flex: 1,
              pt: tokens.spacing.space[2],
            }}
          >
            {service.features.map((feature, idx) => (
              <Box
                key={idx}
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: tokens.spacing.space[2],
                }}
              >
                {/* Bullet Point */}
                <Box
                  sx={{
                    width: "6px",
                    height: "6px",
                    borderRadius: tokens.spacing.radius.full,
                    backgroundColor: accentColors.icon,
                    flexShrink: 0,
                    mt: "8px", // Align with first line of text
                  }}
                  aria-hidden="true"
                />
                <Typography
                  variant="body2"
                  sx={{
                    color: tokens.color.base.neutral[600],
                    lineHeight: tokens.typography.lineHeights.relaxed,
                    flex: 1,
                  }}
                >
                  {feature}
                </Typography>
              </Box>
            ))}
          </Stack>

          {/* CTA Buttons */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{ pt: tokens.spacing.space[3] }}
          >
            <Button
              variant="primary"
              size="medium"
              endIcon={<ArrowForward />}
              onClick={onNavigateToBooking}
              ariaLabel={`Book ${service.name} at LifePlace Alfonso`}
            >
              Book Now
            </Button>
            <Button
              variant="outlined"
              size="medium"
              startIcon={<Collections />}
              onClick={handleViewGallery}
              ariaLabel={`View ${service.name} gallery photos`}
            >
              View Gallery
            </Button>
          </Stack>
        </Stack>
      </ModernCard>
    </AnimatedElement>
  );
};
