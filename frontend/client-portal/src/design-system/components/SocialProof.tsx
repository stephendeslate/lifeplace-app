// design-system/components/SocialProof.tsx

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Avatar, 
  Chip, 
  Badge,
  Fade
} from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';
import {
  Visibility,
  EventAvailable,
  Star,
  TrendingUp,
  People,
  CheckCircle,
  Schedule
} from '@mui/icons-material';
import { tokens } from '../tokens';
import { AnimatedElement } from './AnimatedElement';
import { GlassCard } from './GlassCard';

// Import actual types from backend
import type { Event } from '../../types/events.types';

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const slideIn = keyframes`
  0% { 
    opacity: 0;
    transform: translateX(-100px);
  }
  100% { 
    opacity: 1;
    transform: translateX(0);
  }
`;

// Based on actual Event model from backend
interface EventActivity {
  event: Event;
  action: 'confirmed' | 'completed' | 'updated';
  timeAgo: string;
  clientName?: string;
}

// Based on actual analytics that could be calculated from backend data
interface SocialProofStats {
  totalEvents: number;
  completedEvents: number;
  activeEvents: number;
  eventsThisMonth: number;
  averageEventValue?: number;
  clientSatisfactionRate?: number;
}

interface EventActivityFeedProps {
  activities?: EventActivity[];
  autoRotate?: boolean;
  rotationInterval?: number;
}

interface SocialProofBadgeProps {
  stats: SocialProofStats;
  compact?: boolean;
}

interface TrustIndicatorsProps {
  certifications?: string[];
  testimonials?: Array<{
    text: string;
    author: string;
    rating: number;
  }>;
  compact?: boolean;
}

const StyledNotificationContainer = styled(Box)(() => ({
  position: 'fixed',
  bottom: tokens.spacing.space[3],
  left: tokens.spacing.space[3],
  zIndex: tokens.spacing.zIndex.toast,
  minWidth: '300px',
  maxWidth: '400px',
  
  '@media (max-width: 768px)': {
    left: tokens.spacing.space[2],
    right: tokens.spacing.space[2],
    minWidth: 'auto',
    maxWidth: 'none',
  },
}));

const StyledNotificationCard = styled(GlassCard)(() => ({
  padding: tokens.spacing.space[2],
  marginBottom: tokens.spacing.space[1],
  animation: `${slideIn} 0.5s ease-out`,
  cursor: 'pointer',
  
  '&:hover': {
    transform: 'translateY(-2px) scale(1.02)',
  },
}));

const StyledStatsContainer = styled(Box)(() => ({
  display: 'flex',
  gap: tokens.spacing.space[2],
  flexWrap: 'wrap',
  alignItems: 'center',
}));

const StyledStatItem = styled(Box)(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: tokens.spacing.space[1],
  padding: `${tokens.spacing.space[1]} ${tokens.spacing.space[2]}`,
  borderRadius: tokens.spacing.radius.full,
  background: tokens.color.glass.lightGlass.background,
  backdropFilter: tokens.color.glass.lightGlass.backdropFilter,
  border: tokens.color.glass.lightGlass.border,
  transition: tokens.animation.transition.all,
  
  '&:hover': {
    animation: `${pulse} 1s infinite`,
  },
}));

// Generate mock activities based on actual Event model structure
const generateMockActivities = (): EventActivity[] => {
  const names = [
    'Maria Santos', 'John Cruz', 'Anna Reyes', 'Carlos Garcia',
    'Sofia Mendoza', 'Miguel Torres', 'Elena Flores', 'Diego Ramos'
  ];
  
  const eventTypes = [
    'Wedding', 'Corporate Event', 'Birthday Party', 'Workshop', 'Retreat'
  ];
  
  const actions: Array<'confirmed' | 'completed' | 'updated'> = ['confirmed', 'completed', 'updated'];
  const timeframes = ['2 min ago', '5 min ago', '1 hour ago', '3 hours ago', 'Yesterday'];
  
  return Array.from({ length: 10 }, (_, i) => ({
    event: {
      id: i + 1,
      name: `${eventTypes[Math.floor(Math.random() * eventTypes.length)]} Event`,
      event_type_name: eventTypes[Math.floor(Math.random() * eventTypes.length)],
      status: 'CONFIRMED' as const,
      start_date: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      end_date: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      current_stage_name: 'Production',
      payment_status: 'PAID' as const,
    },
    action: actions[Math.floor(Math.random() * actions.length)],
    timeAgo: timeframes[Math.floor(Math.random() * timeframes.length)],
    clientName: names[Math.floor(Math.random() * names.length)],
  }));
};

