import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Send } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import Button from "../components/ui/Button";
import ContentHeader from "../components/layout/ContentHeader";
import { ImagesPath } from "../utils/images";
import MediaPipeScoresDisplay from "../components/MediaPipeScoresDisplay";
import { useCheatingDetection } from "../hooks/useCheatingDetection";

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
    const response = await fetch("http://localhost:5000/api/interview/tts", {
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
  const [error, setError] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
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
     STOP AUDIO ON LOCATION CHANGE (NAVIGATION)
     ============================================================ */
  useEffect(() => {
    // Stop audio if user navigates away
    const handleBeforeUnload = () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
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
        `http://localhost:5000/api/interview/session/${sessionIdToLoad}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
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

            setSessionLoading(false);
            return; // ⭐ DO NOT START INTERVIEW AGAIN
          }
        }
      }

      // ⭐ OTHERWISE, START A NEW INTERVIEW
      try {
        setLoading(true);
        const res = await fetch("http://localhost:5000/api/interview/start", {
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

    try {
      setLoading(true);

      const res = await fetch("http://localhost:5000/api/interview/answer", {
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
                try { (v as HTMLVideoElement).pause(); } catch (_) {}
                const srcObj: any = (v as any).srcObject;
                if (srcObj && typeof srcObj.getTracks === 'function') {
                  srcObj.getTracks().forEach((t: MediaStreamTrack) => {
                    try { t.stop(); } catch (_) {}
                  });
                  console.log('Stopped MediaStream tracks on a <video> element');
                }
                // Remove hidden video element if it's the one created by the hook
                try { if (v.parentNode) v.parentNode.removeChild(v); } catch (_) {}
              } catch (_) {}
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
    <AppLayout fixLayout={true}>
      <div className="flex flex-col lg:flex-row w-full h-full gap-4">
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
                className={`text-white max-w-[80%] lg:max-w-[60%] rounded-2xl lg:rounded-[1.5vw] flex gap-2 lg:gap-[0.5vw] ${
                  msg.sender === "user"
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
                  className={`font-size-20px font-poppins-regular rounded-2xl lg:rounded-[1.5vw] px-4 py-3 ${
                    msg.sender === "ai"
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
            <MediaPipeScoresDisplay enabled={mediaPipeEnabled} showUI={true} sessionId={sessionId} />
            
            {/* MediaPipe-Based Cheating Detection */}
            <div className="bg-card border border-border rounded-lg p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-text-primary">Cheating Detection</h3>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${cheatingDetectionEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
                  <span className={`text-xs ${cheatingDetectionEnabled ? 'text-green-400' : 'text-gray-400'}`}>
                    {cheatingDetectionEnabled ? 'Active' : 'Disabled'}
                  </span>
                </div>
              </div>

              {cheatingResult.error && (
                <div className="bg-red-900/20 border border-red-700/50 rounded px-3 py-2 text-xs text-red-300">
                  <div className="font-semibold">⚠️ Detection Error</div>
                  <div className="text-xs mt-1">{cheatingResult.error}</div>
                </div>
              )}

              {!cheatingResult.error && (
                <>
                  {cheatingResult.cheatingDetected ? (
                    <div className="bg-red-900/20 border border-red-700/50 rounded px-3 py-2 space-y-1">
                      <div className="font-semibold text-red-400">⚠️ Cheating Detected</div>
                      <div className="text-xs text-red-300">
                        Status: <span className="font-semibold">{cheatingResult.status}</span>
                      </div>
                      {cheatingResult.phoneDetected && (
                        <div className="text-xs text-red-300">📱 Phone detected by backend</div>
                      )}
                      {cheatingResult.behavioralCheatingDetected && (
                        <div className="text-xs text-red-300">
                          Behavior Score: {cheatingResult.behaviorScore}/100
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-green-900/20 border border-green-700/30 rounded px-3 py-2 space-y-1">
                      <div className="text-green-400 text-xs font-semibold">✅ No Cheating Detected</div>
                      <div className="text-xs text-green-300">
                        Status: <span className="font-semibold">{cheatingResult.status}</span>
                      </div>
                      {cheatingResult.behaviorScore > 0 && (
                        <div className="text-xs text-green-300">
                          Behavior Score: {cheatingResult.behaviorScore}/100
                        </div>
                      )}
                    </div>
                  )}

                  {/* Detailed behavioral scores */}
                  {cheatingResult.scores.behaviorScore > 0 && (
                    <div className="text-xs text-text-secondary mt-2 space-y-1">
                      <div>Gaze Down: {cheatingResult.scores.gazeDown.toFixed(1)}s</div>
                      {cheatingResult.scores.headPitchDown && <div>Head Pitch: Down</div>}
                      {cheatingResult.scores.handNearFace && <div>Hand Near Face: Yes</div>}
                      {cheatingResult.scores.faceOutOfFrame && <div>Face Out of Frame: Yes</div>}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default InterviewChatPage;
