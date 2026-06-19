"use client";

import { useState, useRef, useCallback } from "react";
import { useFaceApi } from "@/hooks/useFaceApi";

type Tab = "register" | "recognise";

export default function Page() {
  const [tab, setTab] = useState<Tab>("register");
  const [cameraOn, setCameraOn] = useState(false);

  const {
    modelStatus, error,
    registered, registerFromFile, removeRegistered,
    videoRef, canvasRef, startCamera, stopCamera,
    liveMatches, fps,
  } = useFaceApi();

  const handleStartCamera = useCallback(async () => {
    await startCamera();
    setCameraOn(true);
  }, [startCamera]);

  const handleStopCamera = useCallback(() => {
    stopCamera();
    setCameraOn(false);
  }, [stopCamera]);

  const handleTabChange = useCallback((t: Tab) => {
    if (t === "register" && cameraOn) handleStopCamera();
    setTab(t);
  }, [cameraOn, handleStopCamera]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header style={{
        padding: "0 28px",
        height: 56,
        borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(8,9,13,0.9)", backdropFilter: "blur(12px)",
        position: "sticky", top: 0, zIndex: 20,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>◈</span>
          <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.02em" }}>FaceID</span>
          <span style={{
            fontSize: 10, fontFamily: "var(--mono)", color: "var(--accent)",
            background: "var(--accent-dim)", padding: "2px 8px", borderRadius: 4,
            border: "1px solid rgba(79,142,247,0.3)", letterSpacing: "0.08em",
          }}>BETA</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {cameraOn && (
            <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text-2)", display: "flex", gap: 8 }}>
              <span>FPS</span>
              <span style={{ color: fps >= 20 ? "var(--green)" : "var(--yellow)", fontWeight: 700 }}>{fps}</span>
            </div>
          )}
          <ModelBadge status={modelStatus} />
        </div>
      </header>

      {/* Tabs */}
      <div style={{
        display: "flex", borderBottom: "1px solid var(--border)",
        background: "var(--surface)", padding: "0 28px",
      }}>
        {(["register", "recognise"] as Tab[]).map(t => (
          <button key={t} onClick={() => handleTabChange(t)} style={{
            padding: "14px 20px", border: "none", background: "none",
            color: tab === t ? "var(--text)" : "var(--text-3)",
            fontWeight: tab === t ? 600 : 400, fontSize: 14, cursor: "pointer",
            borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
            marginBottom: -1, transition: "color 0.15s",
            textTransform: "capitalize",
          }}>
            {t === "register" ? "① Register Faces" : "② Recognise"}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ margin: "16px 28px 0", padding: "10px 16px", borderRadius: 8, background: "var(--red-dim)", border: "1px solid rgba(247,92,92,0.3)", color: "var(--red)", fontSize: 13, fontFamily: "var(--mono)" }}>
          ⚠ {error}
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, display: "flex" }}>
        {tab === "register"
          ? <RegisterTab registered={registered} registerFromFile={registerFromFile} removeRegistered={removeRegistered} />
          : <RecogniseTab
              videoRef={videoRef} canvasRef={canvasRef}
              cameraOn={cameraOn} onStart={handleStartCamera} onStop={handleStopCamera}
              liveMatches={liveMatches} registered={registered}
            />
        }
      </div>
    </div>
  );
}

// ── Register Tab ─────────────────────────────────────────────────────────────