export const EventActivityFeed: React.FC<EventActivityFeedProps> = ({
  activities = generateMockActivities(),
  autoRotate = true,
  rotationInterval = 5000,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  
  useEffect(() => {
    if (!autoRotate || activities.length <= 1) return;
    
    const interval = setInterval(() => {
      setVisible(false);
      
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % activities.length);
        setVisible(true);
      }, 300);
    }, rotationInterval);
    
    return () => clearInterval(interval);
  }, [autoRotate, activities.length, rotationInterval]);
  
  if (!activities.length) return null;
  
  const currentActivity = activities[currentIndex];
  
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'confirmed':
        return <EventAvailable sx={{ color: tokens.color.semantic.success.main }} />;
      case 'updated':
        return <Visibility sx={{ color: tokens.color.semantic.info.main }} />;
      case 'completed':
        return <CheckCircle sx={{ color: tokens.color.base.forest[600] }} />;
      default:
        return <People />;
    }
  };
  
  const getActionText = (activity: EventActivity) => {
    switch (activity.action) {
      case 'confirmed':
        return `confirmed their ${activity.event.event_type_name}`;
      case 'updated':
        return `updated their ${activity.event.event_type_name}`;
      case 'completed':
        return `completed their ${activity.event.event_type_name}`;
      default:
        return 'updated their event';
    }
  };
  
  return (
    <StyledNotificationContainer>
      <Fade in={visible} timeout={300}>
        <StyledNotificationCard variant="light" intensity="strong">
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar
              sx={{ 
                width: 32, 
                height: 32,
                bgcolor: tokens.color.base.forest[100],
                color: tokens.color.base.forest[600],
              }}
            >
              {currentActivity.clientName?.charAt(0) || 'C'}
            </Avatar>
            
            <Box flex={1}>
              <Typography variant="body2" fontWeight={600}>
                {currentActivity.clientName || 'A client'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {getActionText(currentActivity)}
              </Typography>
            </Box>
            
            <Box display="flex" flexDirection="column" alignItems="center" gap={0.5}>
              {getActionIcon(currentActivity.action)}
              <Typography variant="caption" color="text.secondary">
                {currentActivity.timeAgo}
              </Typography>
            </Box>
          </Box>
        </StyledNotificationCard>
      </Fade>
    </StyledNotificationContainer>
  );
};

export const SocialProofBadge: React.FC<SocialProofBadgeProps> = ({
  stats,
  compact = false,
}) => {
  return (
    <AnimatedElement animation="fadeIn" delay={200}>
      <GlassCard variant="light" intensity="medium" hover={false}>
        <StyledStatsContainer>
          <StyledStatItem>
            <EventAvailable sx={{ fontSize: 20, color: tokens.color.semantic.success.main }} />
            <Box>
              <Typography variant={compact ? "caption" : "body2"} fontWeight={600}>
                {stats.totalEvents.toLocaleString()}
              </Typography>
              {!compact && (
                <Typography variant="caption" display="block" color="text.secondary">
                  Total Events
                </Typography>
              )}
            </Box>
          </StyledStatItem>
          
          <StyledStatItem>
            <CheckCircle sx={{ fontSize: 20, color: tokens.color.base.forest[600] }} />
            <Box>
              <Typography variant={compact ? "caption" : "body2"} fontWeight={600}>
                {stats.completedEvents.toLocaleString()}
              </Typography>
              {!compact && (
                <Typography variant="caption" display="block" color="text.secondary">
                  Completed Events
                </Typography>
              )}
            </Box>
          </StyledStatItem>
          
          <StyledStatItem>
            <Schedule sx={{ fontSize: 20, color: tokens.color.semantic.info.main }} />
            <Box>
              <Typography variant={compact ? "caption" : "body2"} fontWeight={600}>
                <Badge
                  badgeContent=""
                  variant="dot"
                  sx={{
                    '& .MuiBadge-badge': {
                      backgroundColor: tokens.color.semantic.success.main,
                      animation: `${pulse} 1.5s infinite`,
                    },
                  }}
                >
                  {stats.activeEvents}
                </Badge>
              </Typography>
              {!compact && (
                <Typography variant="caption" display="block" color="text.secondary">
                  Active Events
                </Typography>
              )}
            </Box>
          </StyledStatItem>
          
          {!compact && stats.clientSatisfactionRate && (
            <StyledStatItem>
              <Star sx={{ fontSize: 20, color: tokens.color.base.gold[500] }} />
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  {stats.clientSatisfactionRate}%
                </Typography>
                <Typography variant="caption" display="block" color="text.secondary">
                  Satisfaction Rate
                </Typography>
              </Box>
            </StyledStatItem>
          )}
          
          {!compact && (
            <StyledStatItem>
              <TrendingUp sx={{ fontSize: 20, color: tokens.color.base.forest[600] }} />
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  {stats.eventsThisMonth}
                </Typography>
                <Typography variant="caption" display="block" color="text.secondary">
                  This month
                </Typography>
              </Box>
            </StyledStatItem>
          )}
        </StyledStatsContainer>
      </GlassCard>
    </AnimatedElement>
  );
};

