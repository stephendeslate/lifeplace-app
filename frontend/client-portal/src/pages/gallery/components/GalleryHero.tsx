// pages/gallery/components/GalleryHero.tsx

import React from "react";
import { Typography, Stack } from "@mui/material";
import {
  tokens,
  ImageWithOverlay,
  AnimatedElement,
} from "../../../design-system";

/**
 * GalleryHero Component
 *
 * Hero section for the Gallery page using ImageWithOverlay from the design system.
 * Displays a full-width hero image with gradient overlay and centered text content.
 */
export const GalleryHero: React.FC = () => {
  return (
    <ImageWithOverlay
      image="/images/gallery-hero.jpg"
      alt="LifePlace Alfonso gallery showcase"
      overlay="gradient"
      height={{ xs: "340px", sm: "400px", md: "480px", lg: "540px" }}
      sx={{
        borderRadius: 0,
        mt: { xs: "-120px", md: "-140px" },
        pt: { xs: "120px", md: "140px" },
      }}
    >
      <Stack
        spacing={{ xs: 2, md: 3 }}
        alignItems="center"
        sx={{ textAlign: "center", maxWidth: 800 }}
      >
        <AnimatedElement animation="fadeIn" delay={100}>
          <Typography
            sx={{
              ...tokens.typography.styles.h1,
              fontSize: {
                xs: tokens.typography.responsive.h1.mobile.fontSize,
                md: tokens.typography.responsive.h1.tablet.fontSize,
                lg: tokens.typography.responsive.h1.desktop.fontSize,
              },
              lineHeight: {
                xs: tokens.typography.responsive.h1.mobile.lineHeight,
                md: tokens.typography.responsive.h1.tablet.lineHeight,
                lg: tokens.typography.responsive.h1.desktop.lineHeight,
              },
              color: tokens.color.base.neutral[50],
              textShadow: tokens.shadow.text.dark,
            }}
          >
            Explore LifePlace Alfonso
          </Typography>
        </AnimatedElement>

        <AnimatedElement animation="fadeIn" delay={250}>
          <Typography
            sx={{
              ...tokens.typography.styles.bodyLarge,
              fontSize: {
                xs: tokens.typography.sizes.base,
                md: tokens.typography.sizes.lg,
              },
              color: tokens.color.base.neutral[100],
              lineHeight: tokens.typography.lineHeights.relaxed,
              textShadow: tokens.shadow.text.medium,
              maxWidth: 650,
            }}
          >
            Browse our collection of venue photos, event setups, and atmosphere
            shots
          </Typography>
        </AnimatedElement>
      </Stack>
    </ImageWithOverlay>
  );
};

export default GalleryHero;
