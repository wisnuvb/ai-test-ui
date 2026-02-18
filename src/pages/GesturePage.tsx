/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui";
import { Loading } from "../components/common/Loading";

import * as tf from "@tensorflow/tfjs";
import * as mobilenet from "@tensorflow-models/mobilenet";

const MNIST_LOCAL_URL = "/tf-models/mnist/model.json";
const MNIST_REMOTE_URL =
  "https://storage.googleapis.com/tfjs-models/tfjs/mnist_transfer_cnn_v1/model.json";

const MOBILENET_LOCAL_URL = "/tf-models/mobilenet_v2/model.json";
const MOBILENET_REMOTE_URL =
  "https://storage.googleapis.com/tfjs-models/savedmodel/mobilenet_v2_1.0_224/model.json";

type Prediction = { label: string; confidence: number };

type MobileNetPrediction = { className: string; probability: number };

type DrawCanvasApi = {
  clear: () => void;
  getCanvas: () => HTMLCanvasElement | null;
};

type DrawCanvasOptions = {
  transformPoint?: (
    point: { x: number; y: number },
    canvas: HTMLCanvasElement,
  ) => { x: number; y: number };
};

const ALPHANUMERIC_LABELS = "01234".split("");

const CHAR_GUIDES: Record<string, { x: number; y: number }[]> = {
  "0": [
    { x: 0.5, y: 0.1 },
    { x: 0.8, y: 0.25 },
    { x: 0.9, y: 0.5 },
    { x: 0.8, y: 0.75 },
    { x: 0.5, y: 0.9 },
    { x: 0.2, y: 0.75 },
    { x: 0.1, y: 0.5 },
    { x: 0.2, y: 0.25 },
    { x: 0.5, y: 0.1 },
  ],
  "1": [
    { x: 0.5, y: 0.15 },
    { x: 0.5, y: 0.9 },
  ],
  "2": [
    { x: 0.2, y: 0.25 },
    { x: 0.8, y: 0.25 },
    { x: 0.8, y: 0.45 },
    { x: 0.2, y: 0.8 },
    { x: 0.8, y: 0.8 },
  ],
  "3": [
    { x: 0.2, y: 0.25 },
    { x: 0.7, y: 0.25 },
    { x: 0.5, y: 0.5 },
    { x: 0.7, y: 0.75 },
    { x: 0.2, y: 0.75 },
  ],
  "4": [
    { x: 0.7, y: 0.15 },
    { x: 0.7, y: 0.9 },
    { x: 0.2, y: 0.6 },
    { x: 0.8, y: 0.6 },
  ],
  "5": [
    { x: 0.8, y: 0.25 },
    { x: 0.3, y: 0.25 },
    { x: 0.3, y: 0.5 },
    { x: 0.7, y: 0.5 },
    { x: 0.7, y: 0.85 },
    { x: 0.3, y: 0.85 },
  ],
  "6": [
    { x: 0.7, y: 0.2 },
    { x: 0.4, y: 0.2 },
    { x: 0.2, y: 0.5 },
    { x: 0.4, y: 0.8 },
    { x: 0.7, y: 0.7 },
    { x: 0.5, y: 0.5 },
    { x: 0.3, y: 0.55 },
  ],
  "7": [
    { x: 0.2, y: 0.25 },
    { x: 0.8, y: 0.25 },
    { x: 0.4, y: 0.9 },
  ],
  "8": [
    { x: 0.5, y: 0.15 },
    { x: 0.75, y: 0.3 },
    { x: 0.5, y: 0.45 },
    { x: 0.25, y: 0.3 },
    { x: 0.5, y: 0.15 },
    { x: 0.5, y: 0.55 },
    { x: 0.8, y: 0.75 },
    { x: 0.5, y: 0.9 },
    { x: 0.2, y: 0.75 },
    { x: 0.5, y: 0.55 },
  ],
  "9": [
    { x: 0.3, y: 0.3 },
    { x: 0.5, y: 0.15 },
    { x: 0.8, y: 0.3 },
    { x: 0.7, y: 0.55 },
    { x: 0.4, y: 0.55 },
    { x: 0.6, y: 0.45 },
    { x: 0.8, y: 0.9 },
  ],
};

