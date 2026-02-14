// frontend/client-portal/src/components/booking/steps/VenueSelectionStep.tsx
// Simplified: Only handles venue selection. Package selection moved to PackageSelectionStep.

import React, { useCallback, useMemo, useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  CardMedia,
  Button,
  Chip,
  Alert,
  Skeleton,
} from "@mui/material";
import {
  Check,
  AccessTime,
  People,
  LocationOn,
  Collections,
} from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { VenuesApi } from "../../../apis/booking/venues.api";
import { ProductsApi } from "../../../apis/booking/products.api";
import { useCurrencySettings } from "../../../hooks/useCurrency";
import { ImageCarousel, ImageLightbox } from "../../gallery";
import type { GalleryImage } from "../../../types/gallery.types";
import type {
  RentableVenue,
  VenueSelectionStepConfiguration,
} from "../../../types/booking/venues.types";
import type { VenueSelectionStepData } from "../../../types/booking/stepData.types";

interface VenueSelectionStepProps {
  stepData?: VenueSelectionStepData;
  config: VenueSelectionStepConfiguration | null;
  onDataChange: (data: VenueSelectionStepData) => void;
  validationErrors: Record<string, string[]>;
  isValidating: boolean;
  eventTypeId?: number;
  isSkippable?: boolean;
}

