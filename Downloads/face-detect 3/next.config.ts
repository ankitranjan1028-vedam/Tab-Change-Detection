import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      "@mediapipe/face_detection": { browser: "./empty-module.js", default: "./empty-module.js" },
    },
  },
};

export default nextConfig;
