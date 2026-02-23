import { PublicLayout } from '../components/layout';
import { ContactPage } from '../pages/contact';

export function meta() {
  return [
    { title: 'Contact Us | LifePlace Alfonso' },
    {
      name: 'description',
      content:
        'Get in touch with LifePlace Alfonso. Contact us for bookings, inquiries, and venue tours.',
    },
    { property: 'og:title', content: 'Contact Us | LifePlace Alfonso' },
    {
      property: 'og:description',
      content:
        'Get in touch with LifePlace Alfonso. Contact us for bookings, inquiries, and venue tours.',
    },
    { property: 'og:image', content: '/og-image.jpg' },
    { property: 'og:type', content: 'website' },
  ];
}

export default function ContactRoute() {
  return (
    <PublicLayout fullHeight>
      <ContactPage />
    </PublicLayout>
  );
}
