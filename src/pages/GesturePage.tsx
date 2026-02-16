/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
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

function useDrawableCanvas(
  size: number,
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
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
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
  }, []);

  return [canvasRef, { clear, getCanvas: () => canvasRef.current }];
}

async function loadDigitModel(): Promise<tf.LayersModel> {
  try {
    return await tf.loadLayersModel(MNIST_LOCAL_URL);
  } catch {
    return tf.loadLayersModel(MNIST_REMOTE_URL);
  }
}

function predictDigit(model: tf.LayersModel, canvas: HTMLCanvasElement): Prediction[] {
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
    const pairs: Prediction[] = probs.map((confidence, idx) => ({
      label: String(idx),
      confidence,
    }));

    return pairs.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
  });
}

export const GesturePage = () => {
  const [activeTab, setActiveTab] = useState("tulisan");

  const [writeCanvasRef, writeCanvas] = useDrawableCanvas(320);
  const [imageCanvasRef, imageCanvas] = useDrawableCanvas(320);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Prediction[] | null>(null);

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
            setError(e2 instanceof Error ? e2.message : "Failed to load TensorFlow model");
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

  const handleClear = () => {
    setError(null);
    setResult(null);
    if (activeTab === "gambar") imageCanvas.clear();
    else writeCanvas.clear();
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

      const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
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

      const preds = (await mobileNet.classify(canvas, 3)) as MobileNetPrediction[];
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
              <div className="text-sm text-muted-foreground">
                Deteksi tulisan saat ini fokus ke angka 0–4.
              </div>
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <canvas ref={writeCanvasRef} className="border rounded-md bg-white touch-none" />
                <div className="space-y-2 w-full sm:w-64">
                  <Button onClick={handleDetect} disabled={isLoading} className="w-full">
                    {isLoading ? (
                      <span className="inline-flex items-center gap-2">
                        <Loading /> Detect
                      </span>
                    ) : (
                      "Detect"
                    )}
                  </Button>
                  <Button onClick={handleClear} variant="outline" className="w-full">
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
                <canvas ref={imageCanvasRef} className="border rounded-md bg-white touch-none" />
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
                  <Button onClick={handleClear} variant="outline" className="w-full">
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
                  <div key={p.label} className="flex items-center justify-between">
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
