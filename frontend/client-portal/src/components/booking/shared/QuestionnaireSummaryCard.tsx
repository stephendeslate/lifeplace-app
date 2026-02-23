// frontend/client-portal/src/components/booking/shared/QuestionnaireSummaryCard.tsx

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { Quiz, ExpandMore, AttachFile } from '@mui/icons-material';
import type { QuestionnaireResponseSummary } from '../../../types/booking';

interface QuestionnaireSummaryCardProps {
  questionnaires: QuestionnaireResponseSummary[];
  defaultExpanded?: boolean;
}

export const QuestionnaireSummaryCard: React.FC<QuestionnaireSummaryCardProps> = ({
  questionnaires,
  defaultExpanded = true,
}) => {
  if (!questionnaires || questionnaires.length === 0) {
    return null;
  }

  const formatAnswer = (answer: string | number | boolean | string[], fieldType: string) => {
    if (Array.isArray(answer)) {
      return answer.join(', ');
    }

    if (typeof answer === 'boolean') {
      return answer ? 'Yes' : 'No';
    }

    if (fieldType === 'file') {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <AttachFile sx={{ fontSize: 16 }} />
          <Typography variant="body2">File uploaded</Typography>
        </Box>
      );
    }

    return String(answer);
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Quiz />
        Questionnaire Responses
      </Typography>
      <Divider sx={{ mb: 2 }} />

      {questionnaires.map((questionnaire, qIndex) => (
        <Accordion
          key={questionnaire.questionnaireId}
          defaultExpanded={defaultExpanded}
          sx={{ mb: 1, '&:before': { display: 'none' } }}
          elevation={0}
        >
          <AccordionSummary
            expandIcon={<ExpandMore />}
            sx={{
              backgroundColor: 'grey.50',
              borderRadius: 1,
              '&:hover': { backgroundColor: 'grey.100' },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle2">
                {questionnaire.questionnaireName || `Questionnaire ${qIndex + 1}`}
              </Typography>
              <Chip
                label={`${questionnaire.responses.length} responses`}
                size="small"
                color="primary"
                variant="outlined"
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {questionnaire.responses.map((response, rIndex) => (
                <Box key={response.fieldId || rIndex}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {response.question}
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {formatAnswer(response.answer, response.fieldType)}
                  </Typography>
                  {rIndex < questionnaire.responses.length - 1 && <Divider sx={{ mt: 2 }} />}
                </Box>
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}
    </Paper>
  );
};
