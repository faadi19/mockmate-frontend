import { useState, useRef, useEffect, useCallback } from "react";
import {
  calculateEyeContactScore,
  calculateEyeContactScoreWithState,
  calculateEngagementScore,
  calculateAttentionScore,
  calculateStabilityScore,
  getHeadPosition,
  getHandPositions,
  detectFacialExpression,
  type FacialExpression,
} from "../utils/mediapipeScoring";
import { saveBodyLanguageData } from "../utils/bodyLanguageApi";

// Re-export for component use
export type { FacialExpression };

// MediaPipe types from CDN (available globally after CDN scripts load)
declare global {
  interface Window {
    FaceMesh: any;
    Hands: any;
    Camera: any;
    Module?: any;
  }
}

export interface BodyLanguageScores {
  eyeContact: number;
  engagement: number;
  attention: number;
  stability: number;
  expression: FacialExpression | null; // null when face not detected
  expressionConfidence: number;
  faceDetected: boolean; // Flag to indicate if face is currently detected
}

export interface AggregatedScores extends BodyLanguageScores {
  sampleCount: number;
  timestamp: number;
  dominantExpression?: FacialExpression | null; // Most common expression over time (null if no face detected)
}

/**
 * Global initialization guard to prevent double initialization
 * This is critical for React StrictMode which mounts components twice
 */
let globalInitializationGuard = false;

/**
 * Custom hook for MediaPipe Face Mesh and Hands analysis
 * 
 * FIXES APPLIED:
 * 1. useRef guards prevent double initialization (React StrictMode safe)
 * 2. Single Camera instance shared between FaceMesh and Hands
 * 3. Proper Module.arguments_ configuration before WASM loads
 * 4. Correct locateFile paths for CDN assets
 * 5. Stable MediaPipe version to avoid SIMD crashes
 * 6. Question-based sampling logic implemented.
 * 
 * @param enabled - Whether to enable MediaPipe analysis
 * @param sessionId - Interview session ID for saving data to backend
 * @param isSampling - Whether to collect samples for the current question
 * @param questionIndex - Current question index for tagging data
 */
