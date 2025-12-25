/**
 * SignatureCanvas Component
 *
 * WebView-based signature capture component.
 * Uses HTML5 Canvas for cross-platform signature capture.
 */

import React, { useRef, useCallback, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { Eraser, Check } from 'phosphor-react-native';
import { theme } from '@/theme';

interface SignatureCanvasProps {
  onSignatureCapture: (signatureData: string) => void;
  onClear?: () => void;
  width?: number;
  height?: number;
  penColor?: string;
  backgroundColor?: string;
}

const SIGNATURE_HTML = (penColor: string, backgroundColor: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      touch-action: none;
      background-color: ${backgroundColor};
    }
    canvas {
      width: 100%;
      height: 100%;
      display: block;
    }
  </style>
</head>
<body>
  <canvas id="signature-canvas"></canvas>
  <script>
    const canvas = document.getElementById('signature-canvas');
    const ctx = canvas.getContext('2d');
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let hasSignature = false;

    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      ctx.strokeStyle = '${penColor}';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    function getCoords(e) {
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches ? e.touches[0] : e;
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
    }

    function startDrawing(e) {
      e.preventDefault();
      isDrawing = true;
      const coords = getCoords(e);
      lastX = coords.x;
      lastY = coords.y;
    }

    function draw(e) {
      e.preventDefault();
      if (!isDrawing) return;
      hasSignature = true;
      const coords = getCoords(e);
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
      lastX = coords.x;
      lastY = coords.y;
    }

    function stopDrawing(e) {
      e.preventDefault();
      isDrawing = false;
    }

    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing, { passive: false });
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    window.clearSignature = function() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      hasSignature = false;
    };

    window.getSignature = function() {
      if (!hasSignature) return '';
      return canvas.toDataURL('image/png');
    };

    window.hasSignature = function() {
      return hasSignature;
    };
  </script>
</body>
</html>
`;

export function SignatureCanvas({
  onSignatureCapture,
  onClear,
  width,
  height = 200,
  penColor = '#000000',
  backgroundColor = '#FFFFFF',
}: SignatureCanvasProps) {
  const webViewRef = useRef<WebView>(null);
  const [hasSignature, setHasSignature] = useState(false);

  const handleClear = useCallback(() => {
    webViewRef.current?.injectJavaScript('window.clearSignature(); true;');
    setHasSignature(false);
    onClear?.();
  }, [onClear]);

  const handleConfirm = useCallback(() => {
    webViewRef.current?.injectJavaScript(`
      const sig = window.getSignature();
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'signature', data: sig }));
      true;
    `);
  }, []);

  const handleMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      try {
        const message = JSON.parse(event.nativeEvent.data);
        if (message.type === 'signature' && message.data) {
          onSignatureCapture(message.data);
        }
      } catch (e) {
        // Ignore parsing errors
      }
    },
    [onSignatureCapture]
  );

  const handleTouchEnd = useCallback(() => {
    webViewRef.current?.injectJavaScript(`
      const has = window.hasSignature();
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'hasSignature', data: has }));
      true;
    `);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Draw your signature below</Text>

      <View style={[styles.canvasContainer, { height }]}>
        <WebView
          ref={webViewRef}
          source={{ html: SIGNATURE_HTML(penColor, backgroundColor) }}
          style={styles.webView}
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          onMessage={handleMessage}
          onTouchEnd={handleTouchEnd}
        />

        <View style={styles.signatureLine} />
        <Text style={styles.signatureHint}>Sign here</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
          <Eraser size={20} color={theme.colors.neutral.gray} />
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.confirmButton, !hasSignature && styles.confirmButtonDisabled]}
          onPress={handleConfirm}
        >
          <Check size={20} color={theme.colors.neutral.white} />
          <Text style={styles.confirmButtonText}>Confirm Signature</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    ...theme.typeScale.labelMedium,
    color: theme.colors.neutral.gray,
    marginBottom: theme.spacing.sm,
  },
  canvasContainer: {
    width: '100%',
    backgroundColor: theme.colors.neutral.white,
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: theme.colors.neutral.warmGray,
    borderStyle: 'dashed',
    overflow: 'hidden',
    position: 'relative',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  signatureLine: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: theme.colors.neutral.gray,
  },
  signatureHint: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    ...theme.typeScale.labelSmall,
    color: theme.colors.neutral.gray,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.neutral.warmGray,
  },
  clearButtonText: {
    ...theme.typeScale.labelMedium,
    color: theme.colors.neutral.gray,
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.secondary.forest,
  },
  confirmButtonDisabled: {
    backgroundColor: theme.colors.neutral.gray,
    opacity: 0.5,
  },
  confirmButtonText: {
    ...theme.typeScale.labelMedium,
    color: theme.colors.neutral.white,
    fontWeight: '600',
  },
});

export default SignatureCanvas;
