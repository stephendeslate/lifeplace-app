import React from 'react';
import { Box, Container } from '@mui/material';

interface ContextualContentAreaProps {
  children: React.ReactNode;
}

export const ContextualContentArea: React.FC<ContextualContentAreaProps> = ({ children }) => {
  return (
    <Box
      sx={{
        flex: 1,
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Main Content */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Content Container with Consistent Spacing */}
        <Container
          maxWidth={false}
          sx={{
            flex: 1,
            px: { xs: 2, sm: 3, md: 4, lg: 6 }, // 8px grid: 16px, 24px, 32px, 48px
            py: { xs: 2, sm: 3, md: 4 }, // 8px grid: 16px, 24px, 32px
            maxWidth: '1400px', // Professional max-width
            mx: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {children}
        </Container>
      </Box>
    </Box>
  );
};