export const TrustIndicators: React.FC<TrustIndicatorsProps> = ({
  certifications = ['DOT Certified', 'ISO 9001', 'Green Venue'],
  testimonials = [
    {
      text: "Absolutely perfect venue for our wedding! The team was amazing.",
      author: "Maria & Carlos",
      rating: 5,
    },
    {
      text: "Great facilities and beautiful location. Highly recommend!",
      author: "Corporate Client",
      rating: 5,
    },
  ],
  compact = false,
}) => {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  
  useEffect(() => {
    if (testimonials.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 4000);
    
    return () => clearInterval(interval);
  }, [testimonials.length]);
  
  return (
    <Box>
      {/* Certifications */}
      <Box display="flex" gap={1} flexWrap="wrap" mb={compact ? 1 : 2}>
        {certifications.map((cert) => (
          <Chip
            key={cert}
            size={compact ? "small" : "medium"}
            label={cert}
            color="success"
            variant="outlined"
            icon={<CheckCircle />}
            sx={{
              borderColor: tokens.color.semantic.success.main,
              '&:hover': {
                animation: `${pulse} 0.5s ease-in-out`,
              },
            }}
          />
        ))}
      </Box>
      
      {/* Testimonials */}
      {testimonials.length > 0 && !compact && (
        <AnimatedElement animation="fadeIn" delay={300}>
          <GlassCard variant="light" intensity="subtle" hover={false}>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  sx={{
                    fontSize: 16,
                    color: i < testimonials[currentTestimonial].rating
                      ? tokens.color.base.gold[500]
                      : tokens.color.base.sage[300],
                  }}
                />
              ))}
            </Box>
            <Typography
              variant="body2"
              sx={{ fontStyle: 'italic', mb: 1 }}
            >
              "{testimonials[currentTestimonial].text}"
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={600}
            >
              — {testimonials[currentTestimonial].author}
            </Typography>
          </GlassCard>
        </AnimatedElement>
      )}
    </Box>
  );
};

// Combined Social Proof Component with actual backend data
export const SocialProofSection: React.FC<{
  stats: SocialProofStats;
  activities?: EventActivity[];
  showActivityFeed?: boolean;
  showTrustIndicators?: boolean;
  compact?: boolean;
}> = ({
  stats,
  activities,
  showActivityFeed = true,
  showTrustIndicators = true,
  compact = false,
}) => {
  return (
    <>
      <SocialProofBadge stats={stats} compact={compact} />
      {showTrustIndicators && (
        <Box mt={2}>
          <TrustIndicators compact={compact} />
        </Box>
      )}
      {showActivityFeed && <EventActivityFeed activities={activities} />}
    </>
  );
};

// Legacy export for backward compatibility
export const LiveBookingCounter = EventActivityFeed;

export default SocialProofSection;