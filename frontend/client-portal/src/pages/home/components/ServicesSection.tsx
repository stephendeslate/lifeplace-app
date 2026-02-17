// pages/home/components/ServicesSection.tsx

import React from "react";
import { Box, Typography, Stack } from "@mui/material";
import { styled } from "@mui/material/styles";
import { Favorite, Groups, Nature, School } from "@mui/icons-material";
import {
  Section,
  Container,
  AnimatedElement,
  tokens,
} from "../../../design-system";
import type { ServiceInfo } from "../types/home.types";

// Modern service card component
const ServiceCard = styled(Box)(() => ({
  position: "relative",
  height: "100%",
  background: "rgba(255, 255, 255, 0.95)",
  borderRadius: tokens.spacing.radius.card,
  padding: tokens.spacing.space[4],
  textAlign: "center",
  transition: tokens.animation.transition.all,
  boxShadow: tokens.shadow.elevation.sm,
  border: `1px solid ${tokens.color.base.neutral[100]}`,
  overflow: "hidden",

  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "4px",
    background: tokens.color.gradients.warmSage,
    opacity: 0,
    transition: tokens.animation.transition.all,
  },

  "&:hover": {
    transform: "translateY(-8px)",
    boxShadow: tokens.shadow.elevation.lg,
    "&::before": {
      opacity: 1,
    },
  },

  // Accessibility: Reduced motion
  "@media (prefers-reduced-motion: reduce)": {
    transition: "none",
    "&:hover": {
      transform: "none",
    },
  },
}));

const IconWrapper = styled(Box)({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "80px",
  height: "80px",
  borderRadius: "50%",
  background: tokens.color.gradients.morningMist,
  marginBottom: tokens.spacing.space[3],
  position: "relative",

  "&::after": {
    content: '""',
    position: "absolute",
    inset: -2,
    borderRadius: "50%",
    background: tokens.color.gradients.warmSage,
    opacity: 0.1,
    zIndex: 0,
  },

  "& > svg": {
    position: "relative",
    zIndex: 1,
  },
});

export const ServicesSection: React.FC = () => {
  const services: ServiceInfo[] = [
    {
      id: "weddings",
      title: "Weddings",
      description:
        "Create timeless memories in our beautiful venues with comprehensive wedding packages.",
      icon: (
        <Favorite
          sx={{ fontSize: 48, color: tokens.color.base.terracotta[500] }}
        />
      ),
    },
    {
      id: "team-building",
      title: "Team Building",
      description:
        "Strengthen bonds and foster creativity through hands-on activities in a peaceful environment.",
      icon: (
        <Groups sx={{ fontSize: 48, color: tokens.color.base.sage[600] }} />
      ),
    },
    {
      id: "camps-retreats",
      title: "Camps & Retreats",
      description:
        "Experience nature, community, and spiritual renewal in our spacious grounds and comfortable facilities.",
      icon: (
        <Nature sx={{ fontSize: 48, color: tokens.color.base.sage[500] }} />
      ),
    },
    {
      id: "workshops",
      title: "Workshops",
      description:
        "Discover new skills and grow your creativity in our inspiring workshop venues and peaceful environment.",
      icon: (
        <School sx={{ fontSize: 48, color: tokens.color.base.olive[600] }} />
      ),
    },
  ];

  return (
    <Section background="sage" spacing="large">
      <Container maxWidth="wide">
        <Stack spacing={tokens.spacing.space[8]}>
          {/* Section Header */}
          <AnimatedElement animation="fadeIn" delay={100}>
            <Stack
              spacing={tokens.spacing.space[2]}
              sx={{ textAlign: "center", alignItems: "center" }}
            >
              <Typography
                component="h2"
                sx={{
                  ...tokens.typography.styles.h2,
                  color: tokens.color.base.neutral[900],
                  fontSize: {
                    xs: tokens.typography.responsive.h2.mobile.fontSize,
                    md: tokens.typography.responsive.h2.tablet.fontSize,
                    lg: tokens.typography.styles.h2.fontSize,
                  },
                  lineHeight: {
                    xs: tokens.typography.responsive.h2.mobile.lineHeight,
                    md: tokens.typography.responsive.h2.tablet.lineHeight,
                    lg: tokens.typography.styles.h2.lineHeight,
                  },
                }}
              >
                Our Services
              </Typography>
              <Typography
                sx={{
                  ...tokens.typography.styles.bodyLarge,
                  color: tokens.color.base.neutral[700],
                  maxWidth: "800px",
                }}
              >
                We provide comprehensive packages for every type of celebration
                and gathering
              </Typography>
            </Stack>
          </AnimatedElement>

          {/* Service Cards Grid */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                lg: "repeat(4, 1fr)",
              },
              gap: {
                xs: tokens.spacing.space[3],
                md: tokens.spacing.space[4],
              },
            }}
          >
            {services.map((service, index) => (
              <AnimatedElement
                key={service.id}
                animation="slideUp"
                delay={200 + index * 100}
              >
                <ServiceCard
                  role="article"
                  aria-label={`${service.title} service`}
                >
                  <Stack spacing={tokens.spacing.space[3]} alignItems="center">
                    <IconWrapper aria-hidden="true">{service.icon}</IconWrapper>
                    <Box>
                      <Typography
                        component="h3"
                        sx={{
                          ...tokens.typography.styles.h4,
                          color: tokens.color.base.neutral[900],
                          mb: tokens.spacing.space[2],
                        }}
                      >
                        {service.title}
                      </Typography>
                      <Typography
                        sx={{
                          ...tokens.typography.styles.body,
                          color: tokens.color.base.neutral[600],
                        }}
                      >
                        {service.description}
                      </Typography>
                    </Box>
                  </Stack>
                </ServiceCard>
              </AnimatedElement>
            ))}
          </Box>
        </Stack>
      </Container>
    </Section>
  );
};
