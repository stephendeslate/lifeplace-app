// frontend/client-portal/src/components/auth/FormError.tsx

import React from 'react';
import { Alert, AlertTitle, Collapse } from '@mui/material';

interface FormErrorProps {
  error?: string;
  title?: string;
  severity?: 'error' | 'warning' | 'info' | 'success';
  show?: boolean;
}

const FormError: React.FC<FormErrorProps> = ({
  error,
  title = 'Error',
  severity = 'error',
  show = true,
}) => {
  if (!error || !show) {
    return null;
  }

  return (
    <Collapse in={!!error}>
      <Alert
        severity={severity}
        sx={{
          borderRadius: 2,
          mb: 2,
        }}
      >
        <AlertTitle sx={{ margin: 0, fontWeight: 600 }}>{title}</AlertTitle>
        {error}
      </Alert>
    </Collapse>
  );
};

export default FormError;
