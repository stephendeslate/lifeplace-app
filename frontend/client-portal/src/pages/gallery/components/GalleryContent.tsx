// pages/gallery/components/GalleryContent.tsx

import React, { useState, useMemo, useCallback } from "react";
import { Box, Typography } from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  tokens,
  Section,
  Container,
  AnimatedElement,
  Button,
} from "../../../design-system";
import {
  GalleryGrid,
  GalleryFilterBar,
  ImageLightbox,
} from "../../../components/gallery";
import { useVenueGallery, useGalleryPhotos } from "../../../hooks/useGallery";
import type { GalleryImage } from "../../../types/gallery.types";
import type { GalleryContentProps } from "../types/gallery.types";

/** Number of images to show per page / load-more increment */
const IMAGES_PER_PAGE = 12;

/**
 * Category definitions mapping display labels to backend category values.
 * The `backendValues` array allows one filter to match multiple backend categories.
 */
const GALLERY_CATEGORIES = [
  { id: "all", label: "All", backendValues: [] as string[] },
  { id: "venues", label: "Venues", backendValues: ["GENERAL"] },
  { id: "weddings", label: "Weddings", backendValues: ["WEDDING"] },
  {
    id: "team-building",
    label: "Team Building",
    backendValues: ["TEAM_BUILDING"],
  },
  {
    id: "camps-retreats",
    label: "Camps & Retreats",
    backendValues: ["RETREAT", "CAMPING"],
  },
  { id: "workshops", label: "Workshops", backendValues: ["WORKSHOP"] },
  { id: "atmosphere", label: "Atmosphere", backendValues: ["ATMOSPHERE"] },
];

/** Map a URL-friendly category slug to its category definition */
const findCategoryById = (id: string) =>
  GALLERY_CATEGORIES.find((c) => c.id === id) ?? GALLERY_CATEGORIES[0];

/**
 * GalleryContent Component
 *
 * Main content area for the Gallery page containing:
 * - Category filter bar
 * - Image grid with load-more pagination
 * - Full-screen lightbox viewer
 *
 * Data is aggregated from two sources:
 * 1. Venue gallery images (featured images from each venue)
 * 2. Dedicated gallery photos (uploaded via admin CRM)
 */
