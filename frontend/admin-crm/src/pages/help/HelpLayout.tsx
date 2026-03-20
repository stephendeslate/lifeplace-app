import React, { useState } from 'react';
import { Outlet, useNavigate, useParams, Link as RouterLink } from 'react-router-dom';
import { Box, TextField, InputAdornment, Breadcrumbs, Link, Typography } from '@mui/material';
import { SearchRounded, NavigateNextRounded } from '@mui/icons-material';
import { collections } from '@/generated/helpContent';

export const HelpLayout: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { collection: collectionId, article: articleSlug } = useParams();

  const collection = collectionId ? collections.find((c) => c.id === collectionId) : undefined;

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim().length >= 2) {
      navigate(`/help/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, sm: 3 }, py: 3 }}>
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
          alignItems: { sm: 'center' },
          justifyContent: 'space-between',
        }}
      >
        <Breadcrumbs separator={<NavigateNextRounded fontSize="small" />}>
          <Link component={RouterLink} to="/help" underline="hover" color="inherit">
            Help Center
          </Link>
          {collection &&
            (collectionId && articleSlug ? (
              <Link
                component={RouterLink}
                to={`/help/${collectionId}`}
                underline="hover"
                color="inherit"
              >
                {collection.title}
              </Link>
            ) : (
              <Typography color="text.primary">{collection.title}</Typography>
            ))}
          {articleSlug && (
            <Typography
              color="text.primary"
              sx={{
                maxWidth: 300,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {articleSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            </Typography>
          )}
        </Breadcrumbs>

        <TextField
          size="small"
          placeholder="Search help articles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleSearch}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRounded fontSize="small" color="action" />
                </InputAdornment>
              ),
            },
          }}
          sx={{ minWidth: 280 }}
        />
      </Box>

      <Outlet />
    </Box>
  );
};
