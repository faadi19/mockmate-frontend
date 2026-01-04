/**
 * MediaPipe Body Language Scoring Utilities
 * 
 * Calculates interview performance scores based on face mesh and hands landmarks
 */

// Face Mesh landmark indices (MediaPipe Face Mesh has 468 landmarks)
export const FACE_LANDMARKS = {
  // Eye landmarks
  LEFT_EYE_TOP: 159,
  LEFT_EYE_BOTTOM: 145,
  LEFT_EYE_LEFT: 33,
  LEFT_EYE_RIGHT: 133,
  LEFT_EYE_CENTER: 468, // Approximate center
  
  RIGHT_EYE_TOP: 386,
  RIGHT_EYE_BOTTOM: 374,
  RIGHT_EYE_LEFT: 362,
  RIGHT_EYE_RIGHT: 263,
  RIGHT_EYE_CENTER: 473, // Approximate center
  
  // Face direction/pose
  NOSE_TIP: 4,
  NOSE_BRIDGE: 6,
  FOREHEAD_CENTER: 10,
  CHIN: 175,
  
  // Face boundaries for presence detection
  LEFT_FACE: 234,
  RIGHT_FACE: 454,
  TOP_FACE: 10,
  BOTTOM_FACE: 175,
  
  // Mouth landmarks for expression detection
  MOUTH_LEFT: 61,
  MOUTH_RIGHT: 291,
  MOUTH_TOP: 13,
  MOUTH_BOTTOM: 14,
  MOUTH_CENTER_TOP: 12,
  MOUTH_CENTER_BOTTOM: 15,
  
  // Eyebrow landmarks
  LEFT_EYEBROW_OUTER: 70,
  LEFT_EYEBROW_INNER: 107,
  RIGHT_EYEBROW_OUTER: 300,
  RIGHT_EYEBROW_INNER: 336,
} as const;

/**
 * Calculate distance between two 3D points
 */
