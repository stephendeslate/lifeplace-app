import React from 'react';
import { useParams, Link as RouterLink, Navigate } from 'react-router-dom';
import { Box, Typography, Paper, List, ListItemButton, ListItemText } from '@mui/material';
import { ArticleRounded } from '@mui/icons-material';
import { articles } from '@/generated/helpContent';
import { MarkdownRenderer } from './components/MarkdownRenderer';

export const HelpArticle: React.FC = () => {
  const { collection: collectionId, article: articleSlug } = useParams();
  const article = articles.find((a) => a.collectionId === collectionId && a.slug === articleSlug);

  if (!article) return <Navigate to={collectionId ? `/help/${collectionId}` : '/help'} replace />;

  const siblings = articles.filter(
    (a) => a.collectionId === collectionId && a.slug !== articleSlug,
  );

  return (
    <Box sx={{ display: 'flex', gap: 4, flexDirection: { xs: 'column', md: 'row' } }}>
      <Paper variant="outlined" sx={{ flex: 1, minWidth: 0, p: { xs: 2, sm: 4 } }}>
        <MarkdownRenderer content={article.body} />
      </Paper>

      {siblings.length > 0 && (
        <Box sx={{ width: { md: 280 }, flexShrink: 0 }}>
          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{ mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5 }}
          >
            More in this collection
          </Typography>
          <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {siblings.map((s) => (
              <Paper key={s.slug} variant="outlined" sx={{ borderRadius: 1 }}>
                <ListItemButton
                  component={RouterLink}
                  to={`/help/${collectionId}/${s.slug}`}
                  sx={{ py: 1 }}
                >
                  <ArticleRounded sx={{ mr: 1.5, fontSize: 18, color: 'text.secondary' }} />
                  <ListItemText primary={s.title} primaryTypographyProps={{ variant: 'body2' }} />
                </ListItemButton>
              </Paper>
            ))}
          </List>
        </Box>
      )}
    </Box>
  );
};
