// design-system/components/AnimatedElement.tsx

import React, { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import type { BoxProps } from '@mui/material';

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
  | 'pulse';

interface AnimatedElementProps extends BoxProps {
  animation?: AnimationType;
  delay?: number;
  duration?: number;
  repeat?: boolean;
  threshold?: number;
  children?: React.ReactNode;
}

const StyledAnimatedElement = styled(Box, {
  shouldForwardProp: (prop) =>
    !['animation', 'delay', 'duration', 'repeat', 'isVisible'].includes(prop as string),
})<AnimatedElementProps & { isVisible: boolean }>(({
  animation = 'fadeIn',
  delay = 0,
  duration = 500,
  repeat = false,
  isVisible,
}) => {
  const getAnimation = () => {
    switch (animation) {
      case 'float':
      case 'sway':
      case 'pulse':
        return {
          animation: `${animation} ${duration}ms ease-in-out ${delay}ms ${repeat ? 'infinite' : 'forwards'}`,
        };
      default:
        if (!isVisible) {
          return {
            opacity: 0,
            transform: getInitialTransform(animation),
          };
        }
        return {
          opacity: 1,
          transform: 'none',
          transition: `all ${duration}ms cubic-bezier(0.4, 0, 0.2, 1) ${delay}ms`,
        };
    }
  };

  const getInitialTransform = (type: AnimationType) => {
    switch (type) {
      case 'slideUp':
        return 'translateY(20px)';
      case 'slideDown':
        return 'translateY(-20px)';
      case 'slideLeft':
        return 'translateX(20px)';
      case 'slideRight':
        return 'translateX(-20px)';
      case 'scaleUp':
        return 'scale(0.95)';
      case 'scaleDown':
        return 'scale(1.05)';
      default:
        return 'none';
    }
  };

  return {
    ...getAnimation(),
    '@keyframes float': {
      '0%': { transform: 'translateY(0px)' },
      '50%': { transform: 'translateY(-10px)' },
      '100%': { transform: 'translateY(0px)' },
    },
    '@keyframes sway': {
      '0%': { transform: 'rotate(-1deg)' },
      '50%': { transform: 'rotate(1deg)' },
      '100%': { transform: 'rotate(-1deg)' },
    },
    '@keyframes pulse': {
      '0%': { transform: 'scale(1)' },
      '50%': { transform: 'scale(1.05)' },
      '100%': { transform: 'scale(1)' },
    },
  };
});

export const AnimatedElement: React.FC<AnimatedElementProps> = ({
  children,
  threshold = 0.1,
  animation,
  ...props
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // For continuous animations, set visible immediately
    if (animation === 'float' || animation === 'sway' || animation === 'pulse') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            // Once visible, stop observing unless repeat is true
            if (!props.repeat && elementRef.current) {
              observer.unobserve(elementRef.current);
            }
          } else if (props.repeat) {
            setIsVisible(false);
          }
        });
      },
      { threshold },
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      const currentElement = elementRef.current;
      if (currentElement) {
        observer.unobserve(currentElement);
      }
    };
  }, [threshold, props.repeat, animation]);

  return (
    <StyledAnimatedElement ref={elementRef} isVisible={isVisible} animation={animation} {...props}>
      {children}
    </StyledAnimatedElement>
  );
};

// Convenience wrapper for fade-in animation
export const FadeIn: React.FC<Omit<AnimatedElementProps, 'animation'>> = (props) => (
  <AnimatedElement animation="fadeIn" {...props} />
);

export default AnimatedElement;
