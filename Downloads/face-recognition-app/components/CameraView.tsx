"use client";
import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";

export interface CameraViewHandle {
  getVideo: () => HTMLVideoElement | null;
  captureFrame: () => string | null;
}

interface Props {
  onStreamReady?: () => void;
  mirrored?: boolean;
  overlayCanvas?: boolean;
  className?: string;
}

const CameraView = forwardRef<CameraViewHandle, Props>(
  ({ onStreamReady, mirrored = true, className = "" }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useImperativeHandle(ref, () => ({
      getVideo: () => videoRef.current,
      captureFrame: () => {
        const v = videoRef.current;
        if (!v || !v.videoWidth) return null;
        const c = document.createElement("canvas");
        c.width = v.videoWidth;
        c.height = v.videoHeight;
        c.getContext("2d")?.drawImage(v, 0, 0);
        return c.toDataURL("image/jpeg", 0.9);
      },
    }));

    const startCamera = useCallback(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            onStreamReady?.();
          };
        }
      } catch (err) {
        console.error("Camera error:", err);
      }
    }, [onStreamReady]);

    useEffect(() => {
      startCamera();
      return () => {
        const v = videoRef.current;
        if (v?.srcObject) {
          (v.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
        }
      };
    }, [startCamera]);

    return (
      <div className={`relative overflow-hidden rounded-xl ${className}`} style={{ background: "#0a0a0f" }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: mirrored ? "scaleX(-1)" : "none",
            display: "block",
          }}
        />
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
      </div>
    );
  }
);
CameraView.displayName = "CameraView";
export default CameraView;
