import { useNavigate, useLocation } from 'react-router';
import { PublicLayout } from '../components/layout';
import { AboutPage } from '../pages/about';
import { GA4Events } from '../utils/ga4';

export function meta() {
  return [
    { title: 'About Us | LifePlace Alfonso' },
    {
      name: 'description',
      content:
        'Learn about LifePlace Alfonso, a premier event venue in Cavite offering camps, retreats, and corporate events in a natural setting.',
    },
    { property: 'og:title', content: 'About Us | LifePlace Alfonso' },
    {
      property: 'og:description',
      content:
        'Learn about LifePlace Alfonso, a premier event venue in Cavite offering camps, retreats, and corporate events in a natural setting.',
    },
    { property: 'og:image', content: '/og-image.jpg' },
    { property: 'og:type', content: 'website' },
  ];
}

export default function AboutRoute() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <PublicLayout fullHeight>
      <AboutPage
        onNavigateToBooking={() => {
          GA4Events.ctaClicked('book_now', location.pathname);
          navigate('/booking');
        }}
      />
    </PublicLayout>
  );
}
