// AnimatedElement Component
// Scroll-triggered animations with multiple variants using Intersection Observer

import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import { Box, type SxProps, type Theme } from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';

// Animation keyframes
const fadeInAnimation = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const slideUpAnimation = keyframes`
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const slideDownAnimation = keyframes`
  from {
    opacity: 0;
    transform: translateY(-30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const slideLeftAnimation = keyframes`
  from {
    opacity: 0;
    transform: translateX(30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const slideRightAnimation = keyframes`
  from {
    opacity: 0;
    transform: translateX(-30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const scaleUpAnimation = keyframes`
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;

const scaleDownAnimation = keyframes`
  from {
    opacity: 0;
    transform: scale(1.1);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;

const floatAnimation = keyframes`
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
`;

const swayAnimation = keyframes`
  0%, 100% {
    transform: rotate(0deg);
  }
  25% {
    transform: rotate(2deg);
  }
  75% {
    transform: rotate(-2deg);
  }
`;

const pulseAnimation = keyframes`
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(0.98);
  }
`;

// New animations
const zoomInAnimation = keyframes`
  from {
    opacity: 0;
    transform: scale(0.5);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;

const zoomOutAnimation = keyframes`
  from {
    opacity: 0;
    transform: scale(1.5);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;

const slideUpFadeAnimation = keyframes`
  from {
    opacity: 0;
    transform: translateY(40px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const slideDownFadeAnimation = keyframes`
  from {
    opacity: 0;
    transform: translateY(-40px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const revealAnimation = keyframes`
  from {
    opacity: 0;
    clip-path: inset(0 100% 0 0);
  }
  to {
    opacity: 1;
    clip-path: inset(0 0 0 0);
  }
`;

const blurAnimation = keyframes`
  from {
    opacity: 0;
    filter: blur(10px);
  }
  to {
    opacity: 1;
    filter: blur(0);
  }
`;

const bounceInAnimation = keyframes`
  0% {
    opacity: 0;
    transform: scale(0.3);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
  70% {
    transform: scale(0.9);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
`;

export type AnimationType =
  | 'fadeIn'
  | 'slideUp'
  | 'slideDown'
  | 'slideLeft'
  | 'slideRight'
  | 'scaleUp'
  | 'scaleDown'
  | 'float'
  | 'sway'
  | 'pulse'
  | 'zoomIn'
  | 'zoomOut'
  | 'slideUpFade'
  | 'slideDownFade'
  | 'reveal'
  | 'blur'
  | 'bounceIn';

export interface AnimatedElementProps {
  children: ReactNode;
  animation?: AnimationType;
  duration?: number; // in milliseconds
  delay?: number; // in milliseconds
  threshold?: number; // 0 to 1, how much of the element should be visible before triggering
  triggerOnce?: boolean; // whether to animate only once or every time it comes into view
  disabled?: boolean; // disable animations (useful for prefers-reduced-motion)
  sx?: SxProps<Theme>;
  className?: string;
  as?: React.ElementType;
}

interface StyledAnimatedBoxProps {
  animationType: AnimationType;
  duration: number;
  delay: number;
  isVisible: boolean;
  disabled: boolean;
}

const getAnimationKeyframe = (type: AnimationType) => {
  switch (type) {
    case 'fadeIn':
      return fadeInAnimation;
    case 'slideUp':
      return slideUpAnimation;
    case 'slideDown':
      return slideDownAnimation;
    case 'slideLeft':
      return slideLeftAnimation;
    case 'slideRight':
      return slideRightAnimation;
    case 'scaleUp':
      return scaleUpAnimation;
    case 'scaleDown':
      return scaleDownAnimation;
    case 'float':
      return floatAnimation;
    case 'sway':
      return swayAnimation;
    case 'pulse':
      return pulseAnimation;
    case 'zoomIn':
      return zoomInAnimation;
    case 'zoomOut':
      return zoomOutAnimation;
    case 'slideUpFade':
      return slideUpFadeAnimation;
    case 'slideDownFade':
      return slideDownFadeAnimation;
    case 'reveal':
      return revealAnimation;
    case 'blur':
      return blurAnimation;
    case 'bounceIn':
      return bounceInAnimation;
    default:
      return fadeInAnimation;
  }
};

const isLoopingAnimation = (type: AnimationType): boolean => {
  return ['float', 'sway', 'pulse'].includes(type);
};

const StyledAnimatedBox = styled(Box, {
  shouldForwardProp: (prop) =>
    !['animationType', 'duration', 'delay', 'isVisible', 'disabled'].includes(prop as string),
})<StyledAnimatedBoxProps>(({ animationType, duration, delay, isVisible, disabled }) => {
  const animation = getAnimationKeyframe(animationType);
  const isLooping = isLoopingAnimation(animationType);

  if (disabled) {
    return {
      opacity: 1,
    };
  }

  return {
    // Initial state
    opacity: isVisible ? 1 : 0,

    // Animation
    animation: isVisible
      ? `${animation} ${duration}ms cubic-bezier(0.4, 0, 0.2, 1) ${delay}ms both ${
          isLooping ? 'infinite' : 'forwards'
        }`
      : 'none',

    // Respect reduced motion preference
    '@media (prefers-reduced-motion: reduce)': {
      animation: 'none',
      opacity: 1,
      transform: 'none',
    },
  };
});

export const AnimatedElement: React.FC<AnimatedElementProps> = ({
  children,
  animation = 'fadeIn',
  duration = 600,
  delay = 0,
  threshold = 0.1,
  triggerOnce = true,
  disabled = false,
  sx,
  className,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (disabled || prefersReducedMotion) {
      setIsVisible(true);
      return;
    }

    const element = elementRef.current;
    if (!element) return;

    // Create Intersection Observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (triggerOnce && hasAnimated) {
              return;
            }
            setIsVisible(true);
            if (triggerOnce) {
              setHasAnimated(true);
            }
          } else {
            if (!triggerOnce) {
              setIsVisible(false);
            }
          }
        });
      },
      {
        threshold,
        rootMargin: '0px',
      },
    );

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [threshold, triggerOnce, disabled, hasAnimated]);

  return (
    <StyledAnimatedBox
      ref={elementRef}
      animationType={animation}
      duration={duration}
      delay={delay}
      isVisible={isVisible}
      disabled={disabled}
      className={className}
      sx={sx}
    >
      {children}
    </StyledAnimatedBox>
  );
};

// Convenience components for common animations
export const FadeIn: React.FC<Omit<AnimatedElementProps, 'animation'>> = (props) => (
  <AnimatedElement animation="fadeIn" {...props} />
);

export const SlideUp: React.FC<Omit<AnimatedElementProps, 'animation'>> = (props) => (
  <AnimatedElement animation="slideUp" {...props} />
);

export const SlideDown: React.FC<Omit<AnimatedElementProps, 'animation'>> = (props) => (
  <AnimatedElement animation="slideDown" {...props} />
);

export const ZoomIn: React.FC<Omit<AnimatedElementProps, 'animation'>> = (props) => (
  <AnimatedElement animation="zoomIn" {...props} />
);

export const BounceIn: React.FC<Omit<AnimatedElementProps, 'animation'>> = (props) => (
  <AnimatedElement animation="bounceIn" {...props} />
);

export const Reveal: React.FC<Omit<AnimatedElementProps, 'animation'>> = (props) => (
  <AnimatedElement animation="reveal" {...props} />
);

export const BlurIn: React.FC<Omit<AnimatedElementProps, 'animation'>> = (props) => (
  <AnimatedElement animation="blur" {...props} />
);

export default AnimatedElement;
