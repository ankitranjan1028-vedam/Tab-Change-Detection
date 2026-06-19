import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FaceID — Face Recognition System",
  description: "Real-time face detection and recognition using ONNX Runtime & InsightFace embeddings",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
