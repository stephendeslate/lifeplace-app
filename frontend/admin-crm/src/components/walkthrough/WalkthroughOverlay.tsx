// frontend/admin-crm/src/components/walkthrough/WalkthroughOverlay.tsx

import React, { useMemo } from 'react';
import { Box } from '@mui/material';
import { keyframes } from '@emotion/react';
import { tokens, createTransition } from '../../design-system/tokens';
import type { WalkthroughOverlayProps } from '../../types/walkthrough.types';

// Z-index above header (1300), modal (1300), and toast (9999)
const OVERLAY_Z_INDEX = 10000;

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const pulseGlow = keyframes`
  0%, 100% {
    box-shadow: 0 0 0 2px ${tokens.color.primary[400]},
                0 0 20px 4px ${tokens.color.primary[400]}40;
  }
  50% {
    box-shadow: 0 0 0 3px ${tokens.color.primary[400]},
                0 0 30px 8px ${tokens.color.primary[400]}60;
  }
`;

export const WalkthroughOverlay: React.FC<WalkthroughOverlayProps> = ({
  targetRect,
  padding = 8,
  borderRadius = 8,
  onClick,
  allowClickThrough = false,
}) => {
  // Generate SVG path for spotlight effect with rounded corners
  const spotlightPath = useMemo(() => {
    if (!targetRect) return null;

    const x = targetRect.left - padding;
    const y = targetRect.top - padding;
    const width = targetRect.width + padding * 2;
    const height = targetRect.height + padding * 2;
    const r = Math.min(borderRadius, width / 2, height / 2);

    // Full viewport rectangle
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Create path: full viewport with rounded rectangle cutout
    // M = move to, L = line to, A = arc, Z = close path
    const outerPath = `M 0 0 L ${viewportWidth} 0 L ${viewportWidth} ${viewportHeight} L 0 ${viewportHeight} Z`;

    // Inner rounded rectangle (clockwise for cutout)
    const innerPath = `
      M ${x + r} ${y}
      L ${x + width - r} ${y}
      A ${r} ${r} 0 0 1 ${x + width} ${y + r}
      L ${x + width} ${y + height - r}
      A ${r} ${r} 0 0 1 ${x + width - r} ${y + height}
      L ${x + r} ${y + height}
      A ${r} ${r} 0 0 1 ${x} ${y + height - r}
      L ${x} ${y + r}
      A ${r} ${r} 0 0 1 ${x + r} ${y}
      Z
    `;

    return `${outerPath} ${innerPath}`;
  }, [targetRect, padding, borderRadius]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (allowClickThrough) return;
    e.stopPropagation();
    onClick?.();
  };

  return (
    <>
      {/* Dark overlay with spotlight cutout using SVG */}
      <Box
        component="svg"
        onClick={handleOverlayClick}
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: OVERLAY_Z_INDEX,
          pointerEvents: allowClickThrough ? 'none' : 'auto',
          cursor: allowClickThrough ? 'default' : 'pointer',
          animation: `${fadeIn} 300ms ${tokens.animation.easing.decelerate} forwards`,
        }}
        role="presentation"
        aria-hidden="true"
      >
        {spotlightPath && (
          <path
            d={spotlightPath}
            fill="rgba(0, 0, 0, 0.75)"
            fillRule="evenodd"
            style={{
              transition: createTransition('d', 'normal'),
            }}
          />
        )}
        {!spotlightPath && (
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.75)"
          />
        )}
      </Box>

      {/* Spotlight border/glow effect */}
      {targetRect && (
        <Box
          sx={{
            position: 'fixed',
            top: targetRect.top - padding,
            left: targetRect.left - padding,
            width: targetRect.width + padding * 2,
            height: targetRect.height + padding * 2,
            zIndex: OVERLAY_Z_INDEX + 1,
            borderRadius: `${borderRadius}px`,
            animation: `
              ${fadeIn} 300ms ${tokens.animation.easing.decelerate} forwards,
              ${pulseGlow} 2s ${tokens.animation.easing.gentle} infinite
            `,
            transition: ['top', 'left', 'width', 'height'].map(prop => createTransition(prop, 'normal')).join(', '),
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        />
      )}
    </>
  );
};

export default WalkthroughOverlay;
