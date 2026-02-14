// pages/facilities/FacilitiesPage.tsx

import React, { useMemo } from "react";
import { Box, Typography, Stack } from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  tokens,
  Section,
  Container,
  AnimatedElement,
} from "../../design-system";
import { FacilitiesHero } from "./components/FacilitiesHero";
import {
  FacilitiesVenueCard,
  FacilitiesVenueCardSkeleton,
} from "./components/FacilitiesVenueCard";
import { LocationContact } from "../about/components/LocationContact";
import { useVenueGallery } from "../../hooks/useGallery";
import type { FacilitiesPageProps } from "./types/facilities.types";

const FacilitiesPage: React.FC<FacilitiesPageProps> = ({
  onNavigateToBooking,
}) => {
  const navigate = useNavigate();
  const { data: venues, isLoading, isError } = useVenueGallery();

  const sortedVenues = useMemo(() => {
    if (!venues) return [];
    return [...venues].sort((a, b) => a.sort_order - b.sort_order);
  }, [venues]);

  const handleNavigateToBooking = () => {
    if (onNavigateToBooking) {
      onNavigateToBooking();
    } else {
      navigate("/booking");
    }
  };

  return (
    <>
      <Box sx={{ minHeight: "100vh", width: "100%" }}>
        <FacilitiesHero />

        {/* Venue Showcase Section */}
        <Section background="cream" spacing="large">
          <Container maxWidth="wide">
            <Stack spacing={{ xs: 4, md: 6 }}>
              {/* Section Header */}
              <AnimatedElement animation="fadeIn" delay={0}>
                <Box sx={{ textAlign: "center", mb: { xs: 1, md: 2 } }}>
                  <Typography
                    sx={{
                      ...tokens.typography.styles.h2,
                      color: tokens.color.base.neutral[900],
                      mb: 2,
                    }}
                  >
                    Our Venues
                  </Typography>
                  <Typography
                    sx={{
                      ...tokens.typography.styles.bodyLarge,
                      color: tokens.color.base.neutral[600],
                      maxWidth: "700px",
                      mx: "auto",
                    }}
                  >
                    Explore our thoughtfully designed spaces, each offering a
                    unique setting for your celebration.
                  </Typography>
                </Box>
              </AnimatedElement>

              {/* Loading State */}
              {isLoading && (
                <Stack spacing={4}>
                  {Array.from({ length: 3 }).map((_, index) => (
                    <FacilitiesVenueCardSkeleton key={index} />
                  ))}
                </Stack>
              )}

              {/* Error State */}
              {isError && (
                <AnimatedElement animation="fadeIn">
                  <Box
                    sx={{
                      textAlign: "center",
                      py: { xs: 6, md: 8 },
                    }}
                  >
                    <Typography
                      sx={{
                        ...tokens.typography.styles.bodyLarge,
                        color: tokens.color.base.neutral[500],
                        mb: 1,
                      }}
                    >
                      We were unable to load our venue information at this time.
                    </Typography>
                    <Typography
                      sx={{
                        ...tokens.typography.styles.body,
                        color: tokens.color.base.neutral[400],
                      }}
                    >
                      Please refresh the page or try again later.
                    </Typography>
                  </Box>
                </AnimatedElement>
              )}

              {/* Venue Cards */}
              {!isLoading && !isError && sortedVenues.length > 0 && (
                <Stack spacing={4}>
                  {sortedVenues.map((venue, index) => (
                    <FacilitiesVenueCard
                      key={venue.id}
                      venue={venue}
                      onNavigateToBooking={handleNavigateToBooking}
                      animationDelay={100 + index * 150}
                    />
                  ))}
                </Stack>
              )}

              {/* Empty State */}
              {!isLoading && !isError && sortedVenues.length === 0 && (
                <AnimatedElement animation="fadeIn">
                  <Box
                    sx={{
                      textAlign: "center",
                      py: { xs: 6, md: 8 },
                    }}
                  >
                    <Typography
                      sx={{
                        ...tokens.typography.styles.bodyLarge,
                        color: tokens.color.base.neutral[500],
                      }}
                    >
                      No venues are currently available. Please check back soon.
                    </Typography>
                  </Box>
                </AnimatedElement>
              )}
            </Stack>
          </Container>
        </Section>

        <LocationContact onNavigateToBooking={onNavigateToBooking} />
      </Box>
    </>
  );
};

export default FacilitiesPage;
