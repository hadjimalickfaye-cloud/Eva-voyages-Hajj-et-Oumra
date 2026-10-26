import jsQR from 'jsqr';

/**
 * High-performance QR Code Decoder & Audio/Haptic Feedback Utility
 * Uses native BarcodeDetector API when supported (hardware accelerated),
 * with instant fallback to optimized jsQR.
 */

// Global BarcodeDetector declaration for TypeScript
declare global {
  interface Window {
    BarcodeDetector?: {
      new (options?: { formats: string[] }): {
        detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
      };
      getSupportedFormats?: () => Promise<string[]>;
    };
  }
}

let nativeBarcodeDetector: any = null;
if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
  try {
    nativeBarcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
  } catch (e) {
    nativeBarcodeDetector = null;
  }
}

/**
 * Extracts tracking code from any QR payload:
 * - Direct: "EVA-HJ26-9284"
 * - URL: "https://.../?tracking=EVA-HJ26-9284" or ".../dossier/EVA-OM26-1049"
 * - JSON: '{"trackingCode":"EVA-HJ26-9284"}'
 */
export function extractTrackingCode(rawText: string): string | null {
  if (!rawText) return null;
  const clean = rawText.trim();

  // 1. Direct EVA code regex (EVA-XX##-#### or EVA-[A-Z0-9]+-[A-Z0-9]+)
  const directMatch = clean.match(/EVA-[A-Z0-9]{2,6}-[A-Z0-9]{2,8}/i);
  if (directMatch) {
    return directMatch[0].toUpperCase();
  }

  // 2. JSON payload
  if (clean.startsWith('{') && clean.endsWith('}')) {
    try {
      const parsed = JSON.parse(clean);
      if (parsed.trackingCode) return String(parsed.trackingCode).toUpperCase();
      if (parsed.code) return String(parsed.code).toUpperCase();
      if (parsed.id && String(parsed.id).startsWith('EVA-')) return String(parsed.id).toUpperCase();
    } catch {
      // not JSON
    }
  }

  // 3. URL params or path
  if (clean.includes('tracking=') || clean.includes('code=')) {
    try {
      const url = new URL(clean);
      const code = url.searchParams.get('tracking') || url.searchParams.get('code');
      if (code && code.toUpperCase().startsWith('EVA-')) {
        return code.toUpperCase();
      }
    } catch {
      // not valid URL
    }
  }

  // 4. Return as cleaned uppercase if it has at least some alphanumeric identity
  if (clean.toUpperCase().startsWith('EVA-')) {
    return clean.toUpperCase();
  }

  return clean;
}

/**
 * Scans video element or canvas for QR code in under 15ms.
 */
export async function scanFrameForQr(
  video: HTMLVideoElement,
  scratchCanvas: HTMLCanvasElement
): Promise<string | null> {
  if (!video || video.readyState < 2 || video.videoWidth === 0) {
    return null;
  }

  // 1. Try Native BarcodeDetector (fastest, GPU-accelerated)
  if (nativeBarcodeDetector) {
    try {
      const barcodes = await nativeBarcodeDetector.detect(video);
      if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
        return barcodes[0].rawValue;
      }
    } catch {
      // Fall through to jsQR if detector encounters frame timing issue
    }
  }

  // 2. jsQR Fallback via downsampled high-contrast Canvas
  try {
    const ctx = scratchCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    // Use optimal resolution (max 640px) for speed without losing barcode fidelity
    const srcW = video.videoWidth;
    const srcH = video.videoHeight;
    const scale = Math.min(1, 640 / Math.max(srcW, srcH));
    const targetW = Math.floor(srcW * scale);
    const targetH = Math.floor(srcH * scale);

    if (scratchCanvas.width !== targetW || scratchCanvas.height !== targetH) {
      scratchCanvas.width = targetW;
      scratchCanvas.height = targetH;
    }

    ctx.drawImage(video, 0, 0, targetW, targetH);
    const imageData = ctx.getImageData(0, 0, targetW, targetH);
    const code = jsQR(imageData.data, targetW, targetH, {
      inversionAttempts: 'attemptBoth',
    });

    if (code && code.data) {
      return code.data;
    }
  } catch (err) {
    console.warn('QR scanFrame error:', err);
  }

  return null;
}

/**
 * Decodes QR code from a user-uploaded image file
 */
export async function scanImageFileForQr(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const img = new Image();
      img.onload = async () => {
        // Try native first
        if (nativeBarcodeDetector) {
          try {
            const barcodes = await nativeBarcodeDetector.detect(img);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              resolve(barcodes[0].rawValue);
              return;
            }
          } catch {
            // fallback
          }
        }

        // jsQR
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, canvas.width, canvas.height, {
          inversionAttempts: 'attemptBoth',
        });
        resolve(code ? code.data : null);
      };
      img.onerror = () => resolve(null);
      img.src = reader.result as string;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

/**
 * Emits a crisp, pleasant confirmation beep for instant scanner feedback
 */
export function playScanSuccessBeep(): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Two-tone high chime (880Hz -> 1760Hz)
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(1760, now + 0.08);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.22);

    setTimeout(() => {
      try {
        ctx.close();
      } catch {
        // ignore
      }
    }, 350);
  } catch (e) {
    console.warn('AudioContext beep error', e);
  }

  // Haptic feedback for mobile
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([60, 40, 60]);
    }
  } catch {
    // ignore
  }
}
