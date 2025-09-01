// design-system/patterns/OrganicShapes.tsx

import React from 'react';
import { tokens } from '../tokens';

interface ShapeProps {
  color?: string;
  opacity?: number;
  className?: string;
}

export const LeafShape: React.FC<ShapeProps> = ({ 
  color = tokens.color.base.forest[600], 
  opacity = 0.1,
  className 
}) => (
  <svg 
    className={className}
    viewBox="0 0 200 200" 
    xmlns="http://www.w3.org/2000/svg"
    style={{ position: 'absolute', width: '100%', height: '100%' }}
  >
    <path 
      fill={color} 
      fillOpacity={opacity}
      d="M47.5,-65.2C59.6,-56.6,66.1,-40.3,69.8,-23.6C73.4,-6.9,74.2,10.2,69.4,25.8C64.6,41.4,54.2,55.5,40.3,63.7C26.4,71.9,9.1,74.2,-8.3,71.8C-25.7,69.4,-43.2,62.3,-56.6,50.6C-70,38.9,-79.3,22.6,-80.8,5.6C-82.3,-11.4,-76,-29.1,-65.2,-42.9C-54.4,-56.7,-39.1,-66.6,-22.6,-70.7C-6.1,-74.8,11.6,-73.1,28.5,-67.1C45.4,-61.1,61.5,-50.8,47.5,-65.2Z" 
      transform="translate(100 100)"
    />
  </svg>
);

export const WaveShape: React.FC<ShapeProps> = ({ 
  color = tokens.color.base.forest[500], 
  opacity = 0.08,
  className 
}) => (
  <svg 
    className={className}
    viewBox="0 0 1440 320" 
    xmlns="http://www.w3.org/2000/svg"
    style={{ position: 'absolute', bottom: 0, width: '100%' }}
  >
    <path 
      fill={color} 
      fillOpacity={opacity}
      d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,117.3C672,107,768,117,864,138.7C960,160,1056,192,1152,192C1248,192,1344,160,1392,144L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
    />
  </svg>
);

export const BlobShape: React.FC<ShapeProps> = ({ 
  color = tokens.color.base.earth[500], 
  opacity = 0.1,
  className 
}) => (
  <svg 
    className={className}
    viewBox="0 0 200 200" 
    xmlns="http://www.w3.org/2000/svg"
    style={{ position: 'absolute', width: '100%', height: '100%' }}
  >
    <path 
      fill={color} 
      fillOpacity={opacity}
      d="M40.7,-50.9C54.3,-45.7,67.8,-35.6,73.5,-21.9C79.2,-8.2,77.1,9.1,71.1,24.7C65.1,40.3,55.2,54.2,42.1,61.8C29,69.4,12.7,70.7,-3.4,68.6C-19.5,66.5,-35.4,61,-48.3,51.3C-61.2,41.6,-71.1,27.7,-74.7,12.1C-78.3,-3.5,-75.6,-20.8,-67.5,-34.3C-59.4,-47.8,-45.9,-57.5,-31.5,-62.4C-17.1,-67.3,-1.8,-67.4,12.1,-63.8C26,-60.2,39.1,-52.9,40.7,-50.9Z" 
      transform="translate(100 100)"
    />
  </svg>
);

export const CirclePattern: React.FC<ShapeProps> = ({ 
  color = tokens.color.base.gold[500], 
  opacity = 0.05,
  className 
}) => (
  <svg 
    className={className}
    width="100%" 
    height="100%" 
    xmlns="http://www.w3.org/2000/svg"
    style={{ position: 'absolute' }}
  >
    <defs>
      <pattern id="circles" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
        <circle cx="20" cy="20" r="2" fill={color} fillOpacity={opacity} />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#circles)" />
  </svg>
);

export const GridPattern: React.FC<ShapeProps> = ({ 
  color = tokens.color.base.sage[400], 
  opacity = 0.1,
  className 
}) => (
  <svg 
    className={className}
    width="100%" 
    height="100%" 
    xmlns="http://www.w3.org/2000/svg"
    style={{ position: 'absolute' }}
  >
    <defs>
      <pattern id="grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke={color} strokeWidth="1" strokeOpacity={opacity} />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#grid)" />
  </svg>
);

interface OrganicBackgroundProps {
  shapes?: ('leaf' | 'wave' | 'blob' | 'circles' | 'grid')[];
  children?: React.ReactNode;
}

export const OrganicBackground: React.FC<OrganicBackgroundProps> = ({ 
  shapes = ['blob', 'leaf'], 
  children 
}) => {
  const shapeComponents = {
    leaf: LeafShape,
    wave: WaveShape,
    blob: BlobShape,
    circles: CirclePattern,
    grid: GridPattern,
  };

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '100vh', overflow: 'hidden' }}>
      {shapes.map((shape, index) => {
        const ShapeComponent = shapeComponents[shape];
        return (
          <div
            key={`${shape}-${index}`}
            style={{
              position: 'absolute',
              top: `${Math.random() * 50}%`,
              left: `${Math.random() * 50}%`,
              width: `${200 + Math.random() * 300}px`,
              height: `${200 + Math.random() * 300}px`,
              transform: `rotate(${Math.random() * 360}deg)`,
              pointerEvents: 'none',
            }}
          >
            <ShapeComponent />
          </div>
        );
      })}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
};

export default OrganicBackground;