/**
 * ClientMessagesPage - Main Messages Page for Client Portal
 *
 * Placeholder implementation - messaging components are under development
 */

import React from 'react';
import {
  Box,
  Typography,
  Alert,
  Card,
  CardContent,
  Container,
} from '@mui/material';
import {
  Construction as ConstructionIcon,
} from '@mui/icons-material';

export interface ClientMessagesPageProps {
  eventId?: string;
  simplified?: boolean;
  showWelcome?: boolean;
}

export const ClientMessagesPage: React.FC<ClientMessagesPageProps> = ({
  eventId,
  showWelcome = true,
}) => {
  // const theme = useTheme();

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box
        sx={{
          height: 'calc(100vh - 140px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Card sx={{ maxWidth: 600, textAlign: 'center' }}>
          <CardContent sx={{ p: 4 }}>
            <ConstructionIcon
              sx={{
                fontSize: 80,
                color: 'primary.main',
                mb: 2
              }}
            />
            <Typography variant="h5" gutterBottom fontWeight={600}>
              Messages Coming Soon
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              We're building a beautiful messaging experience that will let you communicate directly with our team about your events.
            </Typography>
            <Box sx={{ textAlign: 'left', mb: 3 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • Chat with our team in real-time
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • Share photos and documents
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • Get instant updates about your events
              </Typography>
              <Typography variant="body2">
                • View conversation history
              </Typography>
            </Box>
            {showWelcome && (
              <Alert severity="info" sx={{ textAlign: 'left' }}>
                <Typography variant="body2">
                  <strong>Need help now?</strong> Please contact us directly via email or phone.
                  We're here to help with any questions about your events!
                </Typography>
              </Alert>
            )}
            {eventId && (
              <Alert severity="success" sx={{ textAlign: 'left', mt: 2 }}>
                <Typography variant="body2">
                  This messaging feature will be connected to your specific event once available.
                </Typography>
              </Alert>
            )}
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default ClientMessagesPage;