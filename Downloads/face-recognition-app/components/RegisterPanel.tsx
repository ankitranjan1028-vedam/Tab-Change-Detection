"use client";
import { useState, useRef, useCallback } from "react";
import { detectAndDescribe, FaceDescriptor, saveRegistered } from "@/lib/faceRecognition";
import { v4 as uuidv4 } from "uuid";

interface Props {
  registered: FaceDescriptor[];
  setRegistered: (faces: FaceDescriptor[]) => void;
  modelsLoaded: boolean;
}

export default function RegisterPanel({ registered, setRegistered, modelsLoaded }: Props) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState<{ type: "idle" | "loading" | "success" | "error"; msg: string }>({ type: "idle", msg: "" });
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      setCapturedImage(null);
      setStatus({ type: "idle", msg: "" });
    } catch {
      setStatus({ type: "error", msg: "Camera access denied" });
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  const captureAndRegister = useCallback(async () => {
    if (!name.trim()) { setStatus({ type: "error", msg: "Enter a name first" }); return; }
    if (!videoRef.current || !modelsLoaded) return;

    setStatus({ type: "loading", msg: "Detecting face..." });
    try {
      const result = await detectAndDescribe(videoRef.current);
      if (!result) { setStatus({ type: "error", msg: "No face detected. Position face clearly." }); return; }

      // Capture snapshot
      const c = document.createElement("canvas");
      c.width = videoRef.current.videoWidth;
      c.height = videoRef.current.videoHeight;
      const ctx = c.getContext("2d")!;
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(videoRef.current, -c.width, 0);
      ctx.restore();

      // Crop face
      const pad = 20;
      const fc = document.createElement("canvas");
      fc.width = Math.min(result.box.width + pad * 2, c.width);
      fc.height = Math.min(result.box.height + pad * 2, c.height);
      fc.getContext("2d")!.drawImage(
        c,
        Math.max(0, c.width - result.box.x - result.box.width - pad),
        Math.max(0, result.box.y - pad),
        fc.width, fc.height, 0, 0, fc.width, fc.height
      );
      const imageData = fc.toDataURL("image/jpeg", 0.85);
      setCapturedImage(imageData);

      const newFace: FaceDescriptor = {
        id: uuidv4(),
        name: name.trim(),
        descriptor: result.descriptor,
        imageData,
        registeredAt: new Date().toISOString(),
      };
      const updated = [...registered, newFace];
      setRegistered(updated);
      saveRegistered(updated);
      setStatus({ type: "success", msg: `"${name.trim()}" registered successfully!` });
      setName("");
      stopCamera();
    } catch (e) {
      setStatus({ type: "error", msg: "Failed: " + (e as Error).message });
    }
  }, [name, modelsLoaded, registered, setRegistered, stopCamera]);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !name.trim()) { setStatus({ type: "error", msg: "Enter a name first" }); return; }
    setStatus({ type: "loading", msg: "Processing image..." });
    const img = new Image();
    img.onload = async () => {
      try {
        const result = await detectAndDescribe(img);
        if (!result) { setStatus({ type: "error", msg: "No face found in image" }); return; }
        const imageData = URL.createObjectURL(file);
        const newFace: FaceDescriptor = {
          id: uuidv4(),
          name: name.trim(),
          descriptor: result.descriptor,
          imageData: await fileToDataUrl(file),
          registeredAt: new Date().toISOString(),
        };
        const updated = [...registered, newFace];
        setRegistered(updated);
        saveRegistered(updated);
        setStatus({ type: "success", msg: `"${name.trim()}" registered from image!` });
        setName("");
        setCapturedImage(newFace.imageData);
        URL.revokeObjectURL(imageData);
      } catch {
        setStatus({ type: "error", msg: "Failed to process image" });
      }
    };
    img.src = URL.createObjectURL(file);
  }, [name, registered, setRegistered]);

  const removeRegistered = (id: string) => {
    const updated = registered.filter((f) => f.id !== id);
    setRegistered(updated);
    saveRegistered(updated);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Name input */}
      <div>
        <label style={{ fontSize: 13, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
          PERSON NAME
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter full name..."
          style={{
            width: "100%", padding: "10px 14px", borderRadius: 8,
            background: "var(--bg-primary)", border: "1px solid var(--border)",
            color: "var(--text-primary)", fontSize: 15, outline: "none",
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--accent-blue)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
        />
      </div>

      {/* Camera area */}
      <div ref={containerRef} style={{ position: "relative", borderRadius: 12, overflow: "hidden", background: "#06060c", aspectRatio: "4/3" }}>
        <video
          ref={videoRef}
          style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)", display: cameraActive ? "block" : "none" }}
          autoPlay playsInline muted
        />
        {capturedImage && !cameraActive && (
          <img src={capturedImage} alt="Captured" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        )}
        {!cameraActive && !capturedImage && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>📷</div>
            <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>Camera preview</span>
          </div>
        )}
        {cameraActive && (
          <div style={{ position: "absolute", inset: 0, border: "2px solid var(--accent-blue)", borderRadius: 12, pointerEvents: "none" }}>
            <div className="scan-active" style={{ position: "absolute", inset: 0 }} />
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 10 }}>
        {!cameraActive ? (
          <button
            onClick={startCamera}
            disabled={!modelsLoaded}
            style={{ flex: 1, padding: "10px 0", borderRadius: 8, background: "var(--accent-blue)", color: "#fff", border: "none", cursor: modelsLoaded ? "pointer" : "not-allowed", fontSize: 14, fontWeight: 600, opacity: modelsLoaded ? 1 : 0.5 }}
          >
            📷 Open Camera
          </button>
        ) : (
          <>
            <button onClick={captureAndRegister} disabled={status.type === "loading"}
              style={{ flex: 2, padding: "10px 0", borderRadius: 8, background: "var(--accent-green)", color: "#fff", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
              {status.type === "loading" ? "⏳ Processing..." : "✓ Capture & Register"}
            </button>
            <button onClick={stopCamera} style={{ flex: 1, padding: "10px 0", borderRadius: 8, background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border)", cursor: "pointer", fontSize: 14 }}>
              Cancel
            </button>
          </>
        )}
      </div>

      {/* Upload option */}
      <div style={{ textAlign: "center" }}>
        <label style={{ color: "var(--accent-violet)", fontSize: 13, cursor: "pointer", textDecoration: "underline" }}>
          Or upload a photo
          <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
        </label>
      </div>

      {/* Status */}
      {status.msg && (
        <div style={{
          padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500,
          background: status.type === "success" ? "rgba(16,185,129,0.15)" : status.type === "error" ? "rgba(239,68,68,0.15)" : "rgba(79,142,247,0.15)",
          color: status.type === "success" ? "var(--accent-green)" : status.type === "error" ? "var(--accent-red)" : "var(--accent-blue)",
          border: `1px solid ${status.type === "success" ? "rgba(16,185,129,0.3)" : status.type === "error" ? "rgba(239,68,68,0.3)" : "rgba(79,142,247,0.3)"}`,
        }}>
          {status.msg}
        </div>
      )}

      {/* Registered faces */}
      {registered.length > 0 && (
        <div>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>
            Registered ({registered.length})
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 220, overflowY: "auto" }}>
            {registered.map((f) => (
              <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
                <img src={f.imageData} alt={f.name} style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</p>
                  <p style={{ fontSize: 11, color: "var(--text-secondary)" }}>{new Date(f.registeredAt).toLocaleDateString()}</p>
                </div>
                <button onClick={() => removeRegistered(f.id)} style={{ background: "none", border: "none", color: "var(--accent-red)", cursor: "pointer", fontSize: 16, padding: 4, opacity: 0.7 }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}
