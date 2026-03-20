import React, { useMemo } from 'react';
import { useSearchParams, Link as RouterLink } from 'react-router-dom';
import { Box, Typography, Paper, Chip } from '@mui/material';
import { collections } from '@/generated/helpContent';
import { searchHelp } from './utils/searchHelp';

export const HelpSearchResults: React.FC = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const results = useMemo(() => searchHelp(query), [query]);

  const collectionMap = useMemo(() => new Map(collections.map((c) => [c.id, c.title])), []);

  const highlightMatch = (text: string, q: string) => {
    if (!q) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <Box component="mark" sx={{ bgcolor: 'warning.light', px: 0.25, borderRadius: 0.5 }}>
          {text.slice(idx, idx + q.length)}
        </Box>
        {text.slice(idx + q.length)}
      </>
    );
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
        Search Results
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {results.length} result{results.length !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
      </Typography>

      {results.length === 0 && (
        <Typography color="text.secondary" sx={{ mt: 4 }}>
          No articles matched your search. Try different keywords or browse the collections.
        </Typography>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {results.map((result) => (
          <Paper
            key={`${result.collectionId}/${result.slug}`}
            variant="outlined"
            component={RouterLink}
            to={`/help/${result.collectionId}/${result.slug}`}
            sx={{
              p: 2.5,
              textDecoration: 'none',
              color: 'inherit',
              transition: 'border-color 0.15s',
              '&:hover': { borderColor: 'primary.main' },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                {highlightMatch(result.title, query)}
              </Typography>
              <Chip
                label={collectionMap.get(result.collectionId) ?? result.collectionId}
                size="small"
                variant="outlined"
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              {highlightMatch(result.snippet, query)}
            </Typography>
          </Paper>
        ))}
      </Box>
    </Box>
  );
};
