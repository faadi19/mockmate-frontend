/**
 * MediaPipe-based Cheating Detection Hook
 * 
 * Uses ONLY MediaPipe for behavior analysis:
 * - Eye gaze detection (looking down/away)
 * - Head pose estimation (pitch down)
 * - Hand landmarks (hand near face/mouth)
 * 
 * Also sends frames to backend for phone detection
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { getHeadPosition, getHandPositions } from "../utils/mediapipeScoring";
import { FACE_LANDMARKS } from "../utils/mediapipeScoring";

import { API_BASE_URL } from '../config/api';

/**
 * Behavioral cheating detection scores
 */
interface BehavioralScores {
  gazeDown: number; // Duration in seconds that user is looking down
  headPitchDown: boolean; // Head pitch is down continuously
  handNearFace: boolean; // Hand is near face continuously
  faceOutOfFrame: boolean; // Face is partially out of frame
  behaviorScore: number; // Total behavioral cheating score (0-100)
  behavioralCheatingDetected: boolean; // True if behaviorScore >= 40
}

/**
 * Cheating detection result
 */
export interface CheatingDetectionResult {
  cheatingDetected: boolean; // Final decision: phoneDetected OR behavioralCheatingDetected
  phoneDetected: boolean; // Backend API response
  behavioralCheatingDetected: boolean; // Behavioral analysis result
  behaviorScore: number; // Behavioral score (0-100)
  scores: BehavioralScores; // Detailed behavioral scores
  status: "Focused" | "Distracted" | "Cheating"; // User state classification
  error: string | null;
}

interface UseCheatingDetectionConfig {
  enabled: boolean;
  videoElement: HTMLVideoElement | null;
  faceLandmarks: any[] | null; // MediaPipe face landmarks
  handLandmarks: any[][] | null; // MediaPipe hand landmarks (array of hands)
}

/**
 * Scoring constants
 */
const SCORE_GAZE_DOWN = 30; // +30 points if gazeDown > 1.5 seconds
const SCORE_HEAD_PITCH_DOWN = 20; // +20 points if head pitch down continuously
const SCORE_HAND_NEAR_FACE = 20; // +20 points if handNearFace
const SCORE_FACE_OUT_OF_FRAME = 10; // +10 points if face partially out of frame
const BEHAVIOR_THRESHOLD = 40; // Threshold for behavioral cheating detection
const GAZE_DOWN_THRESHOLD_SEC = 1.5; // Minimum duration for gazeDown detection

/**
 * Head pitch threshold (in degrees, negative = down)
 */
const HEAD_PITCH_DOWN_THRESHOLD = -15; // Degrees (negative = looking down)

/**
 * Hand near face distance threshold (normalized coordinates)
 */
const HAND_NEAR_FACE_DISTANCE = 0.15; // Normalized distance threshold

/**
 * Frame capture interval (1 frame per second)
 */
const FRAME_CAPTURE_INTERVAL_MS = 1000;

/**
 * Custom hook for MediaPipe-based cheating detection
 */
