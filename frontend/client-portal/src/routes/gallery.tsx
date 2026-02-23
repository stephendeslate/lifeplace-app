import { useNavigate, useLocation } from 'react-router';
import { PublicLayout } from '../components/layout';
import GalleryPage from '../pages/gallery';
import { GA4Events } from '../utils/ga4';

export function meta() {
  return [
    { title: 'Gallery | LifePlace Alfonso' },
    {
      name: 'description',
      content:
        'Browse photos of our venues, event setups, weddings, team building activities, and more at LifePlace Alfonso, Cavite.',
    },
    { property: 'og:title', content: 'Gallery | LifePlace Alfonso' },
    {
      property: 'og:description',
      content:
        'Browse photos of our venues, event setups, weddings, team building activities, and more at LifePlace Alfonso, Cavite.',
    },
    { property: 'og:image', content: '/og-image.jpg' },
    { property: 'og:type', content: 'website' },
  ];
}

export default function GalleryRoute() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <PublicLayout fullHeight>
      <GalleryPage
        onNavigateToBooking={() => {
          GA4Events.ctaClicked('book_now', location.pathname);
          navigate('/booking');
        }}
      />
    </PublicLayout>
  );
}
