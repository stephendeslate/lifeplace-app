import React from 'react';
import { Box, Typography, Stack, CircularProgress } from '@mui/material';

const ValidatingState: React.FC = () => (
  <Box
    sx={{
      minHeight: 'calc(100vh - 360px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 2,
      width: '100%',
    }}
  >
    <Stack spacing={3} alignItems="center">
      <CircularProgress size={60} sx={{ color: 'white' }} />
      <Typography variant="h6" sx={{ color: 'white' }}>
        Validating reset link...
      </Typography>
    </Stack>
  </Box>
);

export default ValidatingState;
