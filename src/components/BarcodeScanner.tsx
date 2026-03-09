import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, CameraOff, AlertTriangle, RotateCcw, Keyboard, Flashlight, FlashlightOff, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ManualBarcodeEntry from '@/components/scanner/ManualBarcodeEntry';

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (code: string) => void;
}

type ScannerState = 'prompt' | 'initializing' | 'scanning' | 'denied' | 'error';

// Detect low-end device
const isLowEndDevice = (): boolean => {
  const memory = (navigator as any).deviceMemory;
  const cores = navigator.hardwareConcurrency;
  return (memory && memory <= 4) || (cores && cores <= 4);
};

const BarcodeScanner = ({ isOpen, onClose, onScanSuccess }: BarcodeScannerProps) => {
  const [state, setState] = useState<ScannerState>('prompt');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastScanRef = useRef<string | null>(null);
  const isLowEnd = useRef(isLowEndDevice()).current;

  const addLog = useCallback((msg: string) => {
    setDebugLog(prev => [...prev.slice(-19), `${new Date().toLocaleTimeString()}: ${msg}`]);
  }, []);

  // Stop everything
  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setTorchEnabled(false);
    setTorchSupported(false);
  }, []);

  // Start camera + scanning loop
  const startCamera = useCallback(async () => {
    setState('initializing');
    setErrorMessage(null);
    addLog('Starting camera...');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: isLowEnd ? 640 : 1280 },
          height: { ideal: isLowEnd ? 480 : 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) {
        addLog('Video element not found');
        stopCamera();
        setState('error');
        setErrorMessage('Internal error: video element missing.');
        return;
      }

      video.srcObject = stream;
      await video.play();

      // Check torch support
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.();
      if (capabilities && 'torch' in capabilities) {
        setTorchSupported(true);
        addLog('Torch supported');
      }

      const settings = track.getSettings();
      addLog(`Camera: ${settings.width}x${settings.height} @ ${settings.frameRate?.toFixed(0)}fps`);

      // Monitor track
      track.onended = () => {
        addLog('Track ended unexpectedly');
        stopCamera();
        setState('error');
        setErrorMessage('Camera disconnected.');
      };

      setState('scanning');
      addLog('Scanning started');

      // Check for BarcodeDetector API
      if ('BarcodeDetector' in window) {
        addLog('Using BarcodeDetector API');
        startBarcodeDetectorLoop(video);
      } else {
        addLog('BarcodeDetector not available — use manual entry');
        // Still show camera but rely on manual entry
      }
    } catch (err: any) {
      addLog(`Error: ${err.name} - ${err.message}`);
      stopCamera();

      if (err.name === 'NotAllowedError') {
        setState('denied');
        setErrorMessage('Camera access was denied. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotReadableError') {
        setState('error');
        setErrorMessage('Camera is busy or unavailable. Close other camera apps and try again.');
      } else if (err.name === 'NotFoundError') {
        setState('error');
        setErrorMessage('No camera found on this device.');
      } else {
        setState('error');
        setErrorMessage(err.message || 'Failed to start camera.');
      }
    }
  }, [addLog, stopCamera, isLowEnd]);

  // BarcodeDetector scanning loop
  const startBarcodeDetectorLoop = useCallback((video: HTMLVideoElement) => {
    const detector = new (window as any).BarcodeDetector({
      formats: ['upc_a', 'upc_e', 'ean_8', 'ean_13', 'code_128', 'code_39', 'qr_code'],
    });

    const fps = isLowEnd ? 5 : 10;
    let lastTime = 0;

    const scan = async (timestamp: number) => {
      if (!streamRef.current) return;

      if (timestamp - lastTime > 1000 / fps) {
        lastTime = timestamp;
        try {
          const barcodes = await detector.detect(video);
          if (barcodes.length > 0) {
            const code = barcodes[0].rawValue;
            if (code && code !== lastScanRef.current) {
              lastScanRef.current = code;
              addLog(`Detected: ${code}`);

              if ('vibrate' in navigator) {
                navigator.vibrate(100);
              }

              stopCamera();
              onScanSuccess(code);

              setTimeout(() => { lastScanRef.current = null; }, 3000);
              return;
            }
          }
        } catch (e) {
          // Detection error, continue
        }
      }

      animFrameRef.current = requestAnimationFrame(scan);
    };

    animFrameRef.current = requestAnimationFrame(scan);
  }, [addLog, stopCamera, onScanSuccess, isLowEnd]);

  // Toggle torch
  const toggleTorch = useCallback(async () => {
    if (!streamRef.current || !torchSupported) return;
    const track = streamRef.current.getVideoTracks()[0];
    const newState = !torchEnabled;
    try {
      await track.applyConstraints({ advanced: [{ torch: newState } as any] });
      setTorchEnabled(newState);
      addLog(`Torch ${newState ? 'on' : 'off'}`);
    } catch (err) {
      addLog(`Torch failed: ${err}`);
    }
  }, [torchEnabled, torchSupported, addLog]);

  // Open/close lifecycle
  useEffect(() => {
    if (isOpen) {
      setState('prompt');
      setShowManualEntry(false);
      setDebugLog([]);
      setErrorMessage(null);
      lastScanRef.current = null;

      // Auto-start after mount
      const timer = setTimeout(() => startCamera(), 100);
      return () => clearTimeout(timer);
    } else {
      stopCamera();
    }
  }, [isOpen, startCamera, stopCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const handleManualSubmit = (code: string) => {
    stopCamera();
    onScanSuccess(code);
  };

  const handleRetry = () => {
    stopCamera();
    setShowManualEntry(false);
    setTimeout(() => startCamera(), 200);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-background flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 shrink-0">
          <h2 className="text-lg font-display font-semibold text-foreground">
            {showManualEntry ? 'Enter Barcode' : 'Scan Barcode'}
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setShowDebug(!showDebug)} className="rounded-full opacity-50">
              <Bug className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          {showManualEntry ? (
            <div className="w-full max-w-md">
              <ManualBarcodeEntry
                onSubmit={handleManualSubmit}
                onCancel={() => setShowManualEntry(false)}
              />
            </div>
          ) : (
            <div className="w-full max-w-lg">
              {/* Video element — ALWAYS MOUNTED, never conditionally rendered */}
              <div className="relative w-full aspect-[4/3] bg-muted rounded-xl overflow-hidden">
                <video
                  ref={videoRef}
                  className="absolute inset-0 w-full h-full object-cover"
                  playsInline
                  muted
                  autoPlay
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Initializing overlay */}
                {state === 'initializing' && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
                    <div className="text-center">
                      <motion.div
                        className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      />
                      <p className="text-foreground/80 text-sm">Starting camera...</p>
                    </div>
                  </div>
                )}

                {/* Scanning overlay — guided corners + scan line */}
                {state === 'scanning' && (
                  <>
                    {/* Corner brackets */}
                    <div className="absolute inset-0 z-10 pointer-events-none">
                      <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-primary rounded-tl-lg" />
                      <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-primary rounded-tr-lg" />
                      <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-primary rounded-bl-lg" />
                      <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-primary rounded-br-lg" />
                    </div>

                    {/* Scan line */}
                    <motion.div
                      className="absolute left-4 right-4 h-0.5 bg-primary/80 rounded-full z-10"
                      style={{ boxShadow: '0 0 8px 2px hsl(var(--primary) / 0.5)' }}
                      animate={{ top: ['25%', '75%', '25%'] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    />

                    {/* Torch button */}
                    {torchSupported && (
                      <button
                        onClick={toggleTorch}
                        className="absolute top-4 right-14 z-20 w-10 h-10 bg-background/60 backdrop-blur rounded-full flex items-center justify-center"
                      >
                        {torchEnabled
                          ? <FlashlightOff className="w-5 h-5 text-foreground" />
                          : <Flashlight className="w-5 h-5 text-foreground" />
                        }
                      </button>
                    )}
                  </>
                )}

                {/* Error / Denied overlays */}
                {(state === 'denied' || state === 'error') && (
                  <div className="absolute inset-0 bg-background/90 flex flex-col items-center justify-center z-10 p-6 text-center">
                    <div className="w-16 h-16 mb-4 bg-destructive/10 rounded-full flex items-center justify-center">
                      {state === 'denied'
                        ? <CameraOff className="w-8 h-8 text-destructive" />
                        : <AlertTriangle className="w-8 h-8 text-destructive" />
                      }
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {state === 'denied' ? 'Camera Access Denied' : 'Camera Error'}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6">{errorMessage}</p>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={handleRetry}>
                        <RotateCcw className="w-4 h-4 mr-2" /> Retry
                      </Button>
                      <Button onClick={() => setShowManualEntry(true)}>
                        <Keyboard className="w-4 h-4 mr-2" /> Enter Manually
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Tips under camera */}
              {state === 'scanning' && (
                <div className="mt-4 text-center space-y-2">
                  <p className="text-muted-foreground text-sm font-serif">
                    Position the barcode in the center of the frame
                  </p>
                  {!('BarcodeDetector' in window) && (
                    <p className="text-xs text-destructive/80">
                      Auto-scan unavailable on this browser. Use manual entry below.
                    </p>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowManualEntry(true)}
                    className="text-muted-foreground"
                  >
                    <Keyboard className="w-4 h-4 mr-2" />
                    Enter manually instead
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Debug panel */}
        <AnimatePresence>
          {showDebug && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-card border-t border-border p-3 overflow-hidden"
            >
              <div className="max-h-32 overflow-y-auto">
                <p className="text-xs font-mono text-muted-foreground mb-1">
                  State: {state} | LowEnd: {isLowEnd ? 'Y' : 'N'} | BarcodeDetector: {('BarcodeDetector' in window) ? 'Y' : 'N'}
                </p>
                {debugLog.map((line, i) => (
                  <p key={i} className="text-xs font-mono text-muted-foreground">{line}</p>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};

export default BarcodeScanner;
