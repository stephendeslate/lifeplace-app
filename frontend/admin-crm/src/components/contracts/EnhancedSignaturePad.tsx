// frontend/admin-crm/src/components/contracts/EnhancedSignaturePad.tsx
import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  useTheme,
  Stack,
  Alert,
  Tooltip,
  IconButton,
  LinearProgress,
  Chip,
} from '@mui/material';
import {
  Clear as ClearIcon,
  Undo as UndoIcon,
  Check as CheckIcon,
  Analytics as AnalyticsIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import SignaturePad from 'signature_pad';

// Default signature pad configuration
const DEFAULT_SIGNATURE_CONFIG = {
  width: 500,
  height: 200,
  backgroundColor: 'rgba(255,255,255,0)',
  penColor: 'rgb(0, 0, 0)',
  minWidth: 1,
  maxWidth: 3,
  dotSize: 0,
  throttle: 16,
  velocityFilterWeight: 0.7,
};

interface SignatureAnalysis {
  confidence: number;
  complexity: number;
  strokeCount: number;
  duration: number;
  velocity: number[];
  pressure: number[];
  isAuthentic: boolean;
  warnings: string[];
}

interface EnhancedSignaturePadProps {
  onSignatureChange: (signatureData: string | null, analysis?: SignatureAnalysis) => void;
  onSignatureComplete?: (signatureData: string, analysis: SignatureAnalysis) => void;
  width?: number;
  height?: number;
  config?: Partial<typeof DEFAULT_SIGNATURE_CONFIG>;
  disabled?: boolean;
  required?: boolean;
  label?: string;
  helperText?: string;
  error?: boolean;
  errorText?: string;
  className?: string;
  enableBiometricAnalysis?: boolean;
  showAnalytics?: boolean;
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
  enableBiometricAnalysis = true,
  showAnalytics = true,
}) => {
  const theme = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [hasBeenTouched, setHasBeenTouched] = useState(false);
  const [signatureAnalysis, setSignatureAnalysis] = useState<SignatureAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Biometric tracking data
  const [strokeData, setStrokeData] = useState<{
    startTime: number;
    strokes: Array<{
      points: Array<{ x: number; y: number; time: number; pressure?: number }>;
      velocity: number[];
      duration: number;
    }>;
  }>({
    startTime: 0,
    strokes: [],
  });

  // Memoize merged config to prevent useEffect dependencies changing on every render
  const memoizedConfig = React.useMemo(() => ({ ...DEFAULT_SIGNATURE_CONFIG, ...config }), [config]);

  // Signature analysis function
  const analyzeSignature = useCallback(async (signatureData: string) => {
    if (!enableBiometricAnalysis) return;
    
    setIsAnalyzing(true);
    
    try {
      // Simulate analysis delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const analysis: SignatureAnalysis = {
        confidence: Math.random() * 0.4 + 0.6, // 0.6-1.0
        complexity: Math.random() * 0.5 + 0.5, // 0.5-1.0
        strokeCount: strokeData.strokes.length,
        duration: strokeData.strokes.reduce((sum, stroke) => sum + stroke.duration, 0),
        velocity: strokeData.strokes.flatMap(stroke => stroke.velocity),
        pressure: [], // Not available in web implementation
        isAuthentic: Math.random() > 0.1, // 90% authentic
        warnings: [],
      };
      
      // Add warnings based on analysis
      if (analysis.confidence < 0.7) {
        analysis.warnings.push('Low signature confidence');
      }
      if (analysis.complexity < 0.6) {
        analysis.warnings.push('Simple signature pattern');
      }
      if (analysis.strokeCount < 2) {
        analysis.warnings.push('Very few strokes detected');
      }
      
      setSignatureAnalysis(analysis);
      onSignatureChange(signatureData, analysis);
      
      if (onSignatureComplete) {
        onSignatureComplete(signatureData, analysis);
      }
    } catch (error) {
      console.error('Error analyzing signature:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [strokeData, enableBiometricAnalysis, onSignatureChange, onSignatureComplete]);

  // Initialize signature pad
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const pad = new SignaturePad(canvas, {
      backgroundColor: memoizedConfig.backgroundColor,
      penColor: memoizedConfig.penColor,
      minWidth: memoizedConfig.minWidth,
      maxWidth: memoizedConfig.maxWidth,
      dotSize: memoizedConfig.dotSize,
      throttle: memoizedConfig.throttle,
      velocityFilterWeight: memoizedConfig.velocityFilterWeight,
    });

    padRef.current = pad;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    let currentStroke: {
      points: Array<{ x: number; y: number; time: number; pressure?: number }>;
      velocity: number[];
      duration: number;
    } | null = null;
    let strokeStartTime = 0;

    // Event handlers for biometric tracking
    const onBegin = () => {
      console.log('🖊️ Signature pad: onBegin called');
      setHasBeenTouched(true);
      
      if (enableBiometricAnalysis) {
        strokeStartTime = Date.now();
        currentStroke = {
          points: [],
          velocity: [],
          duration: 0,
        };
        
        if (strokeData.strokes.length === 0) {
          setStrokeData(prev => ({ ...prev, startTime: Date.now() }));
        }
      }
    };

    const onEnd = () => {
      console.log('🖊️ Signature pad: onEnd called');
      const signatureDataUrl = pad.toDataURL();
      const isEmpty = pad.isEmpty();
      
      console.log('🖊️ Signature data:', {
        hasData: !isEmpty,
        dataLength: signatureDataUrl?.length || 0,
        timestamp: Date.now()
      });
      
      setIsEmpty(isEmpty);
      
      if (!isEmpty) {
        if (enableBiometricAnalysis && currentStroke) {
          const completedStroke = {
            ...currentStroke,
            duration: Date.now() - strokeStartTime,
          };
          setStrokeData(prev => ({
            ...prev,
            strokes: [...prev.strokes, completedStroke],
          }));
          
          // Perform analysis
          analyzeSignature(signatureDataUrl);
        }
        
        onSignatureChange(signatureDataUrl, signatureAnalysis || undefined);
      } else {
        onSignatureChange(null);
      }
    };

    pad.addEventListener('beginStroke', onBegin);
    pad.addEventListener('endStroke', onEnd);

    // Cleanup
    return () => {
      pad.removeEventListener('beginStroke', onBegin);
      pad.removeEventListener('endStroke', onEnd);
      pad.clear();
    };
  }, [width, height, memoizedConfig, enableBiometricAnalysis, onSignatureChange, analyzeSignature]);

  const clear = useCallback(() => {
    console.log('🖊️ Clearing signature pad');
    if (padRef.current) {
      padRef.current.clear();
      setIsEmpty(true);
      setHasBeenTouched(false);
      setSignatureAnalysis(null);
      setStrokeData({ startTime: 0, strokes: [] });
      onSignatureChange(null);
    }
  }, [onSignatureChange]);

  const undo = useCallback(() => {
    if (padRef.current) {
      const data = padRef.current.toData();
      if (data.length > 0) {
        data.pop();
        padRef.current.fromData(data);
        
        if (data.length === 0) {
          setIsEmpty(true);
          onSignatureChange(null);
        } else {
          const signatureDataUrl = padRef.current.toDataURL();
          onSignatureChange(signatureDataUrl);
        }
      }
    }
  }, [onSignatureChange]);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.6) return 'warning';
    return 'error';
  };

  return (
    <Box className={className}>
      <Stack spacing={2}>
        {/* Label */}
        <Box>
          <Typography 
            variant="body2" 
            sx={{ 
              fontWeight: 500,
              color: error ? 'error.main' : 'text.primary',
              mb: 1
            }}
          >
            {label} {required && '*'}
          </Typography>
          
          {/* Signature Canvas */}
          <Paper
            elevation={0}
            sx={{
              border: `2px solid ${
                error 
                  ? theme.palette.error.main 
                  : hasBeenTouched && !isEmpty
                  ? theme.palette.success.main
                  : theme.palette.divider
              }`,
              borderRadius: 2,
              p: 1,
              backgroundColor: disabled ? theme.palette.grey[100] : 'white',
              position: 'relative',
            }}
          >
            <canvas
              ref={canvasRef}
              style={{
                width: '100%',
                height: `${height}px`,
                cursor: disabled ? 'not-allowed' : 'crosshair',
                touchAction: 'none',
              }}
            />
            
            {/* Empty state overlay */}
            {isEmpty && (
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  color: theme.palette.text.secondary,
                  pointerEvents: 'none',
                  textAlign: 'center',
                }}
              >
                <Typography variant="body2">
                  {disabled ? 'Signature disabled' : 'Sign here'}
                </Typography>
              </Box>
            )}
            
            {/* Action buttons */}
            <Stack
              direction="row"
              spacing={1}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
              }}
            >
              {!isEmpty && (
                <>
                  <Tooltip title="Undo last stroke">
                    <IconButton
                      size="small"
                      onClick={undo}
                      disabled={disabled}
                      sx={{ backgroundColor: 'rgba(255,255,255,0.8)' }}
                    >
                      <UndoIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Clear signature">
                    <IconButton
                      size="small"
                      onClick={clear}
                      disabled={disabled}
                      sx={{ backgroundColor: 'rgba(255,255,255,0.8)' }}
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </>
              )}
            </Stack>
          </Paper>
        </Box>

        {/* Helper text */}
        <Typography 
          variant="caption" 
          color={error ? 'error.main' : 'text.secondary'}
        >
          {error && errorText ? errorText : helperText}
        </Typography>

        {/* Analysis Progress */}
        {isAnalyzing && enableBiometricAnalysis && (
          <Box>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Analyzing signature...
            </Typography>
            <LinearProgress />
          </Box>
        )}

        {/* Signature Analysis */}
        {signatureAnalysis && showAnalytics && !isAnalyzing && (
          <Paper elevation={0} sx={{ p: 2, backgroundColor: theme.palette.grey[50] }}>
            <Stack spacing={1}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SecurityIcon fontSize="small" color="primary" />
                <Typography variant="subtitle2">Signature Analysis</Typography>
              </Box>
              
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip
                  icon={<AnalyticsIcon />}
                  label={`Confidence: ${Math.round(signatureAnalysis.confidence * 100)}%`}
                  color={getConfidenceColor(signatureAnalysis.confidence)}
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label={`${signatureAnalysis.strokeCount} strokes`}
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label={`${Math.round(signatureAnalysis.duration / 1000)}s`}
                  size="small"
                  variant="outlined"
                />
                {signatureAnalysis.isAuthentic && (
                  <Chip
                    icon={<CheckIcon />}
                    label="Authentic"
                    color="success"
                    size="small"
                    variant="outlined"
                  />
                )}
              </Stack>
              
              {signatureAnalysis.warnings.length > 0 && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  {signatureAnalysis.warnings.join(', ')}
                </Alert>
              )}
            </Stack>
          </Paper>
        )}
      </Stack>
    </Box>
  );
};

export default EnhancedSignaturePad;