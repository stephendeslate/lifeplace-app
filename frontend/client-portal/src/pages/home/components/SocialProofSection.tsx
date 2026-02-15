// pages/home/components/SocialProofSection.tsx

import React from "react";
import { Box, Typography } from "@mui/material";
import { Star, CheckCircle, People, Favorite } from "@mui/icons-material";
import { Section } from "../../../design-system/components/Section";
import { Container } from "../../../design-system/components/Container";
import { GlassCard } from "../../../design-system/components/GlassCard";
import { AnimatedElement } from "../../../design-system/components/AnimatedElement";
import { tokens } from "../../../design-system/tokens";

interface Testimonial {
  id: string;
  quote: string;
  author: string;
  role: string;
  rating: number;
  event?: string;
}

const TestimonialCard: React.FC<{
  testimonial: Testimonial;
  delay?: number;
}> = ({ testimonial, delay = 0 }) => (
  <AnimatedElement animation="fadeIn" delay={delay}>
    <GlassCard variant="light" intensity="medium" hover={true}>
      <Box
        sx={{ minHeight: "200px", display: "flex", flexDirection: "column" }}
      >
        {/* Star Rating */}
        <Box
          sx={{
            display: "flex",
            gap: tokens.spacing.space[0.5],
            mb: tokens.spacing.space[2],
          }}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              sx={{
                fontSize: 20,
                color:
                  i < testimonial.rating
                    ? tokens.color.base.gold[500]
                    : tokens.color.base.sage[300],
              }}
            />
          ))}
        </Box>

        {/* Quote */}
        <Typography
          sx={{
            ...tokens.typography.styles.quote,
            fontSize: tokens.typography.sizes.md,
            fontStyle: "italic",
            color: tokens.color.base.forest[800],
            mb: tokens.spacing.space[3],
            flex: 1,
          }}
        >
          "{testimonial.quote}"
        </Typography>

        {/* Author */}
        <Box>
          <Typography
            sx={{
              ...tokens.typography.styles.h5,
              fontSize: tokens.typography.sizes.lg,
              color: tokens.color.base.forest[700],
              mb: tokens.spacing.space[0.5],
            }}
          >
            {testimonial.author}
          </Typography>
          <Typography
            sx={{
              ...tokens.typography.styles.bodySmall,
              color: tokens.color.base.neutral[600],
            }}
          >
            {testimonial.role}
            {testimonial.event && ` • ${testimonial.event}`}
          </Typography>
        </Box>
      </Box>
    </GlassCard>
  </AnimatedElement>
);

export const SocialProofSection: React.FC = () => {
  const testimonials: Testimonial[] = [
    {
      id: "1",
      quote:
        "LifePlace made our wedding day absolutely perfect! The venue was stunning, and the team went above and beyond to ensure everything ran smoothly.",
      author: "Maria & Carlos Santos",
      role: "Wedding Celebration",
      rating: 5,
      event: "June 2025",
    },
    {
      id: "2",
      quote:
        "Outstanding venue and exceptional service. Our corporate retreat was a huge success thanks to the professional team and beautiful facilities.",
      author: "Elena Reyes",
      role: "Corporate Event Coordinator",
      rating: 5,
      event: "Team Building Retreat",
    },
    {
      id: "3",
      quote:
        "We've hosted three events here and each time has exceeded our expectations. The attention to detail and genuine care for our guests is remarkable.",
      author: "The Mendoza Family",
      role: "Repeat Client",
      rating: 5,
      event: "Family Celebrations",
    },
  ];

  return (
    <Section background="sage" spacing="large">
      <Container maxWidth="wide">
        {/* Section Header */}
        <AnimatedElement animation="fadeIn" delay={0}>
          <Box
            sx={{
              textAlign: "center",
              mb: { xs: tokens.spacing.space[6], md: tokens.spacing.space[8] },
            }}
          >
            <Typography
              component="h2"
              sx={{
                ...tokens.typography.styles.h2,
                fontSize: {
                  xs: tokens.typography.responsive.h2.mobile.fontSize,
                  sm: tokens.typography.responsive.h2.tablet.fontSize,
                  md: tokens.typography.responsive.h2.desktop.fontSize,
                },
                color: tokens.color.base.forest[800],
                mb: tokens.spacing.space[2],
              }}
            >
              Trusted by Hundreds of Families
            </Typography>
            <Typography
              sx={{
                ...tokens.typography.styles.bodyLarge,
                color: tokens.color.base.neutral[700],
                maxWidth: "700px",
                mx: "auto",
              }}
            >
              Join the many satisfied clients who have celebrated life's special
              moments with us
            </Typography>
          </Box>
        </AnimatedElement>

        {/* Testimonials */}
        <Box>
          <AnimatedElement animation="fadeIn" delay={200}>
            <Typography
              component="h3"
              sx={{
                ...tokens.typography.styles.h3,
                fontSize: {
                  xs: tokens.typography.responsive.h3.mobile.fontSize,
                  md: tokens.typography.responsive.h3.desktop.fontSize,
                },
                color: tokens.color.base.forest[800],
                textAlign: "center",
                mb: {
                  xs: tokens.spacing.space[4],
                  md: tokens.spacing.space[6],
                },
              }}
            >
              What Our Clients Say
            </Typography>
          </AnimatedElement>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(3, 1fr)",
              },
              gap: { xs: 2, md: 3 },
            }}
          >
            {testimonials.map((testimonial, index) => (
              <Box key={testimonial.id}>
                <TestimonialCard
                  testimonial={testimonial}
                  delay={300 + index * 100}
                />
              </Box>
            ))}
          </Box>
        </Box>

        {/* Trust Badges */}
        <AnimatedElement animation="fadeIn" delay={600}>
          <Box
            sx={{
              mt: { xs: tokens.spacing.space[6], md: tokens.spacing.space[8] },
              textAlign: "center",
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: tokens.spacing.space[2],
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <GlassCard variant="light" intensity="subtle" hover={false}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: tokens.spacing.space[1],
                  }}
                >
                  <CheckCircle
                    sx={{
                      color: tokens.color.semantic.success.main,
                      fontSize: 20,
                    }}
                  />
                  <Typography
                    sx={{
                      ...tokens.typography.styles.bodySmall,
                      fontWeight: tokens.typography.weights.semibold,
                      color: tokens.color.base.forest[700],
                    }}
                  >
                    Certified Venue
                  </Typography>
                </Box>
              </GlassCard>

              <GlassCard variant="light" intensity="subtle" hover={false}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: tokens.spacing.space[1],
                  }}
                >
                  <Favorite
                    sx={{
                      color: tokens.color.base.terracotta[500],
                      fontSize: 20,
                    }}
                  />
                  <Typography
                    sx={{
                      ...tokens.typography.styles.bodySmall,
                      fontWeight: tokens.typography.weights.semibold,
                      color: tokens.color.base.forest[700],
                    }}
                  >
                    Family Owned
                  </Typography>
                </Box>
              </GlassCard>

              <GlassCard variant="light" intensity="subtle" hover={false}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: tokens.spacing.space[1],
                  }}
                >
                  <People
                    sx={{
                      color: tokens.color.semantic.info.main,
                      fontSize: 20,
                    }}
                  />
                  <Typography
                    sx={{
                      ...tokens.typography.styles.bodySmall,
                      fontWeight: tokens.typography.weights.semibold,
                      color: tokens.color.base.forest[700],
                    }}
                  >
                    Expert Team
                  </Typography>
                </Box>
              </GlassCard>
            </Box>
          </Box>
        </AnimatedElement>
      </Container>
    </Section>
  );
};