export function useCheatingDetection(config: UseCheatingDetectionConfig): {
  result: CheatingDetectionResult;
  isLoading: boolean;
} {
  const { enabled, videoElement, faceLandmarks, handLandmarks } = config;

  const [result, setResult] = useState<CheatingDetectionResult>({
    cheatingDetected: false,
    phoneDetected: false,
    behavioralCheatingDetected: false,
    behaviorScore: 0,
    scores: {
      gazeDown: 0,
      headPitchDown: false,
      handNearFace: false,
      faceOutOfFrame: false,
      behaviorScore: 0,
      behavioralCheatingDetected: false,
    },
    status: "Focused",
    error: null,
  });

  const [isLoading, setIsLoading] = useState(false);

  // Track gaze down duration
  const gazeDownStartTimeRef = useRef<number | null>(null);
  const currentGazeDownDurationRef = useRef<number>(0);

  // Track head pitch down state
  const headPitchDownHistoryRef = useRef<boolean[]>([]);
  const HEAD_PITCH_HISTORY_SIZE = 10; // Track last 10 frames

  // Track hand near face state
  const handNearFaceHistoryRef = useRef<boolean[]>([]);
  const HAND_NEAR_FACE_HISTORY_SIZE = 10; // Track last 10 frames

  // Frame capture for backend API
  const lastFrameCaptureTimeRef = useRef<number>(0);
  const frameCaptureCanvasRef = useRef<HTMLCanvasElement | null>(null);

  /**
   * Calculate head pitch (pitch angle in degrees)
   * Negative pitch = looking down, positive = looking up
   */
  const calculateHeadPitch = useCallback((landmarks: any[]): number | null => {
    if (!landmarks || landmarks.length < 468) return null;

    try {
      // Use nose bridge and chin to calculate pitch
      const noseBridge = landmarks[FACE_LANDMARKS.NOSE_BRIDGE];
      const chin = landmarks[FACE_LANDMARKS.CHIN];
      const forehead = landmarks[FACE_LANDMARKS.FOREHEAD_CENTER];

      if (!noseBridge || !chin || !forehead) return null;

      // Calculate vertical distance between forehead and chin
      const faceHeight = Math.abs(forehead.y - chin.y);
      if (faceHeight === 0) return null;

      // Calculate nose bridge position relative to face height
      // If nose bridge is lower (higher y value), head is pitched down
      const nosePosition = (noseBridge.y - forehead.y) / faceHeight;

      // Convert to approximate pitch angle (degrees)
      // Normalized position 0.3-0.4 = neutral, >0.4 = down, <0.3 = up
      const neutralPosition = 0.35;
      const pitchDegrees = (nosePosition - neutralPosition) * 60; // Scale to degrees

      return pitchDegrees;
    } catch (error) {
      console.error("Error calculating head pitch:", error);
      return null;
    }
  }, []);

  /**
   * Detect if user is looking down (gaze down)
   * Based on eye position relative to face center
   */
  const detectGazeDown = useCallback((landmarks: any[]): boolean => {
    if (!landmarks || landmarks.length < 468) return false;

    try {
      // Get eye centers
      const leftEyeTop = landmarks[FACE_LANDMARKS.LEFT_EYE_TOP];
      const leftEyeBottom = landmarks[FACE_LANDMARKS.LEFT_EYE_BOTTOM];
      const rightEyeTop = landmarks[FACE_LANDMARKS.RIGHT_EYE_TOP];
      const rightEyeBottom = landmarks[FACE_LANDMARKS.RIGHT_EYE_BOTTOM];

      if (!leftEyeTop || !leftEyeBottom || !rightEyeTop || !rightEyeBottom) {
        return false;
      }

      // Calculate eye center Y positions
      const leftEyeCenterY = (leftEyeTop.y + leftEyeBottom.y) / 2;
      const rightEyeCenterY = (rightEyeTop.y + rightEyeBottom.y) / 2;
      const avgEyeCenterY = (leftEyeCenterY + rightEyeCenterY) / 2;

      // Get face center (nose tip)
      const noseTip = landmarks[FACE_LANDMARKS.NOSE_TIP];
      if (!noseTip) return false;

      // If eyes are significantly below nose tip, user is looking down
      const eyeNoseOffset = avgEyeCenterY - noseTip.y;
      const GAZE_DOWN_THRESHOLD = 0.05; // Normalized threshold

      return eyeNoseOffset > GAZE_DOWN_THRESHOLD;
    } catch (error) {
      console.error("Error detecting gaze down:", error);
      return false;
    }
  }, []);

  /**
   * Detect if hand is near face
   */
  const detectHandNearFace = useCallback(
    (faceLandmarks: any[], handLandmarks: any[][]): boolean => {
      if (!faceLandmarks || faceLandmarks.length < 468) return false;
      if (!handLandmarks || handLandmarks.length === 0) return false;

      try {
        // Get face center (nose tip)
        const noseTip = faceLandmarks[FACE_LANDMARKS.NOSE_TIP];
        if (!noseTip) return false;

        // Check each hand
        for (const hand of handLandmarks) {
          if (!hand || hand.length < 21) continue; // MediaPipe hands have 21 landmarks

          // Use wrist (landmark 0) or index finger tip (landmark 8) as hand position
          const wrist = hand[0];
          const indexTip = hand[8];

          if (!wrist || !indexTip) continue;

          // Calculate distance from hand to face center
          const handX = (wrist.x + indexTip.x) / 2;
          const handY = (wrist.y + indexTip.y) / 2;
          const handZ = (wrist.z || 0) + (indexTip.z || 0) / 2;

          const faceX = noseTip.x;
          const faceY = noseTip.y;
          const faceZ = noseTip.z || 0;

          const distanceX = Math.abs(handX - faceX);
          const distanceY = Math.abs(handY - faceY);
          const distanceZ = Math.abs(handZ - faceZ);

          const totalDistance = Math.sqrt(
            distanceX * distanceX + distanceY * distanceY + distanceZ * distanceZ
          );

          // Check if hand is near face
          if (totalDistance < HAND_NEAR_FACE_DISTANCE) {
            return true;
          }
        }

        return false;
      } catch (error) {
        console.error("Error detecting hand near face:", error);
        return false;
      }
    },
    []
  );

  /**
   * Detect if face is partially out of frame
   */
  const detectFaceOutOfFrame = useCallback((landmarks: any[]): boolean => {
    if (!landmarks || landmarks.length < 468) return false;

    try {
      // Check if key face landmarks are near edges (indicating face is out of frame)
      const leftFace = landmarks[FACE_LANDMARKS.LEFT_FACE];
      const rightFace = landmarks[FACE_LANDMARKS.RIGHT_FACE];
      const topFace = landmarks[FACE_LANDMARKS.TOP_FACE];
      const bottomFace = landmarks[FACE_LANDMARKS.BOTTOM_FACE];

      if (!leftFace || !rightFace || !topFace || !bottomFace) return false;

      // Check if any landmark is near frame edges (within 10% of edge)
      const EDGE_THRESHOLD = 0.1;
      const isLeftEdge = leftFace.x < EDGE_THRESHOLD;
      const isRightEdge = rightFace.x > 1 - EDGE_THRESHOLD;
      const isTopEdge = topFace.y < EDGE_THRESHOLD;
      const isBottomEdge = bottomFace.y > 1 - EDGE_THRESHOLD;

      return isLeftEdge || isRightEdge || isTopEdge || isBottomEdge;
    } catch (error) {
      console.error("Error detecting face out of frame:", error);
      return false;
    }
  }, []);

  /**
   * Capture frame from video and send to backend
   */
  const captureAndSendFrame = useCallback(async () => {
    if (!videoElement || !enabled) return;

    try {
      // Create canvas if not exists
      if (!frameCaptureCanvasRef.current) {
        const canvas = document.createElement("canvas");
        canvas.width = videoElement.videoWidth || 640;
        canvas.height = videoElement.videoHeight || 480;
        frameCaptureCanvasRef.current = canvas;
      }

      const canvas = frameCaptureCanvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Draw video frame to canvas
      canvas.width = videoElement.videoWidth || 640;
      canvas.height = videoElement.videoHeight || 480;
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

      // Convert to blob
      canvas.toBlob(
        async (blob) => {
          if (!blob) return;

          try {
            const token = localStorage.getItem("token");
            if (!token) {
              console.warn("No auth token for cheating detection API");
              return;
            }

            // Create FormData
            const formData = new FormData();
            formData.append("file", blob, "frame.jpg");

            // Send to backend
            const response = await fetch(`${API_BASE_URL}/api/detect-cheating`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
              },
              body: formData,
            });

            if (!response.ok) {
              throw new Error(`Backend API error: ${response.status}`);
            }

            const data = await response.json();
            const phoneDetected = data.phoneDetected === true;

            // Update result
            setResult((prev) => ({
              ...prev,
              phoneDetected,
            }));
          } catch (error: any) {
            console.error("Error sending frame to backend:", error);
            setResult((prev) => ({
              ...prev,
              error: error.message || "Failed to send frame to backend",
            }));
          }
        },
        "image/jpeg",
        0.8
      );
    } catch (error: any) {
      console.error("Error capturing frame:", error);
    }
  }, [videoElement, enabled]);

  /**
   * Analyze behavior and calculate cheating score
   */
  const analyzeBehavior = useCallback(() => {
    if (!enabled || !faceLandmarks || faceLandmarks.length < 468) {
      // Reset tracking when face not detected
      gazeDownStartTimeRef.current = null;
      currentGazeDownDurationRef.current = 0;
      headPitchDownHistoryRef.current = [];
      handNearFaceHistoryRef.current = [];

      setResult((prev) => ({
        ...prev,
        behaviorScore: 0,
        behavioralCheatingDetected: false,
        scores: {
          gazeDown: 0,
          headPitchDown: false,
          handNearFace: false,
          faceOutOfFrame: false,
          behaviorScore: 0,
          behavioralCheatingDetected: false,
        },
      }));
      return;
    }

    const now = Date.now();

    // 1. Detect gaze down
    const isGazeDown = detectGazeDown(faceLandmarks);
    if (isGazeDown) {
      if (gazeDownStartTimeRef.current === null) {
        gazeDownStartTimeRef.current = now;
      }
      currentGazeDownDurationRef.current =
        (now - gazeDownStartTimeRef.current) / 1000; // Convert to seconds
    } else {
      gazeDownStartTimeRef.current = null;
      currentGazeDownDurationRef.current = 0;
    }

    // 2. Detect head pitch down
    const headPitch = calculateHeadPitch(faceLandmarks);
    const isHeadPitchDown =
      headPitch !== null && headPitch < HEAD_PITCH_DOWN_THRESHOLD;

    // Track head pitch history
    headPitchDownHistoryRef.current.push(isHeadPitchDown);
    if (headPitchDownHistoryRef.current.length > HEAD_PITCH_HISTORY_SIZE) {
      headPitchDownHistoryRef.current.shift();
    }

    // Check if head pitch is down continuously (at least 70% of recent frames)
    const headPitchDownCount = headPitchDownHistoryRef.current.filter(
      (b) => b
    ).length;
    const isHeadPitchDownContinuous =
      headPitchDownHistoryRef.current.length >= HEAD_PITCH_HISTORY_SIZE &&
      headPitchDownCount / HEAD_PITCH_HISTORY_SIZE >= 0.7;

    // 3. Detect hand near face
    const isHandNearFaceNow = detectHandNearFace(faceLandmarks, handLandmarks || []);

    // Track hand near face history
    handNearFaceHistoryRef.current.push(isHandNearFaceNow);
    if (handNearFaceHistoryRef.current.length > HAND_NEAR_FACE_HISTORY_SIZE) {
      handNearFaceHistoryRef.current.shift();
    }

    // Check if hand is near face continuously (at least 70% of recent frames)
    const handNearFaceCount = handNearFaceHistoryRef.current.filter(
      (b) => b
    ).length;
    const isHandNearFaceContinuous =
      handNearFaceHistoryRef.current.length >= HAND_NEAR_FACE_HISTORY_SIZE &&
      handNearFaceCount / HAND_NEAR_FACE_HISTORY_SIZE >= 0.7;

    // 4. Detect face out of frame
    const isFaceOutOfFrame = detectFaceOutOfFrame(faceLandmarks);

    // Calculate behavioral score
    let behaviorScore = 0;

    // +30 if gazeDown > 1.5 seconds
    if (currentGazeDownDurationRef.current > GAZE_DOWN_THRESHOLD_SEC) {
      behaviorScore += SCORE_GAZE_DOWN;
    }

    // +20 if head pitch down continuously
    if (isHeadPitchDownContinuous) {
      behaviorScore += SCORE_HEAD_PITCH_DOWN;
    }

    // +20 if hand near face continuously
    if (isHandNearFaceContinuous) {
      behaviorScore += SCORE_HAND_NEAR_FACE;
    }

    // +10 if face partially out of frame
    if (isFaceOutOfFrame) {
      behaviorScore += SCORE_FACE_OUT_OF_FRAME;
    }

    // Determine if behavioral cheating is detected
    // CHANGED: Behavioral issues are now strictly "Distracted", never "Cheating" for termination purposes.
    const behavioralCheatingDetected = false;

    // Update result
    setResult((prev) => {
      const phoneDetected = prev.phoneDetected;
      // CHANGED: Only phone triggers "Cheating"
      const cheatingDetected = phoneDetected;

      // Determine status
      let status: "Focused" | "Distracted" | "Cheating" = "Focused";
      if (cheatingDetected) {
        status = "Cheating";
      } else if (behaviorScore > 20) {
        // High behavior score now maps to Distracted, not Cheating
        status = "Distracted";
      }

      return {
        cheatingDetected,
        phoneDetected,
        behavioralCheatingDetected: behaviorScore >= BEHAVIOR_THRESHOLD, // Keep track of it but don't flag as cheatingDetected
        behaviorScore,
        scores: {
          gazeDown: currentGazeDownDurationRef.current,
          headPitchDown: isHeadPitchDownContinuous,
          handNearFace: isHandNearFaceContinuous,
          faceOutOfFrame: isFaceOutOfFrame,
          behaviorScore,
          behavioralCheatingDetected: behaviorScore >= BEHAVIOR_THRESHOLD,
        },
        status,
        error: null,
      };
    });
  }, [
    enabled,
    faceLandmarks,
    handLandmarks,
    detectGazeDown,
    calculateHeadPitch,
    detectHandNearFace,
    detectFaceOutOfFrame,
  ]);

  // Run behavior analysis when landmarks change
  useEffect(() => {
    if (!enabled) return;

    analyzeBehavior();
  }, [enabled, analyzeBehavior]);

  // Capture and send frame to backend (1 frame per second)
  useEffect(() => {
    if (!enabled || !videoElement) return;

    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastFrameCaptureTimeRef.current >= FRAME_CAPTURE_INTERVAL_MS) {
        lastFrameCaptureTimeRef.current = now;
        captureAndSendFrame();
      }
    }, FRAME_CAPTURE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [enabled, videoElement, captureAndSendFrame]);

  return { result, isLoading: false };
}

