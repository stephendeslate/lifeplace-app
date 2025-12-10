// frontend/client-portal/src/components/contracts/EnhancedSignaturePad.tsx
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  useTheme,
  Stack,
  Alert,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  Clear as ClearIcon,
  Undo as UndoIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import SignaturePad from 'signature_pad';
import { DEFAULT_SIGNATURE_CONFIG } from '../../types/contracts.types';
import type { SignaturePadConfig } from '../../types/contracts.types';

interface EnhancedSignaturePadProps {
  onSignatureChange: (signatureData: string | null) => void;
  onSignatureComplete?: (signatureData: string) => void;
  width?: number;
  height?: number;
  config?: Partial<SignaturePadConfig>;
  disabled?: boolean;
  required?: boolean;
  label?: string;
  helperText?: string;
  error?: boolean;
  errorText?: string;
  className?: string;
}

export const EnhancedSignaturePad: React.FC<EnhancedSignaturePadProps> = ({
  onSignatureChange,
  onSignatureComplete,
  width = DEFAULT_SIGNATURE_CONFIG.width,
  height = DEFAULT_SIGNATURE_CONFIG.height,
  config = {},
  disabled = false,
  required = false,
  label = 'Your Signature',
  helperText = 'Please sign in the box above using your mouse or touch screen',
  error = false,
  errorText,
  className,
}) => {
  const theme = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [hasBeenTouched, setHasBeenTouched] = useState(false);

  // Use ref to store callback to avoid re-creating event handlers
  const onSignatureChangeRef = useRef(onSignatureChange);

  // Keep ref updated
  useEffect(() => {
    onSignatureChangeRef.current = onSignatureChange;
  }, [onSignatureChange]);

  // Memoize config to prevent useEffect re-runs on every render
  const finalConfig = useMemo(() => ({
    ...DEFAULT_SIGNATURE_CONFIG,
    ...config,
  }), [
    config?.width,
    config?.height,
    config?.backgroundColor,
    config?.penColor,
    config?.minWidth,
    config?.maxWidth,
    config?.throttle,
    config?.minPointDistance,
  ]);

  // Resize canvas to match display size
  const resizeCanvas = useCallback(() => {
    if (!canvasRef.current || !padRef.current) return;

    const canvas = canvasRef.current;
    const pad = padRef.current;
    const data = pad.toData();
    const ratio = Math.max(window.devicePixelRatio || 1, 1);

    // Set canvas internal dimensions
    canvas.width = width * ratio;
    canvas.height = height * ratio;

    // Set canvas display dimensions
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // Scale context for high DPI displays
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(ratio, ratio);
    }

    // Restore signature data if any
    if (data && data.length > 0) {
      pad.fromData(data);
    }
  }, [width, height]);

  // Initialize signature pad with event handlers defined inline to avoid dependency issues
  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;

    const signaturePad = new SignaturePad(canvas, {
      backgroundColor: finalConfig.backgroundColor,
      penColor: finalConfig.penColor,
      minWidth: finalConfig.minWidth,
      maxWidth: finalConfig.maxWidth,
      throttle: finalConfig.throttle,
      minDistance: finalConfig.minPointDistance,
    });

    padRef.current = signaturePad;

    // Define event handlers inline to prevent re-binding during strokes
    const handleBeginStroke = () => {
      setHasBeenTouched(true);
    };

    const handleEndStroke = () => {
      if (!padRef.current) {
        return;
      }

      const currentIsEmpty = signaturePad.isEmpty();
      setIsEmpty(currentIsEmpty);

      if (!currentIsEmpty) {
        const signatureData = signaturePad.toDataURL('image/png');
        onSignatureChangeRef.current(signatureData);
      } else {
        onSignatureChangeRef.current(null);
      }
    };

    // Bind event handlers
    signaturePad.addEventListener('beginStroke', handleBeginStroke);
    signaturePad.addEventListener('endStroke', handleEndStroke);

    // Handle resize
    const handleResize = () => {
      resizeCanvas();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      signaturePad.off();
      window.removeEventListener('resize', handleResize);
    };
  }, [width, height, finalConfig, resizeCanvas]);

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
        data.pop();
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

  // Complete signature
  const handleComplete = useCallback(() => {
    if (padRef.current && !isEmpty && onSignatureComplete) {
      const signatureData = padRef.current.toDataURL('image/png');
      onSignatureComplete(signatureData);
    }
  }, [isEmpty, onSignatureComplete]);

  // Validation
  const showError = error || (required && hasBeenTouched && isEmpty);
  const displayErrorText = errorText || (required && hasBeenTouched && isEmpty ? 'Signature is required' : '');

  return (
    <Box className={className}>
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
          ...(!disabled && {
            '&:hover': {
              borderColor: theme.palette.primary.main,
            },
            '&:focus-within': {
              borderColor: theme.palette.primary.main,
              boxShadow: `0 0 0 2px ${theme.palette.primary.main}20`,
            },
          }),
          transition: 'all 0.3s ease',
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
            width={width}
            height={height}
            style={{
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: theme.spacing(1),
              cursor: disabled ? 'not-allowed' : 'crosshair',
              touchAction: 'none',
              opacity: disabled ? 0.5 : 1,
              width: `${width}px`,
              height: `${height}px`,
            }}
            onContextMenu={(e) => e.preventDefault()}
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
              <Typography variant="body2">
                Sign here
              </Typography>
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

            {onSignatureComplete && (
              <Tooltip title="Complete signature">
                <span>
                  <IconButton
                    onClick={handleComplete}
                    disabled={disabled || isEmpty}
                    size="small"
                    color="success"
                  >
                    <CheckIcon />
                  </IconButton>
                </span>
              </Tooltip>
            )}
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

      {/* Validation feedback */}
      {showError && displayErrorText && (
        <Alert
          severity="error"
          sx={{ mt: 1 }}
          variant="outlined"
        >
          {displayErrorText}
        </Alert>
      )}
    </Box>
  );
};

export default EnhancedSignaturePad;
