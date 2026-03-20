import React from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Link as MuiLink,
} from '@mui/material';
import type { Components } from 'react-markdown';

const components: Components = {
  h1: ({ children }) => (
    <Typography variant="h4" gutterBottom sx={{ mt: 2, fontWeight: 700 }}>
      {children}
    </Typography>
  ),
  h2: ({ children }) => (
    <Typography variant="h5" gutterBottom sx={{ mt: 3, mb: 1, fontWeight: 600 }}>
      {children}
    </Typography>
  ),
  h3: ({ children }) => (
    <Typography variant="h6" gutterBottom sx={{ mt: 2, mb: 1, fontWeight: 600 }}>
      {children}
    </Typography>
  ),
  p: ({ children }) => (
    <Typography variant="body1" sx={{ mb: 1.5, lineHeight: 1.7 }}>
      {children}
    </Typography>
  ),
  a: ({ href, children }) => (
    <MuiLink href={href} underline="hover">
      {children}
    </MuiLink>
  ),
  ul: ({ children }) => (
    <Box component="ul" sx={{ pl: 3, mb: 2 }}>
      {children}
    </Box>
  ),
  ol: ({ children }) => (
    <Box component="ol" sx={{ pl: 3, mb: 2 }}>
      {children}
    </Box>
  ),
  li: ({ children }) => (
    <Typography component="li" variant="body1" sx={{ mb: 0.5, lineHeight: 1.7 }}>
      {children}
    </Typography>
  ),
  table: ({ children }) => (
    <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
      <Table size="small">{children}</Table>
    </TableContainer>
  ),
  thead: ({ children }) => <TableHead>{children}</TableHead>,
  tbody: ({ children }) => <TableBody>{children}</TableBody>,
  tr: ({ children }) => <TableRow>{children}</TableRow>,
  th: ({ children }) => <TableCell sx={{ fontWeight: 600 }}>{children}</TableCell>,
  td: ({ children }) => <TableCell>{children}</TableCell>,
  code: ({ className, children }) => {
    const isBlock = className?.startsWith('language-');
    if (isBlock) {
      return (
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            mb: 2,
            overflow: 'auto',
            bgcolor: 'grey.50',
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            whiteSpace: 'pre',
          }}
        >
          {children}
        </Paper>
      );
    }
    return (
      <Box
        component="code"
        sx={{
          px: 0.75,
          py: 0.25,
          borderRadius: 0.5,
          bgcolor: 'grey.100',
          fontFamily: 'monospace',
          fontSize: '0.875em',
        }}
      >
        {children}
      </Box>
    );
  },
  hr: () => <Box sx={{ my: 3, borderTop: '1px solid', borderColor: 'divider' }} />,
  blockquote: ({ children }) => (
    <Box
      sx={{
        borderLeft: 3,
        borderColor: 'primary.main',
        pl: 2,
        py: 0.5,
        my: 2,
        bgcolor: 'primary.50',
        borderRadius: 1,
      }}
    >
      {children}
    </Box>
  ),
};

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <Markdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </Markdown>
  );
};