export function useMediaPipeAnalysis(
  enabled: boolean = true,
  sessionId?: string,
  isSampling: boolean = false,
  questionIndex: number = 0
) {
  const [scores, setScores] = useState<BodyLanguageScores>({
    eyeContact: 0,
    engagement: 0,
    attention: 0,
    stability: 0,
    expression: null,
    expressionConfidence: 0,
    faceDetected: false,
  });

  const [aggregatedScores, setAggregatedScores] = useState<AggregatedScores>({
    eyeContact: 0,
    engagement: 0,
    attention: 0,
    stability: 0,
    expression: null,
    expressionConfidence: 0,
    sampleCount: 0,
    timestamp: Date.now(),
    faceDetected: false,
  });

  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // CRITICAL: useRef guards prevent double initialization in React StrictMode
  const faceMeshRef = useRef<any>(null);
  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const initializationGuardRef = useRef<boolean>(false);
  const isInitializingRef = useRef<boolean>(false);

  // Track previous positions for stability calculation
  const previousHeadPositionRef = useRef<{ x: number; y: number } | null>(null);
  const previousHandPositionsRef = useRef<Array<{ x: number; y: number }>>([]);

  // Store current hand landmarks for expression detection (hand near head = nervous)
  const currentHandLandmarksRef = useRef<any[]>([]);

  // Store current face landmarks for cheating detection
  const currentFaceLandmarksRef = useRef<any[] | null>(null);

  // Store current hand landmarks array (for cheating detection)
  const currentHandLandmarksArrayRef = useRef<any[][]>([]);

  // Accumulator for the current question
  const questionAccumulatorRef = useRef<BodyLanguageScores[]>([]);

  // Throttling for sampling (1-2 seconds)
  const lastSampleTimeRef = useRef<number>(0);

  /**
   * Configure Module.arguments_ BEFORE MediaPipe initialization
   * This prevents WASM "Module.arguments has been replaced" error
   */
  const configureWasmModule = useCallback(() => {
    if (typeof window === 'undefined') return;

    // Initialize Module if it doesn't exist
    if (!window.Module) {
      window.Module = {};
    }

    // CRITICAL: Set arguments_ before MediaPipe loads WASM
    // This prevents the "Module.arguments has been replaced" runtime error
    if (!window.Module.arguments_) {
      window.Module.arguments_ = [];
    }

    // Prevent MediaPipe from overwriting arguments_
    Object.defineProperty(window.Module, 'arguments', {
      get: function () {
        return this.arguments_ || [];
      },
      set: function (value) {
        this.arguments_ = value || [];
      },
      configurable: true,
    });
  }, []);

  /**
   * Aggregate scores over time (calculate average)
   * Also calculates dominant expression (most common over time)
   */
  const aggregateScores = (history: BodyLanguageScores[]): BodyLanguageScores & { dominantExpression?: FacialExpression | null } => {
    if (history.length === 0) {
      return {
        eyeContact: 0,
        engagement: 0,
        attention: 0,
        stability: 0,
        expression: null,
        expressionConfidence: 0,
        faceDetected: false,
      };
    }

    // Filter out scores where face was not detected
    const validScores = history.filter(score => score.faceDetected && score.expression !== null);

    if (validScores.length === 0) {
      return {
        eyeContact: 0,
        engagement: 0,
        attention: 0,
        stability: 0,
        expression: null,
        expressionConfidence: 0,
        faceDetected: false,
      };
    }

    const sum = validScores.reduce(
      (acc, score) => ({
        eyeContact: acc.eyeContact + score.eyeContact,
        engagement: acc.engagement + score.engagement,
        attention: acc.attention + score.attention,
        stability: acc.stability + score.stability,
        expressionConfidence: acc.expressionConfidence + score.expressionConfidence,
      }),
      { eyeContact: 0, engagement: 0, attention: 0, stability: 0, expressionConfidence: 0 }
    );

    const count = validScores.length;

    // Calculate dominant expression (most common in history, only from valid scores)
    const expressionCounts: Record<FacialExpression, number> = {
      confident: 0,
      nervous: 0,
      distracted: 0,
    };

    validScores.forEach(score => {
      if (score.expression) {
        expressionCounts[score.expression]++;
      }
    });

    const dominantExpression = Object.entries(expressionCounts).reduce((a, b) =>
      expressionCounts[a[0] as FacialExpression] > expressionCounts[b[0] as FacialExpression] ? a : b
    )[0] as FacialExpression;

    return {
      eyeContact: Math.round(sum.eyeContact / count),
      engagement: Math.round(sum.engagement / count),
      attention: Math.round(sum.attention / count),
      stability: Math.round(sum.stability / count),
      expression: dominantExpression,
      expressionConfidence: Math.round(sum.expressionConfidence / count),
      faceDetected: true,
      dominantExpression,
    };
  };

  /**
   * Initialize MediaPipe Face Mesh
   * Uses useRef guard to ensure only ONE instance is created
   */
  const initializeFaceMesh = useCallback(() => {
    // Guard: Return existing instance if already initialized
    if (faceMeshRef.current) {
      return faceMeshRef.current;
    }

    // CRITICAL: Runtime check before initialization
    // This prevents "scripts failed to load" errors
    if (typeof window === 'undefined' || !window.FaceMesh) {
      throw new Error(
        "MediaPipe FaceMesh not available. " +
        "Ensure CDN script is loaded in index.html: " +
        "<script src='https://unpkg.com/@mediapipe/face_mesh/face_mesh.js'></script>"
      );
    }

    // Configure WASM Module BEFORE creating FaceMesh
    configureWasmModule();

    // Create FaceMesh with correct locateFile path
    // Using stable version path to avoid SIMD WASM crashes
    const faceMesh = new window.FaceMesh({
      locateFile: (file: string) => {
        // CRITICAL: FaceMesh assets must load from @mediapipe/face_mesh package
        // Using unpkg CDN without version (loads latest, avoids 404)
        return `https://unpkg.com/@mediapipe/face_mesh/${file}`;
      },
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: false, // Disable refine to reduce WASM complexity and avoid SIMD crashes
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    faceMesh.onResults((results: any) => {
      if (!enabled) return;

      try {
        const faceLandmarks = results.multiFaceLandmarks?.[0];

        // Store face landmarks for cheating detection
        currentFaceLandmarksRef.current = faceLandmarks && faceLandmarks.length >= 468 ? faceLandmarks : null;

        if (faceLandmarks && faceLandmarks.length >= 468) {
          // Calculate scores
          const eyeContact = calculateEyeContactScore(faceLandmarks);
          const engagement = calculateEngagementScore(faceLandmarks);

          const headPosition = getHeadPosition(faceLandmarks);
          const attention = calculateAttentionScore(
            faceLandmarks,
            previousHeadPositionRef.current || undefined
          );

          // Update previous head position
          if (headPosition) {
            previousHeadPositionRef.current = headPosition;
          }

          // Get current hand positions (will be updated by hands detector)
          const currentHandPositions = previousHandPositionsRef.current.length > 0
            ? previousHandPositionsRef.current
            : null;

          const stability = calculateStabilityScore(
            headPosition,
            previousHeadPositionRef.current,
            currentHandPositions,
            previousHandPositionsRef.current.length > 0
              ? previousHandPositionsRef.current
              : null
          );

          // Detect facial expression (pass hand landmarks for nervous detection)
          const expressionResult = detectFacialExpression(
            faceLandmarks,
            currentHandLandmarksRef.current.length > 0 ? currentHandLandmarksRef.current : undefined
          );

          // Update scores - Face is definitely detected here (faceLandmarks exist)
          const newScores: BodyLanguageScores = {
            eyeContact,
            engagement,
            attention,
            stability,
            expression: expressionResult.expression, // Will be a valid expression (not null)
            expressionConfidence: expressionResult.confidence,
            faceDetected: true, // Face is detected - CRITICAL: Set to true
          };

          setScores(newScores);

          // --- SAMPLING LOGIC START ---
          // Sample collector (throttled)
          const now = Date.now();
          // Random throttle between 1000ms and 2000ms
          const throttleMs = 1500;

          // Logic: Only collect if sampling is enabled AND enough time passed
          // We use a ref on the hook level to track 'enabled' and 'isSampling' state 
          // but since this callback is created once, we rely on the ref values if we were to use them inside closure.
          // However, 'enabled' is in dependency array so it re-creates.
          // We need to access 'isSampling' which changes often.
          // WARNING: 'isSampling' is not in dependency array to avoid re-initializing FaceMesh.
          // Instead, we should check a ref that tracks isSampling.

          if (isSamplingRef.current) {
            if (now - lastSampleTimeRef.current > throttleMs) {
              lastSampleTimeRef.current = now;
              questionAccumulatorRef.current.push(newScores);
              console.log(`📸 Sample collected for Q${questionIndexRef.current}. Total: ${questionAccumulatorRef.current.length}`);

              // Update aggregated view for UI
              const aggregated = aggregateScores(questionAccumulatorRef.current);
              setAggregatedScores({
                ...aggregated,
                sampleCount: questionAccumulatorRef.current.length,
                timestamp: now,
              });
            }
          }
          // --- SAMPLING LOGIC END ---

        } else {
          // No face detected - set scores to 0 and expression to null
          setScores({
            eyeContact: 0,
            engagement: 0,
            attention: 0,
            stability: 0,
            expression: null, // No expression when face not detected
            expressionConfidence: 0,
            faceDetected: false, // Face is not detected
          });
        }
      } catch (err: any) {
        console.error("Error processing face mesh results:", err);
        // Don't set error state for processing errors, just log
      }
    });

    faceMeshRef.current = faceMesh;
    return faceMesh;
  }, [enabled, configureWasmModule]); // removed isSampling dependnecy to avoid recreation

  // Refs to track prop changes without re-initializing everything
  const isSamplingRef = useRef(isSampling);
  const questionIndexRef = useRef(questionIndex);

  useEffect(() => {
    isSamplingRef.current = isSampling;
    questionIndexRef.current = questionIndex;

    // Logic to handle START/STOP sampling
    if (isSampling) {
      console.log(`▶️ Started sampling for Question ${questionIndex}`);
      questionAccumulatorRef.current = []; // Clear accumulator on start
      lastSampleTimeRef.current = 0; // Reset timer to sample immediately
    } else {
      // Just stopped sampling?
      // Logic to Save is handled by a separate function or effect? 
      // The requirement says "When question ends -> Stop sampling -> Calculate average"
      // This effect runs when isSampling changes to false.

      if (questionAccumulatorRef.current.length > 0) {
        console.log(`⏹️ Stopped sampling for Question ${questionIndex}. Calculating averages...`);
        saveFinalDataForQuestion(questionIndex);
      }
    }
  }, [isSampling, questionIndex]);

  /**
   * Initialize MediaPipe Hands
   * Uses useRef guard to ensure only ONE instance is created
   */
  const initializeHands = useCallback(() => {
    // Guard: Return existing instance if already initialized
    if (handsRef.current) {
      return handsRef.current;
    }

    // CRITICAL: Runtime check before initialization
    // This prevents "scripts failed to load" errors
    if (typeof window === 'undefined' || !window.Hands) {
      throw new Error(
        "MediaPipe Hands not available. " +
        "Ensure CDN script is loaded in index.html: " +
        "<script src='https://unpkg.com/@mediapipe/hands/hands.js'></script>"
      );
    }

    // Configure WASM Module BEFORE creating Hands
    configureWasmModule();

    // Create Hands with correct locateFile path
    const hands = new window.Hands({
      locateFile: (file: string) => {
        // CRITICAL: Hands assets must load from @mediapipe/hands package
        // Using unpkg CDN without version (loads latest, avoids 404)
        return `https://unpkg.com/@mediapipe/hands/${file}`;
      },
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1, // Use complexity 1 to avoid SIMD issues
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    hands.onResults((results: any) => {
      if (!enabled) return;

      try {
        // Get hand landmarks (all hands detected)
        const allHandLandmarks = results.multiHandLandmarks || [];
        const handLandmarks = allHandLandmarks[0] || [];
        const handPositions = getHandPositions(handLandmarks);

        // Store hand landmarks for expression detection (hand near head = nervous)
        currentHandLandmarksRef.current = handLandmarks;

        // Store all hand landmarks array for cheating detection
        currentHandLandmarksArrayRef.current = allHandLandmarks;

        // Update previous hand positions for stability calculation
        previousHandPositionsRef.current = handPositions;
      } catch (err: any) {
        console.error("Error processing hands results:", err);
        // Don't set error state for processing errors, just log
      }
    });

    handsRef.current = hands;
    return hands;
  }, [enabled, configureWasmModule]);

  /**
   * Wait for MediaPipe scripts to load from CDN
   * CRITICAL: This function ensures scripts are loaded before initialization
   */
  const waitForMediaPipe = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Runtime check: Verify MediaPipe is available on window
      const checkMediaPipe = () => {
        return (
          typeof window !== 'undefined' &&
          window.FaceMesh &&
          window.Hands &&
          window.Camera
        );
      };

      // Check if already loaded (immediate check)
      if (checkMediaPipe()) {
        console.log('✅ MediaPipe scripts already loaded');
        // Give WASM modules time to initialize
        setTimeout(() => resolve(), 500);
        return;
      }

      // Check if window.mediaPipeReady flag is set (from index.html verification)
      if ((window as any).mediaPipeReady === true && checkMediaPipe()) {
        console.log('✅ MediaPipe ready flag detected');
        setTimeout(() => resolve(), 500);
        return;
      }

      // Wait for scripts to load (check every 100ms, max 20 seconds)
      const maxWait = 20000;
      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        if (checkMediaPipe()) {
          clearInterval(checkInterval);
          console.log('✅ MediaPipe scripts loaded after wait');
          // Give WASM modules extra time to initialize
          setTimeout(() => resolve(), 1000);
        } else if (Date.now() - startTime > maxWait) {
          clearInterval(checkInterval);
          // Detailed error message for debugging
          const missing = [];
          if (!window.FaceMesh) missing.push('FaceMesh');
          if (!window.Hands) missing.push('Hands');
          if (!window.Camera) missing.push('Camera');
          reject(new Error(
            `MediaPipe scripts failed to load after ${maxWait}ms. Missing: ${missing.join(', ')}. ` +
            `Please check: 1) CDN scripts in index.html, 2) Network connectivity, 3) Browser console for script errors.`
          ));
        }
      }, 100); // Check more frequently (every 100ms)
    });
  }, []);

  /**
   * Start webcam and MediaPipe processing
   * CRITICAL: Multiple guards prevent double initialization
   */
  const startAnalysis = useCallback(async () => {
    if (!enabled) return;

    // Guard 1: Prevent concurrent initialization
    if (isInitializingRef.current) {
      console.log("⏸️ MediaPipe initialization already in progress, skipping...");
      return;
    }

    // Guard 2: Prevent re-initialization if already initialized
    if (initializationGuardRef.current || isInitialized) {
      console.log("⏸️ MediaPipe already initialized, skipping...");
      return;
    }

    // Guard 3: Global guard for React StrictMode double-mount
    if (globalInitializationGuard) {
      console.log("⏸️ MediaPipe global guard active, skipping...");
      return;
    }

    try {
      isInitializingRef.current = true;
      globalInitializationGuard = true;
      setError(null);

      // Configure WASM Module FIRST, before any MediaPipe initialization
      configureWasmModule();

      // Wait for MediaPipe to load
      await waitForMediaPipe();

      // Guard: Check again after waiting (React StrictMode might have unmounted)
      if (!enabled) {
        isInitializingRef.current = false;
        globalInitializationGuard = false;
        return;
      }

      // Create video element (hidden) - ONLY ONCE
      if (!videoRef.current) {
        const video = document.createElement("video");
        video.style.display = "none";
        video.playsInline = true;
        video.autoplay = true;
        document.body.appendChild(video);
        videoRef.current = video;
      }

      // CRITICAL: Runtime check before initializing MediaPipe instances
      // This ensures all scripts are loaded before creating detectors
      if (typeof window === 'undefined' || !window.FaceMesh || !window.Hands || !window.Camera) {
        const missing = [];
        if (!window.FaceMesh) missing.push('FaceMesh');
        if (!window.Hands) missing.push('Hands');
        if (!window.Camera) missing.push('Camera');
        throw new Error(
          `MediaPipe not fully loaded. Missing: ${missing.join(', ')}. ` +
          `Please ensure all CDN scripts are loaded in index.html before React app initializes.`
        );
      }

      // Initialize MediaPipe - useRef guards ensure only ONE instance
      const faceMesh = initializeFaceMesh();
      const hands = initializeHands();

      // CRITICAL: Create ONLY ONE Camera instance shared between FaceMesh and Hands
      // This prevents multiple webcam streams and resource conflicts
      if (!cameraRef.current) {
        const camera = new window.Camera(videoRef.current, {
          onFrame: async () => {
            // Guard: Check if still enabled and video is ready
            if (!enabled || !videoRef.current) return;

            if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
              // Share the same video frame between FaceMesh and Hands
              // This is more efficient than creating separate camera instances
              try {
                if (faceMeshRef.current) {
                  await faceMeshRef.current.send({ image: videoRef.current });
                }
                if (handsRef.current) {
                  await handsRef.current.send({ image: videoRef.current });
                }
              } catch (frameError: any) {
                // Silently handle frame processing errors (common during cleanup)
                if (frameError.message && !frameError.message.includes('closed')) {
                  console.warn("Frame processing error:", frameError.message);
                }
              }
            }
          },
          width: 640,
          height: 480,
        });

        cameraRef.current = camera;
        await camera.start();
      }

      // Mark as initialized
      initializationGuardRef.current = true;
      setIsInitialized(true);

      console.log("✅ MediaPipe Analysis STARTED");
      console.log("📹 Webcam: ACTIVE (single shared instance)");
      console.log("🔍 Face Detection: ENABLED");
      console.log("✋ Hand Detection: ENABLED");

    } catch (err: any) {
      console.error("❌ Error starting MediaPipe analysis:", err);

      // Check if it's a WASM error
      const errorMessage = err.message || err.toString();
      if (errorMessage.includes('Module.arguments') || errorMessage.includes('WASM') || errorMessage.includes('RuntimeError')) {
        setError("MediaPipe WASM initialization failed. Please refresh the page.");
        console.error("💡 WASM Error: This may be a CDN compatibility issue. Try refreshing.");
      } else {
        setError(err.message || "Failed to start webcam analysis. Please check camera permissions.");
      }

      setIsInitialized(false);
      initializationGuardRef.current = false;
      globalInitializationGuard = false;
    } finally {
      isInitializingRef.current = false;
    }
  }, [enabled, isInitialized, waitForMediaPipe, initializeFaceMesh, initializeHands, configureWasmModule]);

  /**
   * Stop webcam and cleanup
   * CRITICAL: Proper cleanup prevents memory leaks and allows re-initialization
   */
  const stopAnalysis = useCallback(() => {
    // Stop camera FIRST (MediaPipe Camera.stop may not stop all underlying MediaStream tracks)
    if (cameraRef.current) {
      try {
        if (typeof cameraRef.current.stop === 'function') {
          cameraRef.current.stop();
        }
      } catch (err) {
        // Ignore errors during cleanup
      }
      cameraRef.current = null;
    }

    // Additionally, explicitly stop any MediaStream tracks attached to the video element
    if (videoRef.current) {
      try {
        // Pause and stop tracks if present
        try {
          videoRef.current.pause();
        } catch (_) { }

        const src: any = videoRef.current.srcObject || (videoRef.current as any).mozSrcObject;
        if (src && typeof src.getTracks === 'function') {
          try {
            src.getTracks().forEach((t: MediaStreamTrack) => {
              try {
                t.stop();
              } catch (_) { }
            });
          } catch (_) { }
        }

        // Remove element from DOM
        if (videoRef.current.parentNode) {
          videoRef.current.parentNode.removeChild(videoRef.current);
        }
        // Clear srcObject to release camera
        try {
          (videoRef.current as any).srcObject = null;
        } catch (_) { }
      } catch (err) {
        // Ignore errors during cleanup
      }
      videoRef.current = null;
    }

    // Close MediaPipe instances
    if (faceMeshRef.current) {
      try {
        faceMeshRef.current.close();
      } catch (err) {
        // Ignore errors during cleanup
      }
      faceMeshRef.current = null;
    }

    if (handsRef.current) {
      try {
        handsRef.current.close();
      } catch (err) {
        // Ignore errors during cleanup
      }
      handsRef.current = null;
    }

    // Reset all guards and state
    initializationGuardRef.current = false;
    globalInitializationGuard = false;
    isInitializingRef.current = false;
    setIsInitialized(false);
    setScores({
      eyeContact: 0,
      engagement: 0,
      attention: 0,
      stability: 0,
      expression: 'confident',
      expressionConfidence: 0,
      faceDetected: false
    });
    setAggregatedScores({
      eyeContact: 0,
      engagement: 0,
      attention: 0,
      stability: 0,
      expression: 'confident',
      expressionConfidence: 0,
      sampleCount: 0,
      timestamp: Date.now(),
      faceDetected: false,
    });
    questionAccumulatorRef.current = []; // Clear accumulator
    previousHeadPositionRef.current = null;
    previousHandPositionsRef.current = [];
    currentHandLandmarksRef.current = [];

    console.log("🛑 MediaPipe analysis stopped and cleaned up");
  }, []);

  // Auto-start when enabled
  // CRITICAL: useEffect with proper cleanup for React StrictMode
  useEffect(() => {
    // Only start if enabled and not already initialized
    if (enabled && !isInitialized && !initializationGuardRef.current) {
      startAnalysis();
    } else if (!enabled && isInitialized) {
      stopAnalysis();
    }

    // Cleanup function for React StrictMode double-mount
    return () => {
      // Only cleanup if we're actually stopping (not just React StrictMode remount)
      if (!enabled) {
        stopAnalysis();
      }
    };
    // NOTE: Intentionally NOT including startAnalysis/stopAnalysis in deps
    // to prevent unnecessary re-runs. The guards handle re-initialization.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, isInitialized]);

  /**
   * Save body language data for a specific question
   */
  const saveFinalDataForQuestion = useCallback(async (qIndex: number) => {
    if (!sessionId || questionAccumulatorRef.current.length === 0) {
      console.log(`⚠️ No samples collected for Q${qIndex}, skipping save.`);
      return;
    }

    const finalAggregated = aggregateScores(questionAccumulatorRef.current);

    try {
      await saveBodyLanguageData({
        sessionId,
        eyeContact: finalAggregated.eyeContact,
        engagement: finalAggregated.engagement,
        attention: finalAggregated.attention,
        stability: finalAggregated.stability,
        expression: finalAggregated.expression as any,
        expressionConfidence: finalAggregated.expressionConfidence,
        dominantExpression: finalAggregated.dominantExpression as string,
        sampleCount: questionAccumulatorRef.current.length,
        timestamp: Date.now(),
        questionIndex: qIndex
      });
      console.log(`✅ Body language data saved for Question ${qIndex} (${questionAccumulatorRef.current.length} samples)`);

      // Clear accumulator after save
      questionAccumulatorRef.current = [];
    } catch (error) {
      console.error("❌ Error saving question body language data:", error);
    }
  }, [sessionId]);

  /**
   * Save final body language data when interview ends
   * This should be called when the interview session is completed
   * (Keeping this for legacy/cleanup, but main logic is now per-question)
   */
  const saveFinalData = useCallback(async () => {
    // If there is data in accumulator, save it for current question
    if (questionAccumulatorRef.current.length > 0) {
      await saveFinalDataForQuestion(questionIndexRef.current);
    }
  }, [saveFinalDataForQuestion]);

  return {
    scores,
    aggregatedScores,
    isInitialized,
    error,
    saveFinalData,
    stopAnalysis, // Export stopAnalysis so it can be called externally
    videoElement: videoRef.current,
    faceLandmarks: currentFaceLandmarksRef.current,
    handLandmarks: currentHandLandmarksArrayRef.current,
  };
}