function RegisterTab({ registered, registerFromFile, removeRegistered }: {
  registered: { name: string; thumbnail: string }[];
  registerFromFile: (file: File, name: string) => Promise<string | null>;
  removeRegistered: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setFile(f);
    setMsg(null);
    const url = URL.createObjectURL(f);
    setPreview(url);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith("image/")) handleFile(f);
  };

  const handleRegister = async () => {
    if (!file || !name.trim()) return;
    setLoading(true);
    setMsg(null);
    const err = await registerFromFile(file, name.trim());
    setLoading(false);
    if (err) {
      setMsg({ text: err, ok: false });
    } else {
      setMsg({ text: `"${name.trim()}" registered successfully!`, ok: true });
      setName(""); setFile(null); setPreview(null);
    }
  };

  return (
    <div style={{ flex: 1, display: "flex", gap: 0, overflow: "hidden" }}>
      {/* Left: form */}
      <div style={{ flex: 1, padding: 32, display: "flex", flexDirection: "column", gap: 24, maxWidth: 520 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Register a face</h2>
          <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6 }}>
            Upload a clear photo and give it a name. The system extracts a 128-point face embedding and stores it locally for matching.
          </p>
        </div>

        {/* Name input */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Alice"
            style={{
              background: "var(--surface-2)", border: "1px solid var(--border)",
              borderRadius: 8, padding: "10px 14px", color: "var(--text)", fontSize: 14,
              outline: "none", fontFamily: "inherit",
            }}
            onKeyDown={e => e.key === "Enter" && handleRegister()}
          />
        </div>

        {/* Drop zone */}
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          style={{
            border: `2px dashed ${preview ? "var(--accent)" : "var(--border-bright)"}`,
            borderRadius: 12, cursor: "pointer",
            background: preview ? "var(--accent-dim)" : "var(--surface-2)",
            overflow: "hidden", transition: "all 0.2s",
            minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative",
          }}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover", maxHeight: 260 }} />
          ) : (
            <div style={{ textAlign: "center", padding: 32 }}>
              <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.4 }}>↑</div>
              <div style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 4 }}>Drop photo here or click to browse</div>
              <div style={{ fontSize: 12, color: "var(--text-3)" }}>JPG, PNG, WEBP</div>
            </div>
          )}
          <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>

        {msg && (
          <div style={{
            padding: "10px 14px", borderRadius: 8, fontSize: 13, fontFamily: "var(--mono)",
            background: msg.ok ? "var(--green-dim)" : "var(--red-dim)",
            border: `1px solid ${msg.ok ? "rgba(34,217,138,0.3)" : "rgba(247,92,92,0.3)"}`,
            color: msg.ok ? "var(--green)" : "var(--red)",
          }} className="fade-in">
            {msg.ok ? "✓" : "⚠"} {msg.text}
          </div>
        )}

        <button
          onClick={handleRegister}
          disabled={!file || !name.trim() || loading}
          style={{
            padding: "12px 24px", borderRadius: 10, border: "none",
            background: !file || !name.trim() ? "var(--surface-3)" : "var(--accent)",
            color: !file || !name.trim() ? "var(--text-3)" : "#fff",
            fontWeight: 600, fontSize: 14, cursor: !file || !name.trim() ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            boxShadow: file && name.trim() ? "0 4px 20px rgba(79,142,247,0.3)" : "none",
            transition: "all 0.2s",
          }}
        >
          {loading ? <Spinner /> : "Register face"}
        </button>
      </div>

      {/* Right: registered list */}
      <div style={{ width: 300, borderLeft: "1px solid var(--border)", background: "var(--surface)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Registered</span>
          <span style={{
            fontSize: 11, fontFamily: "var(--mono)", color: "var(--accent)",
            background: "var(--accent-dim)", padding: "2px 8px", borderRadius: 10,
          }}>{registered.length}</span>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {registered.length === 0 && (
            <p style={{ color: "var(--text-3)", fontSize: 13, textAlign: "center", marginTop: 40 }}>No faces registered yet</p>
          )}
          {registered.map(r => (
            <div key={r.name} className="fade-in" style={{
              background: "var(--surface-2)", borderRadius: 10, border: "1px solid var(--border)",
              display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.thumbnail} alt={r.name} style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
              <span style={{ flex: 1, fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
              <button onClick={() => removeRegistered(r.name)} style={{
                background: "none", border: "none", color: "var(--text-3)", cursor: "pointer",
                fontSize: 16, padding: 4, borderRadius: 4,
                transition: "color 0.15s",
              }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--red)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}
              >✕</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Recognise Tab ─────────────────────────────────────────────────────────────

function RecogniseTab({ videoRef, canvasRef, cameraOn, onStart, onStop, liveMatches, registered }: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  cameraOn: boolean;
  onStart: () => void;
  onStop: () => void;
  liveMatches: { name: string; distance: number; box: { x: number; y: number; w: number; h: number }; known: boolean }[];
  registered: { name: string }[];
}) {
  return (
    <div style={{ flex: 1, display: "flex", gap: 0 }}>
      {/* Camera */}
      <div style={{ flex: 1, padding: 32, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 }}>
        {registered.length === 0 && (
          <div style={{
            padding: "10px 18px", borderRadius: 8,
            background: "rgba(247,193,79,0.1)", border: "1px solid rgba(247,193,79,0.3)",
            color: "var(--yellow)", fontSize: 13,
          }}>
            ⚠ No faces registered — go to Register tab first
          </div>
        )}

        <div style={{
          position: "relative", width: "100%", maxWidth: 680,
          aspectRatio: "16/9", borderRadius: 16, overflow: "hidden",
          background: "var(--surface)",
          border: `1px solid ${cameraOn ? "rgba(79,142,247,0.4)" : "var(--border)"}`,
          boxShadow: cameraOn ? "0 0 40px rgba(79,142,247,0.1)" : "none",
          transition: "border-color 0.3s, box-shadow 0.3s",
        }}>
          {!cameraOn && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "var(--text-3)" }}>
              <div style={{ fontSize: 40, opacity: 0.3 }}>◈</div>
              <p style={{ fontSize: 14 }}>Camera preview</p>
            </div>
          )}

          {/* Scan line */}
          {cameraOn && (
            <div style={{
              position: "absolute", left: 0, right: 0, height: 2, zIndex: 4, pointerEvents: "none",
              background: "linear-gradient(90deg, transparent, rgba(79,142,247,0.5), transparent)",
              animation: "scanline 3s linear infinite",
            }} />
          )}

          <video ref={videoRef} autoPlay playsInline muted style={{
            width: "100%", height: "100%", objectFit: "cover",
            transform: "scaleX(-1)",
            display: cameraOn ? "block" : "none",
          }} />
          <canvas ref={canvasRef} style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            transform: "scaleX(-1)", pointerEvents: "none",
          }} />
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          {!cameraOn ? (
            <button onClick={onStart} style={{
              padding: "12px 28px", borderRadius: 10, border: "none",
              background: "var(--accent)", color: "#fff", fontWeight: 600, fontSize: 14,
              cursor: "pointer", boxShadow: "0 4px 20px rgba(79,142,247,0.35)",
            }}>
              ▶  Start Camera
            </button>
          ) : (
            <button onClick={onStop} style={{
              padding: "12px 28px", borderRadius: 10,
              border: "1px solid var(--border)", background: "var(--surface-2)",
              color: "var(--text)", fontWeight: 600, fontSize: 14, cursor: "pointer",
            }}>
              ◼  Stop
            </button>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <div style={{ width: 280, borderLeft: "1px solid var(--border)", background: "var(--surface)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Live detections</div>
          <div style={{ fontSize: 30, fontWeight: 800 }}>
            {liveMatches.length}
            <span style={{ fontSize: 13, fontWeight: 400, color: "var(--text-2)", marginLeft: 8 }}>
              {liveMatches.length === 1 ? "face" : "faces"}
            </span>
          </div>
        </div>

        <div style={{ flex: 1, padding: 16, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
          {liveMatches.length === 0 && (
            <p style={{ color: "var(--text-3)", fontSize: 13, textAlign: "center", marginTop: 40 }}>
              {cameraOn ? "No faces in frame" : "Start camera to detect"}
            </p>
          )}
          {liveMatches.map((m, i) => {
            const conf = Math.round((1 - m.distance) * 100);
            return (
              <div key={i} className="fade-in" style={{
                background: "var(--surface-2)", borderRadius: 10,
                border: `1px solid ${m.known ? "rgba(34,217,138,0.25)" : "rgba(247,92,92,0.2)"}`,
                overflow: "hidden",
              }}>
                <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: m.known ? "var(--green)" : "var(--red)", display: "inline-block" }} />
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{m.name}</span>
                  </div>
                  {m.known && (
                    <span style={{ fontSize: 11, fontFamily: "var(--mono)", fontWeight: 700, color: conf > 70 ? "var(--green)" : "var(--yellow)" }}>
                      {conf}%
                    </span>
                  )}
                </div>
                {m.known && (
                  <div style={{ height: 3, background: "var(--border)" }}>
                    <div style={{ height: "100%", width: `${conf}%`, background: conf > 70 ? "var(--green)" : "var(--yellow)", transition: "width 0.2s" }} />
                  </div>
                )}
                <div style={{ padding: "8px 14px 10px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 0" }}>
                  <Stat label="X" value={`${m.box.x}px`} />
                  <Stat label="Y" value={`${m.box.y}px`} />
                  <Stat label="W" value={`${m.box.w}px`} />
                  <Stat label="H" value={`${m.box.h}px`} />
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)" }}>
          <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--text-3)" }}>
            Registered: {registered.length} · Threshold: 0.55
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <span style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--mono)" }}>{label}</span>
      <span style={{ fontSize: 11, color: "var(--text-2)", fontFamily: "var(--mono)" }}>{value}</span>
    </div>
  );
}

function ModelBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    idle: { label: "Idle", color: "var(--text-3)" },
    loading: { label: "Loading models…", color: "var(--yellow)" },
    ready: { label: "Models ready", color: "var(--green)" },
    error: { label: "Model error", color: "var(--red)" },
  };
  const c = map[status] ?? map.idle;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: c.color, fontFamily: "var(--mono)" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.color, display: "inline-block",
        animation: status === "loading" ? "pulse 1s infinite" : "none" }} />
      {c.label}
    </div>
  );
}

function Spinner() {
  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.7s linear infinite" }} />
    </>
  );
}
