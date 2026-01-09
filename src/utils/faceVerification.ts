import { API_BASE_URL } from '../config/api';

/**
 * Interface for face verification result from backend
 */
export interface VerifyFaceResponse {
  verified: boolean;
  message?: string;
  confidence?: number;
}

/**
 * Global face-api instance (from CDN)
 */
declare const faceapi: any;

const MODELS_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

/**
 * Load face-api.js models from CDN
 */
export async function loadFaceApiModels() {
  try {
    if (typeof faceapi === 'undefined') {
      throw new Error('face-api.js is not loaded. Ensure script is in index.html');
    }

    // Load necessary models
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODELS_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL),
    ]);

    console.log('✅ face-api.js models loaded');
    return true;
  } catch (error) {
    console.error('❌ Error loading face-api.js models:', error);
    return false;
  }
}

/**
 * Generate face embedding from video element
 */
export async function generateFaceEmbedding(input: HTMLVideoElement | HTMLCanvasElement): Promise<Float32Array | null> {
  try {
    if (typeof faceapi === 'undefined') return null;

    const detection = await faceapi
      .detectSingleFace(input)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      return null;
    }

    return detection.descriptor;
  } catch (error) {
    console.error('❌ Error generating face embedding:', error);
    return null;
  }
}

/**
 * Send face embedding to backend API /verify-face
 */
export async function verifyFace(embedding: Float32Array): Promise<VerifyFaceResponse> {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Not authorized');
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/verify-face`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        embedding: Array.from(embedding),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Face verification failed');
    }

    const result = await response.json();
    console.log('🔍 Face verification result:', result);
    return result;
  } catch (error: any) {
    console.error('❌ Face verification API error:', error);
    return { verified: false, message: error.message };
  }
}
/**
 * Send violation report (screenshot + metadata) to backend API
 */
export async function reportViolation(interviewId: string, violationType: string, actionTaken: string, screenshot?: string): Promise<any> {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  if (!token || !userStr) return { success: false, message: 'Not authorized' };

  try {
    const user = JSON.parse(userStr);
    const response = await fetch(`${API_BASE_URL}/api/interview/log-violation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        userId: user.id || user._id,
        interviewId,
        violationType,
        actionTaken,
        screenshot, // base64 string
      }),
    });

    const data = await response.json();
    return { success: response.ok, data };
  } catch (error: any) {
    console.error('❌ Error reporting violation:', error);
    return { success: false, message: error.message };
  }
}
