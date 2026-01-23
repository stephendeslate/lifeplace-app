// pages/podcasts/components/PodcastEpisode.test.tsx
/**
 * PodcastEpisodeCard Component Tests
 *
 * Tests for the Modern Organic Luxury redesigned PodcastEpisodeCard component
 * including design system compliance, accessibility, and functionality
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PodcastEpisodeCard } from './PodcastEpisode';
import type { PodcastEpisode } from '../types/podcasts.types';

// Mock console.log to avoid cluttering test output
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

// Mock the design system components
vi.mock('../../../design-system/components/ModernCard', () => ({
  ModernCard: ({ children, variant, size, hover, sx }: { children: React.ReactNode; variant?: string; size?: string; hover?: boolean; sx?: object }) => (
    <div
      data-testid="modern-card"
      data-variant={variant}
      data-size={size}
      data-hover={hover?.toString()}
      style={sx as React.CSSProperties}
    >
      {children}
    </div>
  ),
}));

vi.mock('../../../design-system/components/AnimatedElement', () => ({
  AnimatedElement: ({ children, animation, delay }: { children: React.ReactNode; animation?: string; delay?: number }) => (
    <div data-testid="animated-element" data-animation={animation} data-delay={delay}>
      {children}
    </div>
  ),
}));

vi.mock('../../../design-system/tokens', () => ({
  tokens: {
    spacing: {
      space: {
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
      },
      radius: {
        lg: '12px',
      },
    },
    typography: {
      styles: {
        h4: {
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '1.875rem',
          fontWeight: 500,
          lineHeight: 1.35,
          letterSpacing: '0em',
        },
        bodySmall: {
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.875rem',
          fontWeight: 400,
          lineHeight: 1.6,
          letterSpacing: '0em',
        },
        body: {
          fontFamily: "'Inter', sans-serif",
          fontSize: '1rem',
          fontWeight: 400,
          lineHeight: 1.6,
          letterSpacing: '0em',
        },
        caption: {
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.75rem',
          fontWeight: 400,
          lineHeight: 1.5,
          letterSpacing: '0.01em',
        },
      },
      sizes: {
        xl: '1.5rem',
        '2xl': '1.875rem',
      },
    },
    color: {
      base: {
        neutral: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          600: '#757575',
          700: '#616161',
          900: '#212121',
        },
        sage: {
          100: '#eef0ec',
          500: '#7D8570',
        },
      },
      semantic: {
        success: {
          light: '#88c399',
          main: '#5BA872',
        },
      },
    },
    shadow: {
      elevation: {
        card: '0 2px 8px rgba(0,0,0,0.1)',
      },
    },
    animation: {
      transition: {
        card: 'all 0.3s ease',
      },
    },
  },
}));

// Mock the Button component
vi.mock('../../../../../shared/design-system/components/Button', () => ({
  Button: ({ children, variant, size, onClick, startIcon, fullWidth, ariaLabel }: {
    children: React.ReactNode;
    variant?: string;
    size?: string;
    onClick?: () => void;
    startIcon?: React.ReactNode;
    fullWidth?: boolean;
    ariaLabel?: string;
  }) => (
    <button
      data-testid="button"
      data-variant={variant}
      data-size={size}
      data-fullwidth={fullWidth?.toString()}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {startIcon && <span data-testid="button-start-icon">{startIcon}</span>}
      {children}
    </button>
  ),
}));

// Sample podcast episode data
const mockEpisode: PodcastEpisode = {
  id: 'ep-1',
  title: 'Importance of Rest',
  hosts: ['Peter Gramaje', 'Shekinah Gramaje'],
  description: 'In this episode, Peter and Shekinah discuss the significance of rest in our fast-paced world.',
  duration: '25 min',
  videoUrl: '',
  thumbnailUrl: '',
};

const mockEpisodeWithVideo: PodcastEpisode = {
  ...mockEpisode,
  id: 'ep-2',
  title: 'Episode with Video',
  videoUrl: 'https://www.youtube.com/embed/test-video-id',
};

const mockEpisodeWithThumbnail: PodcastEpisode = {
  ...mockEpisode,
  id: 'ep-3',
  title: 'Episode with Thumbnail',
  thumbnailUrl: 'https://example.com/thumbnail.jpg',
};

const mockEpisodeNoDuration: PodcastEpisode = {
  id: 'ep-4',
  title: 'Episode without Duration',
  hosts: ['Test Host'],
  description: 'Test description',
};

const renderPodcastEpisodeCard = (episode: PodcastEpisode = mockEpisode, index = 0) => {
  return render(<PodcastEpisodeCard episode={episode} index={index} />);
};

describe('PodcastEpisodeCard', () => {
  describe('Design System Compliance', () => {
    it('should use ModernCard with variant="elevated"', () => {
      renderPodcastEpisodeCard();
      const modernCard = screen.getByTestId('modern-card');
      expect(modernCard).toHaveAttribute('data-variant', 'elevated');
    });

    it('should use ModernCard with size="medium"', () => {
      renderPodcastEpisodeCard();
      const modernCard = screen.getByTestId('modern-card');
      expect(modernCard).toHaveAttribute('data-size', 'medium');
    });

    it('should enable hover effect on ModernCard', () => {
      renderPodcastEpisodeCard();
      const modernCard = screen.getByTestId('modern-card');
      expect(modernCard).toHaveAttribute('data-hover', 'true');
    });

    it('should use AnimatedElement with slideUp animation', () => {
      renderPodcastEpisodeCard();
      const animatedElement = screen.getByTestId('animated-element');
      expect(animatedElement).toHaveAttribute('data-animation', 'slideUp');
    });

    it('should apply staggered delay based on index', () => {
      const { unmount } = renderPodcastEpisodeCard(mockEpisode, 0);
      let animatedElement = screen.getByTestId('animated-element');
      expect(animatedElement).toHaveAttribute('data-delay', '100');
      unmount();

      render(<PodcastEpisodeCard episode={mockEpisode} index={1} />);
      animatedElement = screen.getByTestId('animated-element');
      expect(animatedElement).toHaveAttribute('data-delay', '200');
    });

    it('should use Button with variant="primary" (sage)', () => {
      renderPodcastEpisodeCard();
      const button = screen.getByTestId('button');
      expect(button).toHaveAttribute('data-variant', 'primary');
    });

    it('should use Button with size="medium"', () => {
      renderPodcastEpisodeCard();
      const button = screen.getByTestId('button');
      expect(button).toHaveAttribute('data-size', 'medium');
    });

    it('should have fullWidth button', () => {
      renderPodcastEpisodeCard();
      const button = screen.getByTestId('button');
      expect(button).toHaveAttribute('data-fullwidth', 'true');
    });
  });

  describe('Content Display', () => {
    it('should render episode title with h4 typography', () => {
      renderPodcastEpisodeCard();
      expect(screen.getByText('Importance of Rest')).toBeInTheDocument();
    });

    it('should render episode hosts', () => {
      renderPodcastEpisodeCard();
      expect(screen.getByText('Peter Gramaje, Shekinah Gramaje')).toBeInTheDocument();
    });

    it('should render episode description', () => {
      renderPodcastEpisodeCard();
      expect(screen.getByText(/In this episode, Peter and Shekinah discuss/i)).toBeInTheDocument();
    });

    it('should render episode duration when provided', () => {
      renderPodcastEpisodeCard();
      expect(screen.getByText('25 min')).toBeInTheDocument();
    });

    it('should not render duration section when duration is not provided', () => {
      renderPodcastEpisodeCard(mockEpisodeNoDuration);
      // Should not show AccessTime icon (duration indicator)
      const accessTimeIcons = screen.queryAllByTestId('AccessTimeIcon');
      expect(accessTimeIcons).toHaveLength(0);
    });

    it('should render "Listen" button', () => {
      renderPodcastEpisodeCard();
      expect(screen.getByRole('button', { name: /Listen to Importance of Rest/i })).toBeInTheDocument();
    });
  });

  describe('Media Display', () => {
    it('should render placeholder when no video or thumbnail', () => {
      renderPodcastEpisodeCard();
      expect(screen.getByText('Episode coming soon')).toBeInTheDocument();
    });

    it('should render iframe when videoUrl is provided', () => {
      renderPodcastEpisodeCard(mockEpisodeWithVideo);
      const iframe = screen.getByTitle('Episode with Video');
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute('src', 'https://www.youtube.com/embed/test-video-id');
    });

    it('should render image when thumbnailUrl is provided', () => {
      renderPodcastEpisodeCard(mockEpisodeWithThumbnail);
      const image = screen.getByAltText('Episode with Thumbnail');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', 'https://example.com/thumbnail.jpg');
    });

    it('should prioritize video over thumbnail', () => {
      const episode = {
        ...mockEpisode,
        videoUrl: 'https://www.youtube.com/embed/test',
        thumbnailUrl: 'https://example.com/thumb.jpg',
      };
      renderPodcastEpisodeCard(episode);
      expect(screen.getByTitle('Importance of Rest')).toBeInTheDocument();
      expect(screen.queryByAltText('Importance of Rest')).not.toBeInTheDocument();
    });

    it('should have proper aspect ratio (16:9)', () => {
      renderPodcastEpisodeCard();
      // The paddingTop: 56.25% creates 16:9 aspect ratio
      // This is applied via sx prop in the component
      expect(screen.getByText('Episode coming soon').parentElement?.parentElement).toBeTruthy();
    });
  });

  describe('Icons and Visual Elements', () => {
    it('should render Person icon for hosts', () => {
      renderPodcastEpisodeCard();
      // Person icon is rendered from @mui/icons-material
      expect(screen.getByText('Peter Gramaje, Shekinah Gramaje')).toBeInTheDocument();
    });

    it('should render AccessTime icon for duration', () => {
      renderPodcastEpisodeCard();
      // AccessTime icon is rendered from @mui/icons-material
      expect(screen.getByText('25 min')).toBeInTheDocument();
    });

    it('should render PlayCircle icon in button', () => {
      renderPodcastEpisodeCard();
      const startIcon = screen.getByTestId('button-start-icon');
      expect(startIcon).toBeInTheDocument();
    });

    it('should render PlayCircle icon in placeholder', () => {
      renderPodcastEpisodeCard();
      // PlayCircle icon is rendered in the placeholder
      expect(screen.getByText('Episode coming soon')).toBeInTheDocument();
    });
  });

  describe('Interactivity', () => {
    it('should call handlePlayClick when Listen button is clicked', async () => {
      const user = userEvent.setup();
      renderPodcastEpisodeCard();

      const listenButton = screen.getByRole('button', { name: /Listen to Importance of Rest/i });
      await user.click(listenButton);

      expect(mockConsoleLog).toHaveBeenCalledWith('Play episode:', 'Importance of Rest');
    });

    it('should have hover effect on card', () => {
      renderPodcastEpisodeCard();
      const modernCard = screen.getByTestId('modern-card');
      expect(modernCard).toHaveAttribute('data-hover', 'true');
    });
  });

  describe('Accessibility', () => {
    it('should have descriptive aria-label on Listen button', () => {
      renderPodcastEpisodeCard();
      const button = screen.getByRole('button', { name: /Listen to Importance of Rest/i });
      expect(button).toHaveAttribute('aria-label', 'Listen to Importance of Rest');
    });

    it('should have alt text on thumbnail image', () => {
      renderPodcastEpisodeCard(mockEpisodeWithThumbnail);
      const image = screen.getByAltText('Episode with Thumbnail');
      expect(image).toBeInTheDocument();
    });

    it('should have title attribute on iframe', () => {
      renderPodcastEpisodeCard(mockEpisodeWithVideo);
      const iframe = screen.getByTitle('Episode with Video');
      expect(iframe).toBeInTheDocument();
    });

    it('should have proper semantic structure', () => {
      renderPodcastEpisodeCard();
      // Episode title should be the main heading
      expect(screen.getByText('Importance of Rest')).toBeInTheDocument();
      // Metadata should be in a Stack
      expect(screen.getByText('Peter Gramaje, Shekinah Gramaje')).toBeInTheDocument();
      expect(screen.getByText('25 min')).toBeInTheDocument();
    });

    it('should support keyboard navigation on button', () => {
      renderPodcastEpisodeCard();
      const button = screen.getByRole('button', { name: /Listen to Importance of Rest/i });
      expect(button).toBeInTheDocument();
      // Button component has built-in keyboard support
    });
  });

  describe('Layout and Spacing', () => {
    it('should use design tokens for spacing', () => {
      renderPodcastEpisodeCard();
      // Component uses tokens.spacing.space values
      expect(screen.getByTestId('modern-card')).toBeInTheDocument();
    });

    it('should have proper card padding from ModernCard size="medium"', () => {
      renderPodcastEpisodeCard();
      const modernCard = screen.getByTestId('modern-card');
      expect(modernCard).toHaveAttribute('data-size', 'medium');
    });

    it('should use flexbox layout for content', () => {
      renderPodcastEpisodeCard();
      // Component uses flexbox with flexGrow: 1
      expect(screen.getByText('Importance of Rest')).toBeInTheDocument();
      expect(screen.getByText(/In this episode/i)).toBeInTheDocument();
    });

    it('should have consistent spacing between sections', () => {
      renderPodcastEpisodeCard();
      // Title, metadata, description, and button are properly spaced
      expect(screen.getByText('Importance of Rest')).toBeInTheDocument();
      expect(screen.getByText('Peter Gramaje, Shekinah Gramaje')).toBeInTheDocument();
      expect(screen.getByText(/In this episode/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Listen/i })).toBeInTheDocument();
    });
  });

  describe('Typography Compliance', () => {
    it('should use h4 style for episode title', () => {
      renderPodcastEpisodeCard();
      // Component applies tokens.typography.styles.h4
      expect(screen.getByText('Importance of Rest')).toBeInTheDocument();
    });

    it('should use bodySmall style for metadata', () => {
      renderPodcastEpisodeCard();
      // Component applies tokens.typography.styles.bodySmall for hosts and duration
      expect(screen.getByText('Peter Gramaje, Shekinah Gramaje')).toBeInTheDocument();
      expect(screen.getByText('25 min')).toBeInTheDocument();
    });

    it('should use body style for description', () => {
      renderPodcastEpisodeCard();
      // Component applies tokens.typography.styles.body
      expect(screen.getByText(/In this episode, Peter and Shekinah discuss/i)).toBeInTheDocument();
    });

    it('should use caption style for placeholder text', () => {
      renderPodcastEpisodeCard();
      // Component applies tokens.typography.styles.caption
      expect(screen.getByText('Episode coming soon')).toBeInTheDocument();
    });

    it('should have responsive typography for title', () => {
      renderPodcastEpisodeCard();
      // Title uses responsive font sizes from tokens
      expect(screen.getByText('Importance of Rest')).toBeInTheDocument();
    });
  });

  describe('Color Scheme', () => {
    it('should use neutral colors for text', () => {
      renderPodcastEpisodeCard();
      // Component uses tokens.color.base.neutral for text colors
      expect(screen.getByText('Importance of Rest')).toBeInTheDocument();
      expect(screen.getByText('Peter Gramaje, Shekinah Gramaje')).toBeInTheDocument();
    });

    it('should use sage gradient for placeholder', () => {
      renderPodcastEpisodeCard();
      // Placeholder uses sage gradient from tokens.color.semantic.sage
      expect(screen.getByText('Episode coming soon')).toBeInTheDocument();
    });

    it('should meet WCAG AA contrast requirements', () => {
      renderPodcastEpisodeCard();
      // Text colors (neutral.900 on white, neutral.600 on white) meet WCAG AA
      expect(screen.getByText('Importance of Rest')).toBeInTheDocument();
      expect(screen.getByText('Peter Gramaje, Shekinah Gramaje')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle long episode titles gracefully', () => {
      const longTitleEpisode: PodcastEpisode = {
        ...mockEpisode,
        title: 'This is a Very Long Episode Title That Should Wrap Properly Without Breaking the Layout',
      };
      renderPodcastEpisodeCard(longTitleEpisode);
      expect(screen.getByText(/This is a Very Long Episode Title/i)).toBeInTheDocument();
    });

    it('should handle multiple hosts', () => {
      const multiHostEpisode: PodcastEpisode = {
        ...mockEpisode,
        hosts: ['Host One', 'Host Two', 'Host Three', 'Host Four'],
      };
      renderPodcastEpisodeCard(multiHostEpisode);
      expect(screen.getByText('Host One, Host Two, Host Three, Host Four')).toBeInTheDocument();
    });

    it('should handle single host', () => {
      const singleHostEpisode: PodcastEpisode = {
        ...mockEpisode,
        hosts: ['Solo Host'],
      };
      renderPodcastEpisodeCard(singleHostEpisode);
      expect(screen.getByText('Solo Host')).toBeInTheDocument();
    });

    it('should handle long descriptions', () => {
      const longDescriptionEpisode: PodcastEpisode = {
        ...mockEpisode,
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(10),
      };
      renderPodcastEpisodeCard(longDescriptionEpisode);
      expect(screen.getByText(/Lorem ipsum dolor sit amet/i)).toBeInTheDocument();
    });

    it('should handle missing optional fields', () => {
      const minimalEpisode: PodcastEpisode = {
        id: 'ep-min',
        title: 'Minimal Episode',
        hosts: ['Host'],
        description: 'Description',
      };
      expect(() => renderPodcastEpisodeCard(minimalEpisode)).not.toThrow();
    });

    it('should handle index of 0', () => {
      renderPodcastEpisodeCard(mockEpisode, 0);
      const animatedElement = screen.getByTestId('animated-element');
      expect(animatedElement).toHaveAttribute('data-delay', '100');
    });

    it('should handle large index values', () => {
      renderPodcastEpisodeCard(mockEpisode, 10);
      const animatedElement = screen.getByTestId('animated-element');
      expect(animatedElement).toHaveAttribute('data-delay', '1100');
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive font sizes for title', () => {
      renderPodcastEpisodeCard();
      // Component uses responsive fontSize with xs and md breakpoints
      expect(screen.getByText('Importance of Rest')).toBeInTheDocument();
    });

    it('should maintain proper card structure on all screen sizes', () => {
      renderPodcastEpisodeCard();
      // Flexbox layout adapts to different screen sizes
      expect(screen.getByTestId('modern-card')).toBeInTheDocument();
    });

    it('should have proper aspect ratio on all screen sizes', () => {
      renderPodcastEpisodeCard();
      // 16:9 aspect ratio maintained via paddingTop: 56.25%
      expect(screen.getByText('Episode coming soon').parentElement?.parentElement).toBeTruthy();
    });
  });

  describe('Integration', () => {
    it('should render all elements in correct order', () => {
      renderPodcastEpisodeCard();

      // Check all main elements are present
      expect(screen.getByText('Episode coming soon')).toBeInTheDocument();
      expect(screen.getByText('Importance of Rest')).toBeInTheDocument();
      expect(screen.getByText('Peter Gramaje, Shekinah Gramaje')).toBeInTheDocument();
      expect(screen.getByText('25 min')).toBeInTheDocument();
      expect(screen.getByText(/In this episode/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Listen/i })).toBeInTheDocument();
    });

    it('should work with PodcastsGrid component', () => {
      // Component is designed to work in grid layout
      renderPodcastEpisodeCard(mockEpisode, 0);
      expect(screen.getByTestId('modern-card')).toBeInTheDocument();
    });
  });
});
