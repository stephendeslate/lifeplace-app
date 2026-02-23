import { useNavigate, useLocation } from 'react-router';
import { PublicLayout } from '../components/layout';
import { ServicesPage } from '../pages/services';
import { GA4Events } from '../utils/ga4';

export function meta() {
  return [
    { title: 'Our Services | LifePlace Alfonso' },
    {
      name: 'description',
      content:
        'Discover our services: camps, retreats, team building, workshops, and weddings at LifePlace Alfonso, Cavite.',
    },
    { property: 'og:title', content: 'Our Services | LifePlace Alfonso' },
    {
      property: 'og:description',
      content:
        'Discover our services: camps, retreats, team building, workshops, and weddings at LifePlace Alfonso, Cavite.',
    },
    { property: 'og:image', content: '/og-image.jpg' },
    { property: 'og:type', content: 'website' },
  ];
}

export default function ServicesRoute() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <PublicLayout fullHeight>
      <ServicesPage
        onNavigateToBooking={() => {
          GA4Events.ctaClicked('book_now', location.pathname);
          navigate('/booking');
        }}
      />
    </PublicLayout>
  );
}
