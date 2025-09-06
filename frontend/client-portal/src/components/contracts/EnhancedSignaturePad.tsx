// frontend/client-portal/src/components/contracts/EnhancedSignaturePad.tsx
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
import { DEFAULT_SIGNATURE_CONFIG } from '../../types/contracts.types';
import type { SignaturePadConfig } from '../../types/contracts.types';

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
  config?: Partial<SignaturePadConfig>;
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
    velocities: number[];
    pressures: number[];
    strokes: number;
  }>({
    startTime: 0,
    velocities: [],
    pressures: [],
    strokes: 0,
  });

  // Merge default config with provided config
  const finalConfig = { ...DEFAULT_SIGNATURE_CONFIG, ...config };

  // Analyze signature for authenticity and quality
  const analyzeSignature = useCallback(async (
    signatureData: string, 
    strokeInfo: typeof strokeData
  ): Promise<SignatureAnalysis> => {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const base64Data = signatureData.split(',')[1] || '';
    const dataSize = base64Data.length;
    
    // Calculate metrics
    const complexity = Math.min(dataSize / 10000, 1.0);
    const avgVelocity = strokeInfo.velocities.length > 0 
      ? strokeInfo.velocities.reduce((a, b) => a + b, 0) / strokeInfo.velocities.length 
      : 0;
    const duration = strokeInfo.startTime > 0 ? Date.now() - strokeInfo.startTime : 0;
    
    // Calculate confidence score
    let confidence = 0.5;
    confidence += Math.min(complexity, 0.3);
    confidence += Math.min(strokeInfo.strokes / 10, 0.2);
    confidence = Math.min(confidence, 1.0);
    
    // Determine authenticity
    const isAuthentic = confidence > 0.4 && strokeInfo.strokes >= 2 && duration > 1000;
    
    // Generate warnings
    const warnings: string[] = [];
    if (complexity < 0.2) warnings.push('Signature appears too simple');
    if (strokeInfo.strokes < 2) warnings.push('Too few strokes detected');
    if (duration < 1000) warnings.push('Signature completed too quickly');
    if (avgVelocity > 10) warnings.push('Signature drawn too fast');
    
    return {
      confidence: Math.round(confidence * 10000) / 10000,
      complexity: Math.round(complexity * 100) / 100,
      strokeCount: strokeInfo.strokes,
      duration: Math.round(duration / 1000 * 10) / 10, // Convert to seconds
      velocity: strokeInfo.velocities,
      pressure: strokeInfo.pressures,
      isAuthentic,
      warnings,
    };
  }, []);

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

  // Event handlers
  const handleBeginStroke = useCallback((_event: any) => {
    console.log('✏️ BEGIN STROKE triggered', { 
      timestamp: Date.now(), 
      isEmpty: padRef.current?.isEmpty(),
      canvasReady: !!canvasRef.current,
      hasBeenTouched: hasBeenTouched
    });
    
    setHasBeenTouched(true);
    const strokeStartTime = Date.now();
    
    setStrokeData(prev => ({
      ...prev,
      startTime: prev.startTime === 0 ? strokeStartTime : prev.startTime,
      strokes: prev.strokes + 1
    }));
  }, [hasBeenTouched]);

  const handleEndStroke = useCallback(async () => {
    console.log('🏁 END STROKE triggered', {
      timestamp: Date.now(),
      padExists: !!padRef.current,
      canvasExists: !!canvasRef.current
    });

    if (!padRef.current) {
      console.error('❌ SignaturePad instance not found in handleEndStroke');
      return;
    }
    
    try {
      const signaturePad = padRef.current;
      const currentIsEmpty = signaturePad.isEmpty();
      
      console.log('📊 Stroke processing:', { 
        isEmpty: currentIsEmpty,
        canConvertToDataURL: typeof signaturePad.toDataURL === 'function',
        strokeData: strokeData
      });
      
      setIsEmpty(currentIsEmpty);
      
      if (!currentIsEmpty) {
        const signatureData = signaturePad.toDataURL('image/png');
        
        console.log('🎨 Signature captured:', {
          dataLength: signatureData.length,
          isValidDataURL: signatureData.startsWith('data:image/'),
          preview: signatureData.substring(0, 50) + '...'
        });
        
        if (enableBiometricAnalysis) {
          setIsAnalyzing(true);
          // Use current strokeData directly
          setStrokeData(currentStrokeData => {
            analyzeSignature(signatureData, currentStrokeData).then(analysis => {
              console.log('🔬 Signature analysis complete:', analysis);
              setSignatureAnalysis(analysis);
              onSignatureChange(signatureData, analysis);
              setIsAnalyzing(false);
            }).catch(error => {
              console.error('💥 Analysis error:', error);
              setIsAnalyzing(false);
            });
            return currentStrokeData;
          });
        } else {
          onSignatureChange(signatureData);
        }
      } else {
        console.log('⭕ Signature pad is empty, calling onSignatureChange(null)');
        onSignatureChange(null);
        setSignatureAnalysis(null);
      }
    } catch (error) {
      console.error('💥 Error in handleEndStroke:', error);
    }
  }, [enableBiometricAnalysis, analyzeSignature, onSignatureChange, strokeData]);

  // Initialize signature pad
  useEffect(() => {
    console.log('🚀 Initializing SignaturePad...');
    
    if (!canvasRef.current) {
      console.error('❌ Canvas ref not found during initialization');
      return;
    }

    const canvas = canvasRef.current;
    
    console.log('🎨 SignaturePad initialization:', {
      canvasExists: !!canvas,
      canvasDimensions: { width: canvas.width, height: canvas.height },
      canvasStyle: { width: canvas.style.width, height: canvas.style.height },
      config: finalConfig
    });

    const signaturePad = new SignaturePad(canvas, {
      backgroundColor: finalConfig.backgroundColor,
      penColor: finalConfig.penColor,
      minWidth: finalConfig.minWidth,
      maxWidth: finalConfig.maxWidth,
      throttle: finalConfig.throttle,
      minDistance: finalConfig.minPointDistance,
    });

    console.log('📝 SignaturePad instance created:', {
      created: !!signaturePad,
      isEmpty: signaturePad.isEmpty(),
      hasCanvas: !!canvas,
      canvasContext: !!canvas.getContext('2d')
    });

    padRef.current = signaturePad;

    // Test if library events are working
    signaturePad.addEventListener('beginStroke', () => {
      console.log('📚 Library beginStroke event fired');
    });
    signaturePad.addEventListener('endStroke', () => {
      console.log('📚 Library endStroke event fired');
    });

    console.log('🎯 SignaturePad created, storing reference for event binding');

    // Handle resize
    const handleResize = () => {
      console.log('📏 Window resize triggered');
      resizeCanvas();
    };

    window.addEventListener('resize', handleResize);
    // Don't call resizeCanvas() immediately as canvas dimensions are already set

    return () => {
      console.log('🧹 Cleaning up SignaturePad');
      signaturePad.off();
      window.removeEventListener('resize', handleResize);
    };
  }, [width, height]); // Only re-initialize when canvas size changes

  // Bind event handlers separately to avoid re-initialization
  React.useEffect(() => {
    if (!padRef.current) {
      console.log('⚠️ No SignaturePad instance available for event binding');
      return;
    }

    console.log('🎯 Binding event handlers to existing SignaturePad instance');
    
    const signaturePad = padRef.current;
    
    // Remove existing handlers first
    signaturePad.removeEventListener('beginStroke', handleBeginStroke);
    signaturePad.removeEventListener('endStroke', handleEndStroke);
    
    // Add new handlers
    signaturePad.addEventListener('beginStroke', handleBeginStroke);
    signaturePad.addEventListener('endStroke', handleEndStroke);

    console.log('✅ Event handlers bound successfully');

    return () => {
      console.log('🧹 Cleaning up event handlers');
      if (padRef.current) {
        padRef.current.removeEventListener('beginStroke', handleBeginStroke);
        padRef.current.removeEventListener('endStroke', handleEndStroke);
      }
    };
  }, [handleBeginStroke, handleEndStroke]);

  // Track critical state changes
  React.useEffect(() => {
    console.log('📊 Signature pad state update:', { 
      isEmpty, 
      hasBeenTouched, 
      signatureAnalysis: !!signatureAnalysis,
      isAnalyzing,
      strokeCount: strokeData.strokes
    });
  }, [isEmpty, hasBeenTouched, signatureAnalysis, isAnalyzing, strokeData.strokes]);

  // Clear signature and reset analysis
  const handleClear = useCallback(() => {
    if (padRef.current) {
      padRef.current.clear();
      setIsEmpty(true);
      setHasBeenTouched(false);
      setSignatureAnalysis(null);
      setStrokeData({
        startTime: 0,
        velocities: [],
        pressures: [],
        strokes: 0,
      });
      onSignatureChange(null);
    }
  }, [onSignatureChange]);

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
          onSignatureChange(signatureData, signatureAnalysis || undefined);
        } else {
          onSignatureChange(null);
          setSignatureAnalysis(null);
        }
      }
    }
  }, [onSignatureChange, signatureAnalysis]);

  // Complete signature
  const handleComplete = useCallback(() => {
    if (padRef.current && !isEmpty && onSignatureComplete && signatureAnalysis) {
      const signatureData = padRef.current.toDataURL('image/png');
      onSignatureComplete(signatureData, signatureAnalysis || undefined);
    }
  }, [isEmpty, onSignatureComplete, signatureAnalysis]);

  // Validation
  const showError = error || (required && hasBeenTouched && isEmpty);
  const displayErrorText = errorText || (required && hasBeenTouched && isEmpty ? 'Signature is required' : '');

  // Log validation state
  React.useEffect(() => {
    if (showError || displayErrorText) {
      console.log('❗ Signature pad validation error:', {
        showError,
        displayErrorText,
        error,
        required,
        hasBeenTouched,
        isEmpty,
        errorSource: error ? 'external' : 'internal'
      });
    }
  }, [showError, displayErrorText, error, required, hasBeenTouched, isEmpty]);

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
            onMouseDown={(e) => {
              console.log('🖱️ Canvas mouse down', {
                button: e.button,
                clientX: e.clientX,
                clientY: e.clientY,
                target: e.target === canvasRef.current
              });
            }}
            onTouchStart={(e) => {
              console.log('👆 Canvas touch start', {
                touches: e.touches.length,
                target: e.target === canvasRef.current
              });
            }}
            onPointerDown={(e) => {
              console.log('👉 Canvas pointer down', {
                pointerType: e.pointerType,
                isPrimary: e.isPrimary,
                target: e.target === canvasRef.current
              });
            }}
            onMouseMove={(e) => {
              // Only log if mouse is down
              if (e.buttons > 0) {
                console.log('🖱️ Canvas mouse move while down');
              }
            }}
            onMouseUp={() => {
              console.log('🖱️ Canvas mouse up');
            }}
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

            {showAnalytics && signatureAnalysis && (
              <Tooltip title="Signature analysis">
                <IconButton size="small" color="info">
                  <AnalyticsIcon />
                </IconButton>
              </Tooltip>
            )}

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

      {/* Analysis Progress */}
      {isAnalyzing && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Analyzing signature...
          </Typography>
          <LinearProgress sx={{ mt: 0.5 }} />
        </Box>
      )}

      {/* Signature Analysis */}
      {showAnalytics && signatureAnalysis && !isAnalyzing && (
        <Box sx={{ mt: 2 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip
              icon={<SecurityIcon />}
              label={`${Math.round(signatureAnalysis.confidence * 100)}% confidence`}
              color={signatureAnalysis.confidence > 0.7 ? 'success' : signatureAnalysis.confidence > 0.4 ? 'warning' : 'error'}
              size="small"
              variant="outlined"
            />
            <Chip
              label={`${signatureAnalysis.strokeCount} strokes`}
              size="small"
              variant="outlined"
            />
            <Chip
              label={`${signatureAnalysis.duration}s duration`}
              size="small"
              variant="outlined"
            />
            {signatureAnalysis.isAuthentic && (
              <Chip
                label="Authentic"
                color="success"
                size="small"
              />
            )}
          </Stack>
          
          {signatureAnalysis.warnings.length > 0 && (
            <Alert severity="warning" sx={{ mt: 1 }} variant="outlined">
              <Typography variant="body2">
                {signatureAnalysis.warnings.join(', ')}
              </Typography>
            </Alert>
          )}
        </Box>
      )}

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