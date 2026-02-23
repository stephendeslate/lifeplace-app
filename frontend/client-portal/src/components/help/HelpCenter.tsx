// frontend/client-portal/src/components/help/HelpCenter.tsx

import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
  Card,
  CardContent,
  IconButton,
  Button,
  Chip,
  Avatar,
  useTheme,
  alpha,
  Stack,
} from '@mui/material';
import {
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  QuestionAnswer as FAQIcon,
  VideoLibrary as TutorialIcon,
  Support as SupportIcon,
  Article as GuideIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  Share as ShareIcon,
  Bookmark as BookmarkIcon,
  PlayArrow as PlayIcon,
  AccessTime as TimeIcon,
  Person as PersonIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { GlassCard } from '../../design-system/components/GlassCard';
import { AnimatedElement } from '../../design-system/components/AnimatedElement';

interface HelpArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  views: number;
  helpful: number;
  lastUpdated: string;
  author: string;
  readTime: number;
}

interface VideoTutorial {
  id: string;
  title: string;
  description: string;
  duration: string;
  thumbnail: string;
  category: string;
  views: number;
  rating: number;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  helpful: number;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
  </div>
);

export const HelpCenter: React.FC = () => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedAccordion, setExpandedAccordion] = useState<string | false>(false);

  // Mock data
  const faqs: FAQ[] = [
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

  const articles: HelpArticle[] = [
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

  const tutorials: VideoTutorial[] = [
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

  const categories = [
    { id: 'all', name: 'All Topics', icon: <GuideIcon />, count: faqs.length + articles.length },
    { id: 'booking', name: 'Booking', icon: <FAQIcon />, count: 8 },
    { id: 'payment', name: 'Payments', icon: <SupportIcon />, count: 6 },
    { id: 'guides', name: 'Guides', icon: <GuideIcon />, count: 12 },
    { id: 'policies', name: 'Policies', icon: <FAQIcon />, count: 4 },
  ];

  const handleAccordionChange =
    (panel: string) => (_: React.SyntheticEvent, isExpanded: boolean) => {
      setExpandedAccordion(isExpanded ? panel : false);
    };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleHelpfulClick = (type: 'up' | 'down', id: string) => {
    if (import.meta.env.DEV) console.log(`Marked ${type} for item ${id}`);
    // In a real app, this would send feedback to the server
  };

  const filteredContent = {
    faqs: faqs.filter(
      (faq) =>
        !searchQuery ||
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase()),
    ),
    articles: articles.filter(
      (article) =>
        !searchQuery ||
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())),
    ),
    tutorials: tutorials.filter(
      (tutorial) =>
        !searchQuery ||
        tutorial.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tutorial.description.toLowerCase().includes(searchQuery.toLowerCase()),
    ),
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <AnimatedElement animation="slideDown" delay={100}>
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography variant="h3" sx={{ fontWeight: 700, color: 'primary.main', mb: 1 }}>
            Help Center
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
            Find answers to your questions, browse guides, and get the most out of LifePlace
          </Typography>

          {/* Search Bar */}
          <GlassCard
            variant="light"
            intensity="medium"
            sx={{
              p: 1,
              maxWidth: 600,
              mx: 'auto',
              backgroundColor: alpha('#fff', 0.1),
              backdropFilter: 'blur(20px)',
              border: `1px solid ${alpha('#fff', 0.2)}`,
            }}
          >
            <TextField
              fullWidth
              placeholder="Search for help articles, FAQs, or tutorials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: alpha('#fff', 0.7) }} />
                  </InputAdornment>
                ),
                sx: {
                  '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                  '& .MuiInputBase-input::placeholder': {
                    color: alpha('#fff', 0.6),
                  },
                },
              }}
              sx={{
                '& .MuiInputBase-root': {
                  backgroundColor: 'transparent',
                },
              }}
            />
          </GlassCard>
        </Box>
      </AnimatedElement>

      {/* Categories */}
      <AnimatedElement animation="slideUp" delay={200}>
        <Box sx={{ mb: 4 }}>
          <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap" gap={2}>
            {categories.map((category, index) => (
              <AnimatedElement key={category.id} animation="slideUp" delay={200 + index * 50}>
                <GlassCard
                  variant="light"
                  intensity="subtle"
                  hover
                  sx={{
                    p: 2,
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: alpha('#fff', 0.08),
                    backdropFilter: 'blur(15px)',
                    border: `1px solid ${alpha('#fff', 0.1)}`,
                    minWidth: 120,
                    '&:hover': {
                      backgroundColor: alpha('#fff', 0.15),
                      transform: 'translateY(-4px)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  <Avatar
                    sx={{
                      backgroundColor: alpha(theme.palette.primary.main, 0.15),
                      color: theme.palette.primary.main,
                      mx: 'auto',
                      mb: 1,
                    }}
                  >
                    {category.icon}
                  </Avatar>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {category.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {category.count} items
                  </Typography>
                </GlassCard>
              </AnimatedElement>
            ))}
          </Stack>
        </Box>
      </AnimatedElement>

      {/* Main Content Tabs */}
      <AnimatedElement animation="slideUp" delay={300}>
        <GlassCard
          variant="light"
          intensity="medium"
          sx={{
            backgroundColor: alpha('#fff', 0.08),
            backdropFilter: 'blur(20px)',
            border: `1px solid ${alpha('#fff', 0.1)}`,
          }}
        >
          <Box sx={{ borderBottom: 1, borderColor: alpha('#fff', 0.1) }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              centered
              sx={{
                '& .MuiTab-root': {
                  color: alpha('#fff', 0.7),
                  '&.Mui-selected': {
                    color: theme.palette.primary.main,
                  },
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: theme.palette.primary.main,
                },
              }}
            >
              <Tab
                label={`FAQs (${filteredContent.faqs.length})`}
                icon={<FAQIcon />}
                iconPosition="start"
              />
              <Tab
                label={`Guides (${filteredContent.articles.length})`}
                icon={<GuideIcon />}
                iconPosition="start"
              />
              <Tab
                label={`Tutorials (${filteredContent.tutorials.length})`}
                icon={<TutorialIcon />}
                iconPosition="start"
              />
            </Tabs>
          </Box>

          {/* FAQs Tab */}
          <TabPanel value={activeTab} index={0}>
            <Box sx={{ p: 3 }}>
              {filteredContent.faqs.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="h6" color="text.secondary">
                    No FAQs found matching your search
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={2}>
                  {filteredContent.faqs.map((faq, index) => (
                    <AnimatedElement key={faq.id} animation="slideUp" delay={index * 100}>
                      <Accordion
                        expanded={expandedAccordion === faq.id}
                        onChange={handleAccordionChange(faq.id)}
                        sx={{
                          backgroundColor: alpha('#fff', 0.05),
                          backdropFilter: 'blur(10px)',
                          border: `1px solid ${alpha('#fff', 0.1)}`,
                          '&:before': { display: 'none' },
                          borderRadius: '12px !important',
                          overflow: 'hidden',
                        }}
                      >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Box
                            sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}
                          >
                            <Typography variant="body1" sx={{ fontWeight: 600, flex: 1 }}>
                              {faq.question}
                            </Typography>
                            <Chip
                              label={faq.category}
                              size="small"
                              sx={{
                                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                color: theme.palette.primary.main,
                              }}
                            />
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mb: 3, lineHeight: 1.6 }}
                          >
                            {faq.answer}
                          </Typography>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="caption" color="text.secondary">
                                Was this helpful?
                              </Typography>
                              <IconButton
                                size="small"
                                onClick={() => handleHelpfulClick('up', faq.id)}
                                sx={{ color: 'success.main' }}
                              >
                                <ThumbUpIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleHelpfulClick('down', faq.id)}
                                sx={{ color: 'error.main' }}
                              >
                                <ThumbDownIcon fontSize="small" />
                              </IconButton>
                              <Typography variant="caption" color="text.secondary">
                                {faq.helpful} found this helpful
                              </Typography>
                            </Box>
                            <IconButton size="small">
                              <ShareIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </AccordionDetails>
                      </Accordion>
                    </AnimatedElement>
                  ))}
                </Stack>
              )}
            </Box>
          </TabPanel>

          {/* Guides Tab */}
          <TabPanel value={activeTab} index={1}>
            <Box sx={{ p: 3 }}>
              {filteredContent.articles.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="h6" color="text.secondary">
                    No guides found matching your search
                  </Typography>
                </Box>
              ) : (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                    gap: 3,
                  }}
                >
                  {filteredContent.articles.map((article, index) => (
                    <AnimatedElement key={article.id} animation="slideUp" delay={index * 100}>
                      <Card
                        sx={{
                          backgroundColor: alpha('#fff', 0.05),
                          backdropFilter: 'blur(10px)',
                          border: `1px solid ${alpha('#fff', 0.1)}`,
                          borderRadius: 3,
                          '&:hover': {
                            backgroundColor: alpha('#fff', 0.1),
                            transform: 'translateY(-4px)',
                          },
                          transition: 'all 0.3s ease',
                          cursor: 'pointer',
                        }}
                      >
                        <CardContent sx={{ p: 3 }}>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                            <Avatar
                              sx={{
                                backgroundColor: alpha(theme.palette.info.main, 0.15),
                                color: 'info.main',
                              }}
                            >
                              <GuideIcon />
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                                {article.title}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ lineHeight: 1.6 }}
                              >
                                {article.content}
                              </Typography>
                            </Box>
                            <IconButton size="small">
                              <BookmarkIcon fontSize="small" />
                            </IconButton>
                          </Box>

                          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                            {article.tags.map((tag) => (
                              <Chip
                                key={tag}
                                label={tag}
                                size="small"
                                variant="outlined"
                                sx={{
                                  backgroundColor: alpha('#fff', 0.05),
                                  border: `1px solid ${alpha('#fff', 0.2)}`,
                                }}
                              />
                            ))}
                          </Box>

                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: '0.875rem',
                              color: 'text.secondary',
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <PersonIcon fontSize="small" />
                                {article.author}
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <TimeIcon fontSize="small" />
                                {article.readTime} min read
                              </Box>
                            </Box>
                            <Box>{article.views} views</Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </AnimatedElement>
                  ))}
                </Box>
              )}
            </Box>
          </TabPanel>

          {/* Tutorials Tab */}
          <TabPanel value={activeTab} index={2}>
            <Box sx={{ p: 3 }}>
              {filteredContent.tutorials.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="h6" color="text.secondary">
                    No tutorials found matching your search
                  </Typography>
                </Box>
              ) : (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: 3,
                  }}
                >
                  {filteredContent.tutorials.map((tutorial, index) => (
                    <AnimatedElement key={tutorial.id} animation="slideUp" delay={index * 100}>
                      <Card
                        sx={{
                          backgroundColor: alpha('#fff', 0.05),
                          backdropFilter: 'blur(10px)',
                          border: `1px solid ${alpha('#fff', 0.1)}`,
                          borderRadius: 3,
                          overflow: 'hidden',
                          '&:hover': {
                            backgroundColor: alpha('#fff', 0.1),
                            transform: 'translateY(-4px)',
                          },
                          transition: 'all 0.3s ease',
                          cursor: 'pointer',
                        }}
                      >
                        <Box sx={{ position: 'relative' }}>
                          <Box
                            sx={{
                              height: 180,
                              backgroundColor: alpha(theme.palette.primary.main, 0.1),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              position: 'relative',
                            }}
                          >
                            <IconButton
                              sx={{
                                backgroundColor: alpha('#fff', 0.9),
                                color: theme.palette.primary.main,
                                '&:hover': { backgroundColor: '#fff' },
                                width: 64,
                                height: 64,
                              }}
                            >
                              <PlayIcon sx={{ fontSize: 32 }} />
                            </IconButton>
                            <Box
                              sx={{
                                position: 'absolute',
                                bottom: 8,
                                right: 8,
                                backgroundColor: alpha('#000', 0.7),
                                color: '#fff',
                                px: 1,
                                py: 0.5,
                                borderRadius: 1,
                                fontSize: '0.75rem',
                              }}
                            >
                              {tutorial.duration}
                            </Box>
                          </Box>
                        </Box>
                        <CardContent sx={{ p: 3 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                            {tutorial.title}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mb: 2, lineHeight: 1.6 }}
                          >
                            {tutorial.description}
                          </Typography>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: '0.875rem',
                              color: 'text.secondary',
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <StarIcon fontSize="small" sx={{ color: 'warning.main' }} />
                                {tutorial.rating}
                              </Box>
                              <Box>{tutorial.views} views</Box>
                            </Box>
                            <Chip
                              label={tutorial.category}
                              size="small"
                              sx={{
                                backgroundColor: alpha(theme.palette.secondary.main, 0.1),
                                color: theme.palette.secondary.main,
                              }}
                            />
                          </Box>
                        </CardContent>
                      </Card>
                    </AnimatedElement>
                  ))}
                </Box>
              )}
            </Box>
          </TabPanel>
        </GlassCard>
      </AnimatedElement>

      {/* Contact Support */}
      <AnimatedElement animation="slideUp" delay={400}>
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <GlassCard
            variant="light"
            intensity="medium"
            sx={{
              p: 4,
              maxWidth: 600,
              mx: 'auto',
              backgroundColor: alpha(theme.palette.info.main, 0.05),
              backdropFilter: 'blur(20px)',
              border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
            }}
          >
            <Avatar
              sx={{
                backgroundColor: alpha(theme.palette.info.main, 0.15),
                color: theme.palette.info.main,
                width: 64,
                height: 64,
                mx: 'auto',
                mb: 2,
              }}
            >
              <SupportIcon sx={{ fontSize: 32 }} />
            </Avatar>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
              Still need help?
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Our support team is here to assist you with any questions or concerns.
            </Typography>
            <Stack direction="row" spacing={2} justifyContent="center">
              <Button
                variant="contained"
                size="large"
                sx={{
                  backgroundColor: alpha(theme.palette.primary.main, 0.9),
                  backdropFilter: 'blur(10px)',
                  '&:hover': {
                    backgroundColor: theme.palette.primary.main,
                  },
                }}
              >
                Contact Support
              </Button>
              <Button
                variant="outlined"
                size="large"
                sx={{
                  backgroundColor: alpha('#fff', 0.1),
                  backdropFilter: 'blur(10px)',
                  '&:hover': {
                    backgroundColor: alpha('#fff', 0.2),
                  },
                }}
              >
                Live Chat
              </Button>
            </Stack>
          </GlassCard>
        </Box>
      </AnimatedElement>
    </Box>
  );
};
