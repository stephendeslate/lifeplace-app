// frontend/admin-crm/src/components/contracts/SimpleSignaturePad.tsx
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Box, Typography, Paper, useTheme, Stack, Tooltip, IconButton } from '@mui/material';
import { Clear as ClearIcon, Undo as UndoIcon } from '@mui/icons-material';
import SignaturePad from 'signature_pad';

// Default configuration for signature pad
const DEFAULT_CONFIG = {
  width: 500,
  height: 200,
  backgroundColor: 'rgba(255,255,255,0)',
  penColor: 'rgb(0, 0, 0)',
  minWidth: 1,
  maxWidth: 3,
  throttle: 16,
  minDistance: 5,
};

interface SimpleSignaturePadProps {
  onSignatureChange: (signatureData: string | null) => void;
  width?: number;
  height?: number;
  disabled?: boolean;
  required?: boolean;
  label?: string;
  helperText?: string;
  error?: boolean;
  errorText?: string;
}

export const SimpleSignaturePad: React.FC<SimpleSignaturePadProps> = ({
  onSignatureChange,
  width = DEFAULT_CONFIG.width,
  height = DEFAULT_CONFIG.height,
  disabled = false,
  required = false,
  label = 'Your Signature',
  helperText = 'Please sign in the box above using your mouse or touch screen',
  error = false,
  errorText,
}) => {
  const theme = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const onSignatureChangeRef = useRef(onSignatureChange);
  const [isEmpty, setIsEmpty] = useState(true);
  const [hasBeenTouched, setHasBeenTouched] = useState(false);

  // Keep the ref updated
  useEffect(() => {
    onSignatureChangeRef.current = onSignatureChange;
  }, [onSignatureChange]);

  // Resize canvas to match display size
  const resizeCanvas = useCallback(() => {
    if (!canvasRef.current || !padRef.current) return;

    const canvas = canvasRef.current;
    const pad = padRef.current;

    // Get the current signature data before clearing
    const data = pad.toData();

    // Simple sizing without complex scaling
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // Clear and restore signature data
    pad.clear();
    if (data && data.length > 0) {
      pad.fromData(data);
    }
  }, [width, height]);

  // Initialize signature pad
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const signaturePad = new SignaturePad(canvas, {
      backgroundColor: DEFAULT_CONFIG.backgroundColor,
      penColor: DEFAULT_CONFIG.penColor,
      minWidth: DEFAULT_CONFIG.minWidth,
      maxWidth: DEFAULT_CONFIG.maxWidth,
      throttle: DEFAULT_CONFIG.throttle,
      minDistance: DEFAULT_CONFIG.minDistance,
    });

    padRef.current = signaturePad;

    // Set up event handlers
    const handleBeginStroke = () => {
      setHasBeenTouched(true);
    };

    const handleEndStroke = () => {
      const currentIsEmpty = signaturePad.isEmpty();
      setIsEmpty(currentIsEmpty);

      if (!currentIsEmpty) {
        const signatureData = signaturePad.toDataURL('image/png');
        onSignatureChangeRef.current(signatureData);
      } else {
        onSignatureChangeRef.current(null);
      }
    };

    signaturePad.addEventListener('beginStroke', handleBeginStroke);
    signaturePad.addEventListener('endStroke', handleEndStroke);

    // Handle resize
    const handleResize = () => {
      resizeCanvas();
    };

    window.addEventListener('resize', handleResize);

    // Initial resize
    resizeCanvas();

    return () => {
      signaturePad.off();
      window.removeEventListener('resize', handleResize);
    };
  }, [resizeCanvas]); // Include resizeCanvas dependency

  // Clear signature
  const handleClear = useCallback(() => {
    if (padRef.current) {
      padRef.current.clear();
      setIsEmpty(true);
      setHasBeenTouched(false);
      onSignatureChangeRef.current(null);
    }
  }, []);

  // Undo last stroke
  const handleUndo = useCallback(() => {
    if (padRef.current) {
      const data = padRef.current.toData();
      if (data && data.length > 0) {
        data.pop(); // Remove the last stroke
        padRef.current.fromData(data);

        const currentIsEmpty = padRef.current.isEmpty();
        setIsEmpty(currentIsEmpty);

        if (!currentIsEmpty) {
          const signatureData = padRef.current.toDataURL('image/png');
          onSignatureChangeRef.current(signatureData);
        } else {
          onSignatureChangeRef.current(null);
        }
      }
    }
  }, []);

  // Validation
  const showError = error || (required && hasBeenTouched && isEmpty);
  const displayErrorText =
    errorText || (required && hasBeenTouched && isEmpty ? 'Signature is required' : '');

  return (
    <Box>
      {/* Label */}
      {label && (
        <Typography
          variant="body2"
          color={showError ? 'error' : 'text.secondary'}
          sx={{ mb: 1, fontWeight: 500 }}
        >
          {label}
          {required && ' *'}
        </Typography>
      )}

      {/* Signature Canvas */}
      <Paper
        elevation={1}
        sx={{
          p: 2,
          border: `2px solid ${showError ? theme.palette.error.main : theme.palette.divider}`,
          borderRadius: 2,
          backgroundColor: disabled ? theme.palette.action.disabledBackground : 'white',
        }}
      >
        <Box
          sx={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* Canvas */}
          <canvas
            ref={canvasRef}
            style={{
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: theme.spacing(1),
              cursor: disabled ? 'not-allowed' : 'crosshair',
              touchAction: 'none', // Prevent scrolling on touch devices
              opacity: disabled ? 0.5 : 1,
              display: 'block',
            }}
            onContextMenu={(e) => e.preventDefault()} // Prevent right-click menu
          />

          {/* Empty state overlay */}
          {isEmpty && !disabled && (
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none',
                color: theme.palette.text.disabled,
              }}
            >
              <Typography variant="body2">Sign here</Typography>
            </Box>
          )}

          {/* Action buttons */}
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Tooltip title="Clear signature">
              <span>
                <IconButton
                  onClick={handleClear}
                  disabled={disabled || isEmpty}
                  size="small"
                  color="error"
                >
                  <ClearIcon />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title="Undo last stroke">
              <span>
                <IconButton
                  onClick={handleUndo}
                  disabled={disabled || isEmpty}
                  size="small"
                  color="secondary"
                >
                  <UndoIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Box>
      </Paper>

      {/* Helper text */}
      {(helperText || displayErrorText) && (
        <Typography
          variant="caption"
          color={showError ? 'error' : 'text.secondary'}
          sx={{ mt: 1, display: 'block' }}
        >
          {displayErrorText || helperText}
        </Typography>
      )}
    </Box>
  );
};

export default SimpleSignaturePad;
