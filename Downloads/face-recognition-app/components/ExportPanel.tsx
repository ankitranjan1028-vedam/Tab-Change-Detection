"use client";
import { FaceDescriptor } from "@/lib/faceRecognition";
import JSZip from "jszip";

interface Props {
  registered: FaceDescriptor[];
}

export default function ExportPanel({ registered }: Props) {
  const exportZip = async () => {
    if (registered.length === 0) return;
    const zip = new JSZip();
    const folder = zip.folder("face-recognition-db")!;

    // JSON index
    const index = registered.map((f) => ({
      id: f.id, name: f.name, registeredAt: f.registeredAt,
      descriptorLength: f.descriptor.length,
    }));
    folder.file("index.json", JSON.stringify(index, null, 2));

    // Descriptors as binary
    const descFolder = folder.folder("descriptors")!;
    for (const f of registered) {
      const buf = new ArrayBuffer(f.descriptor.length * 4);
      const view = new Float32Array(buf);
      view.set(f.descriptor);
      descFolder.file(`${f.id}.bin`, buf);
    }

    // Images
    const imgFolder = folder.folder("images")!;
    for (const f of registered) {
      if (f.imageData.startsWith("data:")) {
        const base64 = f.imageData.split(",")[1];
        imgFolder.file(`${f.id}.jpg`, base64, { base64: true });
      }
    }

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `face-db-${new Date().toISOString().slice(0, 10)}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    const data = registered.map((f) => ({
      id: f.id, name: f.name, registeredAt: f.registeredAt,
      descriptor: Array.from(f.descriptor),
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `face-db-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const data = JSON.parse(text);
    const faces: FaceDescriptor[] = data.map((f: FaceDescriptor & { descriptor: number[] }) => ({
      ...f, descriptor: new Float32Array(f.descriptor),
    }));
    // Save
    const serialized = faces.map((f) => ({ ...f, descriptor: Array.from(f.descriptor) }));
    localStorage.setItem("registered_faces", JSON.stringify(serialized));
    window.location.reload();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ padding: "16px", borderRadius: 10, background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
        <p style={{ fontWeight: 600, marginBottom: 4 }}>Database Status</p>
        <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>{registered.length} face{registered.length !== 1 ? "s" : ""} registered</p>
        {registered.length > 0 && (
          <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
            {registered.map((f) => (
              <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 20, background: "var(--bg-elevated)", fontSize: 12 }}>
                <img src={f.imageData} alt="" style={{ width: 20, height: 20, borderRadius: "50%", objectFit: "cover" }} />
                {f.name}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button onClick={exportZip} disabled={registered.length === 0}
          style={{ padding: "11px 16px", borderRadius: 8, background: "var(--accent-violet)", color: "#fff", border: "none", cursor: registered.length > 0 ? "pointer" : "not-allowed", fontSize: 14, fontWeight: 600, opacity: registered.length > 0 ? 1 : 0.5 }}>
          📦 Export ZIP (with images + descriptors)
        </button>
        <button onClick={exportJSON} disabled={registered.length === 0}
          style={{ padding: "11px 16px", borderRadius: 8, background: "var(--accent-blue)", color: "#fff", border: "none", cursor: registered.length > 0 ? "pointer" : "not-allowed", fontSize: 14, fontWeight: 600, opacity: registered.length > 0 ? 1 : 0.5 }}>
          📄 Export JSON (descriptors only)
        </button>
        <label style={{ padding: "11px 16px", borderRadius: 8, background: "var(--bg-elevated)", color: "var(--text-primary)", border: "1px solid var(--border)", cursor: "pointer", fontSize: 14, fontWeight: 600, textAlign: "center" }}>
          📥 Import JSON Database
          <input type="file" accept=".json" onChange={importJSON} style={{ display: "none" }} />
        </label>
      </div>

      <div style={{ padding: "14px", borderRadius: 10, background: "rgba(79,142,247,0.08)", border: "1px solid rgba(79,142,247,0.2)", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
        <p style={{ color: "var(--accent-blue)", fontWeight: 600, marginBottom: 4 }}>📌 About the Model</p>
        <p>Uses <strong style={{ color: "var(--text-primary)" }}>@vladmandic/face-api</strong> with InsightFace-compatible 128D face embeddings. Detection via TinyFaceDetector (ONNX). Recognition via cosine/euclidean distance matching with configurable threshold.</p>
      </div>
    </div>
  );
}
