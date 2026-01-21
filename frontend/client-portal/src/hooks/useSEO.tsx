import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  ogImage?: string;
  noIndex?: boolean;
}

export const SEO: React.FC<SEOProps> = ({
  title = 'LifePlace Alfonso',
  description = 'Book weddings, retreats, team building events at LifePlace Alfonso, Cavite',
  ogImage = '/og-image.jpg',
  noIndex = false
}) => (
  <Helmet>
    <title>{title}</title>
    <meta name="description" content={description} />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:image" content={ogImage} />
    <meta property="og:type" content="website" />
    {noIndex && <meta name="robots" content="noindex,nofollow" />}
  </Helmet>
);

export default SEO;
