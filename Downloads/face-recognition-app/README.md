# FaceID — Face Detection & Recognition App

A Next.js + TypeScript app for real-time face detection and recognition running **entirely in the browser** using ONNX Runtime Web and InsightFace-style embeddings.

## Features

- **Face Registration** — Register faces via live camera or image upload
- **Live Recognition** — Real-time recognition from webcam with bounding box overlays  
- **128D Embeddings** — InsightFace-compatible face embeddings via `@vladmandic/face-api`
- **ONNX Runtime** — All inference runs client-side with ONNX Runtime Web (no server needed)
- **Export/Import** — Export your face database as a ZIP (images + binary descriptors) or JSON
- **Local Only** — No data ever leaves your browser

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Framework | Next.js 16 + TypeScript |
| Face Detection | TinyFaceDetector (ONNX) |
| Face Recognition | FaceRecognitionNet (InsightFace 128D, ONNX) |
| Landmarks | FaceLandmark68Net (ONNX) |
| Runtime | `@vladmandic/face-api` (ONNX Runtime Web) |
| Export | JSZip |
| Storage | localStorage (browser) |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

> **Note:** The COOP/COEP headers in `next.config.ts` are required for ONNX Runtime Web's SharedArrayBuffer support.

## Usage

### Register a Face
1. Go to the **Register** tab
2. Enter the person's name
3. Click **Open Camera** and position your face clearly
4. Click **Capture & Register** — the face embedding will be extracted and saved

### Recognize Faces
1. Go to the **Recognize** tab
2. Click **Start Recognition**
3. Live bounding boxes will appear: 🟢 green = matched, 🔵 blue = unknown

### Export Database
Go to **Export / Import** to:
- Download a **ZIP** with face images + binary descriptor files
- Download a **JSON** with descriptors only
- Import a previously exported JSON database

## Accuracy

The recognition uses **euclidean distance** on 128-dimensional face embeddings with a default threshold of `0.5`. Lower = stricter matching. You can adjust `threshold` in `lib/faceRecognition.ts`.

## Architecture

```
app/
  page.tsx          # Entry point (client-only via dynamic import)
components/
  App.tsx           # Main app with tabs
  RegisterPanel.tsx # Face registration UI + camera
  RecognizePanel.tsx# Live recognition with canvas overlay
  FaceOverlay.tsx   # Canvas drawing for face boxes + labels
  ExportPanel.tsx   # DB export/import
lib/
  faceRecognition.ts# Core: model loading, detection, recognition, storage
```
