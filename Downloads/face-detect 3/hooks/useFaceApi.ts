"use client";
import { useRef, useState, useCallback, useEffect } from "react";

export interface RegisteredFace {
  name: string;
  descriptor: number[]; // Float32Array serialized
  thumbnail: string;    // data URL
}

export interface LiveMatch {
  name: string;
  distance: number;
  box: { x: number; y: number; w: number; h: number };
  known: boolean;
}

type Status = "idle" | "loading" | "ready" | "error";

let modelsLoaded = false; // module-level cache

export function useFaceApi() {
  const [modelStatus, setModelStatus] = useState<Status>("idle");
  const [registered, setRegistered] = useState<RegisteredFace[]>([]);
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([]);
  const [fps, setFps] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const registeredRef = useRef<RegisteredFace[]>([]);
  const fpsRef = useRef({ frames: 0, last: Date.now() });
  const runningRef = useRef(false);

  // keep ref in sync
  useEffect(() => { registeredRef.current = registered; }, [registered]);

  const loadModels = useCallback(async () => {
    if (modelsLoaded) { setModelStatus("ready"); return; }
    setModelStatus("loading");
    try {
      const faceapi = await import("face-api.js");
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
        faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
        faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
      ]);
      modelsLoaded = true;
      setModelStatus("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load models");
      setModelStatus("error");
    }
  }, []);

  useEffect(() => { loadModels(); }, [loadModels]);

  // ── Register a face from an image file ──────────────────────────────
  const registerFromFile = useCallback(async (file: File, name: string): Promise<string | null> => {
    const faceapi = await import("face-api.js");
    const img = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = img.width; canvas.height = img.height;
    canvas.getContext("2d")!.drawImage(img, 0, 0);

    const result = await faceapi
      .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!result) return "No face found in image — try a clearer photo.";

    // Thumbnail: crop face region
    const { x, y, width, height } = result.detection.box;
    const thumb = document.createElement("canvas");
    const pad = 24;
    thumb.width = width + pad * 2; thumb.height = height + pad * 2;
    thumb.getContext("2d")!.drawImage(canvas, x - pad, y - pad, width + pad * 2, height + pad * 2, 0, 0, thumb.width, thumb.height);

    setRegistered(prev => [
      ...prev.filter(r => r.name !== name),
      { name, descriptor: Array.from(result.descriptor), thumbnail: thumb.toDataURL("image/jpeg", 0.85) },
    ]);
    return null;
  }, []);

  const removeRegistered = useCallback((name: string) => {
    setRegistered(prev => prev.filter(r => r.name !== name));
  }, []);

  // ── Live recognition loop ────────────────────────────────────────────
  const drawAndMatch = useCallback(async () => {
    const faceapi = await import("face-api.js");
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptors();

    const reg = registeredRef.current;
    const matcher = reg.length > 0
      ? new faceapi.FaceMatcher(
          reg.map(r => new faceapi.LabeledFaceDescriptors(r.name, [new Float32Array(r.descriptor)])),
          0.55
        )
      : null;

    const matches: LiveMatch[] = detections.map(det => {
      const { x, y, width, height } = det.detection.box;
      const match = matcher ? matcher.findBestMatch(det.descriptor) : null;
      const known = match !== null && match.label !== "unknown";
      const label = match ? (known ? match.label : "Unknown") : "Unregistered";
      const distance = match?.distance ?? 1;

      // Box
      const color = known ? "var(--green)" : "var(--red)";
      const colorHex = known ? "#22d98a" : "#f75c5c";
      ctx.strokeStyle = colorHex;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      const clen = Math.min(width, height) * 0.2;
      const r = 3;
      const corners: [number,number,number,number][] = [
        [x, y, 1, 1], [x+width, y, -1, 1],
        [x, y+height, 1, -1], [x+width, y+height, -1, -1],
      ];
      for (const [cx,cy,dx,dy] of corners) {
        ctx.beginPath();
        ctx.moveTo(cx+dx*r, cy); ctx.lineTo(cx+dx*clen, cy);
        ctx.moveTo(cx, cy+dy*r); ctx.lineTo(cx, cy+dy*clen);
        ctx.stroke();
      }
      ctx.fillStyle = known ? "rgba(34,217,138,0.06)" : "rgba(247,92,92,0.06)";
      ctx.fillRect(x, y, width, height);

      // Label pill
      const conf = known ? `${Math.round((1 - distance) * 100)}%` : "";
      const text = known ? `${label}  ${conf}` : label;
      ctx.font = "bold 12px monospace";
      const tw = ctx.measureText(text).width;
      ctx.fillStyle = colorHex;
      ctx.beginPath();
      ctx.roundRect(x - 1, y - 26, tw + 14, 22, 4);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillText(text, x + 6, y - 9);

      void color;
      return { name: label, distance, box: { x: Math.round(x), y: Math.round(y), w: Math.round(width), h: Math.round(height) }, known };
    });

    setLiveMatches(matches);

    // FPS
    fpsRef.current.frames++;
    const now = Date.now();
    if (now - fpsRef.current.last >= 1000) {
      setFps(Math.round(fpsRef.current.frames * 1000 / (now - fpsRef.current.last)));
      fpsRef.current = { frames: 0, last: now };
    }
  }, []);

  const loop = useCallback(async () => {
    if (!runningRef.current) return;
    await drawAndMatch();
    animRef.current = requestAnimationFrame(loop);
  }, [drawAndMatch]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, facingMode: "user" } });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      runningRef.current = true;
      animRef.current = requestAnimationFrame(loop);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Camera error");
    }
  }, [loop]);

  const stopCamera = useCallback(() => {
    runningRef.current = false;
    cancelAnimationFrame(animRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    canvasRef.current?.getContext("2d")?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setLiveMatches([]);
    setFps(0);
  }, []);

  useEffect(() => () => {
    runningRef.current = false;
    cancelAnimationFrame(animRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  return {
    modelStatus, error,
    registered, registerFromFile, removeRegistered,
    videoRef, canvasRef, startCamera, stopCamera,
    liveMatches, fps,
  };
}