function useDrawableCanvas(
  size: number,
  options?: DrawCanvasOptions,
): [RefObject<HTMLCanvasElement | null>, DrawCanvasApi] {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 16;

    clear();
  }, [size]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getPoint = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const base = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      if (options?.transformPoint) {
        return options.transformPoint(base, canvas);
      }
      return base;
    };

    const onPointerDown = (e: PointerEvent) => {
      isDrawingRef.current = true;
      lastPointRef.current = getPoint(e);
      canvas.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDrawingRef.current) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const next = getPoint(e);
      const prev = lastPointRef.current;
      if (!prev) {
        lastPointRef.current = next;
        return;
      }

      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(next.x, next.y);
      ctx.stroke();

      lastPointRef.current = next;
    };

    const onPointerUp = () => {
      isDrawingRef.current = false;
      lastPointRef.current = null;
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("pointerleave", onPointerUp);

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerUp);
    };
  }, [options?.transformPoint]);

  return [canvasRef, { clear, getCanvas: () => canvasRef.current }];
}

async function loadDigitModel(): Promise<tf.LayersModel> {
  try {
    return await tf.loadLayersModel(MNIST_LOCAL_URL);
  } catch {
    return tf.loadLayersModel(MNIST_REMOTE_URL);
  }
}

function predictDigit(
  model: tf.LayersModel,
  canvas: HTMLCanvasElement,
): Prediction[] {
  return tf.tidy(() => {
    const temp = document.createElement("canvas");
    temp.width = 28;
    temp.height = 28;
    const tctx = temp.getContext("2d");
    if (!tctx) throw new Error("Canvas context unavailable");

    tctx.drawImage(canvas, 0, 0, 28, 28);

    const x = tf.browser.fromPixels(temp, 1).toFloat().div(255);
    const inverted = tf.scalar(1).sub(x);

    const batched = inverted.reshape([1, 28, 28, 1]);
    const logits = model.predict(batched) as tf.Tensor;

    const raw = Array.from(logits.dataSync() as Float32Array);
    const sum = raw.reduce((acc, v) => acc + v, 0);
    const shouldSoftmax =
      raw.some((v) => v < 0 || v > 1.0001) ||
      !Number.isFinite(sum) ||
      Math.abs(sum - 1) > 0.01;

    const probs = shouldSoftmax
      ? Array.from(tf.softmax(logits).dataSync() as Float32Array)
      : raw;
    const pairs: Prediction[] = probs.map((confidence, idx) => {
      const label = ALPHANUMERIC_LABELS[idx] ?? String(idx);
      return { label, confidence };
    });

    return pairs.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
  });
}

