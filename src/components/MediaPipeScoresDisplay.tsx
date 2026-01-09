import { useEffect } from "react";
import { useMediaPipeAnalysis, FacialExpression } from "../hooks/useMediaPipeAnalysis";

interface MediaPipeScoresDisplayProps {
  enabled?: boolean;
  showUI?: boolean; // If false, scores only logged to console
  sessionId?: string; // Interview session ID for saving data to backend
  isSampling?: boolean;
  questionIndex?: number;
}

/**
 * Minimal component to display MediaPipe body language analysis scores
 * Scores are always logged to console, UI is optional
 * If sessionId is provided, scores will be saved to backend periodically
 */
export default function MediaPipeScoresDisplay({
  enabled = true,
  showUI = false,
  sessionId,
  isSampling = false,
  questionIndex = 0,
}: MediaPipeScoresDisplayProps) {
  const { scores, aggregatedScores, isInitialized, error, saveFinalData, stopAnalysis, videoElement, faceLandmarks, handLandmarks } = useMediaPipeAnalysis(enabled, sessionId, isSampling, questionIndex);

  // Expose landmarks globally for cheating detection
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).mediaPipeFaceLandmarks = faceLandmarks;
      (window as any).mediaPipeHandLandmarks = handLandmarks;
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).mediaPipeFaceLandmarks;
        delete (window as any).mediaPipeHandLandmarks;
      }
    };
  }, [faceLandmarks, handLandmarks]);

  // Expose video element globally for YOLO detection
  useEffect(() => {
    if (videoElement && typeof window !== 'undefined') {
      (window as any).mediaPipeVideoElement = videoElement;
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).mediaPipeVideoElement;
      }
    };
  }, [videoElement]);

  // Expose saveFinalData to parent component via ref or return it
  // For now, we'll expose it via a useEffect that can be called by parent
  useEffect(() => {
    if (sessionId && typeof window !== 'undefined') {
      // Store saveFinalData and stopAnalysis globally so InterviewChatPage can call them
      (window as any).saveBodyLanguageFinalData = saveFinalData;
      (window as any).stopMediaPipeAnalysis = stopAnalysis;
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).saveBodyLanguageFinalData;
        delete (window as any).stopMediaPipeAnalysis;
      }
    };
  }, [sessionId, saveFinalData]);

  // Scores are already logged to console by the hook
  // This component just provides optional UI display

  // Always show status, even if UI is hidden
  useEffect(() => {
    if (isInitialized) {
      console.log("✅ MediaPipe Analysis: ACTIVE - Face detection running");
    } else if (error) {
      console.error("❌ MediaPipe Analysis: ERROR -", error);
    } else {
      console.log("⏳ MediaPipe Analysis: Initializing...");
    }
  }, [isInitialized, error]);

  // Log scores when they update
  useEffect(() => {
    if (scores && (scores.eyeContact > 0 || scores.engagement > 0)) {
      console.log("📊 Live Scores:", {
        "Eye Contact": `${scores.eyeContact}%`,
        "Engagement": `${scores.engagement}%`,
        "Attention": `${scores.attention}%`,
        "Stability": `${scores.stability}%`,
      });
    }
  }, [scores]);

  if (!showUI) {
    // UI hidden - but still log to console
    return null;
  }

  return (
    <div className="bg-card border border-border rounded-lg p-3 space-y-2 text-xs">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-text-primary">Body Language</h3>
        {isInitialized ? (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-400 text-xs">Active</span>
          </div>
        ) : (
          <span className="text-gray-400 text-xs">Initializing...</span>
        )}
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-700/50 rounded px-3 py-2 text-xs text-red-300 space-y-2">
          <div className="font-semibold">⚠️ Face Detection Error</div>
          <div>{error}</div>
          <div className="text-xs text-red-400 mt-1">
            💡 Face analysis is temporarily unavailable. Interview will continue normally.
          </div>
        </div>
      )}

      {isInitialized && !error && (
        <>
          {/* Facial Expression - Only show if face is detected and expression is not null */}
          {(scores.faceDetected || (scores.eyeContact > 0 || scores.engagement > 0)) && scores.expression !== null && (
            <div className="bg-primary/10 border border-primary/20 rounded px-3 py-2 mb-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-secondary">Expression</span>
                <div className="flex items-center gap-2">
                  <ExpressionBadge expression={scores.expression} confidence={scores.expressionConfidence} />
                </div>
              </div>
            </div>
          )}

          {/* No Face Detected Message - Only show when face is definitely NOT detected */}
          {!scores.faceDetected && scores.eyeContact === 0 && scores.engagement === 0 && scores.attention === 0 && (
            <div className="bg-yellow-900/20 border border-yellow-700/30 rounded px-3 py-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-yellow-400">👤 Face not detected</span>
              </div>
            </div>
          )}

          {/* Live Scores */}
          <div className="space-y-1.5">
            <ScoreRow label="Eye Contact" value={scores.eyeContact} />
            <ScoreRow label="Engagement" value={scores.engagement} />
            <ScoreRow label="Attention" value={scores.attention} />
            <ScoreRow label="Stability" value={scores.stability} />
          </div>

          {/* Aggregated Scores */}
          {aggregatedScores.sampleCount > 0 && (
            <div className="pt-2 border-t border-border">
              <div className="text-xs text-text-secondary mb-1.5">
                Average ({aggregatedScores.sampleCount} samples)
              </div>
              {aggregatedScores.dominantExpression && aggregatedScores.faceDetected && (
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs text-text-secondary">Dominant Expression</span>
                  <ExpressionBadge
                    expression={aggregatedScores.dominantExpression}
                    confidence={aggregatedScores.expressionConfidence}
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <ScoreRow label="Eye Contact" value={aggregatedScores.eyeContact} isAggregated />
                <ScoreRow label="Engagement" value={aggregatedScores.engagement} isAggregated />
                <ScoreRow label="Attention" value={aggregatedScores.attention} isAggregated />
                <ScoreRow label="Stability" value={aggregatedScores.stability} isAggregated />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface ScoreRowProps {
  label: string;
  value: number;
  isAggregated?: boolean;
}

function ScoreRow({ label, value, isAggregated = false }: ScoreRowProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className={`${isAggregated ? "text-primary" : "text-text-secondary"}`}>
          {label}
        </span>
        <span className={`font-semibold ${isAggregated ? "text-primary" : "text-text-primary"}`}>
          {value}%
        </span>
      </div>
      <div className="w-full bg-border rounded-full h-1">
        <div
          className="bg-primary h-1 rounded-full transition-all duration-300"
          style={{ width: `${Math.min(value, 100)}%` }}
        ></div>
      </div>
    </div>
  );
}

interface ExpressionBadgeProps {
  expression: FacialExpression | null;
  confidence: number;
}

function ExpressionBadge({ expression, confidence }: ExpressionBadgeProps) {
  if (!expression) {
    return null; // Don't render if expression is null
  }
  if (!expression) {
    return null; // Don't render if expression is null
  }

  const emojiMap: Record<FacialExpression, string> = {
    confident: '😊',
    nervous: '😰',
    distracted: '😑',
  };

  const colorMap: Record<FacialExpression, string> = {
    confident: 'text-green-400',
    nervous: 'text-yellow-400',
    distracted: 'text-orange-400',
  };

  const bgColorMap: Record<FacialExpression, string> = {
    confident: 'bg-green-900/20 border-green-700/30',
    nervous: 'bg-yellow-900/20 border-yellow-700/30',
    distracted: 'bg-orange-900/20 border-orange-700/30',
  };

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded ${bgColorMap[expression]} border`}>
      <span className="text-sm">{emojiMap[expression]}</span>
      <span className={`text-xs font-semibold capitalize ${colorMap[expression]}`}>
        {expression}
      </span>
    </div>
  );
}

