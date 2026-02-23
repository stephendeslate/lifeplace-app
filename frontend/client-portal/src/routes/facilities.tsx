import { useNavigate, useLocation } from 'react-router';
import { PublicLayout } from '../components/layout';
import { FacilitiesPage } from '../pages/facilities';
import { GA4Events } from '../utils/ga4';

export function meta() {
  return [
    { title: 'Facilities | LifePlace Alfonso' },
    {
      name: 'description',
      content:
        'Explore our facilities including conference rooms, outdoor areas, and accommodation at LifePlace Alfonso.',
    },
    { property: 'og:title', content: 'Facilities | LifePlace Alfonso' },
    {
      property: 'og:description',
      content:
        'Explore our facilities including conference rooms, outdoor areas, and accommodation at LifePlace Alfonso.',
    },
    { property: 'og:image', content: '/og-image.jpg' },
    { property: 'og:type', content: 'website' },
  ];
}

export default function FacilitiesRoute() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <PublicLayout fullHeight>
      <FacilitiesPage
        onNavigateToBooking={() => {
          GA4Events.ctaClicked('book_now', location.pathname);
          navigate('/booking');
        }}
      />
    </PublicLayout>
  );
}
