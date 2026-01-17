// pages/podcasts/types/podcasts.types.ts

export interface PodcastEpisode {
  id: string;
  title: string;
  hosts: string[];
  description: string;
  duration?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
}

// Component props types - empty interfaces converted to type aliases to satisfy ESLint
export type PodcastsPageProps = Record<string, never>;
export type PodcastsHeroProps = Record<string, never>;

export interface PodcastEpisodeCardProps {
  episode: PodcastEpisode;
  index?: number;
}

export type PodcastsGridProps = Record<string, never>;
