import type { Config } from '@react-router/dev/config';

export default {
  appDirectory: 'src',
  ssr: false,
  prerender: [
    '/',
    '/about',
    '/services',
    '/rates',
    '/facilities',
    '/gallery',
    '/reviews',
    '/contact',
    '/partner',
    '/podcasts',
    '/booking',
    '/privacy',
    '/terms',
  ],
} satisfies Config;
