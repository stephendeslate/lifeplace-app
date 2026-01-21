// pages/reviews/types/reviews.types.ts

export interface Testimonial {
  id: string;
  name: string;
  organization?: string;
  review: string;
  eventDate?: string;
  eventType?: string;
}

export interface ReviewsPageProps {
  onNavigateToBooking?: () => void;
}

// Component props types - empty interfaces converted to type aliases to satisfy ESLint
export type ReviewsHeroProps = Record<string, never>;

export interface TestimonialCardProps {
  testimonial: Testimonial;
  index?: number;
}

export type TestimonialGridProps = Record<string, never>;
