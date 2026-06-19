"use client";
import { useState, useEffect, useCallback } from "react";
import { loadModels, loadRegistered, FaceDescriptor } from "@/lib/faceRecognition";
import RegisterPanel from "@/components/RegisterPanel";
import RecognizePanel from "@/components/RecognizePanel";
import ExportPanel from "@/components/ExportPanel";

type Tab = "register" | "recognize" | "export";

export default function App() {
  const [tab, setTab] = useState<Tab>("recognize");
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("Initializing...");
  const [registered, setRegistered] = useState<FaceDescriptor[]>([]);

  const init = useCallback(async () => {
    const saved = loadRegistered();
    setRegistered(saved);
    await loadModels((msg) => setLoadingMsg(msg));
    setModelsLoaded(true);
    setLoadingMsg("Ready");
  }, []);

  useEffect(() => { init(); }, [init]);

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "recognize", label: "Recognize", icon: "🔍" },
    { id: "register", label: "Register", icon: "👤" },
    { id: "export", label: "Export / Import", icon: "📦" },
  ];

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-primary)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header style={{ borderBottom: "1px solid var(--border)", padding: "0 24px", position: "sticky", top: 0, zIndex: 100, background: "rgba(10,10,15,0.9)", backdropFilter: "blur(10px)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(135deg, var(--accent-blue), var(--accent-violet))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>
              👁
            </div>
            <div>
              <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: -0.5 }}>
                Face<span style={{ color: "var(--accent-blue)" }}>ID</span>
              </span>
              <p style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: -2 }}>ONNX · InsightFace · Local</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 12px", borderRadius: 20, background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
            <div style={{
              width: 7, height: 7, borderRadius: "50%",
              background: modelsLoaded ? "var(--accent-green)" : "var(--accent-blue)",
            }} />
            <span style={{ fontSize: 12, color: modelsLoaded ? "var(--accent-green)" : "var(--text-secondary)", whiteSpace: "nowrap" }}>
              {modelsLoaded ? `Ready · ${registered.length} face${registered.length !== 1 ? "s" : ""}` : loadingMsg}
            </span>
          </div>
        </div>
      </header>

      {/* Body */}
      <div style={{ flex: 1, maxWidth: 900, width: "100%", margin: "0 auto", padding: "24px" }}>
        {!modelsLoaded && (
          <div style={{ marginBottom: 20, padding: "14px 18px", borderRadius: 10, background: "rgba(79,142,247,0.08)", border: "1px solid rgba(79,142,247,0.2)", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid var(--accent-blue)", borderTopColor: "transparent", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 14, color: "var(--accent-blue)", fontWeight: 600 }}>{loadingMsg}</p>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>Downloading ONNX models from CDN (~4MB). First load only.</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "var(--bg-card)", borderRadius: 10, padding: 4, border: "1px solid var(--border)" }}>
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ flex: 1, padding: "9px 0", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600,
                background: tab === t.id ? "var(--bg-elevated)" : "transparent",
                color: tab === t.id ? "var(--text-primary)" : "var(--text-secondary)",
                transition: "all 0.15s",
                boxShadow: tab === t.id ? "0 1px 4px rgba(0,0,0,0.3)" : "none",
              }}>
              {t.icon} {t.label}
              {t.id === "register" && registered.length > 0 && (
                <span style={{ marginLeft: 6, background: "var(--accent-blue)", color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 11 }}>
                  {registered.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div style={{ background: "var(--bg-card)", borderRadius: 14, border: "1px solid var(--border)", padding: 22 }}>
          {tab === "register" && <RegisterPanel registered={registered} setRegistered={setRegistered} modelsLoaded={modelsLoaded} />}
          {tab === "recognize" && <RecognizePanel registered={registered} modelsLoaded={modelsLoaded} />}
          {tab === "export" && <ExportPanel registered={registered} />}
        </div>

        <p style={{ marginTop: 16, textAlign: "center", fontSize: 12, color: "var(--text-secondary)" }}>
          🔒 All processing is local — your face data never leaves the browser
          · <span style={{ color: "var(--accent-blue)" }}>ONNX Runtime Web</span>
          · <span style={{ color: "var(--accent-violet)" }}>InsightFace 128D embeddings</span>
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
