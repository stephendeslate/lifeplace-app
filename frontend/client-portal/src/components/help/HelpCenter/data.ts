import React from 'react';
import {
  QuestionAnswer as FAQIcon,
  Support as SupportIcon,
  Article as GuideIcon,
} from '@mui/icons-material';
import type { FAQ, HelpArticle, VideoTutorial } from './types';

export const faqs: FAQ[] = [
  {
    id: '1',
    question: 'How do I book a new event?',
    answer:
      'To book a new event, click on the "Book Event" button in your dashboard. You\'ll be guided through a step-by-step process including selecting your event type, date, venue, and services.',
    category: 'booking',
    helpful: 24,
  },
  {
    id: '2',
    question: 'Can I modify my booking after confirmation?',
    answer:
      'Yes, you can modify certain aspects of your booking up to 48 hours before the event date. Changes may incur additional fees depending on the modifications.',
    category: 'booking',
    helpful: 18,
  },
  {
    id: '3',
    question: 'How do I make payments?',
    answer:
      'We accept various payment methods including credit cards, bank transfers, and PayPal. You can set up payment plans or pay in full through your booking dashboard.',
    category: 'payment',
    helpful: 32,
  },
  {
    id: '4',
    question: 'What if I need to cancel my event?',
    answer:
      'Cancellation policies vary by event type and timing. Please review your contract terms or contact our support team for specific cancellation procedures.',
    category: 'policies',
    helpful: 15,
  },
];

export const articles: HelpArticle[] = [
  {
    id: '1',
    title: 'Complete Guide to Event Planning',
    content:
      'Learn the essential steps for planning your perfect event, from initial concept to execution.',
    category: 'guides',
    tags: ['planning', 'events', 'beginner'],
    views: 1250,
    helpful: 89,
    lastUpdated: '2024-03-15',
    author: 'Sarah Johnson',
    readTime: 8,
  },
  {
    id: '2',
    title: 'Understanding Our Pricing Structure',
    content: 'A detailed breakdown of our pricing model, packages, and add-on services.',
    category: 'pricing',
    tags: ['pricing', 'packages', 'services'],
    views: 890,
    helpful: 67,
    lastUpdated: '2024-03-10',
    author: 'Michael Chen',
    readTime: 5,
  },
  {
    id: '3',
    title: 'Venue Selection Best Practices',
    content: 'Tips and considerations for choosing the perfect venue for your event.',
    category: 'venues',
    tags: ['venues', 'selection', 'tips'],
    views: 675,
    helpful: 54,
    lastUpdated: '2024-03-08',
    author: 'Emma Davis',
    readTime: 6,
  },
];

export const tutorials: VideoTutorial[] = [
  {
    id: '1',
    title: 'Getting Started with Your Dashboard',
    description: 'A walkthrough of your client portal dashboard and key features.',
    duration: '3:24',
    thumbnail: '/api/placeholder/320/180',
    category: 'getting-started',
    views: 2100,
    rating: 4.8,
  },
  {
    id: '2',
    title: 'How to Book Your First Event',
    description: 'Step-by-step tutorial on booking your first event through our platform.',
    duration: '7:15',
    thumbnail: '/api/placeholder/320/180',
    category: 'booking',
    views: 1850,
    rating: 4.9,
  },
  {
    id: '3',
    title: 'Managing Payments and Invoices',
    description: 'Learn how to handle payments, view invoices, and set up payment plans.',
    duration: '4:42',
    thumbnail: '/api/placeholder/320/180',
    category: 'payment',
    views: 1320,
    rating: 4.7,
  },
];

interface HelpCategory {
  id: string;
  name: string;
  icon: React.ReactElement;
  count: number;
}

export const getCategories = (): HelpCategory[] => [
  {
    id: 'all',
    name: 'All Topics',
    icon: React.createElement(GuideIcon),
    count: faqs.length + articles.length,
  },
  { id: 'booking', name: 'Booking', icon: React.createElement(FAQIcon), count: 8 },
  { id: 'payment', name: 'Payments', icon: React.createElement(SupportIcon), count: 6 },
  { id: 'guides', name: 'Guides', icon: React.createElement(GuideIcon), count: 12 },
  { id: 'policies', name: 'Policies', icon: React.createElement(FAQIcon), count: 4 },
];