function distance3D(
  p1: { x: number; y: number; z?: number },
  p2: { x: number; y: number; z?: number }
): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = (p1.z || 0) - (p2.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculate distance between two 2D points
 */
function distance2D(
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate eye aspect ratio (EAR) to determine if eye is open
 * Lower EAR = eye is more closed
 */
function calculateEyeAspectRatio(
  eyeTop: { x: number; y: number },
  eyeBottom: { x: number; y: number },
  eyeLeft: { x: number; y: number },
  eyeRight: { x: number; y: number }
): number {
  // Vertical distances
  const vertical1 = distance2D(eyeTop, eyeBottom);
  const vertical2 = distance2D(eyeLeft, eyeRight);
  
  // Horizontal distance
  const horizontal = distance2D(eyeLeft, eyeRight);
  
  // EAR formula: average of vertical distances / horizontal distance
  if (horizontal === 0) return 0;
  return (vertical1 + vertical2) / (2 * horizontal);
}

/**
 * Calculate head pose direction (looking at camera vs away)
 * Returns value between 0-1, where 1 = looking directly at camera
 */
function calculateHeadPose(landmarks: any[]): number {
  if (landmarks.length < 468) return 0;
  
  // Use actual MediaPipe landmark indices
  const noseTip = landmarks[4]; // NOSE_TIP
  const noseBridge = landmarks[6]; // NOSE_BRIDGE
  const leftFace = landmarks[234]; // LEFT_FACE
  const rightFace = landmarks[454]; // RIGHT_FACE
  
  if (!noseTip || !noseBridge || !leftFace || !rightFace) {
    // Fallback: use nose tip position relative to screen center
    if (noseTip) {
      const offsetX = Math.abs(noseTip.x - 0.5);
      const offsetY = Math.abs(noseTip.y - 0.5);
      const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
      return Math.max(0, 1 - (distance / 0.4)); // Normalize
    }
    return 0;
  }
  
  // Calculate how centered the nose is (indicates facing camera)
  // MediaPipe coordinates are normalized (0-1), with (0.5, 0.5) being center
  const screenCenterX = 0.5;
  const screenCenterY = 0.5;
  
  const noseOffsetX = Math.abs(noseTip.x - screenCenterX);
  const noseOffsetY = Math.abs(noseTip.y - screenCenterY);
  
  // Convert offset to score (0-1), where 0 = far from center, 1 = centered
  const maxOffset = 0.3; // Maximum expected offset
  const scoreX = Math.max(0, 1 - (noseOffsetX / maxOffset));
  const scoreY = Math.max(0, 1 - (noseOffsetY / maxOffset));
  
  // Also check if face is rotated (using face width)
  const faceWidth = Math.abs(rightFace.x - leftFace.x);
  if (faceWidth > 0) {
    const nosePosition = (noseTip.x - leftFace.x) / faceWidth;
    const rotationScore = 1 - Math.abs(nosePosition - 0.5) * 2; // 0.5 = centered
    // Combine scores
    return Math.max(0, Math.min(1, (scoreX * 0.3 + scoreY * 0.3 + rotationScore * 0.4)));
  }
  
  // Fallback if face width calculation fails
  return Math.max(0, Math.min(1, (scoreX * 0.5 + scoreY * 0.5)));
}

/**
 * Eye Contact Detection Constants
 */
const EAR_THRESHOLD = 0.12; // Eye Aspect Ratio threshold for closed eyes (typical open eye ~0.25, closed < 0.12)
const BLINK_DURATION_MS = 300; // Maximum duration for a blink (300ms)
const EYES_CLOSED_LONG_MS = 1500; // Duration after which eyes closed is considered "long" (1.5 seconds)
const MOVING_AVERAGE_WINDOW = 10; // Number of frames for moving average smoothing
const EYES_CLOSED_REDUCTION_RATE = 0.02; // Rate at which score reduces per frame when eyes closed long (2% per frame)
const EYES_CLOSED_IMMEDIATE_PENALTY = 0.8; // Immediate penalty when eyes closed (not blink) - reduces score by 80%

/**
 * Eye State Tracker
 * Tracks eye state over time to detect blinks vs long eye closures
 */
class EyeStateTracker {
  private eyeClosedStartTime: number | null = null;
  private lastEyeOpenTime: number = Date.now();
  private scoreHistory: number[] = [];
  private lastSmoothedScore: number = 50; // Initial score

  /**
   * Update eye state and return blink/closure status
   */
  updateEyeState(isEyesOpen: boolean, currentTime: number): {
    isBlinking: boolean;
    isEyesClosedLong: boolean;
  } {
    let isBlinking = false;
    let isEyesClosedLong = false;

    if (!isEyesOpen) {
      // Eyes are closed
      if (this.eyeClosedStartTime === null) {
        // Just closed - record start time
        this.eyeClosedStartTime = currentTime;
      } else {
        // Eyes have been closed - check duration
        const closedDuration = currentTime - this.eyeClosedStartTime;
        
        if (closedDuration <= BLINK_DURATION_MS) {
          // Short closure = blink
          isBlinking = true;
        } else if (closedDuration > EYES_CLOSED_LONG_MS) {
          // Long closure = eyes closed long
          isEyesClosedLong = true;
        }
        // Between BLINK_DURATION_MS and EYES_CLOSED_LONG_MS: transition period
        // Still considered a blink if it's closer to blink duration
        else if (closedDuration < EYES_CLOSED_LONG_MS / 2) {
          isBlinking = true;
        }
      }
    } else {
      // Eyes are open
      if (this.eyeClosedStartTime !== null) {
        // Eyes just opened - check if it was a blink or long closure
        const closedDuration = currentTime - this.eyeClosedStartTime;
        
        if (closedDuration <= BLINK_DURATION_MS) {
          isBlinking = true; // Was a blink
        } else if (closedDuration > EYES_CLOSED_LONG_MS) {
          isEyesClosedLong = true; // Was a long closure
        }
        
        // Reset closed start time
        this.eyeClosedStartTime = null;
      }
      this.lastEyeOpenTime = currentTime;
    }

    return { isBlinking, isEyesClosedLong };
  }

  /**
   * Apply moving average smoothing to eye contact score
   * More responsive to drops (eyes closing) than to rises (eyes opening)
   * When score is very low (eyes closed), bypass smoothing for immediate response
   */
  smoothScore(rawScore: number, isEyesClosed: boolean = false): number {
    // If eyes are closed and score is very low, bypass smoothing for immediate response
    if (isEyesClosed && rawScore < 0.2) {
      // Directly use the low score without smoothing
      this.lastSmoothedScore = rawScore;
      // Still update history but don't use it for smoothing
      this.scoreHistory.push(rawScore);
      if (this.scoreHistory.length > MOVING_AVERAGE_WINDOW) {
        this.scoreHistory.shift();
      }
      return rawScore;
    }
    
    // Add to history
    this.scoreHistory.push(rawScore);
    
    // Keep only last N scores
    if (this.scoreHistory.length > MOVING_AVERAGE_WINDOW) {
      this.scoreHistory.shift();
    }

    // Calculate moving average
    if (this.scoreHistory.length === 0) {
      return this.lastSmoothedScore;
    }

    const sum = this.scoreHistory.reduce((acc, score) => acc + score, 0);
    const smoothed = sum / this.scoreHistory.length;
    
    // Adaptive smoothing: more responsive to drops (eyes closing) than rises
    // If score dropped significantly, be more responsive (less smoothing)
    const scoreDrop = this.lastSmoothedScore - rawScore;
    const isSignificantDrop = scoreDrop > 0.15; // More than 15% drop
    
    // Use different alpha based on whether score is dropping or rising
    // Lower alpha = more smoothing, higher alpha = more responsive
    const alpha = isSignificantDrop ? 0.8 : 0.3; // Much more responsive to drops (0.8 vs 0.6)
    
    const finalSmoothed = alpha * smoothed + (1 - alpha) * this.lastSmoothedScore;
    
    this.lastSmoothedScore = finalSmoothed;
    return finalSmoothed;
  }

  /**
   * Gradually reduce score when eyes are closed long
   */
  applyLongClosurePenalty(currentScore: number): number {
    if (this.eyeClosedStartTime === null) {
      return currentScore; // Eyes are open, no penalty
    }

    const closedDuration = Date.now() - this.eyeClosedStartTime;
    if (closedDuration <= EYES_CLOSED_LONG_MS) {
      return currentScore; // Not long enough for penalty
    }

    // Calculate penalty based on duration
    const excessDuration = closedDuration - EYES_CLOSED_LONG_MS;
    const penaltyFrames = Math.floor(excessDuration / (1000 / 30)); // Assuming ~30fps
    const penalty = Math.min(0.5, penaltyFrames * EYES_CLOSED_REDUCTION_RATE); // Max 50% reduction

    return currentScore * (1 - penalty);
  }

  /**
   * Reset tracker state
   */
  reset(): void {
    this.eyeClosedStartTime = null;
    this.lastEyeOpenTime = Date.now();
    this.scoreHistory = [];
    this.lastSmoothedScore = 50;
  }
}

// Global eye state tracker instance
let eyeStateTracker: EyeStateTracker | null = null;

/**
 * Get or create eye state tracker
 */
function getEyeStateTracker(): EyeStateTracker {
  if (!eyeStateTracker) {
    eyeStateTracker = new EyeStateTracker();
  }
  return eyeStateTracker;
}

/**
 * Eye Contact Detection Result
 */
export interface EyeContactResult {
  eyeContactScore: number; // 0-100
  isBlinking: boolean;
  isEyesClosedLong: boolean;
}

/**
 * Calculate robust eye contact score with blink handling
 * Based on:
 * - Head pose facing camera
 * - Gaze direction (iris/eye center alignment)
 * - Eye state (open/closed/blinking)
 * 
 * Handles blinks correctly: maintains score during brief blinks, reduces score only for long eye closures
 */
export function calculateEyeContactScore(faceLandmarks: any[]): number {
  const result = calculateEyeContactScoreWithState(faceLandmarks);
  return result.eyeContactScore;
}

/**
 * Calculate eye contact score with detailed state information
 * Returns score, blink status, and long closure status
 */
export function calculateEyeContactScoreWithState(faceLandmarks: any[]): EyeContactResult {
  const tracker = getEyeStateTracker();
  const currentTime = Date.now();

  if (!faceLandmarks || faceLandmarks.length < 468) {
    return {
      eyeContactScore: 0,
      isBlinking: false,
      isEyesClosedLong: false,
    };
  }
  
  try {
    // Get head pose score (primary indicator of facing camera)
    const headPoseScore = calculateHeadPose(faceLandmarks);
    
    // Get eye landmarks
    const leftEyeTop = faceLandmarks[159];
    const leftEyeBottom = faceLandmarks[145];
    const leftEyeLeft = faceLandmarks[33];
    const leftEyeRight = faceLandmarks[133];
    
    const rightEyeTop = faceLandmarks[386];
    const rightEyeBottom = faceLandmarks[374];
    const rightEyeLeft = faceLandmarks[362];
    const rightEyeRight = faceLandmarks[263];
    
    if (!leftEyeTop || !leftEyeBottom || !rightEyeTop || !rightEyeBottom) {
      // Fallback: use head pose only
      const fallbackScore = Math.round(headPoseScore * 100);
      return {
        eyeContactScore: fallbackScore,
        isBlinking: false,
        isEyesClosedLong: false,
      };
    }

    // Calculate Eye Aspect Ratio (EAR) for both eyes
    let leftEAR = 0;
    let rightEAR = 0;
    
    if (leftEyeTop && leftEyeBottom && leftEyeLeft && leftEyeRight) {
      leftEAR = calculateEyeAspectRatio(
        leftEyeTop,
        leftEyeBottom,
        leftEyeLeft,
        leftEyeRight
      );
    }
    
    if (rightEyeTop && rightEyeBottom && rightEyeLeft && rightEyeRight) {
      rightEAR = calculateEyeAspectRatio(
        rightEyeTop,
        rightEyeBottom,
        rightEyeLeft,
        rightEyeRight
      );
    }
    
    const avgEAR = (leftEAR + rightEAR) / 2;
    
    // Determine if eyes are open (EAR above threshold)
    const isEyesOpen = avgEAR > EAR_THRESHOLD;

    // Update eye state tracker to detect blinks vs long closures
    const eyeState = tracker.updateEyeState(isEyesOpen, currentTime);
    const { isBlinking, isEyesClosedLong } = eyeState;

    // Calculate gaze direction score (iris/eye center alignment)
    // Use eye center position relative to eye boundaries to estimate gaze
    // When looking at camera, iris should be near center of eye
    const leftEyeWidth = Math.abs(leftEyeRight.x - leftEyeLeft.x);
    const rightEyeWidth = Math.abs(rightEyeRight.x - rightEyeLeft.x);
    
    let gazeScore = 0.5; // Default neutral gaze score
    
    if (leftEyeWidth > 0 && rightEyeWidth > 0) {
      // Calculate eye center (geometric center of eye boundaries)
      const leftEyeCenterX = (leftEyeLeft.x + leftEyeRight.x) / 2;
      const rightEyeCenterX = (rightEyeLeft.x + rightEyeRight.x) / 2;
      
      // For gaze estimation, we approximate iris position using eye center landmarks
      // In MediaPipe, the eye center landmarks (if available) would be more accurate
      // For now, we use the geometric center as an approximation
      // When looking forward, the iris should be near the geometric center
      // We calculate symmetry: how well-aligned both eyes are (both looking forward)
      
      // Calculate symmetry score: both eyes should be similarly positioned
      // If both eyes are centered, the person is likely looking forward
      const leftEyeSymmetry = 1 - Math.abs(leftEyeCenterX - 0.5); // 0.5 = screen center
      const rightEyeSymmetry = 1 - Math.abs(rightEyeCenterX - 0.5);
      
      // Average symmetry (both eyes centered = good gaze)
      const avgSymmetry = (leftEyeSymmetry + rightEyeSymmetry) / 2;
      
      // Convert to gaze score (normalized to 0-1)
      // Higher symmetry = better gaze direction
      gazeScore = Math.max(0, Math.min(1, avgSymmetry * 2)); // Scale to 0-1 range
    }

    // Calculate raw eye contact score
    // Head pose (50%) + Gaze direction (30%) + Eye openness (20%)
    // Note: When eyes are closed, we reduce ALL components, not just eye openness
    let eyeOpenScore = 1.0; // Default: eyes open = full score
    let headPoseMultiplier = 1.0; // Multiplier for head pose when eyes closed
    let gazeMultiplier = 1.0; // Multiplier for gaze when eyes closed
    
    if (!isEyesOpen) {
      // Eyes are closed - score depends on whether it's a blink or longer closure
      if (isBlinking) {
        // During blink (< 300ms): maintain all scores (don't penalize)
        eyeOpenScore = 1.0; // Keep full score during blink
        headPoseMultiplier = 1.0;
        gazeMultiplier = 1.0;
      } else {
        // Eyes closed for longer than blink duration - AGGRESSIVELY reduce ALL components
        eyeOpenScore = 0.0; // No eye contact when eyes closed
        headPoseMultiplier = 0.3; // Reduce head pose contribution (can't have eye contact without eyes)
        gazeMultiplier = 0.2; // Reduce gaze contribution (can't determine gaze without eyes)
      }
    } else {
      // Eyes are open - use EAR to determine quality
      const normalizedEAR = Math.min(1, Math.max(0, avgEAR / 0.25)); // Normalize to 0-1
      eyeOpenScore = normalizedEAR;
    }

    // Combine components with multipliers
    let rawScore = (headPoseScore * 0.5 * headPoseMultiplier) + 
                   (gazeScore * 0.3 * gazeMultiplier) + 
                   (eyeOpenScore * 0.2);
    
    // Apply additional penalty for long eye closure (gradual reduction beyond initial penalty)
    if (isEyesClosedLong) {
      rawScore = tracker.applyLongClosurePenalty(rawScore);
    }
    
    // CRITICAL: If eyes are closed (not blinking), apply AGGRESSIVE immediate penalty
    // This ensures score drops IMMEDIATELY and SIGNIFICANTLY when eyes close
    if (!isEyesOpen && !isBlinking) {
      // Apply aggressive penalty: reduce overall score by 80% when eyes are closed
      rawScore = rawScore * (1 - EYES_CLOSED_IMMEDIATE_PENALTY);
      
      // Additional: Cap the maximum score when eyes are closed to ensure it's very low
      rawScore = Math.min(rawScore, 0.15); // Max 15% when eyes closed (not blinking)
    }

    // Apply moving average smoothing - bypass when eyes are closed for immediate response
    const smoothedScore = tracker.smoothScore(rawScore, !isEyesOpen && !isBlinking);

    // Convert to 0-100 scale
    const finalScore = Math.round(Math.max(0, Math.min(100, smoothedScore * 100)));

    // Debug logging (always log when eyes are closed to help diagnose)
    if (!isEyesOpen && !isBlinking) {
      console.log("👁️ Eyes Closed - Score Dropping:", {
        avgEAR: avgEAR.toFixed(3),
        EAR_THRESHOLD,
        isEyesOpen,
        isBlinking,
        isEyesClosedLong,
        eyeOpenScore: eyeOpenScore.toFixed(2),
        headPoseScore: headPoseScore.toFixed(2),
        gazeScore: gazeScore.toFixed(2),
        headPoseMultiplier: headPoseMultiplier.toFixed(2),
        gazeMultiplier: gazeMultiplier.toFixed(2),
        rawScore: rawScore.toFixed(2),
        smoothedScore: smoothedScore.toFixed(2),
        finalScore,
      });
    }

    return {
      eyeContactScore: finalScore,
      isBlinking,
      isEyesClosedLong,
    };
  } catch (error) {
    console.error("Error calculating eye contact score:", error);
    return {
      eyeContactScore: 0,
      isBlinking: false,
      isEyesClosedLong: false,
    };
  }
}

/**
 * Calculate engagement score (0-100)
 * Based on:
 * - Face presence (face detected)
 * - Eye openness (engaged people keep eyes open)
 * - Head position (engaged people face forward)
 */
export function calculateEngagementScore(faceLandmarks: any[]): number {
  if (!faceLandmarks || faceLandmarks.length < 468) return 0;
  
  try {
    // Face presence score (1 if face detected, 0 if not)
    const facePresenceScore = 1.0;
    
    // Eye openness score - use actual indices
    const leftEyeTop = faceLandmarks[159];
    const leftEyeBottom = faceLandmarks[145];
    const leftEyeLeft = faceLandmarks[33];
    const leftEyeRight = faceLandmarks[133];
    
    const rightEyeTop = faceLandmarks[386];
    const rightEyeBottom = faceLandmarks[374];
    const rightEyeLeft = faceLandmarks[362];
    const rightEyeRight = faceLandmarks[263];
    
    let eyeOpenScore = 0.5; // Default if landmarks missing
    
    if (leftEyeTop && leftEyeBottom && leftEyeLeft && leftEyeRight &&
        rightEyeTop && rightEyeBottom && rightEyeLeft && rightEyeRight) {
      const leftEAR = calculateEyeAspectRatio(
        leftEyeTop,
        leftEyeBottom,
        leftEyeLeft,
        leftEyeRight
      );
      const rightEAR = calculateEyeAspectRatio(
        rightEyeTop,
        rightEyeBottom,
        rightEyeLeft,
        rightEyeRight
      );
      
      const avgEAR = (leftEAR + rightEAR) / 2;
      eyeOpenScore = Math.min(1, Math.max(0, avgEAR / 0.25)); // Normalize
    }
    
    // Head position score (facing forward = more engaged)
    const headPoseScore = calculateHeadPose(faceLandmarks);
    
    // Combine: presence (20%), eye openness (40%), head pose (40%)
    const finalScore = 
      facePresenceScore * 0.2 + 
      eyeOpenScore * 0.4 + 
      headPoseScore * 0.4;
    
    return Math.round(Math.max(0, Math.min(100, finalScore * 100)));
  } catch (error) {
    console.error("Error calculating engagement score:", error);
    return 0;
  }
}

/**
 * Calculate attention score (0-100)
 * Similar to engagement but focuses on sustained attention
 * Based on:
 * - Consistent head position
 * - Eye openness maintained
 * - Face stability
 */
export function calculateAttentionScore(
  faceLandmarks: any[],
  previousHeadPosition?: { x: number; y: number }
): number {
  if (!faceLandmarks || faceLandmarks.length < 468) return 0;
  
  try {
    // Base attention from engagement metrics
    const baseScore = calculateEngagementScore(faceLandmarks) / 100;
    
    // Stability bonus (if previous position exists)
    let stabilityBonus = 0;
    if (previousHeadPosition) {
      const noseTip = faceLandmarks[FACE_LANDMARKS.NOSE_TIP];
      if (noseTip) {
        const movement = distance2D(
          { x: noseTip.x, y: noseTip.y },
          previousHeadPosition
        );
        // Less movement = more stable = higher attention
        // Movement threshold: 0.05 (normalized coordinates)
        stabilityBonus = Math.max(0, 1 - (movement / 0.05));
      }
    } else {
      stabilityBonus = 0.5; // Default if no previous data
    }
    
    // Combine base score (70%) with stability (30%)
    const finalScore = baseScore * 0.7 + stabilityBonus * 0.3;
    
    return Math.round(Math.max(0, Math.min(100, finalScore * 100)));
  } catch (error) {
    console.error("Error calculating attention score:", error);
    return 0;
  }
}

/**
 * Calculate stability score (0-100)
 * Based on:
 * - Head movement over time
 * - Hand movement (if hands detected)
 */
export function calculateStabilityScore(
  currentHeadPosition: { x: number; y: number } | null,
  previousHeadPosition: { x: number; y: number } | null,
  currentHandPositions: Array<{ x: number; y: number }> | null,
  previousHandPositions: Array<{ x: number; y: number }> | null
): number {
  try {
    let headStability = 1.0;
    let handStability = 1.0;
    
    // Calculate head movement
    if (currentHeadPosition && previousHeadPosition) {
      const headMovement = distance2D(currentHeadPosition, previousHeadPosition);
      // Normalize: movement < 0.02 = stable, > 0.1 = very unstable
      headStability = Math.max(0, 1 - (headMovement / 0.1));
    } else if (!currentHeadPosition) {
      headStability = 0; // No head = no stability
    }
    
    // Calculate hand movement
    if (currentHandPositions && previousHandPositions && 
        currentHandPositions.length > 0 && previousHandPositions.length > 0) {
      // Calculate average movement across all hand landmarks
      let totalMovement = 0;
      const minLength = Math.min(currentHandPositions.length, previousHandPositions.length);
      
      for (let i = 0; i < minLength; i++) {
        totalMovement += distance2D(currentHandPositions[i], previousHandPositions[i]);
      }
      
      const avgMovement = totalMovement / minLength;
      // Normalize: movement < 0.03 = stable, > 0.15 = very unstable
      handStability = Math.max(0, 1 - (avgMovement / 0.15));
    } else if (!currentHandPositions || currentHandPositions.length === 0) {
      // No hands detected = neutral (don't penalize)
      handStability = 0.5;
    }
    
    // Combine: head stability (60%), hand stability (40%)
    const finalScore = headStability * 0.6 + handStability * 0.4;
    
    return Math.round(Math.max(0, Math.min(100, finalScore * 100)));
  } catch (error) {
    console.error("Error calculating stability score:", error);
    return 50; // Default neutral score
  }
}

/**
 * Get head position from face landmarks (for stability tracking)
 */
export function getHeadPosition(faceLandmarks: any[]): { x: number; y: number } | null {
  if (!faceLandmarks || faceLandmarks.length < 468) return null;
  
  try {
    const noseTip = faceLandmarks[4]; // NOSE_TIP index
    if (noseTip && typeof noseTip.x === 'number' && typeof noseTip.y === 'number') {
      return { x: noseTip.x, y: noseTip.y };
    }
  } catch (error) {
    console.error("Error getting head position:", error);
  }
  
  return null;
}

/**
 * Get hand positions from hand landmarks (for stability tracking)
 */
export function getHandPositions(handLandmarks: any[]): Array<{ x: number; y: number }> {
  if (!handLandmarks || handLandmarks.length === 0) return [];
  
  try {
    // Return all hand landmarks as positions
    return handLandmarks.map((landmark: any) => ({
      x: landmark.x,
      y: landmark.y,
    }));
  } catch (error) {
    console.error("Error getting hand positions:", error);
    return [];
  }
}

/**
 * Check if hand is near head/face (thinking pose, nervous gesture)
 * MediaPipe Hands landmarks: 0 = wrist, 4/8 = thumb/index tips, 12/16/20 = finger tips
 */
export function isHandNearHead(
  handLandmarks: any[],
  faceLandmarks: any[]
): boolean {
  if (!handLandmarks || handLandmarks.length === 0 || !faceLandmarks || faceLandmarks.length < 468) {
    return false;
  }
  
  try {
    // Get key hand points (wrist and finger tips)
    const wrist = handLandmarks[0]; // Wrist
    const indexTip = handLandmarks[8]; // Index finger tip
    const middleTip = handLandmarks[12]; // Middle finger tip
    
    // Get face reference points
    const forehead = faceLandmarks[10]; // FOREHEAD_CENTER
    const chin = faceLandmarks[175]; // CHIN
    const leftFace = faceLandmarks[234]; // LEFT_FACE
    const rightFace = faceLandmarks[454]; // RIGHT_FACE
    
    if (!wrist || !forehead || !chin) return false;
    
    // Calculate face boundaries (make detection more sensitive)
    const faceTop = forehead.y;
    const faceBottom = chin.y;
    const faceLeft = Math.min(leftFace?.x || 0, rightFace?.x || 1);
    const faceRight = Math.max(leftFace?.x || 1, rightFace?.x || 0);
    
    // Check if hand is in the head region (above chin, near face sides or top)
    const handY = wrist.y;
    const handX = wrist.x;
    
    // Hand should be above or near face (y < faceBottom + larger margin for better detection)
    const isAboveFace = handY < faceBottom + 0.15; // Increased margin from 0.1 to 0.15
    
    // Hand should be near face horizontally (within face width + larger margin)
    const faceWidth = Math.abs(faceRight - faceLeft);
    const faceCenterX = (faceLeft + faceRight) / 2;
    const horizontalDistance = Math.abs(handX - faceCenterX);
    const isNearFaceHorizontally = horizontalDistance < (faceWidth / 2 + 0.20); // Increased margin from 0.15 to 0.20
    
    // Check if finger tips are near forehead/head area (thinking pose) - more sensitive
    let isFingerNearHead = false;
    if (indexTip && middleTip && forehead) {
      const indexDistance = distance2D(indexTip, forehead);
      const middleDistance = distance2D(middleTip, forehead);
      // If finger tips are close to forehead (thinking pose) - more sensitive threshold
      isFingerNearHead = indexDistance < 0.20 || middleDistance < 0.20; // Increased from 0.15 to 0.20
    }
    
    // Also check if wrist is near forehead (hand on head)
    let isWristNearHead = false;
    if (wrist && forehead) {
      const wristDistance = distance2D(wrist, forehead);
      isWristNearHead = wristDistance < 0.25; // Wrist near forehead = hand on head
    }
    
    // Hand is near head if: (above face AND near horizontally) OR (finger near head) OR (wrist near head)
    return (isAboveFace && isNearFaceHorizontally) || isFingerNearHead || isWristNearHead;
  } catch (error) {
    console.error("Error checking hand near head:", error);
    return false;
  }
}

/**
 * Behavior-Based Facial Expression Types for Interview Analysis
 * These are NOT emotions, but behavioral states relevant to interview performance
 */
// Behavior-based facial expression types for interview analysis
// Neutral state removed - Confident is the default when no strong indicators are present
export type FacialExpression = 'confident' | 'nervous' | 'distracted';

export interface ExpressionResult {
  expression: FacialExpression;
  confidence: number; // 0-100
  nervousScore: number; // 0-100
  distractionScore: number; // 0-100
}

/**
 * Calculate mouth aspect ratio (MAR) - indicates mouth opening
 * Higher MAR = mouth more open (could indicate surprise, speaking, or nervousness)
 */
function calculateMouthAspectRatio(
  mouthTop: { x: number; y: number },
  mouthBottom: { x: number; y: number },
  mouthLeft: { x: number; y: number },
  mouthRight: { x: number; y: number }
): number {
  const vertical = distance2D(mouthTop, mouthBottom);
  const horizontal = distance2D(mouthLeft, mouthRight);
  
  if (horizontal === 0) return 0;
  return vertical / horizontal;
}

/**
 * Calculate mouth curvature - positive = smile (corners up), negative = frown (corners down)
 * Uses relative positions normalized by mouth width to be robust to head movement
 */
function calculateMouthCurvature(
  mouthLeft: { x: number; y: number },
  mouthRight: { x: number; y: number },
  mouthCenter: { x: number; y: number },
  mouthTop?: { x: number; y: number },
  mouthBottom?: { x: number; y: number }
): number {
  // Calculate mouth width for normalization (makes it robust to head distance/rotation)
  const mouthWidth = Math.abs(mouthRight.x - mouthLeft.x);
  
  if (mouthWidth === 0) return 0;
  
  // Calculate if mouth corners are above or below center (relative to mouth width)
  const leftOffset = mouthLeft.y - mouthCenter.y;
  const rightOffset = mouthRight.y - mouthCenter.y;
  const avgOffset = (leftOffset + rightOffset) / 2;
  
  // Normalize by mouth width to make it robust to head movement/distance
  // This ensures the same expression gives similar values regardless of head position
  const normalizedOffset = avgOffset / mouthWidth;
  
  // Positive = corners up (smile), Negative = corners down (frown/sad)
  return -normalizedOffset; // Negative because y increases downward
}

/**
 * Calculate face size for normalization (to handle different distances)
 * Returns face height (forehead to chin) as a reference scale
 */
function calculateFaceSize(landmarks: any[]): number {
  try {
    const forehead = landmarks[10];  // FOREHEAD_CENTER
    const chin = landmarks[175];     // CHIN
    if (forehead && chin) {
      return distance2D(forehead, chin);
    }
    // Fallback: use face width
    const leftFace = landmarks[234];  // LEFT_FACE
    const rightFace = landmarks[454]; // RIGHT_FACE
    if (leftFace && rightFace) {
      return distance2D(leftFace, rightFace);
    }
    return 0.3; // Default face size if can't calculate
  } catch {
    return 0.3;
  }
}

/**
 * Calculate eyebrow position - raised eyebrows indicate surprise/nervousness
 * Now normalized by face size to handle different distances
 */
function calculateEyebrowPosition(
  eyebrowOuter: { x: number; y: number },
  eyebrowInner: { x: number; y: number },
  eyeTop: { x: number; y: number },
  faceSize: number = 0.3 // Normalized face size for scaling
): number {
  // Calculate average eyebrow y position
  const eyebrowY = (eyebrowOuter.y + eyebrowInner.y) / 2;
  // Compare with eye top - if eyebrow is much higher, it's raised
  const raiseAmount = eyeTop.y - eyebrowY;
  
  // Normalize by face size to handle different distances
  // When face is far, faceSize is smaller, so raiseAmount needs to be normalized
  // When face is close, faceSize is larger, so raiseAmount is already larger
  const normalizedRaise = faceSize > 0 ? raiseAmount / faceSize : raiseAmount;
  
  return normalizedRaise;
}

/**
 * Behavior-Based Facial Expression Detection Constants
 * These thresholds are based on interview-relevant behavioral indicators
 */
const NORMAL_BLINK_RATE_PER_MINUTE = 15; // Average human blink rate: 15-20 blinks/min
const NERVOUS_BLINK_RATE_THRESHOLD = 18; // Blinks/min above this = nervous (lowered significantly)
const MIN_STATE_DURATION_MS = 800; // State must persist for at least 0.8 seconds (reduced for faster response)
const HEAD_AWAY_THRESHOLD = 0.25; // Head offset > 25% from center = distracted (lowered for better detection)
const LONG_EYE_CLOSURE_MS = 1200; // Eyes closed > 1.2s = distracted (lowered for faster detection)
const MOUTH_TIGHTNESS_THRESHOLD = 0.22; // Mouth aspect ratio < 0.22 = tight lips (nervous) - more lenient
const HEAD_DOWN_THRESHOLD = 0.51; // Head y position > 0.51 = looking down (nervous/distracted) - lowered
const NERVOUS_SCORE_THRESHOLD = 15; // Nervous score > 15 triggers nervous state (lowered for better detection)
const DISTRACTED_SCORE_THRESHOLD = 25; // Distraction score > 25 triggers distracted state (lowered significantly)
const HEAD_POSE_AWAY_THRESHOLD = 0.6; // headPoseScore < 0.6 = looking away (lowered from 0.5)
const MOUTH_MOVEMENT_VARIANCE_THRESHOLD = 0.004; // Variance threshold for frequent mouth movement (lowered)

/**
 * Temporal State Tracker for Behavior-Based Expression Detection
 * Tracks metrics over time to detect persistent behavioral patterns
 */
class BehaviorStateTracker {
  private blinkHistory: number[] = []; // Timestamps of blinks
  private headPositionHistory: Array<{ x: number; y: number; timestamp: number }> = [];
  private eyeClosureHistory: Array<{ startTime: number; endTime: number | null }> = [];
  private mouthMovementHistory: number[] = []; // Mouth aspect ratio history
  private currentState: FacialExpression = 'confident'; // Default state
  private stateStartTime: number = Date.now();
  private stateHistory: Array<{ state: FacialExpression; startTime: number; endTime: number }> = [];
  
  // Time window for analysis (last 10 seconds)
  private readonly ANALYSIS_WINDOW_MS = 10000;
  private readonly MAX_HISTORY_SIZE = 100;

  /**
   * Record a blink event
   */
  recordBlink(timestamp: number): void {
    this.blinkHistory.push(timestamp);
    // Keep only recent blinks (within analysis window)
    const cutoff = timestamp - this.ANALYSIS_WINDOW_MS;
    this.blinkHistory = this.blinkHistory.filter(t => t > cutoff);
  }

  /**
   * Calculate current blink rate (blinks per minute)
   */
  getBlinkRate(): number {
    if (this.blinkHistory.length < 2) return NORMAL_BLINK_RATE_PER_MINUTE;
    
    const oldestBlink = this.blinkHistory[0];
    const newestBlink = this.blinkHistory[this.blinkHistory.length - 1];
    const timeSpan = newestBlink - oldestBlink;
    
    if (timeSpan < 1000) return NORMAL_BLINK_RATE_PER_MINUTE; // Need at least 1 second of data
    
    const blinksPerSecond = (this.blinkHistory.length - 1) / (timeSpan / 1000);
    return blinksPerSecond * 60; // Convert to per minute
  }

  /**
   * Record head position
   */
  recordHeadPosition(x: number, y: number, timestamp: number): void {
    this.headPositionHistory.push({ x, y, timestamp });
    // Keep only recent positions
    const cutoff = timestamp - this.ANALYSIS_WINDOW_MS;
    this.headPositionHistory = this.headPositionHistory.filter(p => p.timestamp > cutoff);
    if (this.headPositionHistory.length > this.MAX_HISTORY_SIZE) {
      this.headPositionHistory.shift();
    }
  }

  /**
   * Check if head is frequently away from camera
   */
  isHeadFrequentlyAway(): boolean {
    if (this.headPositionHistory.length < 2) return false; // Reduced minimum requirement even more
    
    let awayCount = 0;
    for (const pos of this.headPositionHistory) {
      const offsetX = Math.abs(pos.x - 0.5);
      const offsetY = Math.abs(pos.y - 0.5);
      const totalOffset = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
      if (totalOffset > HEAD_AWAY_THRESHOLD) {
        awayCount++;
      }
    }
    
    // If > 40% of recent positions are away, consider frequently away (lowered from 50%)
    return (awayCount / this.headPositionHistory.length) > 0.4;
  }

  /**
   * Check if head is frequently looking down
   */
  isHeadFrequentlyDown(): boolean {
    if (this.headPositionHistory.length < 3) return false; // Reduced minimum requirement
    
    let downCount = 0;
    for (const pos of this.headPositionHistory) {
      if (pos.y > HEAD_DOWN_THRESHOLD) {
        downCount++;
      }
    }
    
    // If > 40% of recent positions are down, consider frequently down (lowered from 50%)
    return (downCount / this.headPositionHistory.length) > 0.4;
  }

  /**
   * Record eye closure
   */
  recordEyeClosure(isEyesOpen: boolean, timestamp: number): void {
    const lastClosure = this.eyeClosureHistory[this.eyeClosureHistory.length - 1];
    
    if (!isEyesOpen) {
      // Eyes just closed
      if (!lastClosure || lastClosure.endTime !== null) {
        this.eyeClosureHistory.push({ startTime: timestamp, endTime: null });
      }
    } else {
      // Eyes just opened
      if (lastClosure && lastClosure.endTime === null) {
        lastClosure.endTime = timestamp;
      }
    }
    
    // Clean old closures
    const cutoff = timestamp - this.ANALYSIS_WINDOW_MS;
    this.eyeClosureHistory = this.eyeClosureHistory.filter(c => c.startTime > cutoff);
  }

  /**
   * Check if there are long eye closures
   */
  hasLongEyeClosures(): boolean {
    const now = Date.now();
    for (const closure of this.eyeClosureHistory) {
      const duration = (closure.endTime || now) - closure.startTime;
      if (duration > LONG_EYE_CLOSURE_MS) {
        return true;
      }
    }
    return false;
  }

  /**
   * Record mouth movement
   */
  recordMouthMovement(mouthAspectRatio: number): void {
    this.mouthMovementHistory.push(mouthAspectRatio);
    if (this.mouthMovementHistory.length > this.MAX_HISTORY_SIZE) {
      this.mouthMovementHistory.shift();
    }
  }
  
  /**
   * Get head position history (for variance calculation)
   */
  getHeadPositionHistory(): Array<{ x: number; y: number; timestamp: number }> {
    return this.headPositionHistory;
  }
  
  /**
   * Get mouth movement history
   */
  getMouthMovementHistory(): number[] {
    return this.mouthMovementHistory;
  }

  /**
   * Check if mouth is frequently tight (nervous indicator)
   */
  isMouthFrequentlyTight(): boolean {
    if (this.mouthMovementHistory.length < 3) return false; // Reduced minimum requirement
    
    let tightCount = 0;
    for (const ratio of this.mouthMovementHistory) {
      if (ratio < MOUTH_TIGHTNESS_THRESHOLD) {
        tightCount++;
      }
    }
    
    // If > 35% of recent frames show tight mouth, consider frequently tight (lowered for better detection)
    return (tightCount / this.mouthMovementHistory.length) > 0.35;
  }

  /**
   * Update current state with persistence check
   */
  updateState(newState: FacialExpression, timestamp: number): FacialExpression {
    if (newState !== this.currentState) {
      // State changed - check if it's been long enough
      const stateDuration = timestamp - this.stateStartTime;
      
      if (stateDuration >= MIN_STATE_DURATION_MS) {
        // State persisted long enough - allow change
        if (this.stateHistory.length > 0) {
          const lastState = this.stateHistory[this.stateHistory.length - 1];
          lastState.endTime = this.stateStartTime;
        }
        
        this.stateHistory.push({
          state: this.currentState,
          startTime: this.stateStartTime,
          endTime: timestamp,
        });
        
        this.currentState = newState;
        this.stateStartTime = timestamp;
      }
      // If state hasn't persisted long enough, keep previous state
    } else {
      // Same state - reset start time if needed
      this.stateStartTime = timestamp;
    }
    
    return this.currentState;
  }

  /**
   * Get current state
   */
  getCurrentState(): FacialExpression {
    return this.currentState;
  }

  /**
   * Get mouth movement history (for variance calculation)
   */
  getMouthMovementHistory(): number[] {
    return [...this.mouthMovementHistory]; // Return copy
  }

  /**
   * Reset tracker
   */
  reset(): void {
    this.blinkHistory = [];
    this.headPositionHistory = [];
    this.eyeClosureHistory = [];
    this.mouthMovementHistory = [];
    this.currentState = 'confident'; // Default state
    this.stateStartTime = Date.now();
    this.stateHistory = [];
  }
}

// Global behavior state tracker instance
let behaviorTracker: BehaviorStateTracker | null = null;

function getBehaviorTracker(): BehaviorStateTracker {
  if (!behaviorTracker) {
    behaviorTracker = new BehaviorStateTracker();
  }
  return behaviorTracker;
}

/**
 * Behavior-Based Facial Expression Detection for Interview Analysis
 * 
 * WHY BEHAVIOR-BASED EXPRESSIONS ARE MORE RELIABLE FOR INTERVIEWS:
 * 
 * 1. Explainable: Each state is based on measurable behavioral indicators
 *    (blink rate, head position, eye contact) rather than subjective emotions.
 * 
 * 2. Actionable: Interviewers can provide specific feedback:
 *    - "Your blink rate increased during that question" (nervous)
 *    - "You maintained good eye contact" (confident)
 *    - "You looked away frequently" (distracted)
 * 
 * 3. Consistent: Behavior metrics are more stable across different
 *    lighting, camera angles, and individual facial features.
 * 
 * 4. Industry-Relevant: These states directly correlate with interview
 *    performance indicators that matter to employers.
 * 
 * @param faceLandmarks - Face mesh landmarks from MediaPipe
 * @param handLandmarks - Optional hand landmarks for additional nervous indicators
 * @returns ExpressionResult with behavior-based state and confidence scores
 */
export function detectFacialExpression(
  faceLandmarks: any[],
  handLandmarks?: any[]
): ExpressionResult {
  if (!faceLandmarks || faceLandmarks.length < 468) {
    return { 
      expression: 'neutral', 
      confidence: 0,
      nervousScore: 0,
      distractionScore: 0
    };
  }
  
  try {
    const tracker = getBehaviorTracker();
    const currentTime = Date.now();
    
    // Get essential landmarks
    const noseTip = faceLandmarks[4]; // NOSE_TIP
    const leftEyeTop = faceLandmarks[159];
    const leftEyeBottom = faceLandmarks[145];
    const leftEyeLeft = faceLandmarks[33];
    const leftEyeRight = faceLandmarks[133];
    const rightEyeTop = faceLandmarks[386];
    const rightEyeBottom = faceLandmarks[374];
    const rightEyeLeft = faceLandmarks[362];
    const rightEyeRight = faceLandmarks[263];
    const mouthTop = faceLandmarks[13];
    const mouthBottom = faceLandmarks[14];
    const mouthLeft = faceLandmarks[61];
    const mouthRight = faceLandmarks[291];
    
    if (!noseTip || !leftEyeTop || !leftEyeBottom || !mouthTop || !mouthBottom) {
      return { 
        expression: 'confident', // Default state when face not detected
        confidence: 0,
        nervousScore: 0,
        distractionScore: 0
      };
    }
    
    // Calculate Eye Aspect Ratio (EAR) to detect blinks and eye openness
    let leftEAR = 0;
    let rightEAR = 0;
    let avgEAR = 0;
    let isEyesOpen = false;
    
    if (leftEyeTop && leftEyeBottom && leftEyeLeft && leftEyeRight &&
        rightEyeTop && rightEyeBottom && rightEyeLeft && rightEyeRight) {
      leftEAR = calculateEyeAspectRatio(leftEyeTop, leftEyeBottom, leftEyeLeft, leftEyeRight);
      rightEAR = calculateEyeAspectRatio(rightEyeTop, rightEyeBottom, rightEyeLeft, rightEyeRight);
      avgEAR = (leftEAR + rightEAR) / 2;
      isEyesOpen = avgEAR > EAR_THRESHOLD;
    }
    
    // Track eye closures for blink detection
    const previousEyesOpen = tracker.getCurrentState() !== 'distracted' || isEyesOpen;
    if (!isEyesOpen && previousEyesOpen) {
      // Just blinked
      tracker.recordBlink(currentTime);
    }
    tracker.recordEyeClosure(isEyesOpen, currentTime);
    
    // Get head position (normalized coordinates)
    const headX = noseTip.x;
    const headY = noseTip.y;
    tracker.recordHeadPosition(headX, headY, currentTime);
    
    // Calculate head pose score (how well face is facing camera)
    const headPoseScore = calculateHeadPose(faceLandmarks);
    
    // Calculate mouth aspect ratio (for tightness detection)
    let mouthAspectRatio = 0;
    if (mouthTop && mouthBottom && mouthLeft && mouthRight) {
      mouthAspectRatio = calculateMouthAspectRatio(mouthTop, mouthBottom, mouthLeft, mouthRight);
      tracker.recordMouthMovement(mouthAspectRatio);
    }
    
    // Calculate behavioral scores
    let nervousScore = 0;
    let distractionScore = 0;
    let confidentScore = 0;
    
    // ============================================
    // 1. NERVOUS / ANXIOUS DETECTION
    // ============================================
    const blinkRate = tracker.getBlinkRate();
    const isHighBlinkRate = blinkRate > NERVOUS_BLINK_RATE_THRESHOLD;
    const isMouthTight = tracker.isMouthFrequentlyTight();
    const isHeadDown = tracker.isHeadFrequentlyDown();
    const handNearHead = handLandmarks ? isHandNearHead(handLandmarks, faceLandmarks) : false;
    
    // Nervous indicators (each adds to score)
    // Requirements: Blink rate significantly higher, lip tightness OR frequent mouth movement,
    // slight head-down posture, micro facial movements
    
    // 1. Blink rate significantly higher than normal
    if (isHighBlinkRate) {
      // Blink rate significantly above normal
      const excessBlinks = blinkRate - NORMAL_BLINK_RATE_PER_MINUTE;
      nervousScore += Math.min(60, excessBlinks * 5); // Increased: more points per excess blink
    }
    
    // Also check if blink rate is moderately high (between normal and threshold)
    if (blinkRate > NORMAL_BLINK_RATE_PER_MINUTE && blinkRate <= NERVOUS_BLINK_RATE_THRESHOLD) {
      nervousScore += 30; // Increased: Moderate increase in blink rate
    }
    
    // Even if blink rate is just slightly above normal, give some points
    if (blinkRate > NORMAL_BLINK_RATE_PER_MINUTE * 1.05) {
      nervousScore += 15; // Increased: Slight increase in blink rate
    }
    
    // 2. Lip tightness OR frequent mouth movement
    if (isMouthTight) {
      nervousScore += 45; // Increased: Tight lips indicate tension
    }
    
    // Also check current mouth tightness (not just history) - IMMEDIATE detection
    if (mouthAspectRatio < MOUTH_TIGHTNESS_THRESHOLD) {
      nervousScore += 30; // Increased: Current mouth is tight (immediate)
    }
    
    // Check for frequent mouth movement (variance in mouth aspect ratio)
    const mouthHistory = tracker.getMouthMovementHistory();
    let hasFrequentMouthMovement = false;
    if (mouthHistory.length > 2) { // Reduced minimum requirement even more
      const mouthVariance = calculateVariance(mouthHistory);
      if (mouthVariance > MOUTH_MOVEMENT_VARIANCE_THRESHOLD) {
        hasFrequentMouthMovement = true;
        nervousScore += Math.min(40, mouthVariance * 1500); // Increased: Frequent mouth movements
      }
    }
    
    // Also check if mouth is currently moving (current vs previous)
    if (mouthHistory.length > 1) {
      const lastMouthRatio = mouthHistory[mouthHistory.length - 1];
      const prevMouthRatio = mouthHistory[mouthHistory.length - 2];
      const mouthChange = Math.abs(lastMouthRatio - prevMouthRatio);
      if (mouthChange > 0.05) {
        nervousScore += 15; // Current mouth movement detected
      }
    }
    
    // 3. Slight head-down posture
    // Check current head position (not just history) - IMMEDIATE detection
    if (headY > HEAD_DOWN_THRESHOLD) {
      nervousScore += 35; // Increased: Looking down (slight head-down posture) - immediate
    }
    
    if (isHeadDown) {
      nervousScore += 25; // Increased: Additional points if frequently down (persistent head-down)
    }
    
    // 4. Hand near head / on head (STRONG NERVOUS INDICATOR - doesn't conflict with confident)
    // This is a clear nervous/thinking gesture that should override confident
    if (handNearHead) {
      nervousScore += 50; // STRONG: Hand near/on head (thinking/nervous gesture) - high weight
      
      // If hand is on head AND other nervous indicators present, add bonus
      if (isHighBlinkRate || isMouthTight || headY > HEAD_DOWN_THRESHOLD) {
        nervousScore += 25; // Combination bonus: hand on head + other nervous indicators
      }
    }
    
    // Additional micro movement detection: check if head position has small but frequent changes
    const headPositionHistory = tracker.getHeadPositionHistory();
    if (headPositionHistory.length > 3) { // Reduced minimum requirement
      const headXHistory = headPositionHistory.map(p => p.x);
      const headYHistory = headPositionHistory.map(p => p.y);
      const headXVariance = calculateVariance(headXHistory);
      const headYVariance = calculateVariance(headYHistory);
      
      // Small but frequent head movements (micro movements) - more lenient
      if (headXVariance > 0.001 && headXVariance < 0.025 && 
          headYVariance > 0.001 && headYVariance < 0.025) {
        nervousScore += 20; // Increased: Micro facial movements detected
      }
    }
    
    // Also check for immediate head movement (current vs previous)
    if (headPositionHistory.length > 1) {
      const lastPos = headPositionHistory[headPositionHistory.length - 1];
      const prevPos = headPositionHistory[headPositionHistory.length - 2];
      const headMovement = Math.sqrt(
        Math.pow(lastPos.x - prevPos.x, 2) + Math.pow(lastPos.y - prevPos.y, 2)
      );
      if (headMovement > 0.02 && headMovement < 0.1) {
        nervousScore += 12; // Small immediate head movement
      }
    }
    
    // REDUCE nervous score if confident indicators are present
    // This prevents nervous from overriding confident when conditions are good
    // Even hand-on-head can be reduced if confident conditions are VERY strong
    
    // Check for stability (same as confident detection)
    const headPosHistoryForNervous = tracker.getHeadPositionHistory();
    let isStableHeadForNervous = false;
    if (headPosHistoryForNervous.length > 5) {
      const headXHistory = headPosHistoryForNervous.map(p => p.x);
      const headYHistory = headPosHistoryForNervous.map(p => p.y);
      const headXVariance = calculateVariance(headXHistory);
      const headYVariance = calculateVariance(headYHistory);
      
      if (headXVariance < 0.01 && headYVariance < 0.01) {
        isStableHeadForNervous = true;
      }
    }
    
    const isExcellentEyeContactForNervous = headPoseScore > 0.7; // Higher threshold
    const isVeryCenteredForNervous = Math.abs(headX - 0.5) < 0.12 && Math.abs(headY - 0.5) < 0.12; // Tighter
    const isNormalBlinkForNervous = blinkRate >= NORMAL_BLINK_RATE_PER_MINUTE * 0.8 && 
                                     blinkRate <= NORMAL_BLINK_RATE_PER_MINUTE * 1.2; // Tighter range
    const isRelaxedMouthForNervous = mouthAspectRatio >= 0.15 && mouthAspectRatio <= 0.40; // Relaxed mouth
    
    // If conditions are VERY strong (perfect confident conditions), reduce nervous aggressively
    // Even if hand is on head, perfect conditions should show confident
    if (isStableHeadForNervous && isExcellentEyeContactForNervous && isVeryCenteredForNervous && 
        isNormalBlinkForNervous && isRelaxedMouthForNervous) {
      // Perfect stable conditions - reduce nervous by 80% (very aggressive)
      // This ensures confident shows when conditions are perfect, even with hand-on-head
      nervousScore *= 0.2;
    } else if (isStableHeadForNervous && isExcellentEyeContactForNervous && isNormalBlinkForNervous && isRelaxedMouthForNervous) {
      // Very stable + excellent eye contact + normal blink + relaxed - reduce by 70%
      nervousScore *= 0.3;
    } else if (isExcellentEyeContactForNervous && isVeryCenteredForNervous && isNormalBlinkForNervous && isRelaxedMouthForNervous) {
      // Excellent eye contact + centered + normal blink + relaxed - reduce by 60%
      nervousScore *= 0.4;
    } else if (isExcellentEyeContactForNervous && isNormalBlinkForNervous && isRelaxedMouthForNervous) {
      // Excellent eye contact + normal blink + relaxed - reduce by 50%
      nervousScore *= 0.5;
    } else if (headPoseScore > 0.75 && isNormalBlinkForNervous && isRelaxedMouthForNervous) {
      // Very good eye contact + normal blink + relaxed - reduce by 40%
      nervousScore *= 0.6;
    } else if (headPoseScore > 0.7 && isNormalBlinkForNervous) {
      // Good eye contact + normal blink - reduce by 30%
      nervousScore *= 0.7;
    } else if (!handNearHead && headPoseScore > 0.65 && isNormalBlinkForNervous) {
      // Decent eye contact + normal blink (only if hand NOT on head) - reduce by 20%
      nervousScore *= 0.8;
    }
    // If hand is on head AND conditions are not perfect, don't reduce much (let nervous show)
    
    nervousScore = Math.min(100, nervousScore);
    
    // ============================================
    // 2. DISTRACTED / DISENGAGED DETECTION
    // ============================================
    const isHeadAway = tracker.isHeadFrequentlyAway();
    const hasLongClosures = tracker.hasLongEyeClosures();
    const isLookingAway = headPoseScore < HEAD_POSE_AWAY_THRESHOLD; // Face not well-centered
    
    // Check current head position (not just history) - IMMEDIATE detection
    const currentHeadOffset = Math.sqrt(
      Math.pow(headX - 0.5, 2) + Math.pow(headY - 0.5, 2)
    );
    const isCurrentlyAway = currentHeadOffset > HEAD_AWAY_THRESHOLD;
    
    // Immediate detection - if head is currently away, give high score
    if (isCurrentlyAway) {
      distractionScore += 50; // Increased: Current head position away (immediate detection)
    }
    
    // Also check if head is significantly off-center in X or Y direction
    const headXOffset = Math.abs(headX - 0.5);
    const headYOffset = Math.abs(headY - 0.5);
    
    if (headXOffset > 0.3 || headYOffset > 0.3) {
      // Head is significantly off-center in either direction
      distractionScore += 35; // Looking away from screen
    }
    
    if (isHeadAway) {
      distractionScore += 40; // Head frequently off-camera (history-based)
    }
    
    if (hasLongClosures) {
      distractionScore += 35; // Long eye closures (not paying attention)
    }
    
    if (isLookingAway) {
      distractionScore += 30; // Increased: Head turned away from camera (poor head pose)
    }
    
    // Check if eyes are currently closed
    if (!isEyesOpen) {
      distractionScore += 20; // Increased: Eyes currently closed
    }
    
    // Check if head is currently looking down (away from screen)
    if (headY > HEAD_DOWN_THRESHOLD) {
      distractionScore += 25; // Increased: Looking down = distracted
    }
    
    // Check if head is looking to the side (X offset)
    if (headXOffset > 0.25) {
      distractionScore += 20; // Looking left or right = distracted
    }
    
    // Bonus: If head pose is very poor (face not facing camera at all)
    if (headPoseScore < 0.4) {
      distractionScore += 30; // Very poor head pose = highly distracted
    }
    
    distractionScore = Math.min(100, distractionScore);
    
    // ============================================
    // 3. CONFIDENT DETECTION
    // ============================================
    const isNormalBlinkRate = blinkRate >= NORMAL_BLINK_RATE_PER_MINUTE * 0.6 && 
                               blinkRate <= NORMAL_BLINK_RATE_PER_MINUTE * 1.4; // More lenient range
    const isGoodEyeContact = headPoseScore > 0.5; // Lowered threshold
    const isExcellentEyeContact = headPoseScore > 0.65; // Excellent eye contact
    const isFaceCentered = Math.abs(headX - 0.5) < 0.25 && Math.abs(headY - 0.5) < 0.25; // More lenient
    const isVeryCentered = Math.abs(headX - 0.5) < 0.15 && Math.abs(headY - 0.5) < 0.15; // Very well centered
    const isRelaxedMouth = mouthAspectRatio >= 0.12 && mouthAspectRatio <= 0.45; // More lenient
    
    // Base confident score for stable conditions
    let baseConfidentScore = 0;
    
    // Check for stability (low variance in head position) - CRITICAL for confident
    const headPosHistoryForStability = tracker.getHeadPositionHistory();
    let isStableHead = false;
    if (headPosHistoryForStability.length > 5) {
      const headXHistory = headPosHistoryForStability.map(p => p.x);
      const headYHistory = headPosHistoryForStability.map(p => p.y);
      const headXVariance = calculateVariance(headXHistory);
      const headYVariance = calculateVariance(headYHistory);
      
      if (headXVariance < 0.01 && headYVariance < 0.01) {
        isStableHead = true;
        baseConfidentScore += 25; // Increased: Very stable head position (critical indicator)
      } else if (headXVariance < 0.02 && headYVariance < 0.02) {
        baseConfidentScore += 15; // Moderately stable
      }
    }
    
    // Stable eye contact + stable face = very confident
    if (isStableHead && isExcellentEyeContact) {
      baseConfidentScore += 20; // Bonus for stable + excellent eye contact
    }
    
    if (isNormalBlinkRate) {
      baseConfidentScore += 35; // Increased: Normal, relaxed blink rate
    }
    
    if (isExcellentEyeContact) {
      baseConfidentScore += 40; // Increased: Excellent eye contact maintained
    } else if (isGoodEyeContact) {
      baseConfidentScore += 30; // Good eye contact
    }
    
    if (isVeryCentered) {
      baseConfidentScore += 35; // Increased: Very well centered
    } else if (isFaceCentered) {
      baseConfidentScore += 25; // Well centered
    }
    
    if (isRelaxedMouth) {
      baseConfidentScore += 25; // Relaxed jaw and lips
    }
    
    // Bonus: Stable eye contact + stable face + normal blink = highly confident
    if (isStableHead && isExcellentEyeContact && isNormalBlinkRate && isVeryCentered) {
      baseConfidentScore += 20; // Perfect conditions bonus
    }
    
    confidentScore = Math.min(100, baseConfidentScore);
    
    // ============================================
    // 4. DETERMINE FINAL STATE
    // ============================================
    // Classification Logic: Distracted > Nervous > Confident (default)
    // Confident is the DEFAULT state when no strong indicators are present
    // This provides a positive baseline assumption for interview candidates
    
    let expression: FacialExpression = 'confident'; // Default to confident
    let confidence = 0;
    
    // Priority 1: Distracted (highest priority - overrides all other states)
    if (distractionScore > DISTRACTED_SCORE_THRESHOLD) {
      // Distraction indicators detected - highest priority
      // Even if other scores are high, distracted wins
      expression = 'distracted';
      confidence = Math.round(distractionScore);
    } 
    // Priority 2: Check if confident conditions are VERY strong
    // If confident is strong, it should win even if nervous is slightly above threshold
    else if (confidentScore > 50) {
      // Confident score is high - check if conditions are strong
      const headPosHistoryCheck = tracker.getHeadPositionHistory();
      let isStableHeadCheck = false;
      if (headPosHistoryCheck.length > 5) {
        const headXHistory = headPosHistoryCheck.map(p => p.x);
        const headYHistory = headPosHistoryCheck.map(p => p.y);
        const headXVariance = calculateVariance(headXHistory);
        const headYVariance = calculateVariance(headYHistory);
        isStableHeadCheck = headXVariance < 0.01 && headYVariance < 0.01;
      }
      const isExcellentEyeContactCheck = headPoseScore > 0.7;
      const isVeryCenteredCheck = Math.abs(headX - 0.5) < 0.12 && Math.abs(headY - 0.5) < 0.12;
      const isRelaxedMouthCheck = mouthAspectRatio >= 0.15 && mouthAspectRatio <= 0.40;
      
      // If confident conditions are strong, confident wins even if nervous is above threshold
      if (isStableHeadCheck && isExcellentEyeContactCheck && isNormalBlinkRate && isRelaxedMouthCheck) {
        // Very stable + excellent eye contact + normal blink + relaxed = confident wins
        expression = 'confident';
        confidence = Math.round(confidentScore);
      } else if (isExcellentEyeContactCheck && isVeryCenteredCheck && isNormalBlinkRate && isRelaxedMouthCheck) {
        // Excellent eye contact + centered + normal blink + relaxed = confident wins
        expression = 'confident';
        confidence = Math.round(confidentScore);
      } else if (confidentScore > nervousScore + 10) {
        // Confident is significantly higher (10+ points) - confident wins
        expression = 'confident';
        confidence = Math.round(confidentScore);
      } else if (nervousScore > NERVOUS_SCORE_THRESHOLD) {
        // Nervous is above threshold and close to confident - show nervous
        expression = 'nervous';
        confidence = Math.round(nervousScore);
      } else {
        // Confident wins
        expression = 'confident';
        confidence = Math.round(confidentScore);
      }
    }
    // Priority 3: Nervous (only if confident is not strong)
    else if (nervousScore > NERVOUS_SCORE_THRESHOLD) {
      // Nervous indicators detected - show nervous state
      expression = 'nervous';
      confidence = Math.round(nervousScore);
    } 
    // Priority 4: Confident (default - when no strong indicators present)
    else {
      // Default to confident - positive baseline assumption
      // Calculate confidence based on stability indicators
      const stabilityScore = (isNormalBlinkRate ? 30 : 0) + 
                            (isGoodEyeContact ? 30 : 0) + 
                            (isFaceCentered ? 25 : 0) + 
                            (isRelaxedMouth ? 15 : 0);
      confidence = Math.max(50, Math.min(100, stabilityScore)); // Minimum 50% for default confident
      expression = 'confident';
    }
    
    // Debug logging to help diagnose detection
    if (Math.random() < 0.1) { // 10% chance to log (increased for debugging)
      const currentHeadOffset = Math.sqrt(
        Math.pow(headX - 0.5, 2) + Math.pow(headY - 0.5, 2)
      );
      console.log("🎭 Expression Detection:", {
        expression,
        confidence,
        nervousScore: Math.round(nervousScore),
        distractionScore: Math.round(distractionScore),
        confidentScore: Math.round(confidentScore),
        blinkRate: blinkRate.toFixed(1),
        isHighBlinkRate,
        isMouthTight,
        mouthAspectRatio: mouthAspectRatio.toFixed(3),
        isHeadDown,
        headY: headY.toFixed(3),
        headDownThreshold: HEAD_DOWN_THRESHOLD,
        isHeadAway,
        isCurrentlyAway: currentHeadOffset > HEAD_AWAY_THRESHOLD,
        currentHeadOffset: currentHeadOffset.toFixed(3),
        headAwayThreshold: HEAD_AWAY_THRESHOLD,
        hasLongClosures,
        headPoseScore: headPoseScore.toFixed(2),
        headX: headX.toFixed(2),
        headXOffset: Math.abs(headX - 0.5).toFixed(3),
        headYOffset: Math.abs(headY - 0.5).toFixed(3),
        handNearHead,
        nervousThreshold: NERVOUS_SCORE_THRESHOLD,
        distractedThreshold: DISTRACTED_SCORE_THRESHOLD,
        isLookingAway: headPoseScore < HEAD_POSE_AWAY_THRESHOLD,
      });
    }
    
    // Apply temporal smoothing - state must persist
    const smoothedState = tracker.updateState(expression, currentTime);
    expression = smoothedState;
    
    // Return result with all scores
    return {
      expression,
      confidence,
      nervousScore: Math.round(nervousScore),
      distractionScore: Math.round(distractionScore),
    };
    
  } catch (error) {
    console.error("Error detecting facial expression:", error);
    return { 
      expression: 'neutral', 
      confidence: 0,
      nervousScore: 0,
      distractionScore: 0
    };
  }
}

/**
 * Calculate variance of an array (for micro movement detection)
 */
function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  
  return variance;
}