export const GesturePage = () => {
  const [activeTab, setActiveTab] = useState("tulisan");

  const [targetChar, setTargetChar] = useState("0");
  const [showGuidance, setShowGuidance] = useState(true);
  const [magnetic, setMagnetic] = useState(false);

  const transformWritePoint = useCallback(
    (point: { x: number; y: number }, canvas: HTMLCanvasElement) => {
      if (!magnetic || !showGuidance) return point;
      const guide = CHAR_GUIDES[targetChar];
      if (!guide || guide.length < 2) return point;

      const size = Math.min(canvas.width, canvas.height);
      const margin = size * 0.15;

      let bestX = point.x;
      let bestY = point.y;
      let bestDistSq = Number.POSITIVE_INFINITY;

      for (let i = 0; i < guide.length - 1; i += 1) {
        const p1 = guide[i];
        const p2 = guide[i + 1];

        const x1 = margin + p1.x * (size - margin * 2);
        const y1 = margin + p1.y * (size - margin * 2);
        const x2 = margin + p2.x * (size - margin * 2);
        const y2 = margin + p2.y * (size - margin * 2);

        const vx = x2 - x1;
        const vy = y2 - y1;
        const wx = point.x - x1;
        const wy = point.y - y1;

        const lenSq = vx * vx + vy * vy || 1;
        const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / lenSq));

        const projX = x1 + vx * t;
        const projY = y1 + vy * t;

        const dx = point.x - projX;
        const dy = point.y - projY;
        const distSq = dx * dx + dy * dy;

        if (distSq < bestDistSq) {
          bestDistSq = distSq;
          bestX = projX;
          bestY = projY;
        }
      }

      const threshold = (size * 0.12) ** 2;
      if (bestDistSq > threshold) return point;

      return { x: bestX, y: bestY };
    },
    [magnetic, showGuidance, targetChar],
  );

  const [writeCanvasRef, writeCanvas] = useDrawableCanvas(320, {
    transformPoint: transformWritePoint,
  });
  const [imageCanvasRef, imageCanvas] = useDrawableCanvas(320);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Prediction[] | null>(null);

  const [compatStatus, setCompatStatus] = useState<
    "idle" | "running" | "ok" | "error"
  >("idle");
  const [compatInfo, setCompatInfo] = useState<string | null>(null);

  const [mobileNet, setMobileNet] = useState<mobilenet.MobileNet | null>(null);
  const [isMobileNetLoading, setIsMobileNetLoading] = useState(false);

  const digitModelRef = useRef<tf.LayersModel | null>(null);
  const digitModelLoadingRef = useRef<Promise<tf.LayersModel> | null>(null);

  const canDetect = useMemo(() => {
    if (activeTab === "gambar") return !!mobileNet;
    return true;
  }, [activeTab, mobileNet]);

  useEffect(() => {
    if (activeTab !== "gambar" || mobileNet || isMobileNetLoading) return;

    let cancelled = false;
    setIsMobileNetLoading(true);

    (async () => {
      try {
        const m = await mobilenet.load({
          version: 2,
          alpha: 1.0,
          modelUrl: MOBILENET_LOCAL_URL,
        } as any);
        if (!cancelled) setMobileNet(m);
      } catch {
        try {
          const m = await mobilenet.load({
            version: 2,
            alpha: 1.0,
            modelUrl: MOBILENET_REMOTE_URL,
          } as any);
          if (!cancelled) setMobileNet(m);
        } catch (e2) {
          if (!cancelled) {
            setError(
              e2 instanceof Error
                ? e2.message
                : "Failed to load TensorFlow model",
            );
          }
        }
      } finally {
        if (!cancelled) setIsMobileNetLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeTab, mobileNet, isMobileNetLoading]);

  useEffect(() => {
    return () => {
      digitModelRef.current?.dispose();
      digitModelRef.current = null;
      digitModelLoadingRef.current = null;
    };
  }, []);

  const drawDigitGuide = useCallback(() => {
    if (!showGuidance || activeTab !== "tulisan") return;

    const canvas = writeCanvas.getCanvas();
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const guide = CHAR_GUIDES[targetChar];
    if (!guide || guide.length === 0) return;

    const size = Math.min(canvas.width, canvas.height);
    const margin = size * 0.15;

    ctx.save();
    ctx.strokeStyle = "rgba(148, 163, 184, 0.6)";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    guide.forEach((p, index) => {
      const x = margin + p.x * (size - margin * 2);
      const y = margin + p.y * (size - margin * 2);
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
    ctx.restore();
  }, [activeTab, showGuidance, targetChar, writeCanvas]);

  useEffect(() => {
    drawDigitGuide();
  }, [drawDigitGuide]);

  const handleCompatTest = async () => {
    setCompatStatus("running");
    setCompatInfo(null);

    try {
      const backend = tf.getBackend();
      const version = tf.version.tfjs;

      let values: number[] = [];

      tf.tidy(() => {
        const a = tf.tensor2d(
          [
            [1, 2],
            [3, 4],
          ],
          [2, 2],
        );
        const b = tf.matMul(a, a);
        const data = b.dataSync();
        values = Array.from(data as Float32Array);
      });

      const preview = values.slice(0, 4).join(", ");

      setCompatStatus("ok");
      setCompatInfo(
        `Backend: ${backend} • Versi: ${version} • Contoh output matmul: [${preview}]`,
      );
    } catch (e) {
      setCompatStatus("error");
      setCompatInfo(
        e instanceof Error
          ? e.message
          : "TensorFlow tidak dapat dijalankan di perangkat ini",
      );
    }
  };

  const handleClear = () => {
    setError(null);
    setResult(null);
    if (activeTab === "gambar") {
      imageCanvas.clear();
    } else {
      writeCanvas.clear();
      drawDigitGuide();
    }
  };

  const handleUploadImage = async (file: File) => {
    setError(null);
    setResult(null);

    const canvas = imageCanvas.getCanvas();
    if (!canvas) return;

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      URL.revokeObjectURL(url);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const scale = Math.min(
        canvas.width / img.width,
        canvas.height / img.height,
      );
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (canvas.width - w) / 2;
      const y = (canvas.height - h) / 2;
      ctx.drawImage(img, x, y, w, h);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      setError("Failed to load image");
    };

    img.src = url;
  };

  const handleDetect = async () => {
    setError(null);
    setResult(null);
    setIsLoading(true);

    try {
      if (activeTab === "tulisan") {
        const canvas = writeCanvas.getCanvas();
        if (!canvas) return;

        if (!digitModelRef.current) {
          digitModelLoadingRef.current ??= loadDigitModel();
          digitModelRef.current = await digitModelLoadingRef.current;
        }

        setResult(predictDigit(digitModelRef.current, canvas));
        return;
      }

      const canvas = imageCanvas.getCanvas();
      if (!canvas) return;
      if (!mobileNet) {
        setError("Image model is still loading. Please wait.");
        return;
      }

      const preds = (await mobileNet.classify(
        canvas,
        3,
      )) as MobileNetPrediction[];
      setResult(
        preds.map((p) => ({
          label: p.className,
          confidence: p.probability,
        })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Detection failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Gesture (TensorFlow)</CardTitle>
          <CardDescription>
            Coba menulis atau menggambar di canvas, lalu jalankan deteksi.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <p className="text-sm font-medium">
                Tes kompatibilitas TensorFlow
              </p>
              <Button
                onClick={handleCompatTest}
                size="sm"
                variant="outline"
                disabled={compatStatus === "running"}
              >
                {compatStatus === "running" ? (
                  <span className="inline-flex items-center gap-2">
                    <Loading /> Menguji...
                  </span>
                ) : (
                  "Jalankan Tes"
                )}
              </Button>
            </div>
            {compatStatus === "ok" && compatInfo && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                TensorFlow berhasil dijalankan. {compatInfo}
              </p>
            )}
            {compatStatus === "error" && compatInfo && (
              <p className="text-xs text-red-600 dark:text-red-400">
                Tes TensorFlow gagal: {compatInfo}
              </p>
            )}
            {compatStatus === "idle" && (
              <p className="text-xs text-muted-foreground">
                Klik tombol untuk menguji apakah TensorFlow.js dapat berjalan di
                perangkat dan browser ini.
              </p>
            )}
          </div>

          {(error || isMobileNetLoading) && (
            <Alert variant={error ? "destructive" : "default"}>
              <AlertDescription>
                {error ?? "Loading TensorFlow model for image detection..."}
              </AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="tulisan">Tulisan</TabsTrigger>
              <TabsTrigger value="gambar">Gambar</TabsTrigger>
            </TabsList>

            <TabsContent value="tulisan" className="space-y-3">
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Deteksi tulisan angka 0–4 menggunakan model MNIST.</p>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-1">
                    <span className="font-medium text-foreground">
                      Digit target
                    </span>
                    <select
                      value={targetChar}
                      onChange={(e) => setTargetChar(e.target.value)}
                      className="border rounded-md bg-background px-2 py-1 text-xs"
                    >
                      {ALPHANUMERIC_LABELS.map((label) => (
                        <option key={label} value={label}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="inline-flex items-center gap-1">
                    <input
                      type="checkbox"
                      className="h-3 w-3"
                      checked={showGuidance}
                      onChange={(e) => setShowGuidance(e.target.checked)}
                    />
                    <span>Guidance samar</span>
                  </label>
                  <label className="inline-flex items-center gap-1">
                    <input
                      type="checkbox"
                      className="h-3 w-3"
                      checked={magnetic}
                      onChange={(e) => setMagnetic(e.target.checked)}
                      disabled={!showGuidance}
                    />
                    <span>Mode magnetik</span>
                  </label>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <canvas
                  ref={writeCanvasRef}
                  className="border rounded-md bg-white touch-none"
                />
                <div className="space-y-2 w-full sm:w-64">
                  <Button
                    onClick={handleDetect}
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? (
                      <span className="inline-flex items-center gap-2">
                        <Loading /> Detect
                      </span>
                    ) : (
                      "Detect"
                    )}
                  </Button>
                  <Button
                    onClick={handleClear}
                    variant="outline"
                    className="w-full"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="gambar" className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Upload gambar ke canvas atau gambar bebas, lalu deteksi.
              </div>
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <canvas
                  ref={imageCanvasRef}
                  className="border rounded-md bg-white touch-none"
                />
                <div className="space-y-2 w-full sm:w-64">
                  <input
                    type="file"
                    accept="image/*"
                    className="w-full text-sm"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleUploadImage(file);
                    }}
                  />
                  <Button
                    onClick={handleDetect}
                    disabled={isLoading || !canDetect}
                    className="w-full"
                  >
                    {isLoading ? (
                      <span className="inline-flex items-center gap-2">
                        <Loading /> Detect
                      </span>
                    ) : (
                      "Detect"
                    )}
                  </Button>
                  <Button
                    onClick={handleClear}
                    variant="outline"
                    className="w-full"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {result && (
            <Card className="bg-muted/30">
              <CardHeader>
                <CardTitle className="text-base">Hasil</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                {result.map((p) => (
                  <div
                    key={p.label}
                    className="flex items-center justify-between"
                  >
                    <span className="font-medium">{p.label}</span>
                    <span className="font-mono text-muted-foreground">
                      {(p.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
