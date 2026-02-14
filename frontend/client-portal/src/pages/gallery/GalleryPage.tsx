// pages/gallery/GalleryPage.tsx

import React from "react";
import { Box, useMediaQuery } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { tokens, Button } from "../../design-system";
import { GalleryHero } from "./components/GalleryHero";
import { GalleryContent } from "./components/GalleryContent";
import type { GalleryPageProps } from "./types/gallery.types";

/**
 * GalleryPage
 *
 * Dedicated gallery page with hero section, category filters, image grid,
 * and lightbox viewer. Supports URL query param ?category= for deep linking.
 *
 * Includes a sticky CTA bar on mobile to drive booking conversions.
 */
const GalleryPage: React.FC<GalleryPageProps> = ({ onNavigateToBooking }) => {
  const isMobile = useMediaQuery("(max-width:899.95px)");
  const navigate = useNavigate();

  const handleBooking = () => {
    if (onNavigateToBooking) {
      onNavigateToBooking();
    } else {
      navigate("/booking");
    }
  };

  return (
    <>
      <Box sx={{ minHeight: "100vh", width: "100%" }}>
        <GalleryHero />
        <GalleryContent />
      </Box>

      {/* Sticky CTA bar on mobile */}
      {isMobile && (
        <Box
          sx={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: tokens.spacing.zIndex.sticky,
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(12px)",
            borderTop: `1px solid ${tokens.color.base.neutral[200]}`,
            px: 2,
            py: 1.5,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <Button
            variant="terracotta"
            size="large"
            fullWidth
            onClick={handleBooking}
          >
            Ready to Book? Schedule Your Event
          </Button>
        </Box>
      )}
    </>
  );
};

export default GalleryPage;
