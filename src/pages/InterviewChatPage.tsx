import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Send } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import Button from "../components/ui/Button";
import ContentHeader from "../components/layout/ContentHeader";
import { ImagesPath } from "../utils/images";
import MediaPipeScoresDisplay from "../components/MediaPipeScoresDisplay";
import { useCheatingDetection } from "../hooks/useCheatingDetection";
import { useFaceVerification } from "../hooks/useFaceVerification";
import { API_BASE_URL } from "../config/api";
import { reportViolation } from "../utils/faceVerification";
import { Camera, AlertCircle, Users, UserX, Clock } from "lucide-react";

interface ChatMessage {
  sender: "ai" | "user";
  text: string;
  questionIndex?: number; // Store question number for AI messages
  score?: number; // Score for user answers
  feedback?: string; // Feedback for user answers
}

/* ============================================================
   TEXT TO SPEECH WITH PROPER AUDIO STOP HANDLING
   ============================================================ */
async function playTtsForText(text: string, currentAudioRef: any) {
  if (!text || !currentAudioRef) return;

  // STOP OLD AUDIO BEFORE PLAYING NEW
  if (currentAudioRef.current) {
    currentAudioRef.current.pause();
    currentAudioRef.current.currentTime = 0;
    if (currentAudioRef.current.src) {
      try {
        URL.revokeObjectURL(currentAudioRef.current.src);
      } catch (e) {
        // Ignore errors when revoking URL
      }
    }
    currentAudioRef.current = null;
  }

  try {
    const token = localStorage.getItem("token");

    // Call backend endpoint for text-to-speech
    const response = await fetch(`${API_BASE_URL}/api/interview/tts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        text: text,
        voice: "alloy",
      }),
    });

    if (!response.ok) {
      console.error("TTS request failed", await response.text());
      return;
    }

    // Backend returns audio blob
    const audioData = await response.blob();
    const audioUrl = URL.createObjectURL(audioData);
    const audio = new Audio(audioUrl);

    // Check if ref still exists before playing
    if (!currentAudioRef) return;

    currentAudioRef.current = audio; // SAVE REF

    audio.play().catch((err) => {
      console.error("Autoplay failed:", err);
      if (currentAudioRef.current === audio) {
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
      }
    });

    audio.onended = () => {
      if (currentAudioRef.current === audio) {
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
      }
    };

    // Handle audio errors
    audio.onerror = () => {
      if (currentAudioRef.current === audio) {
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
      }
    };
  } catch (err) {
    console.error("TTS error:", err);
    if (currentAudioRef.current) {
      currentAudioRef.current = null;
    }
  }
}

const InterviewChatPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Monitoring States
  const [rule1Countdown, setRule1Countdown] = useState<number | null>(null);
  const [rule1Stage, setRule1Stage] = useState<1 | 2 | null>(null); // 1: Yellow, 2: Red
  const [rule3Countdown, setRule3Countdown] = useState<number | null>(null);
  const [isInterviewTerminated, setIsInterviewTerminated] = useState(false);
  const [violationType, setViolationType] = useState<string | null>(null);
  const [sessionFinished, setSessionFinished] = useState(false);

  // Phone Detection Tracking
  const [phoneViolationCount, setPhoneViolationCount] = useState<number>(0);
  const [phoneWarningStage, setPhoneWarningStage] = useState<0 | 1 | 2 | 3>(0);
  const [isPhoneDetectedNow, setIsPhoneDetectedNow] = useState<boolean>(false);
  const phoneDetectionRef = useRef<{ isActive: boolean; lastState: boolean }>({ isActive: false, lastState: false });

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null); // ⭐ MAIN REF
  const lastTtsMessageRef = useRef<string | null>(null); // Track last message that had TTS played
  const ttsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null); // Track TTS timeout to prevent multiple calls

  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [totalQuestions, setTotalQuestions] = useState<number | null>(null);
  const [mediaPipeEnabled, setMediaPipeEnabled] = useState<boolean>(true);
  const [cheatingDetectionEnabled, setCheatingDetectionEnabled] = useState<boolean>(true);

  /* ============================================================
     GET VIDEO ELEMENT AND LANDMARKS FROM MEDIAPIPE
     ============================================================ */
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [faceLandmarks, setFaceLandmarks] = useState<any[] | null>(null);
  const [handLandmarks, setHandLandmarks] = useState<any[][] | null>(null);
  const [isSampling, setIsSampling] = useState<boolean>(false);

  useEffect(() => {
    // Get video element and landmarks from MediaPipe
    const checkForMediaPipe = setInterval(() => {
      const video = (window as any).mediaPipeVideoElement || document.querySelector('video');
      const face = (window as any).mediaPipeFaceLandmarks;
      const hands = (window as any).mediaPipeHandLandmarks;

      if (video && video !== videoElement) {
        setVideoElement(video);
      }
      if (face !== faceLandmarks) {
        setFaceLandmarks(face || null);
      }
      if (hands !== handLandmarks) {
        setHandLandmarks(hands || null);
      }
    }, 100);

    return () => clearInterval(checkForMediaPipe);
  }, [videoElement, faceLandmarks, handLandmarks]);

  /* ============================================================
     MEDIAPIPE-BASED CHEATING DETECTION
     ============================================================ */
  const { result: cheatingResult } = useCheatingDetection({
    enabled: cheatingDetectionEnabled && !!videoElement,
    videoElement,
    faceLandmarks,
    handLandmarks,
  });

  /* ============================================================
     IDENTITY MISMATCH HANDLING
     ============================================================ */
  const { mismatchCount, multipleFacesDetected, noFaceDetected, isCameraOff, isWrongFaceDetected } = useFaceVerification({
    enabled: mediaPipeEnabled && !!videoElement && !isInterviewTerminated,
    videoElement,
    checkIntervalMs: 2000,
    // CHANGED: Pause identity check if user is distracted (looking away)
    // This allows coaching mode: warning for distraction but no termination for identity mismatch
    pauseIdentityCheck: cheatingResult.status === "Distracted"
  });

  const captureViolationFrame = useCallback(() => {
    if (!videoElement) return undefined;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoElement, 0, 0);
        return canvas.toDataURL('image/jpeg', 0.8);
      }
    } catch (err) {
      console.error('Error capturing violation frame:', err);
    }
    return undefined;
  }, [videoElement]);

  const terminateInterview = useCallback(async (type: string) => {
    if (isInterviewTerminated) return;

    setIsInterviewTerminated(true);
    setViolationType(type);

    let message = "";
    if (type === "IDENTITY_MISMATCH") message = "Security Protocol Violation: Unauthorized person detected. Session terminated.";
    else if (type === "CAMERA_OFF") message = "Security Protocol Violation: Camera connection lost or disabled. Session terminated.";
    else if (type === "MULTIPLE_FACES") message = "Security Protocol Violation: Multiple persons detected. Session terminated.";

    setError(message);

    // CRITICAL: Stop MediaPipe and camera immediately when violation occurs
    console.log("🛑 Violation detected - stopping MediaPipe analysis...");
    setMediaPipeEnabled(false);
    setCheatingDetectionEnabled(false);
    setIsSampling(false);

    // Call stopAnalysis if available
    try {
      if (typeof (window as any).stopMediaPipeAnalysis === 'function') {
        (window as any).stopMediaPipeAnalysis();
        console.log('✅ Called window.stopMediaPipeAnalysis() from terminateInterview');
      }
    } catch (err) {
      console.error("Error stopping MediaPipe analysis:", err);
    }

    // Fallback: explicitly stop all MediaStream tracks
    try {
      const videos = document.querySelectorAll('video');
      videos.forEach((v) => {
        try {
          (v as HTMLVideoElement).pause();
          const srcObj: any = (v as any).srcObject;
          if (srcObj && typeof srcObj.getTracks === 'function') {
            srcObj.getTracks().forEach((t: MediaStreamTrack) => {
              try {
                t.stop();
                console.log(`✅ Stopped track ${t.kind} during violation cleanup`);
              } catch (_) { }
            });
          }
          (v as any).srcObject = null;
        } catch (_) { }
      });
    } catch (err) {
      console.error('Error stopping video tracks during violation:', err);
    }

    // Capture screenshot for identity mismatch or other critical violations
    const screenshot = type === "IDENTITY_MISMATCH" ? captureViolationFrame() : undefined;

    // PREVENT REFRESHe RESUMPTION: Mark session as completed immediately
    localStorage.setItem("interviewCompleted", "true");
    if (sessionId) {
      // Clear chat data prevent restoration
      localStorage.removeItem(`interviewChat_${sessionId}`);
      localStorage.removeItem(`interviewQuestionIndex_${sessionId}`);
      localStorage.removeItem(`interviewTotalQuestions_${sessionId}`);

      await reportViolation(sessionId, type, "Session Terminated", screenshot);
    }

    // Redirect to dashboard after a delay
    setTimeout(() => navigate("/dashboard", { replace: true }), 5000);
  }, [isInterviewTerminated, sessionId, captureViolationFrame, navigate]);

  // Rule 2: Different Person Detected (Immediate)
  useEffect(() => {
    if (isWrongFaceDetected && !isInterviewTerminated) {
      terminateInterview("IDENTITY_MISMATCH");
    }
  }, [isWrongFaceDetected, isInterviewTerminated, terminateInterview]);

  // Rule 1: Camera OFF (Technical Failure) - Terminate
  useEffect(() => {
    if (isInterviewTerminated) return;

    let timer: any;
    // Only warn/terminate if camera is technically OFF/Broken OR if NO FACE is detected (user left/covered cam)
    const shouldWarn = isCameraOff || noFaceDetected;

    if (shouldWarn) {
      if (rule1Stage === null) {
        setRule1Stage(1);
        setRule1Countdown(10);
      } else if (rule1Stage === 1) {
        if (rule1Countdown! > 0) {
          timer = setTimeout(() => setRule1Countdown(prev => prev! - 1), 1000);
        } else {
          setRule1Stage(2);
          setRule1Countdown(10); // Final warning countdown
        }
      } else if (rule1Stage === 2) {
        if (rule1Countdown! > 0) {
          timer = setTimeout(() => setRule1Countdown(prev => prev! - 1), 1000);
        } else {
          terminateInterview("CAMERA_OFF");
        }
      }
    } else {
      setRule1Stage(null);
      setRule1Countdown(null);
    }

    return () => clearTimeout(timer);
  }, [isCameraOff, noFaceDetected, rule1Countdown, rule1Stage, isInterviewTerminated, terminateInterview]);

  // Rule 3: Multiple Faces
  useEffect(() => {
    if (isInterviewTerminated) return;

    let timer: any;
    if (multipleFacesDetected) {
      if (rule3Countdown === null) {
        setRule3Countdown(5);
      } else if (rule3Countdown > 0) {
        timer = setTimeout(() => setRule3Countdown(prev => prev! - 1), 1000);
      } else {
        terminateInterview("MULTIPLE_FACES");
      }
    } else {
      setRule3Countdown(null);
    }

    return () => clearTimeout(timer);
  }, [multipleFacesDetected, rule3Countdown, isInterviewTerminated, terminateInterview]);

  // Phone detection logic (3-stage warning)
  useEffect(() => {
    if (isInterviewTerminated) return;

    const currentlyDetected = cheatingResult.phoneDetected;
    const previouslyDetected = phoneDetectionRef.current.lastState;
    phoneDetectionRef.current.lastState = currentlyDetected;

    // Detect NEW incident (false -> true)
    if (currentlyDetected && !previouslyDetected) {
      setPhoneViolationCount(prev => {
        const nextCount = prev + 1;

        if (nextCount === 1) {
          setPhoneWarningStage(1);
          reportViolation(sessionId!, "MOBILE_PHONE_DETECTED", "First Warning Issued", captureViolationFrame());
        } else if (nextCount === 2) {
          setPhoneWarningStage(2);
          reportViolation(sessionId!, "MOBILE_PHONE_DETECTED", "Final Warning + Penalty Issued (10%)", captureViolationFrame());
        } else if (nextCount >= 3) {
          setPhoneWarningStage(3);
          terminateInterview("PHONE_CHEATING");
        }

        return nextCount;
      });
    }

    // Update current visibility (if phone is present, show warning)
    setIsPhoneDetectedNow(currentlyDetected);

    // If phone is removed, clear the warning visibility but KEEP the violation count
    if (!currentlyDetected && previouslyDetected) {
      setPhoneWarningStage(0);
    }
  }, [cheatingResult.phoneDetected, sessionId, isInterviewTerminated, terminateInterview, captureViolationFrame]);

  // Log cheating detection results
  useEffect(() => {
    if (cheatingResult.phoneDetected) {
      console.warn('⚠️ PHONE DETECTED! Count:', phoneViolationCount, 'Stage:', phoneWarningStage);
    }
  }, [cheatingResult.phoneDetected, phoneViolationCount, phoneWarningStage]);

  // Log cheating detection results
  useEffect(() => {
    if (cheatingResult.cheatingDetected) {
      console.warn('⚠️ CHEATING DETECTED:', {
        phoneDetected: cheatingResult.phoneDetected,
        behavioralCheatingDetected: cheatingResult.behavioralCheatingDetected,
        behaviorScore: cheatingResult.behaviorScore,
        status: cheatingResult.status,
      });
    }
  }, [cheatingResult]);

  /* ============================================================
     AUTO-SCROLL WHEN CHAT UPDATES
     ============================================================ */
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [chat]);

  /* ============================================================
     AUTO-PLAY TTS FOR NEW AI MESSAGES
     ============================================================ */
  useEffect(() => {
    if (chat.length === 0 || !sessionId) return;

    const lastMessage = chat[chat.length - 1];
    if (lastMessage.sender === "ai" && lastMessage.text && lastMessage.questionIndex) {
      // Use sessionId + questionIndex as stable key (not text, as text may change)
      const messageKey = `${sessionId}-${lastMessage.questionIndex}`;

      // Check if this message has already been played
      if (lastTtsMessageRef.current === messageKey) {
        return; // Already played this message
      }

      // Clear any pending TTS timeout
      if (ttsTimeoutRef.current) {
        clearTimeout(ttsTimeoutRef.current);
        ttsTimeoutRef.current = null;
      }

      // Delay to ensure state is fully updated and text is stable
      ttsTimeoutRef.current = setTimeout(() => {
        // Verify this is still the last message with same questionIndex and sessionId hasn't changed
        if (!sessionId || chat.length === 0) {
          ttsTimeoutRef.current = null;
          return;
        }

        const currentLastMessage = chat[chat.length - 1];
        if (
          currentLastMessage.sender === "ai" &&
          currentLastMessage.questionIndex === lastMessage.questionIndex &&
          currentLastMessage.text &&
          sessionId
        ) {
          // Final check: ensure we haven't already played this
          const finalKey = `${sessionId}-${currentLastMessage.questionIndex}`;
          if (lastTtsMessageRef.current !== finalKey) {
            playTtsForText(currentLastMessage.text, currentAudioRef);
            lastTtsMessageRef.current = finalKey; // Mark as played
          }
        }
        ttsTimeoutRef.current = null;
      }, 800); // Increased delay to ensure text is stable

      return () => {
        if (ttsTimeoutRef.current) {
          clearTimeout(ttsTimeoutRef.current);
          ttsTimeoutRef.current = null;
        }
      };
    }
  }, [chat, sessionId]);

  /* ============================================================
     CLEANUP: STOP AUDIO ON COMPONENT UNMOUNT OR NAVIGATION
     ============================================================ */
  useEffect(() => {
    // Stop audio when component unmounts or user navigates away
    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
        if (currentAudioRef.current.src) {
          URL.revokeObjectURL(currentAudioRef.current.src);
        }
        currentAudioRef.current = null;
      }
      if (ttsTimeoutRef.current) {
        clearTimeout(ttsTimeoutRef.current);
        ttsTimeoutRef.current = null;
      }
    };
  }, []);

  /* ============================================================
     STOP AUDIO AND MEDIAPIPE ON LOCATION CHANGE (NAVIGATION)
     ============================================================ */
  useEffect(() => {
    // Stop audio and MediaPipe if user navigates away or closes page
    const handleBeforeUnload = () => {
      console.log("🧹 beforeunload: Cleaning up MediaPipe and camera...");

      // Stop MediaPipe
      try {
        if (typeof (window as any).stopMediaPipeAnalysis === 'function') {
          (window as any).stopMediaPipeAnalysis();
        }
      } catch (err) {
        console.error("Error stopping MediaPipe on beforeunload:", err);
      }

      // Stop all MediaStream tracks
      try {
        const videos = document.querySelectorAll('video');
        videos.forEach((v) => {
          try {
            const srcObj: any = (v as any).srcObject;
            if (srcObj && typeof srcObj.getTracks === 'function') {
              srcObj.getTracks().forEach((t: MediaStreamTrack) => {
                try { t.stop(); } catch (_) { }
              });
            }
            (v as any).srcObject = null;
          } catch (_) { }
        });
      } catch (err) {
        console.error('Error stopping video tracks on beforeunload:', err);
      }

      // Stop audio
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);

      // Also cleanup on location change
      console.log("🧹 Location changed - cleaning up MediaPipe...");

      // Stop MediaPipe
      try {
        if (typeof (window as any).stopMediaPipeAnalysis === 'function') {
          (window as any).stopMediaPipeAnalysis();
        }
      } catch (err) {
        console.error("Error stopping MediaPipe on location change:", err);
      }

      // Stop all MediaStream tracks
      try {
        const videos = document.querySelectorAll('video');
        videos.forEach((v) => {
          try {
            const srcObj: any = (v as any).srcObject;
            if (srcObj && typeof srcObj.getTracks === 'function') {
              srcObj.getTracks().forEach((t: MediaStreamTrack) => {
                try { t.stop(); } catch (_) { }
              });
            }
            (v as any).srcObject = null;
          } catch (_) { }
        });
      } catch (err) {
        console.error('Error stopping video tracks on location change:', err);
      }

      // Stop audio
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      }
      if (ttsTimeoutRef.current) {
        clearTimeout(ttsTimeoutRef.current);
        ttsTimeoutRef.current = null;
      }
    };
  }, [location]);

  /* ============================================================
     PREVENT ACCESS IF COMING FROM FEEDBACK PAGE
     ============================================================ */
  useEffect(() => {
    // If coming from feedback page via browser navigation, redirect to dashboard
    if (location.state?.fromFeedback) {
      navigate("/dashboard", { replace: true });
      return;
    }
  }, [location, navigate]);

  /* ============================================================
     CRITICAL: CLEANUP MEDIAPIPE AND CAMERA ON COMPONENT UNMOUNT
     ============================================================ */
  useEffect(() => {
    // Only cleanup when component actually unmounts (not on every render)
    // Use a ref to track if component is mounted
    let isMounted = true;

    // Cleanup function runs when component unmounts or user navigates away
    return () => {
      if (!isMounted) return; // Already cleaned up
      isMounted = false;

      console.log("🧹 InterviewChatPage: Component unmounting - cleaning up MediaPipe...");

      // Stop MediaPipe analysis directly (don't set state in cleanup - causes issues)
      try {
        if (typeof (window as any).stopMediaPipeAnalysis === 'function') {
          (window as any).stopMediaPipeAnalysis();
          console.log('✅ Called window.stopMediaPipeAnalysis() on unmount');
        }
      } catch (err) {
        console.error("Error stopping MediaPipe on unmount:", err);
      }

      // Stop all MediaStream tracks (comprehensive cleanup)
      try {
        const videos = document.querySelectorAll('video');
        videos.forEach((v) => {
          try {
            (v as HTMLVideoElement).pause();
            const srcObj: any = (v as any).srcObject;
            if (srcObj && typeof srcObj.getTracks === 'function') {
              srcObj.getTracks().forEach((t: MediaStreamTrack) => {
                try {
                  t.stop();
                  console.log(`✅ Stopped track ${t.kind} on unmount`);
                } catch (_) { }
              });
            }
            (v as any).srcObject = null;
          } catch (_) { }
        });
      } catch (err) {
        console.error('Error stopping video tracks on unmount:', err);
      }

      // Stop audio
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
        if (currentAudioRef.current.src) {
          URL.revokeObjectURL(currentAudioRef.current.src);
        }
        currentAudioRef.current = null;
      }

      // Clear TTS timeout
      if (ttsTimeoutRef.current) {
        clearTimeout(ttsTimeoutRef.current);
        ttsTimeoutRef.current = null;
      }
    };
  }, []);

  /* ============================================================
     LOAD INTERVIEW SESSION FROM BACKEND
     ============================================================ */
  const loadInterviewSession = async (sessionIdToLoad: string) => {
    try {
      setSessionLoading(true);
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/interview/session/${sessionIdToLoad}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          // Token invalid/expired
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login");
          return;
        }
        if (response.status === 404) {
          throw new Error("Session not found or access denied");
        }
        throw new Error("Failed to load interview session");
      }

      const data = await response.json();

      // Set session data
      setSessionId(data.sessionId || sessionIdToLoad);
      localStorage.setItem("interviewSessionId", data.sessionId || sessionIdToLoad);

      // Store setupId if available (for resume-based interviews)
      if (data.setup) {
        const resumeSetupId = `resume_${data.sessionId || sessionIdToLoad}`;
        localStorage.setItem("setupId", resumeSetupId);
        localStorage.setItem(`interviewSetupId_${data.sessionId || sessionIdToLoad}`, resumeSetupId);
      }

      // Set question index and total questions
      const questionIndex = data.currentIndex || 1;
      setCurrentQuestionIndex(questionIndex);
      setTotalQuestions(data.totalQuestions || null);

      // Store in localStorage
      localStorage.setItem(`interviewQuestionIndex_${data.sessionId || sessionIdToLoad}`, String(questionIndex));
      localStorage.setItem(`interviewTotalQuestions_${data.sessionId || sessionIdToLoad}`, String(data.totalQuestions || 0));

      // Display first question in chat if available
      if (data.question) {
        const initialChat: ChatMessage[] = [
          {
            sender: "ai",
            text: data.question,
            questionIndex: questionIndex,
          },
        ];
        setChat(initialChat);
        localStorage.setItem(`interviewChat_${data.sessionId || sessionIdToLoad}`, JSON.stringify(initialChat));
        setIsSampling(true);
        // Ensure MediaPipe is enabled when session loads
        setMediaPipeEnabled(true);
        setCheatingDetectionEnabled(true);
      }
    } catch (err: any) {
      console.error("Error loading interview session:", err);
      setError(err.message || "Failed to load interview session");
      // On error, try to fall back to normal flow
      const setupId = localStorage.getItem("setupId");
      if (!setupId) {
        navigate("/interview-setup");
      }
    } finally {
      setSessionLoading(false);
    }
  };

  /* ============================================================
     INITIAL SESSION RESTORE OR START
     ============================================================ */
  useEffect(() => {
    const initSession = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        setSessionLoading(false);
        return;
      }

      // ⭐ CHECK FOR SESSIONID IN URL (from resume upload)
      const sessionIdFromUrl = searchParams.get("sessionId");
      if (sessionIdFromUrl) {
        await loadInterviewSession(sessionIdFromUrl);
        return;
      }

      const setupId = localStorage.getItem("setupId");
      if (!setupId) {
        navigate("/interview-setup");
        setSessionLoading(false);
        return;
      }

      // ⭐ CHECK IF A PREVIOUS SESSION EXISTS
      const existingSessionId = localStorage.getItem("interviewSessionId");
      const isInterviewCompleted = localStorage.getItem("interviewCompleted");

      // If interview is completed, don't restore - redirect to dashboard
      if (isInterviewCompleted) {
        localStorage.removeItem("interviewCompleted");
        navigate("/dashboard", { replace: true });
        setSessionLoading(false);
        return;
      }

      if (existingSessionId) {
        // ⭐ VERIFY THAT SESSION BELONGS TO CURRENT SETUP ID
        const savedSetupId = localStorage.getItem(`interviewSetupId_${existingSessionId}`);

        // If setupId doesn't match, clear old session and start new
        if (savedSetupId !== setupId) {
          localStorage.removeItem("interviewSessionId");
          localStorage.removeItem(`interviewChat_${existingSessionId}`);
          localStorage.removeItem(`interviewQuestionIndex_${existingSessionId}`);
          localStorage.removeItem(`interviewTotalQuestions_${existingSessionId}`);
          localStorage.removeItem(`interviewSetupId_${existingSessionId}`);
        } else {
          // SetupId matches, check if chat exists
          const savedChat = localStorage.getItem(`interviewChat_${existingSessionId}`);
          const savedIndex = localStorage.getItem(`interviewQuestionIndex_${existingSessionId}`);
          const savedTotal = localStorage.getItem(`interviewTotalQuestions_${existingSessionId}`);

          if (savedChat) {
            setSessionId(existingSessionId);
            const parsedChat = JSON.parse(savedChat);
            setChat(parsedChat);

            if (savedIndex) setCurrentQuestionIndex(Number(savedIndex));
            if (savedTotal) setTotalQuestions(Number(savedTotal));

            // Mark all existing messages as already played to prevent TTS on restore
            if (parsedChat.length > 0) {
              const lastMessage = parsedChat[parsedChat.length - 1];
              if (lastMessage.sender === "ai" && lastMessage.text) {
                const messageKey = `${existingSessionId}-${lastMessage.questionIndex || parsedChat.length}`;
                lastTtsMessageRef.current = messageKey;
              }
            }

            // Ensure MediaPipe is enabled when restoring session
            setMediaPipeEnabled(true);
            setCheatingDetectionEnabled(true);

            setSessionLoading(false);
            return; // ⭐ DO NOT START INTERVIEW AGAIN
          }
        }
      }

      // ⭐ OTHERWISE, START A NEW INTERVIEW
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/api/interview/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ setupId }),
        });

        if (!res.ok) throw new Error("Failed to start interview");

        const data = await res.json();

        const sId = data.sessionId || data?.session?._id;
        setSessionId(sId);
        localStorage.setItem("interviewSessionId", sId);
        // Link setupId with sessionId
        localStorage.setItem(`interviewSetupId_${sId}`, setupId);

        // FIRST QUESTION
        if (data.question) {
          const firstQuestionIndex = 1;
          setChat([{ sender: "ai", text: data.question, questionIndex: firstQuestionIndex }]);
          setTotalQuestions(data.totalQuestions || null);
          setCurrentQuestionIndex(firstQuestionIndex);
          // TTS will be handled by useEffect watching chat array
          setIsSampling(true);
          // Ensure MediaPipe is enabled when interview starts
          setMediaPipeEnabled(true);
          setCheatingDetectionEnabled(true);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
        setSessionLoading(false);
      }
    };

    initSession();
  }, [navigate, searchParams]);

  /* ============================================================
     SAVE PROGRESS (so refresh won't restart)
     ============================================================ */
  useEffect(() => {
    if (!sessionId) return;

    localStorage.setItem(`interviewChat_${sessionId}`, JSON.stringify(chat));
    localStorage.setItem(`interviewQuestionIndex_${sessionId}`, String(currentQuestionIndex));
    localStorage.setItem(`interviewTotalQuestions_${sessionId}`, String(totalQuestions));
  }, [chat, currentQuestionIndex, totalQuestions, sessionId]);

  /* ============================================================
     SEND ANSWER → GET NEXT QUESTION
     ============================================================ */
  const handleSendMessage = async () => {
    if (!input.trim() || !sessionId) return;

    const token = localStorage.getItem("token");
    const answer = input;
    setInput("");

    // ADD USER MESSAGE (without score/feedback initially)
    setChat((prev) => [...prev, { sender: "user", text: answer }]);

    // Stop sampling when user answers
    setIsSampling(false);

    // CRITICAL: Force save body language data for the current question BEFORE sending answer
    if (typeof (window as any).saveBodyLanguageFinalData === 'function') {
      try {
        console.log("Saving body language feedback before answer...");
        await (window as any).saveBodyLanguageFinalData();
      } catch (err) {
        console.error("Error saving pre-answer body language data:", err);
      }
    }

    try {
      setLoading(true);

      const res = await fetch(`${API_BASE_URL}/api/interview/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sessionId, answer }),
      });

      if (!res.ok) throw new Error("Server error");

      const data = await res.json();

      /* ---------------------------
         END SESSION → STOP AUDIO
         --------------------------- */
      if (data.done || data.sessionEnded) {
        setSessionFinished(true); // Mark session as finished to hide violation UI
        if (currentAudioRef.current) {
          currentAudioRef.current.pause();
          currentAudioRef.current.currentTime = 0;
        }

        // Save final body language data before ending interview
        if (typeof (window as any).saveBodyLanguageFinalData === 'function') {
          try {
            await (window as any).saveBodyLanguageFinalData();
          } catch (err) {
            console.error("Error saving final body language data:", err);
          }
        }
        // Disable MediaPipe auto-restart and ensure the webcam / mediapipe analysis is stopped
        setMediaPipeEnabled(false);
        setIsSampling(false);
        setCheatingDetectionEnabled(false); // Also disable cheating detection
        try {
          console.log("Attempting to stop MediaPipe analysis...");
          if (typeof (window as any).stopMediaPipeAnalysis === 'function') {
            try {
              (window as any).stopMediaPipeAnalysis();
              console.log('Called window.stopMediaPipeAnalysis()');
            } catch (err) {
              console.error("Error stopping MediaPipe analysis:", err);
            }
          } else {
            console.log('window.stopMediaPipeAnalysis not available');
          }

          // Fallback: explicitly stop any MediaStream tracks attached to video elements
          try {
            const videos = document.querySelectorAll('video');
            videos.forEach((v) => {
              try {
                // Pause and stop tracks
                try { (v as HTMLVideoElement).pause(); } catch (_) { }
                const srcObj: any = (v as any).srcObject;
                if (srcObj && typeof srcObj.getTracks === 'function') {
                  srcObj.getTracks().forEach((t: MediaStreamTrack) => {
                    try { t.stop(); } catch (_) { }
                  });
                  console.log('Stopped MediaStream tracks on a <video> element');
                }
                // Remove hidden video element if it's the one created by the hook
                try { if (v.parentNode) v.parentNode.removeChild(v); } catch (_) { }
              } catch (_) { }
            });
          } catch (err) {
            console.error('Error while stopping video elements:', err);
          }
        } catch (err) {
          console.error('Error during camera stop sequence:', err);
        }

        // CLEAR CHAT DATA BUT KEEP SESSION ID FOR FEEDBACK PAGE
        localStorage.removeItem(`interviewChat_${sessionId}`);
        localStorage.removeItem(`interviewQuestionIndex_${sessionId}`);
        localStorage.removeItem(`interviewTotalQuestions_${sessionId}`);
        // Mark interview as completed to prevent restoration
        localStorage.setItem("interviewCompleted", "true");
        // Keep interviewSessionId in localStorage - feedback page will remove it after fetching

        setTimeout(() => navigate("/interview-feedback", { state: { sessionId }, replace: true }), 500);
        return;
      }

      /* ---------------------------
         NEXT QUESTION
         --------------------------- */
      const nextQ = data.nextQuestion || data.question || data.reply;

      if (nextQ) {
        const aiText = String(nextQ);
        // Get the question index from response, or use currentQuestionIndex + 1
        const questionIndex = typeof data.current === "number" ? data.current : (currentQuestionIndex + 1);
        setChat((prev) => [...prev, { sender: "ai", text: aiText, questionIndex }]);
        // TTS will be handled by useEffect watching chat array

        // Start sampling for next question
        setIsSampling(true);
      }

      // UPDATE COUNTERS
      if (typeof data.current === "number") setCurrentQuestionIndex(data.current);
      if (typeof data.total === "number") setTotalQuestions(data.total);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ============================================================
     ENTER → SEND MESSAGE
     ============================================================ */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  /* ============================================================
     UI
     ============================================================ */
  return (
    <>
      <AppLayout fixLayout={true}>
        <div className={`flex flex-col lg:flex-row w-full h-full gap-4 ${rule1Stage === 2 ? 'blur-md pointer-events-none transition-all duration-500' : ''}`}>
          <div className="flex flex-col flex-1 w-full h-full">
            <ContentHeader
              title="Interview Chat"
              description="Answer the questions one by one"
              backButton
              sticky={false}
            />

            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto flex flex-col gap-4 p-4"
            >
              {sessionLoading && (
                <div className="flex items-center justify-center py-8">
                  <p className="text-gray-400">Loading interview session...</p>
                </div>
              )}

              {!sessionLoading && loading && (
                <p className="text-gray-400">Processing...</p>
              )}

              {!sessionLoading && chat.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.sender === "ai" ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`text-white max-w-[80%] lg:max-w-[60%] rounded-2xl lg:rounded-[1.5vw] flex gap-2 lg:gap-[0.5vw] ${msg.sender === "user"
                      ? " flex-row-reverse"
                      : ""
                      }`}
                  >
                    <img
                      src={
                        msg.sender === "ai"
                          ? ImagesPath.aiIcon
                          : ImagesPath.userIcon
                      }
                      alt={msg.sender === "ai" ? "ai assistant" : "user"}
                      className={`object-contain w-4 h-4 lg:w-[2.5vw] lg:h-[2.5vw]`}
                    />
                    <div
                      className={`font-size-20px font-poppins-regular rounded-2xl lg:rounded-[1.5vw] px-4 py-3 ${msg.sender === "ai"
                        ? "bg-primary text-white"
                        : "bg-card border border-border text-text-primary"
                        }`}
                    >
                      {msg.text}

                      {msg.sender === "ai" && msg.questionIndex && totalQuestions && (
                        <div className="text-xs text-gray-300 mt-1">
                          Question {msg.questionIndex} of {totalQuestions}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}

              {!sessionLoading && chat.length === 0 && !loading && (
                <div className="flex items-center justify-center py-8">
                  <p className="text-gray-400">No messages yet. Waiting for question...</p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-800 px-4 pb-4">
              {error && <p className="text-sm text-red-400 mb-2">{error}</p>}

              {/* Identity Verification Warnings */}
              {mismatchCount >= 2 && mismatchCount < 6 && !sessionFinished && (
                <div className="mb-2 p-3 bg-red-900/40 border border-red-500 rounded-lg text-red-100 text-xs font-semibold animate-pulse shadow-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 101.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="uppercase tracking-wider">Security Protocol Alert</span>
                  </div>
                  {noFaceDetected ? "Candidate face not detected. Please remain in frame." :
                    multipleFacesDetected ? "Multiple individuals detected. This is a critical security violation." :
                      "Registered candidate not detected. Unauthorized individual present."}
                  <span className="block mt-1 text-red-300 opacity-80 italic">Proctoring Status: {mismatchCount}/6 violation flags recorded.</span>
                </div>
              )}

              <div className="relative flex items-center w-full">
                <textarea
                  value={input}
                  ref={textareaRef}
                  onChange={(e) => {
                    setInput(e.target.value);
                    if (textareaRef.current) {
                      textareaRef.current.style.height = "auto";
                      textareaRef.current.style.height = `${Math.min(
                        textareaRef.current.scrollHeight,
                        150
                      )}px`;
                    }
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your answer..."
                  className="w-full px-4 py-3 pr-12 rounded-lg bg-card border border-border focus:outline-none focus:ring-2 focus:ring-primary/35 focus:border-transparent text-text-primary placeholder:text-text-secondary/70 resize-none scrollbar-hide"
                  rows={1}
                  disabled={sessionLoading || !sessionId}
                />

                <Button
                  onClick={handleSendMessage}
                  className="absolute right-2 p-2 rounded-md bg-transparent hover:bg-primary/10 text-primary"
                  size="icon"
                  disabled={sessionLoading || !sessionId || loading}
                >
                  <Send size={20} />
                </Button>
              </div>
            </div>
          </div>

          {/* MediaPipe Body Language Analysis - UI enabled to show scores */}
          {!sessionLoading && sessionId && (
            <div className="lg:w-80 lg:border-l lg:border-gray-800 lg:pl-4 lg:pr-4 lg:pt-4 lg:pb-4 w-full pt-4 space-y-4">
              <MediaPipeScoresDisplay
                enabled={mediaPipeEnabled && !isInterviewTerminated}
                showUI={true}
                sessionId={sessionId || undefined}
                isSampling={isSampling}
                questionIndex={currentQuestionIndex}
              />    {/* MediaPipe-Based Cheating Detection */}
              <div className="bg-card border border-border rounded-lg p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-text-primary">Cheating Detection</h3>
                  <div className={`px-2 py-0.5 rounded text-xs font-medium ${sessionFinished
                    ? 'bg-blue-500/20 text-blue-500'
                    : (cheatingResult.cheatingDetected || multipleFacesDetected)
                      ? 'bg-red-500/20 text-red-500'
                      : (noFaceDetected || cheatingResult.status === 'Distracted')
                        ? 'bg-yellow-500/20 text-yellow-500'
                        : 'bg-green-500/20 text-green-500'
                    }`}>
                    {sessionFinished
                      ? 'Completed'
                      : isInterviewTerminated
                        ? 'Terminated'
                        : (cheatingResult.cheatingDetected || multipleFacesDetected)
                          ? 'Violation'
                          : (noFaceDetected || cheatingResult.status === 'Distracted')
                            ? 'Distracted'
                            : 'Active'}
                  </div>
                </div>

                <div className="space-y-2">
                  {/* Phone Detection Status */}
                  <div className="flex items-center justify-between text-gray-400">
                    <span>Phone Detection</span>
                    <div className="flex flex-col items-end">
                      <span className={cheatingResult.phoneDetected ? "text-red-500 font-bold" : "text-green-500"}>
                        {cheatingResult.phoneDetected ? "DETECTED" : "Clear"}
                      </span>
                      {phoneViolationCount > 0 && (
                        <span className="text-[10px] text-red-400">Violation: {phoneViolationCount}/3</span>
                      )}
                    </div>
                  </div>

                  {/* Behavioral Analysis */}
                  <div className="flex items-center justify-between text-gray-400">
                    <span>Focus Analysis</span>
                    <span className={
                      cheatingResult.behavioralCheatingDetected
                        ? "text-red-500 font-bold"
                        : (noFaceDetected || cheatingResult.status === 'Distracted')
                          ? "text-yellow-500 font-bold"
                          : "text-green-500"
                    }>
                      {cheatingResult.behavioralCheatingDetected
                        ? "SUSPICIOUS"
                        : (noFaceDetected || cheatingResult.status === 'Distracted')
                          ? "DISTRACTED"
                          : "FOCUSED"}
                    </span>
                  </div>

                  {/* Warning Message if Distracted/No Face */}
                  {(noFaceDetected || cheatingResult.status === 'Distracted') && !cheatingResult.cheatingDetected && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-2 text-xs text-yellow-500 mt-2">
                      ⚠️ Distracted? Please keep your face visible and look at the camera.
                    </div>
                  )}

                  {/* Detailed behavioral scores */}
                  {cheatingResult.scores.behaviorScore > 0 && (
                    <div className="text-xs text-text-secondary mt-2 space-y-1 border-t border-border pt-2">
                      <div>Gaze Down: {cheatingResult.scores.gazeDown.toFixed(1)}s</div>
                      {cheatingResult.scores.headPitchDown && <div>Head Pitch: Down</div>}
                      {cheatingResult.scores.handNearFace && <div>Hand Near Face: Yes</div>}
                      {cheatingResult.scores.faceOutOfFrame && <div>Face Out of Frame: Yes</div>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </AppLayout>

      {/* Rule 1 Warning (Yellow) */}
      {rule1Stage === 1 && rule1Countdown !== null && !isInterviewTerminated && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-lg">
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-yellow-500 border-2 border-yellow-600 rounded-xl p-4 shadow-2xl flex items-center gap-4"
          >
            <div className="bg-yellow-600/20 p-2 rounded-full">
              <Camera className="text-yellow-900 size-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-yellow-900 font-bold text-lg">Camera is Off</h3>
              <p className="text-yellow-800 text-sm">Please turn it on within 10 seconds to continue.</p>
            </div>
            <div className="relative size-12 flex items-center justify-center">
              <svg className="absolute inset-0 size-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(120, 53, 15, 0.2)" strokeWidth="8" />
                <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(120, 53, 15, 0.8)" strokeWidth="8" strokeDasharray="283" strokeDashoffset={283 - (283 * (rule1Countdown / 10))} className="transition-all duration-1000 ease-linear" />
              </svg>
              <span className="text-yellow-900 font-black text-xl">{rule1Countdown}</span>
            </div>
          </motion.div>
        </div>
      )}

      {/* Rule 1 Stage 2 / Final Warning (Red) */}
      {rule1Stage === 2 && rule1Countdown !== null && !isInterviewTerminated && (
        <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-900 border-2 border-red-500 rounded-2xl p-8 max-w-md w-full text-center shadow-[0_0_50px_rgba(239,68,68,0.3)]"
          >
            <div className="bg-red-500/20 size-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/30">
              <AlertCircle className="text-red-500 size-12 animate-pulse" />
            </div>
            <h2 className="text-red-500 text-3xl font-black mb-4 uppercase italic tracking-wider">Final Warning</h2>
            <p className="text-slate-300 text-lg mb-8">Interview will be terminated immediately. Enable camera now!</p>
            <div className="text-6xl font-black text-white mb-2">{rule1Countdown}</div>
            <div className="text-red-500/60 text-xs font-bold uppercase tracking-[0.2em]">Seconds Remaining</div>
          </motion.div>
        </div>
      )}

      {/* Rule 2: Identity Mismatch (Red - Immediate) */}
      {isInterviewTerminated && violationType === "IDENTITY_MISMATCH" && (
        <div className="fixed inset-0 z-[1000] bg-slate-950 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center max-w-lg"
          >
            <div className="size-24 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_40px_rgba(220,38,38,0.5)]">
              <UserX className="text-white size-14" />
            </div>
            <h1 className="text-red-500 text-4xl font-black mb-4 uppercase tracking-tighter">Security Violation</h1>
            <p className="text-white text-xl font-medium mb-2">Unauthorized Person Detected</p>
            <p className="text-slate-400 mb-8">The assessment has been terminated to ensure integrity. A report has been sent to the proctoring team.</p>
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 inline-flex items-center gap-3 text-slate-400">
              <Clock className="size-5" />
              <span>Redirecting to dashboard...</span>
            </div>
          </motion.div>
        </div>
      )}

      {/* Rule 3: Multiple Faces Warning (Yellow) */}
      {rule3Countdown !== null && !isInterviewTerminated && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-lg">
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-yellow-500 border-2 border-yellow-600 rounded-xl p-4 shadow-2xl flex items-center gap-4"
          >
            <div className="bg-yellow-600/20 p-2 rounded-full">
              <Users className="text-yellow-900 size-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-yellow-900 font-bold text-lg">Multiple Persons Detected</h3>
              <p className="text-yellow-800 text-sm">Only one participant is allowed. Please remove others.</p>
            </div>
            <div className="relative size-12 flex items-center justify-center">
              <svg className="absolute inset-0 size-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(120, 53, 15, 0.2)" strokeWidth="8" />
                <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(120, 53, 15, 0.8)" strokeWidth="8" strokeDasharray="283" strokeDashoffset={283 - (283 * (rule3Countdown / 5))} className="transition-all duration-1000 ease-linear" />
              </svg>
              <span className="text-yellow-900 font-black text-xl">{rule3Countdown}</span>
            </div>
          </motion.div>
        </div>
      )}

      {/* Mobile Phone Detection Warning - Stage 1 (Warning) */}
      {phoneWarningStage === 1 && isPhoneDetectedNow && !isInterviewTerminated && !sessionFinished && (
        <div className="fixed top-32 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-lg">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-yellow-500 border-2 border-yellow-600 rounded-xl p-5 shadow-2xl flex items-center gap-4"
          >
            <div className="bg-yellow-600/20 p-2 rounded-full">
              <AlertCircle className="text-yellow-900 size-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-yellow-900 font-bold text-lg">Mobile Phone Detected</h3>
              <p className="text-yellow-800 text-sm">Please remove the mobile to continue the interview.</p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Mobile Phone Detection Warning - Stage 2 (Final Warning) */}
      {phoneWarningStage === 2 && isPhoneDetectedNow && !isInterviewTerminated && !sessionFinished && (
        <div className="fixed top-32 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-lg">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, y: [0, -5, 0] }}
            transition={{ y: { duration: 0.5, repeat: Infinity } }}
            className="bg-red-600 border-2 border-red-700 rounded-xl p-5 shadow-2xl flex items-center gap-4"
          >
            <div className="bg-red-900/20 p-2 rounded-full">
              <AlertCircle className="text-white size-6 animate-pulse" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-bold text-lg leading-tight">Final Warning</h3>
              <p className="text-white/90 text-sm">Repeated mobile usage may end your interview. Penalty applied.</p>
            </div>
            <div className="bg-white/20 px-2 py-1 rounded text-white font-bold text-xs">
              -10%
            </div>
          </motion.div>
        </div>
      )}

      {/* General Termination Overlay */}
      {isInterviewTerminated && violationType !== "IDENTITY_MISMATCH" && (
        <div className="fixed inset-0 z-[1000] bg-slate-950 flex items-center justify-center p-6 text-center">
          <div className="max-w-lg">
            <div className="size-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/30">
              <AlertCircle className="text-red-500 size-12" />
            </div>
            <h1 className="text-white text-3xl font-black mb-4 uppercase">
              {violationType === "PHONE_CHEATING" ? "Interview Terminated" : "Session Terminated"}
            </h1>
            <p className="text-slate-400 text-lg mb-8">
              {violationType === "PHONE_CHEATING"
                ? "Interview terminated due to repeated policy violations."
                : error}
            </p>
            <div className="text-primary text-sm font-bold animate-pulse">Redirecting to dashboard...</div>
          </div>
        </div>
      )}
    </>
  );
};

export default InterviewChatPage;
