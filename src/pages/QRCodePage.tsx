/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui";

declare class BarcodeDetector {
  constructor(options?: { formats?: string[] });
  static getSupportedFormats(): Promise<string[]>;
  detect(image: ImageBitmapSource): Promise<{ rawValue?: string }[]>;
}

export const QRCodePage = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const barcodeDetectorRef = useRef<BarcodeDetector | null>(null);
  const jsQrLoadedRef = useRef(false);
  const jsQrLoadingRef = useRef<Promise<void> | null>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [scanMode, setScanMode] = useState<"barcodeDetector" | "jsqr" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [scannedText, setScannedText] = useState("");

  const stopStream = () => {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const loadJsQR = async () => {
    if (jsQrLoadedRef.current) return;

    if (!jsQrLoadingRef.current) {
      jsQrLoadingRef.current = new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js";
        script.async = true;
        script.onload = () => {
          jsQrLoadedRef.current = true;
          resolve();
        };
        script.onerror = () => {
          reject(new Error("Failed to load jsQR"));
        };
        document.head.appendChild(script);
      });
    }

    await jsQrLoadingRef.current;
  };

  const handleStartScan = async () => {
    setError(null);
    setScannedText("");

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Browser tidak mendukung akses kamera");
      return;
    }

    if (typeof window === "undefined") {
      setError("Lingkungan tidak mendukung window");
      return;
    }

    let mode: "barcodeDetector" | "jsqr" | null = null;

    if ("BarcodeDetector" in window) {
      if (!barcodeDetectorRef.current) {
        barcodeDetectorRef.current = new BarcodeDetector({
          formats: ["qr_code"],
        });
      }
      mode = "barcodeDetector";
    } else {
      try {
        await loadJsQR();
        if (!(window as any).jsQR) {
          setError(
            "Browser tidak mendukung scan QR code langsung dari kamera. Coba gunakan browser lain.",
          );
          return;
        }
        mode = "jsqr";
      } catch {
        setError(
          "Browser tidak mendukung scan QR code langsung dari kamera. Coba gunakan browser lain.",
        );
        return;
      }
    }

    try {
      stopStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) {
        setError("Video element tidak tersedia");
        return;
      }

      video.srcObject = stream;
      await video.play();
      setScanMode(mode);
      setIsScanning(true);
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : "Gagal mengakses kamera. Pastikan izin sudah diberikan.";
      setError(message);
      stopStream();
    }
  };

  const handleStopScan = () => {
    setIsScanning(false);
    stopStream();
  };

  useEffect(() => {
    if (!isScanning) return;

    let cancelled = false;
    const video = videoRef.current;
    const detector = barcodeDetectorRef.current;
    const captureCanvas = captureCanvasRef.current;

    if (!video) return;

    const scan = async () => {
      if (cancelled) return;

      if (video.readyState !== HTMLMediaElement.HAVE_ENOUGH_DATA) {
        requestAnimationFrame(scan);
        return;
      }

      try {
        if (scanMode === "barcodeDetector") {
          if (!detector) return;
          const barcodes = await detector.detect(video);
          if (barcodes && barcodes.length > 0) {
            const value = barcodes[0].rawValue ?? "";
            if (value) {
              setScannedText(value);
            } else {
              setScannedText("");
            }
            setIsScanning(false);
            stopStream();
            return;
          }
        } else if (scanMode === "jsqr") {
          if (!captureCanvas) return;
          const jsQR = (window as any).jsQR;
          if (!jsQR) return;

          const width = video.videoWidth || 0;
          const height = video.videoHeight || 0;
          if (!width || !height) {
            requestAnimationFrame(scan);
            return;
          }

          if (
            captureCanvas.width !== width ||
            captureCanvas.height !== height
          ) {
            captureCanvas.width = width;
            captureCanvas.height = height;
          }

          const ctx = captureCanvas.getContext("2d");
          if (!ctx) return;

          ctx.drawImage(video, 0, 0, width, height);
          const imageData = ctx.getImageData(0, 0, width, height);
          const result = jsQR(
            imageData.data,
            imageData.width,
            imageData.height,
          );

          if (result && result.data) {
            setScannedText(result.data as string);
            setIsScanning(false);
            stopStream();
            return;
          }
        }
      } catch (e) {
        if (!cancelled) {
          const message =
            e instanceof Error
              ? e.message
              : "Gagal memproses gambar dari kamera";
          setError(message);
        }
      }

      if (!cancelled) {
        requestAnimationFrame(scan);
      }
    };

    requestAnimationFrame(scan);

    return () => {
      cancelled = true;
    };
  }, [isScanning, scanMode]);

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, []);

  return (
    <div className="container mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>QR Code Scanner</CardTitle>
          <CardDescription>
            Buka kamera lalu arahkan ke QR code untuk membaca isinya.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <div className="aspect-video w-full max-w-md mx-auto bg-black rounded-md overflow-hidden flex items-center justify-center">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />
              <canvas ref={captureCanvasRef} className="hidden" />
            </div>

            <div className="flex justify-center gap-2">
              {!isScanning ? (
                <Button onClick={handleStartScan} className="min-w-[160px]">
                  Buka Kamera & Scan
                </Button>
              ) : (
                <Button
                  onClick={handleStopScan}
                  variant="destructive"
                  className="min-w-[160px]"
                >
                  Hentikan Scan
                </Button>
              )}
            </div>
          </div>

          {isScanning && (
            <p className="text-sm text-muted-foreground text-center">
              Sedang mencari QR code...
            </p>
          )}

          {scannedText && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Hasil scan:</p>
              <div className="w-full max-w-md mx-auto rounded-md border bg-muted/40 p-3 text-sm break-all">
                {scannedText}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