export const GalleryContent: React.FC<GalleryContentProps> = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read category from URL query param, default to "all"
  const activeCategoryId = searchParams.get("category") ?? "all";
  const activeCategory = findCategoryById(activeCategoryId);

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Pagination state
  const [visibleCount, setVisibleCount] = useState(IMAGES_PER_PAGE);

  // Fetch data from both sources
  const {
    data: venues,
    isLoading: venuesLoading,
    isError: venuesError,
  } = useVenueGallery();
  const {
    data: galleryPhotos,
    isLoading: photosLoading,
    isError: photosError,
  } = useGalleryPhotos();

  const isLoading = venuesLoading || photosLoading;
  const isError = venuesError && photosError;

  /**
   * Aggregate images from both data sources and apply category filter.
   */
  const allImages = useMemo<GalleryImage[]>(() => {
    const images: GalleryImage[] = [];

    // 1. Venue featured images
    if (venues) {
      for (const venue of venues) {
        if (venue.featured_image) {
          images.push({
            src: venue.featured_image,
            alt: `${venue.name} - venue`,
            category: "GENERAL",
            venueId: venue.id,
            venueName: venue.name,
          });
        }
      }
    }

    // 2. Dedicated gallery photos
    if (galleryPhotos) {
      for (const photo of galleryPhotos) {
        images.push({
          src: photo.image,
          alt: photo.title || photo.description || "Gallery photo",
          category: photo.category,
          venueId: photo.venue_id ?? undefined,
          venueName: photo.venue_name ?? undefined,
          eventType: photo.event_type_name ?? undefined,
        });
      }
    }

    return images;
  }, [venues, galleryPhotos]);

  /** Images filtered by active category */
  const filteredImages = useMemo<GalleryImage[]>(() => {
    if (
      activeCategory.id === "all" ||
      activeCategory.backendValues.length === 0
    ) {
      return allImages;
    }
    return allImages.filter(
      (img) =>
        img.category && activeCategory.backendValues.includes(img.category),
    );
  }, [allImages, activeCategory]);

  /** Images currently visible (paginated) */
  const visibleImages = useMemo(
    () => filteredImages.slice(0, visibleCount),
    [filteredImages, visibleCount],
  );

  const hasMore = visibleCount < filteredImages.length;

  /** Category filter counts */
  const categoriesWithCounts = useMemo(
    () =>
      GALLERY_CATEGORIES.map((cat) => ({
        id: cat.id,
        label: cat.label,
        count:
          cat.id === "all"
            ? allImages.length
            : allImages.filter(
                (img) =>
                  img.category && cat.backendValues.includes(img.category),
              ).length,
      })),
    [allImages],
  );

  const handleCategoryChange = useCallback(
    (categoryId: string) => {
      if (categoryId === "all") {
        setSearchParams({});
      } else {
        setSearchParams({ category: categoryId });
      }
      setVisibleCount(IMAGES_PER_PAGE);
    },
    [setSearchParams],
  );

  const handleImageClick = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  const handleLoadMore = useCallback(() => {
    setVisibleCount((prev) => prev + IMAGES_PER_PAGE);
  }, []);

  const handleNavigateToBooking = useCallback(() => {
    navigate("/booking");
  }, [navigate]);

  return (
    <Section>
      <Container maxWidth="wide">
        {/* Filter Bar */}
        <AnimatedElement animation="fadeIn" delay={100}>
          <Box sx={{ mb: { xs: 3, md: 4 } }}>
            <GalleryFilterBar
              categories={categoriesWithCounts}
              activeCategory={activeCategoryId}
              onCategoryChange={handleCategoryChange}
            />
          </Box>
        </AnimatedElement>

        {/* Loading State */}
        {isLoading && (
          <GalleryGrid images={[]} columns={{ xs: 2, sm: 3, md: 4 }} loading />
        )}

        {/* Error State */}
        {isError && !isLoading && (
          <Box
            sx={{
              textAlign: "center",
              py: { xs: 6, md: 10 },
            }}
          >
            <Typography
              sx={{
                ...tokens.typography.styles.body,
                color: tokens.color.base.neutral[500],
              }}
            >
              Unable to load gallery images. Please try again later.
            </Typography>
          </Box>
        )}

        {/* Empty State */}
        {!isLoading && !isError && filteredImages.length === 0 && (
          <Box
            sx={{
              textAlign: "center",
              py: { xs: 6, md: 10 },
            }}
          >
            <Typography
              sx={{
                ...tokens.typography.styles.h4,
                color: tokens.color.base.neutral[600],
                mb: 1,
              }}
            >
              No photos found
            </Typography>
            <Typography
              sx={{
                ...tokens.typography.styles.body,
                color: tokens.color.base.neutral[500],
              }}
            >
              Try selecting a different category to explore more of our spaces.
            </Typography>
          </Box>
        )}

        {/* Image Grid */}
        {!isLoading && !isError && filteredImages.length > 0 && (
          <>
            <GalleryGrid
              images={visibleImages}
              columns={{ xs: 2, sm: 3, md: 4 }}
              onImageClick={handleImageClick}
            />

            {/* Load More Button */}
            {hasMore && (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  mt: { xs: 4, md: 6 },
                }}
              >
                <Button
                  variant="outlined"
                  size="large"
                  onClick={handleLoadMore}
                >
                  Load More Photos
                </Button>
              </Box>
            )}

            {/* Results count */}
            <Box
              sx={{
                textAlign: "center",
                mt: 2,
              }}
            >
              <Typography
                sx={{
                  ...tokens.typography.styles.body,
                  color: tokens.color.base.neutral[400],
                  fontSize: tokens.typography.sizes.sm,
                }}
              >
                Showing {visibleImages.length} of {filteredImages.length} photos
              </Typography>
            </Box>
          </>
        )}

        {/* Lightbox */}
        <ImageLightbox
          images={filteredImages}
          open={lightboxOpen}
          index={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
          onIndexChange={setLightboxIndex}
          showThumbnails
          showZoom
          showFullscreen
          showCaptions
          ctaButton={{
            label: "Book This Venue",
            onClick: handleNavigateToBooking,
          }}
        />
      </Container>
    </Section>
  );
};

export default GalleryContent;
