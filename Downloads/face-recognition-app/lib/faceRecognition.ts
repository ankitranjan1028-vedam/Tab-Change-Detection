/* eslint-disable @typescript-eslint/no-explicit-any */
let faceapi: any = null;
let isLoaded = false;
let isLoading = false;

export interface FaceDescriptor {
  id: string;
  name: string;
  descriptor: Float32Array;
  imageData: string;
  registeredAt: string;
}

export interface RecognitionResult {
  matched: boolean;
  name?: string;
  id?: string;
  distance?: number;
  confidence?: number;
  box?: { x: number; y: number; width: number; height: number };
}

const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";

export async function loadModels(onProgress?: (msg: string) => void): Promise<void> {
  if (isLoaded) return;
  if (isLoading) {
    await new Promise<void>((resolve) => {
      const check = setInterval(() => { if (isLoaded) { clearInterval(check); resolve(); } }, 100);
    });
    return;
  }
  isLoading = true;
  try {
    onProgress?.("Loading face-api.js...");
    faceapi = await import("@vladmandic/face-api");
    onProgress?.("Loading TinyFaceDetector...");
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    onProgress?.("Loading FaceLandmarks...");
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    onProgress?.("Loading Recognition Net...");
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    onProgress?.("Models ready ✓");
    isLoaded = true;
  } finally {
    isLoading = false;
  }
}

export async function detectAndDescribe(
  source: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement
): Promise<{ descriptor: Float32Array; box: any } | null> {
  if (!isLoaded || !faceapi) throw new Error("Models not loaded");
  const detection = await faceapi
    .detectSingleFace(source, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();
  if (!detection) return null;
  return { descriptor: detection.descriptor, box: detection.detection.box };
}

export async function detectAllFaces(
  source: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement
): Promise<Array<{ descriptor: Float32Array; box: any }>> {
  if (!isLoaded || !faceapi) throw new Error("Models not loaded");
  const detections = await faceapi
    .detectAllFaces(source, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptors();
  return detections.map((d: any) => ({ descriptor: d.descriptor, box: d.detection.box }));
}

export function euclideanDistance(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

export function recognize(descriptor: Float32Array, registered: FaceDescriptor[], threshold = 0.5): RecognitionResult {
  if (registered.length === 0) return { matched: false };
  let bestMatch: FaceDescriptor | null = null;
  let bestDist = Infinity;
  for (const reg of registered) {
    const d = euclideanDistance(descriptor, reg.descriptor);
    if (d < bestDist) { bestDist = d; bestMatch = reg; }
  }
  if (bestMatch && bestDist < threshold) {
    const confidence = Math.round((1 - bestDist / threshold) * 100);
    return { matched: true, name: bestMatch.name, id: bestMatch.id, distance: bestDist, confidence };
  }
  return { matched: false, distance: bestDist };
}

export function saveRegistered(faces: FaceDescriptor[]): void {
  const serialized = faces.map((f) => ({ ...f, descriptor: Array.from(f.descriptor) }));
  localStorage.setItem("registered_faces", JSON.stringify(serialized));
}

export function loadRegistered(): FaceDescriptor[] {
  try {
    const raw = localStorage.getItem("registered_faces");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return parsed.map((f: FaceDescriptor & { descriptor: number[] }) => ({
      ...f, descriptor: new Float32Array(f.descriptor),
    }));
  } catch { return []; }
}
