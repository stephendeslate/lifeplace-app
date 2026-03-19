import React from 'react';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Chip,
  alpha,
  useTheme,
  Stack,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  Share as ShareIcon,
} from '@mui/icons-material';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';
import type { FAQ } from './types';

interface FAQTabProps {
  faqs: FAQ[];
  expandedAccordion: string | false;
  onAccordionChange: (panel: string) => (_: React.SyntheticEvent, isExpanded: boolean) => void;
  onHelpfulClick: (type: 'up' | 'down', id: string) => void;
}

export const FAQTab: React.FC<FAQTabProps> = ({
  faqs,
  expandedAccordion,
  onAccordionChange,
  onHelpfulClick,
}) => {
  const theme = useTheme();

  if (faqs.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6" color="text.secondary">
          No FAQs found matching your search
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={2}>
      {faqs.map((faq, index) => (
        <AnimatedElement key={faq.id} animation="slideUp" delay={index * 100}>
          <Accordion
            expanded={expandedAccordion === faq.id}
            onChange={onAccordionChange(faq.id)}
            sx={{
              backgroundColor: alpha('#fff', 0.05),
              backdropFilter: 'blur(10px)',
              border: `1px solid ${alpha('#fff', 0.1)}`,
              '&:before': { display: 'none' },
              borderRadius: '12px !important',
              overflow: 'hidden',
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Typography variant="body1" sx={{ fontWeight: 600, flex: 1 }}>
                  {faq.question}
                </Typography>
                <Chip
                  label={faq.category}
                  size="small"
                  sx={{
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main,
                  }}
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
                {faq.answer}
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Was this helpful?
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => onHelpfulClick('up', faq.id)}
                    sx={{ color: 'success.main' }}
                  >
                    <ThumbUpIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => onHelpfulClick('down', faq.id)}
                    sx={{ color: 'error.main' }}
                  >
                    <ThumbDownIcon fontSize="small" />
                  </IconButton>
                  <Typography variant="caption" color="text.secondary">
                    {faq.helpful} found this helpful
                  </Typography>
                </Box>
                <IconButton size="small">
                  <ShareIcon fontSize="small" />
                </IconButton>
              </Box>
            </AccordionDetails>
          </Accordion>
        </AnimatedElement>
      ))}
    </Stack>
  );
};