export const VenueSelectionStep: React.FC<VenueSelectionStepProps> = ({
  stepData = { selected_venue_ids: [] },
  config,
  onDataChange,
  validationErrors,
  isValidating,
  eventTypeId,
  isSkippable = false,
}) => {
  const { formatAmount } = useCurrencySettings();
  const [selectedVenueIds, setSelectedVenueIds] = useState<number[]>(
    stepData.selected_venue_ids || [],
  );

  // Lightbox state — single lightbox shared across all venue cards
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxImages, setLightboxImages] = useState<GalleryImage[]>([]);
  const [lightboxVenueId, setLightboxVenueId] = useState<number | null>(null);

  // Configuration values
  // Use nullish coalescing (??) so that 0 is preserved (for skippable steps)
  // If step is skippable, allow empty selection (min = 0)
  const configMinVenues = config?.min_venues ?? 1;
  const minVenues = isSkippable ? 0 : configMinVenues;
  const maxVenues = config?.max_venues ?? 5;
  const showPricing = config?.show_pricing ?? true;
  const showIncludedHours = config?.show_included_hours ?? true;
  const title = config?.title || "Select Your Spaces";
  const description =
    config?.description || "Choose which spaces to include in your booking.";

  // Fetch rentable venues with event-type-specific pricing if available
  const {
    data: venues,
    isLoading,
    error: fetchError,
  } = useQuery({
    queryKey: ["rentable-venues", eventTypeId],
    queryFn: () => VenuesApi.getRentableVenues(eventTypeId),
  });

  // Debug logging - remove after fixing
  if (import.meta.env.DEV) {
    console.log("[VenueSelectionStep] Debug:", {
      config,
      configAvailableVenues: config?.available_venues_details,
      apiVenues: venues,
      fetchError,
      isLoading,
    });
  }

  // Use configured venues if available, otherwise use fetched venues
  const availableVenues = config?.available_venues_details || venues || [];

  // Sync local state with stepData changes from parent
  const stepDataVenueIdsString = JSON.stringify(
    stepData.selected_venue_ids || [],
  );
  useEffect(() => {
    const newIds = stepData.selected_venue_ids || [];
    if (JSON.stringify(selectedVenueIds) !== stepDataVenueIdsString) {
      setSelectedVenueIds(newIds);
    }
  }, [stepDataVenueIdsString]); // eslint-disable-line react-hooks/exhaustive-deps

  // Get selected venue objects for display
  const selectedVenueObjects = useMemo(() => {
    return availableVenues.filter((v) => selectedVenueIds.includes(v.id));
  }, [availableVenues, selectedVenueIds]);

  // Check if venue is selected
  const isVenueSelected = useCallback(
    (venueId: number) => {
      return selectedVenueIds.includes(venueId);
    },
    [selectedVenueIds],
  );

  // Handle venue toggle
  const handleVenueToggle = useCallback(
    (venue: RentableVenue) => {
      let newSelectedIds: number[];

      if (isVenueSelected(venue.id)) {
        // Remove venue
        newSelectedIds = selectedVenueIds.filter((id) => id !== venue.id);
      } else {
        // Add venue if under limit
        if (maxVenues > 0 && selectedVenueIds.length >= maxVenues) {
          return; // Don't add if at limit
        }
        newSelectedIds = [...selectedVenueIds, venue.id];
      }

      setSelectedVenueIds(newSelectedIds);
      onDataChange({
        selected_venue_ids: newSelectedIds,
      });
    },
    [selectedVenueIds, maxVenues, isVenueSelected, onDataChange],
  );

  // Validation status
  const validationStatus = useMemo(() => {
    const errors: string[] = [];

    if (minVenues > 0 && selectedVenueIds.length < minVenues) {
      errors.push(
        `Please select at least ${minVenues} space${minVenues > 1 ? "s" : ""}`,
      );
    }

    if (maxVenues > 0 && selectedVenueIds.length > maxVenues) {
      errors.push(
        `Cannot select more than ${maxVenues} space${maxVenues > 1 ? "s" : ""}`,
      );
    }

    // Merge with external validation errors
    const allErrors = [...errors, ...Object.values(validationErrors).flat()];

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
    };
  }, [selectedVenueIds, minVenues, maxVenues, validationErrors]);

  const formatPrice = (price: string | number) => {
    return ProductsApi.formatPrice(price.toString());
  };

  // Build GalleryImage[] from a venue's featured + gallery images
  const buildVenueGalleryImages = useCallback(
    (venue: RentableVenue): GalleryImage[] => {
      const urls = [venue.featured_image, ...venue.gallery_images].filter(
        Boolean,
      ) as string[];
      return urls.map((src, index) => ({
        src,
        alt: `${venue.name} - Photo ${index + 1}`,
        venueId: venue.id,
        venueName: venue.name,
      }));
    },
    [],
  );

  // Open lightbox for a specific venue
  const openLightbox = useCallback(
    (venue: RentableVenue, imageIndex: number) => {
      const images = buildVenueGalleryImages(venue);
      setLightboxImages(images);
      setLightboxIndex(imageIndex);
      setLightboxVenueId(venue.id);
      setLightboxOpen(true);
    },
    [buildVenueGalleryImages],
  );

  // Close lightbox
  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    setLightboxVenueId(null);
  }, []);

  // Handle "Select This Venue" from lightbox
  const handleLightboxSelect = useCallback(() => {
    if (lightboxVenueId === null) return;
    const venue = availableVenues.find((v) => v.id === lightboxVenueId);
    if (venue) {
      handleVenueToggle(venue);
    }
    closeLightbox();
  }, [lightboxVenueId, availableVenues, handleVenueToggle, closeLightbox]);

  // Loading state
  if (isLoading) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Skeleton variant="text" width="60%" height={40} />
        <Skeleton variant="text" width="80%" />
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton
              key={i}
              variant="rectangular"
              height={200}
              sx={{ borderRadius: 2 }}
            />
          ))}
        </Box>
      </Box>
    );
  }

  // Error state
  if (fetchError) {
    return (
      <Alert severity="error">
        Failed to load venues. Please refresh and try again.
      </Alert>
    );
  }

  // No venues available
  if (availableVenues.length === 0) {
    return (
      <Alert severity="info">
        No spaces are currently available for selection.
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>

      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {description}
        </Typography>
      )}

      {maxVenues > 1 && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          You can select up to {maxVenues} spaces for your event.
        </Typography>
      )}

      {/* Validation Errors */}
      {!validationStatus.isValid && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {validationStatus.errors.map((error, index) => (
            <Typography key={index} variant="body2">
              {error}
            </Typography>
          ))}
        </Alert>
      )}

      {/* Venue Cards */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 3 }}>
        {availableVenues.map((venue) => {
          const isSelected = isVenueSelected(venue.id);
          // Get effective pricing (uses event-type config if available)
          const pricing = VenuesApi.getEffectivePricing(venue);

          return (
            <Card
              key={venue.id}
              variant={isSelected ? "elevation" : "outlined"}
              sx={{
                border: isSelected ? 2 : 1,
                borderColor: isSelected ? "primary.main" : "divider",
                position: "relative",
                transition: "all 0.2s ease-in-out",
                cursor: "pointer",
                "&:hover": {
                  borderColor: isSelected ? "primary.main" : "primary.light",
                  boxShadow: 2,
                },
              }}
              onClick={() => handleVenueToggle(venue)}
            >
              {isSelected && (
                <Chip
                  icon={<Check />}
                  label="Included"
                  color="primary"
                  size="small"
                  sx={{ position: "absolute", top: 16, right: 16, zIndex: 1 }}
                />
              )}

              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", sm: "row" },
                }}
              >
                {/* Venue Image: carousel when gallery images exist, fallback otherwise */}
                {(() => {
                  const galleryImages = buildVenueGalleryImages(venue);
                  const galleryCount = venue.gallery_images?.length || 0;

                  if (galleryImages.length > 0) {
                    return (
                      <Box
                        sx={{
                          width: { xs: "100%", sm: 200 },
                          height: { xs: 150, sm: 200 },
                          flexShrink: 0,
                          position: "relative",
                        }}
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      >
                        <ImageCarousel
                          images={galleryImages}
                          height={{ xs: "150px", sm: "200px" }}
                          showArrows={galleryImages.length > 1}
                          showThumbnails={false}
                          onImageClick={(index) => openLightbox(venue, index)}
                        />
                        {galleryCount > 0 && (
                          <Chip
                            icon={<Collections sx={{ fontSize: 14 }} />}
                            label={`${galleryImages.length} photos`}
                            size="small"
                            sx={{
                              position: "absolute",
                              bottom: 8,
                              left: 8,
                              zIndex: 2,
                              backgroundColor: "rgba(0, 0, 0, 0.6)",
                              color: "#fff",
                              fontSize: "0.7rem",
                              height: 24,
                              "& .MuiChip-icon": { color: "#fff" },
                              cursor: "pointer",
                            }}
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              openLightbox(venue, 0);
                            }}
                          />
                        )}
                      </Box>
                    );
                  }

                  return (
                    <CardMedia
                      component="img"
                      image="/assets/Fountain-min.png"
                      alt={venue.name}
                      loading="lazy"
                      sx={{
                        width: { xs: "100%", sm: 200 },
                        height: { xs: 150, sm: "auto" },
                        objectFit: "cover",
                      }}
                    />
                  );
                })()}

                <CardContent sx={{ flex: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    {venue.name}
                  </Typography>

                  {venue.description && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 2 }}
                    >
                      {venue.description}
                    </Typography>
                  )}

                  {/* Venue Features */}
                  <Box
                    sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}
                  >
                    <Chip
                      icon={<People />}
                      label={`${venue.minimum_capacity}-${venue.maximum_capacity} guests`}
                      size="small"
                      variant="outlined"
                    />
                    {showIncludedHours && pricing.includedHours && (
                      <Chip
                        icon={<AccessTime />}
                        label={
                          pricing.isAllDayAccess
                            ? "All-day access"
                            : `${pricing.includedHours} hours included`
                        }
                        size="small"
                        variant="outlined"
                        color={pricing.isAllDayAccess ? "success" : "default"}
                      />
                    )}
                    {venue.location_description && (
                      <Chip
                        icon={<LocationOn />}
                        label={venue.location_description}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Box>

                  {/* Pricing */}
                  {showPricing && (
                    <Box
                      sx={{ display: "flex", alignItems: "baseline", gap: 1 }}
                    >
                      <Typography variant="h5" color="primary">
                        {formatPrice(pricing.basePrice)}
                      </Typography>
                      {pricing.excessHourPrice && !pricing.isAllDayAccess && (
                        <Typography variant="body2" color="text.secondary">
                          +{formatAmount(parseFloat(pricing.excessHourPrice))}
                          /hr extra
                        </Typography>
                      )}
                    </Box>
                  )}
                </CardContent>
              </Box>

              <CardActions sx={{ px: 2, pb: 2 }}>
                <Button
                  variant={isSelected ? "contained" : "outlined"}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleVenueToggle(venue);
                  }}
                  fullWidth
                >
                  {isSelected ? "Included" : "Add to Booking"}
                </Button>
              </CardActions>
            </Card>
          );
        })}
      </Box>

      {/* Simple selection summary */}
      {selectedVenueIds.length > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Selected:</strong>{" "}
            {selectedVenueObjects.map((v) => v.name).join(", ")}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            You'll choose your package in the next step.
          </Typography>
        </Alert>
      )}

      {/* Validation indicator */}
      {isValidating && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Validating selection...
          </Typography>
        </Box>
      )}

      {/* Shared lightbox — rendered once for all venue cards */}
      <ImageLightbox
        images={lightboxImages}
        open={lightboxOpen}
        index={lightboxIndex}
        onClose={closeLightbox}
        onIndexChange={setLightboxIndex}
        showThumbnails
        showZoom
        showFullscreen
        ctaButton={
          lightboxVenueId !== null
            ? {
                label: isVenueSelected(lightboxVenueId)
                  ? "Remove This Venue"
                  : "Select This Venue",
                onClick: handleLightboxSelect,
              }
            : undefined
        }
      />
    </Box>
  );
};

export default VenueSelectionStep;
