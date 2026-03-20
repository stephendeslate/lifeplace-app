import React from 'react';
import { useParams, Link as RouterLink, Navigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItemButton,
  ListItemText,
  Card,
  CardContent,
  CardActionArea,
} from '@mui/material';
import { ArticleRounded } from '@mui/icons-material';
import { collections, articles } from '@/generated/helpContent';

export const HelpCollection: React.FC = () => {
  const { collection: collectionId } = useParams();
  const collection = collections.find((c) => c.id === collectionId);

  if (!collection) return <Navigate to="/help" replace />;

  const collectionArticles = articles.filter((a) => a.collectionId === collectionId);
  const otherCollections = collections.filter((c) => c.id !== collectionId);

  return (
    <Box sx={{ display: 'flex', gap: 4, flexDirection: { xs: 'column', md: 'row' } }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>
          {collection.title}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {collection.description}
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {collectionArticles.map((article) => (
            <Paper key={article.slug} variant="outlined">
              <ListItemButton component={RouterLink} to={`/help/${collectionId}/${article.slug}`}>
                <ArticleRounded sx={{ mr: 2, color: 'primary.main' }} />
                <ListItemText primary={article.title} />
              </ListItemButton>
            </Paper>
          ))}
          {collectionArticles.length === 0 && (
            <Typography color="text.secondary">No articles in this collection.</Typography>
          )}
        </Box>
      </Box>

      <Box sx={{ width: { md: 280 }, flexShrink: 0 }}>
        <Typography
          variant="subtitle2"
          color="text.secondary"
          sx={{ mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5 }}
        >
          Other Collections
        </Typography>
        <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {otherCollections.map((c) => (
            <Card key={c.id} variant="outlined" sx={{ borderRadius: 1 }}>
              <CardActionArea component={RouterLink} to={`/help/${c.id}`}>
                <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="body2" fontWeight={500}>
                    {c.title}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </List>
      </Box>
    </Box>
  );
};
