/**
 * Frontend Example Code for Cheating Detection API
 * Copy this code to your frontend project
 */

// ============================================
// OPTION 1: Base64 JSON (Recommended for Video Frames)
// ============================================
async function detectCheatingBase64(imageBase64, token) {
  try {
    // Remove data URL prefix if present
    const base64String = imageBase64.includes(',') 
      ? imageBase64.split(',')[1] 
      : imageBase64;

    const response = await fetch('http://localhost:5000/api/detect-cheating', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        image: base64String
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'API request failed');
    }

    const data = await response.json();
    return {
      phoneDetected: data.phoneDetected || false,
      detectedObjects: data.detectedObjects || [],
      confidence: data.confidence || 0.0
    };
  } catch (error) {
    console.error('Cheating detection error:', error);
    return {
      phoneDetected: false,
      detectedObjects: [],
      confidence: 0.0
    };
  }
}

// ============================================
// OPTION 2: Multipart Form Data (File Upload)
// ============================================
async function detectCheatingFile(imageFile, token) {
  try {
    const formData = new FormData();
    formData.append('file', imageFile);

    const response = await fetch('http://localhost:5000/api/detect-cheating', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
        // Don't set Content-Type - browser sets it automatically
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'API request failed');
    }

    const data = await response.json();
    return {
      phoneDetected: data.phoneDetected || false,
      detectedObjects: data.detectedObjects || [],
      confidence: data.confidence || 0.0
    };
  } catch (error) {
    console.error('Cheating detection error:', error);
    return {
      phoneDetected: false,
      detectedObjects: [],
      confidence: 0.0
    };
  }
}

// ============================================
// EXAMPLE: Capture from Video Element
// ============================================
function captureFrameFromVideo(videoElement, token) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;
  ctx.drawImage(videoElement, 0, 0);
  
  const base64Image = canvas.toDataURL('image/jpeg', 0.8);
  
  return detectCheatingBase64(base64Image, token);
}

// ============================================
// EXAMPLE: React Hook
// ============================================
/*
import { useState, useCallback } from 'react';

function useCheatingDetection() {
  const [detectionResult, setDetectionResult] = useState({
    phoneDetected: false,
    detectedObjects: [],
    confidence: 0.0
  });

  const detect = useCallback(async (imageBase64) => {
    const token = localStorage.getItem('token'); // or from context
    const result = await detectCheatingBase64(imageBase64, token);
    setDetectionResult(result);
    return result;
  }, []);

  return { detectionResult, detect };
}
*/

// ============================================
// USAGE EXAMPLE
// ============================================
/*
// Get token from your auth system
const token = localStorage.getItem('token');

// Example 1: From canvas
const canvas = document.getElementById('myCanvas');
const base64 = canvas.toDataURL('image/jpeg');
const result = await detectCheatingBase64(base64, token);
console.log('Phone detected:', result.phoneDetected);

// Example 2: From file input
const fileInput = document.getElementById('fileInput');
const file = fileInput.files[0];
const result = await detectCheatingFile(file, token);
console.log('Detected objects:', result.detectedObjects);

// Example 3: From video element
const video = document.getElementById('myVideo');
const result = await captureFrameFromVideo(video, token);
console.log('Confidence:', result.confidence);
*/

// ============================================
// ERROR HANDLING GUIDE
// ============================================
/*
Common Error Codes:
- 401 → Token invalid/expired - Check Authorization header
- 400 → Invalid request format - Check body structure
- 503 → Python service unavailable - Backend service down
- 500 → Server error - Check backend logs

Quick Fix Checklist:
[ ] URL: /api/detect-cheating (not /detect-cheating or /api/interview/detect-cheating)
[ ] Authorization header with Bearer token
[ ] Base64: Content-Type: application/json + { image: base64String }
[ ] File: FormData with field name 'file'
[ ] Error handling with fallback values
*/

export {
  detectCheatingBase64,
  detectCheatingFile,
  captureFrameFromVideo
};

