"use client";
import { useRef, useState, useCallback, useEffect } from "react";

export type DetectionStatus = "idle" | "loading" | "running" | "error";

export interface FaceInfo {
  id: number;
  box: { x: number; y: number; width: number; height: number };
  keypoints: { x: number; y: number; name?: string; score?: number }[];
  score: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Detector = { estimateFaces: (input: HTMLVideoElement, cfg?: any) => Promise<any[]>; dispose?: () => void };

export function useFaceDetection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const detectorRef = useRef<Detector | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState<DetectionStatus>("idle");
  const [faces, setFaces] = useState<FaceInfo[]>([]);
  const [fps, setFps] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fpsRef = useRef({ frames: 0, last: Date.now() });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const drawFaces = useCallback((rawFaces: any[], ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    const mapped: FaceInfo[] = rawFaces.map((f, i) => {
      const b = f.box;
      const clen = Math.min(b.width, b.height) * 0.22;
      const r = 4;

      ctx.strokeStyle = "#6c63ff";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";

      const corners: [number, number, number, number][] = [
        [b.xMin, b.yMin, 1, 1],
        [b.xMin + b.width, b.yMin, -1, 1],
        [b.xMin, b.yMin + b.height, 1, -1],
        [b.xMin + b.width, b.yMin + b.height, -1, -1],
      ];
      for (const [cx, cy, dx, dy] of corners) {
        ctx.beginPath();
        ctx.moveTo(cx + dx * r, cy);
        ctx.lineTo(cx + dx * clen, cy);
        ctx.moveTo(cx, cy + dy * r);
        ctx.lineTo(cx, cy + dy * clen);
        ctx.stroke();
      }

      ctx.fillStyle = "rgba(108,99,255,0.06)";
      ctx.fillRect(b.xMin, b.yMin, b.width, b.height);

      const kpScore: number | undefined = f.keypoints?.[0]?.score;
      const confidence = kpScore != null ? Math.round(kpScore * 100) : null;
      const label = confidence != null ? `Face ${i + 1}  ${confidence}%` : `Face ${i + 1}`;
      ctx.font = "bold 11px monospace";
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = "#6c63ff";
      ctx.fillRect(b.xMin - 1, b.yMin - 22, tw + 12, 20);
      ctx.fillStyle = "#fff";
      ctx.fillText(label, b.xMin + 5, b.yMin - 7);

      (f.keypoints ?? []).forEach((kp: { x: number; y: number }) => {
        ctx.beginPath();
        ctx.arc(kp.x, kp.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = "#ff6584";
        ctx.fill();
      });

      return {
        id: i,
        box: { x: Math.round(b.xMin), y: Math.round(b.yMin), width: Math.round(b.width), height: Math.round(b.height) },
        keypoints: (f.keypoints ?? []).map((kp: { x: number; y: number; name?: string; score?: number }) => ({
          x: Math.round(kp.x), y: Math.round(kp.y), name: kp.name, score: kp.score,
        })),
        score: kpScore ?? 0.99,
      };
    });
    setFaces(mapped);
  }, []);

  const loop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const detector = detectorRef.current;
    if (!video || !canvas || !detector) return;
    if (video.readyState < 2) { animRef.current = requestAnimationFrame(loop); return; }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    detector
      .estimateFaces(video, { flipHorizontal: true })
      .then((rawFaces) => {
        drawFaces(rawFaces, ctx);
        fpsRef.current.frames++;
        const now = Date.now();
        const delta = now - fpsRef.current.last;
        if (delta >= 1000) {
          setFps(Math.round((fpsRef.current.frames * 1000) / delta));
          fpsRef.current = { frames: 0, last: now };
        }
        animRef.current = requestAnimationFrame(loop);
      })
      .catch(() => { animRef.current = requestAnimationFrame(loop); });
  }, [drawFaces]);

  const start = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      // Dynamic imports — avoids SSR issues and defers heavy bundles
      const tf = await import("@tensorflow/tfjs-core");
      await import("@tensorflow/tfjs-backend-webgl");
      await tf.setBackend("webgl");
      await tf.ready();

      // Use require path explicitly resolved to CJS build via webpack alias in next.config.ts
      const faceDetection = await import("@tensorflow-models/face-detection");
      const detector = await faceDetection.createDetector(
        faceDetection.SupportedModels.MediaPipeFaceDetector,
        // runtime: "tfjs" avoids any mediapipe JS dependency
        { runtime: "tfjs", maxFaces: 5 } as Parameters<typeof faceDetection.createDetector>[1]
      );
      detectorRef.current = detector as Detector;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setStatus("running");
      animRef.current = requestAnimationFrame(loop);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(
        msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("notallowed")
          ? "Camera permission denied."
          : msg
      );
      setStatus("error");
    }
  }, [loop]);

  const stop = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    detectorRef.current?.dispose?.();
    detectorRef.current = null;
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setStatus("idle");
    setFaces([]);
    setFps(0);
  }, []);

  useEffect(() => () => {
    cancelAnimationFrame(animRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  return { videoRef, canvasRef, status, faces, fps, error, start, stop };
}
