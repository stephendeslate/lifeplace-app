import { useNavigate, useLocation } from 'react-router';
import { PublicLayout } from '../components/layout';
import { ReviewsPage } from '../pages/reviews';
import { GA4Events } from '../utils/ga4';

export function meta() {
  return [
    { title: 'Reviews & Testimonials | LifePlace Alfonso' },
    {
      name: 'description',
      content: 'Read reviews and testimonials from clients who hosted events at LifePlace Alfonso.',
    },
    {
      property: 'og:title',
      content: 'Reviews & Testimonials | LifePlace Alfonso',
    },
    {
      property: 'og:description',
      content: 'Read reviews and testimonials from clients who hosted events at LifePlace Alfonso.',
    },
    { property: 'og:image', content: '/og-image.jpg' },
    { property: 'og:type', content: 'website' },
  ];
}

export default function ReviewsRoute() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <PublicLayout fullHeight>
      <ReviewsPage
        onNavigateToBooking={() => {
          GA4Events.ctaClicked('book_now', location.pathname);
          navigate('/booking');
        }}
      />
    </PublicLayout>
  );
}
