import { PublicLayout } from '../components/layout';
import { PodcastsPage } from '../pages/podcasts';

export function meta() {
  return [
    { title: 'Podcasts | LifePlace Alfonso' },
    {
      name: 'description',
      content:
        'Listen to the LifePlace Alfonso podcast series featuring conversations about events and venue management.',
    },
    { property: 'og:title', content: 'Podcasts | LifePlace Alfonso' },
    {
      property: 'og:description',
      content:
        'Listen to the LifePlace Alfonso podcast series featuring conversations about events and venue management.',
    },
    { property: 'og:image', content: '/og-image.jpg' },
    { property: 'og:type', content: 'website' },
  ];
}

export default function PodcastsRoute() {
  return (
    <PublicLayout fullHeight>
      <PodcastsPage />
    </PublicLayout>
  );
}
