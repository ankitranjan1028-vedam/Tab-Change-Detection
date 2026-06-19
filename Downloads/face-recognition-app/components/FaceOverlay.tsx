"use client";
import { useEffect, useRef } from "react";

interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  matched?: boolean;
  confidence?: number;
}

interface Props {
  boxes: FaceBox[];
  videoWidth: number;
  videoHeight: number;
  containerWidth: number;
  containerHeight: number;
  mirrored?: boolean;
}

export default function FaceOverlay({
  boxes,
  videoWidth,
  videoHeight,
  containerWidth,
  containerHeight,
  mirrored = true,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !videoWidth || !videoHeight) return;
    canvas.width = containerWidth;
    canvas.height = containerHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scaleX = containerWidth / videoWidth;
    const scaleY = containerHeight / videoHeight;

    for (const box of boxes) {
      let x = box.x * scaleX;
      const y = box.y * scaleY;
      const w = box.width * scaleX;
      const h = box.height * scaleY;

      if (mirrored) x = containerWidth - x - w;

      const color = box.matched ? "#10b981" : "#4f8ef7";
      const glow = box.matched ? "rgba(16,185,129,0.3)" : "rgba(79,142,247,0.3)";

      // Glow effect
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;

      // Corner brackets
      const cs = Math.min(w, h) * 0.2;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      // TL
      ctx.moveTo(x, y + cs); ctx.lineTo(x, y); ctx.lineTo(x + cs, y);
      // TR
      ctx.moveTo(x + w - cs, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + cs);
      // BR
      ctx.moveTo(x + w, y + h - cs); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - cs, y + h);
      // BL
      ctx.moveTo(x + cs, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - cs);
      ctx.stroke();

      // Fill overlay
      ctx.shadowBlur = 0;
      ctx.fillStyle = glow;
      ctx.fillRect(x, y, w, h);

      // Label
      if (box.label) {
        const label = box.matched
          ? `${box.label} ${box.confidence ? `(${box.confidence}%)` : ""}`
          : "Unknown";
        const padding = 6;
        const fontSize = 13;
        ctx.font = `600 ${fontSize}px Inter, system-ui`;
        const textW = ctx.measureText(label).width;
        const labelX = x;
        const labelY = y - 28;

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(labelX, labelY, textW + padding * 2, 22, 4);
        ctx.fill();

        ctx.fillStyle = "#fff";
        ctx.fillText(label, labelX + padding, labelY + 15);
      }
    }
  }, [boxes, videoWidth, videoHeight, containerWidth, containerHeight, mirrored]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    />
  );
}
