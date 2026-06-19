"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { detectAllFaces, recognize, FaceDescriptor, RecognitionResult } from "@/lib/faceRecognition";
import FaceOverlay from "./FaceOverlay";

interface DetectedFace {
  box: { x: number; y: number; width: number; height: number };
  result: RecognitionResult;
}

interface Props {
  registered: FaceDescriptor[];
  modelsLoaded: boolean;
}

export default function RecognizePanel({ registered, modelsLoaded }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [faces, setFaces] = useState<DetectedFace[]>([]);
  const [fps, setFps] = useState(0);
  const [dims, setDims] = useState({ w: 640, h: 480, cw: 640, ch: 480 });
  const lastTimeRef = useRef(Date.now());

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      alert("Camera access denied");
    }
  }, []);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
    setFaces([]);
  }, []);

  useEffect(() => {
    if (!cameraActive || !modelsLoaded) return;
    let running = true;

    const loop = async () => {
      if (!running || !videoRef.current?.videoWidth) {
        if (running) rafRef.current = requestAnimationFrame(loop);
        return;
      }
      try {
        const detections = await detectAllFaces(videoRef.current);
        const results: DetectedFace[] = detections.map((d) => ({
          box: { x: d.box.x, y: d.box.y, width: d.box.width, height: d.box.height },
          result: recognize(d.descriptor, registered),
        }));
        setFaces(results);

        // Update dims
        if (containerRef.current && videoRef.current) {
          setDims({
            w: videoRef.current.videoWidth,
            h: videoRef.current.videoHeight,
            cw: containerRef.current.clientWidth,
            ch: containerRef.current.clientHeight,
          });
        }

        const now = Date.now();
        setFps(Math.round(1000 / (now - lastTimeRef.current)));
        lastTimeRef.current = now;
      } catch { /* skip frame */ }
      if (running) rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => { running = false; cancelAnimationFrame(rafRef.current); };
  }, [cameraActive, modelsLoaded, registered]);

  const matchedFaces = faces.filter((f) => f.result.matched);
  const unknownFaces = faces.filter((f) => !f.result.matched);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Camera feed */}
      <div ref={containerRef} style={{ position: "relative", borderRadius: 12, overflow: "hidden", background: "#06060c", aspectRatio: "4/3" }}>
        <video ref={videoRef} autoPlay playsInline muted
          style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)", display: cameraActive ? "block" : "none" }}
        />
        {!cameraActive && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(79,142,247,0.1)", border: "2px solid rgba(79,142,247,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🔍</div>
            <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Start camera to begin recognition</p>
          </div>
        )}
        {cameraActive && (
          <FaceOverlay
            boxes={faces.map((f) => ({
              ...f.box,
              label: f.result.matched ? f.result.name : "Unknown",
              matched: f.result.matched,
              confidence: f.result.confidence,
            }))}
            videoWidth={dims.w}
            videoHeight={dims.h}
            containerWidth={dims.cw}
            containerHeight={dims.ch}
            mirrored={true}
          />
        )}
        {/* HUD */}
        {cameraActive && (
          <div style={{ position: "absolute", top: 10, right: 10, display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
            <div style={{ background: "rgba(0,0,0,0.7)", borderRadius: 6, padding: "3px 8px", fontSize: 11, color: "var(--accent-cyan)" }}>
              {fps} FPS
            </div>
            <div style={{ background: "rgba(0,0,0,0.7)", borderRadius: 6, padding: "3px 8px", fontSize: 11, color: faces.length > 0 ? "var(--accent-green)" : "var(--text-secondary)" }}>
              {faces.length} face{faces.length !== 1 ? "s" : ""}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 10 }}>
        {!cameraActive ? (
          <button onClick={startCamera} disabled={!modelsLoaded}
            style={{ flex: 1, padding: "11px 0", borderRadius: 8, background: "var(--accent-blue)", color: "#fff", border: "none", cursor: modelsLoaded ? "pointer" : "not-allowed", fontSize: 14, fontWeight: 600, opacity: modelsLoaded ? 1 : 0.5 }}>
            🔍 Start Recognition
          </button>
        ) : (
          <button onClick={stopCamera}
            style={{ flex: 1, padding: "11px 0", borderRadius: 8, background: "var(--bg-elevated)", color: "var(--text-primary)", border: "1px solid var(--border)", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
            ⏹ Stop
          </button>
        )}
      </div>

      {/* Results */}
      {cameraActive && faces.length > 0 && (
        <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 1 }}>
            Live Results
          </p>
          {matchedFaces.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {matchedFaces.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(16,185,129,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>✓</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: 15, color: "var(--accent-green)" }}>{f.result.name}</p>
                    <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>Confidence: {f.result.confidence}% · dist: {f.result.distance?.toFixed(3)}</p>
                  </div>
                  {registered.find(r => r.id === f.result.id)?.imageData && (
                    <img src={registered.find(r => r.id === f.result.id)!.imageData} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover", border: "2px solid var(--accent-green)" }} />
                  )}
                </div>
              ))}
            </div>
          )}
          {unknownFaces.map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: "rgba(79,142,247,0.08)", border: "1px solid rgba(79,142,247,0.2)" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(79,142,247,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>?</div>
              <div>
                <p style={{ fontWeight: 600, fontSize: 14, color: "var(--accent-blue)" }}>Unknown Person</p>
                <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>Not in database · dist: {f.result.distance?.toFixed(3)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {cameraActive && registered.length === 0 && (
        <div style={{ padding: "12px 16px", borderRadius: 8, background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.3)", fontSize: 13, color: "var(--accent-violet)" }}>
          ⚠ No faces registered yet. Go to Register tab to add faces.
        </div>
      )}
    </div>
  );
}
