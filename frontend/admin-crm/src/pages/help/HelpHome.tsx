import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Typography, Card, CardActionArea, CardContent, Chip } from '@mui/material';
import { collections } from '@/generated/helpContent';

export const HelpHome: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>
        Help Center
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Browse collections below to find articles on the topic you need.
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
          gap: 2.5,
        }}
      >
        {collections.map((collection) => (
          <Card key={collection.id} variant="outlined" sx={{ height: '100%' }}>
            <CardActionArea
              component={RouterLink}
              to={`/help/${collection.id}`}
              sx={{ height: '100%' }}
            >
              <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  {collection.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flex: 1 }}>
                  {collection.description}
                </Typography>
                <Chip
                  label={`${collection.articleCount} article${collection.articleCount !== 1 ? 's' : ''}`}
                  size="small"
                  variant="outlined"
                />
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Box>
    </Box>
  );
};
