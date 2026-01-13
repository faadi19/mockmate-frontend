import { useNavigate, useLocation } from "react-router-dom";
import { API_BASE_URL } from "../config/api";
import { motion } from "framer-motion";
import AppLayout from "../components/layout/AppLayout";
import ContentHeader from "../components/layout/ContentHeader";
import Button from "../components/ui/Button";
import { Card, CardContent } from "../components/ui/Card";
import { ImagesPath } from "../utils/images";
import { Star, Loader2 } from "lucide-react";
import { useEffect, useState, useRef } from "react";

const InterviewFeedbackPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fetchedRef = useRef(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [evaluation, setEvaluation] = useState<any>({
    technicalAccuracy: 0,
    completeness: 0,
    conciseness: 0,
    problemSolving: 0,
    questions: [],
    totalScore: 0,
    overallPercentage: 0,
    aiSummary: "",
  });

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const fetchEvaluation = async () => {
      const token = localStorage.getItem("token");
      // Try to get sessionId from navigation state first, then localStorage
      const sessionIdFromState = (location.state as any)?.sessionId;
      const sessionIdFromStorage = localStorage.getItem("interviewSessionId");
      const sessionId = sessionIdFromState || sessionIdFromStorage;

      // Debugging sessionId
      console.log("Session ID:", sessionId);

      if (!sessionId) {
        setError("No interview session found.");
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetching interview feedback from backend
        const res = await fetch(`${API_BASE_URL}/api/interview/finish`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ sessionId }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message || `Server error: ${res.status}`);
        }

        const data = await res.json();

        setEvaluation({
          technicalAccuracy: data.technicalAccuracy ?? 0,
          completeness: data.completeness ?? 0,
          conciseness: data.conciseness ?? 0,
          problemSolving: data.problemSolving ?? 0,
          questions: data.questions || [],
          totalScore: data.totalScore || 0,
          overallPercentage: Math.round(
            ((data.technicalAccuracy || 0) +
              (data.completeness || 0) +
              (data.conciseness || 0) +
              (data.problemSolving || 0)) /
            4
          ),
          aiSummary: data.summary || data.aiSummary || "",
        });

        // Clear session data after successfully fetching evaluation
        localStorage.removeItem("interviewSessionId");
        localStorage.removeItem(`interviewChat_${sessionId}`);
        localStorage.removeItem(`interviewQuestionIndex_${sessionId}`);
        localStorage.removeItem(`interviewTotalQuestions_${sessionId}`);
        localStorage.removeItem(`interviewSetupId_${sessionId}`);
        localStorage.removeItem("interviewCompleted");
      } catch (err: any) {
        setError(err?.message || "Failed to fetch evaluation");
      } finally {
        setLoading(false);
      }
    };

    fetchEvaluation();
  }, []);

  const handleViewAnalytics = () => {
    navigate("/performance");
  };

  // Prevent browser back button from going to interview chat
  useEffect(() => {
    const handlePopState = () => {
      // If user tries to go back, redirect to dashboard
      navigate("/dashboard", { replace: true });
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [navigate]);

  return (
    <AppLayout fixLayout>
      <ContentHeader
        title="Interview Complete"
        description="Your interview evaluation"
        backButton
        onBackButtonClick={() => navigate("/dashboard", { replace: true })}
        sticky={false}
      />
      <div className="w-full min-h-screen flex justify-center py-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full flex justify-center"
        >
          <Card className="mx-auto w-full max-w-[85vw] lg:max-w-[75vw] relative">
            <Star className="size-5 lg:size-[2vw] text-yellow-400 absolute top-4 right-4" />

            <CardContent className="pt-8 pb-8 text-center">
              {loading ? (
                /* ===== LOADING STATE ===== */
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="w-16 h-16 lg:w-[4vw] lg:h-[4vw] text-primary animate-spin mb-4" />
                  <h3 className="font-size-28px font-poppins-semibold text-text-primary mb-2">
                    Evaluating Your Interview
                  </h3>
                  <p className="font-size-18px text-text-secondary">
                    Please wait while we analyze your answers...
                  </p>
                </div>
              ) : error ? (
                /* ===== ERROR STATE ===== */
                <div className="py-10">
                  <p className="text-red-400 font-size-20px mb-4">{error}</p>
                  <Button
                    onClick={() => navigate("/dashboard", { replace: true })}
                  >
                    Go to Dashboard
                  </Button>
                </div>
              ) : (
                /* ===== SUCCESS STATE - SHOW RESULTS ===== */
                <>
                  {/* TOP ICON */}
                  <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 lg:w-[6vw] lg:h-[6vw]">
                      <img
                        src={ImagesPath.trophyIcon}
                        alt="trophy"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>

                  <h2 className="font-size-40px font-poppins-bold mb-1">
                    Interview Complete!
                  </h2>
                  <p className="font-size-20px text-text-secondary mb-6">
                    Here is a detailed breakdown of your interview performance.
                  </p>

                  {/* ===== GLOBAL SCORES ===== */}
                  <div className="grid grid-cols-2 gap-4 max-w-[80%] mx-auto mb-8">
                    <ScoreBox
                      value={evaluation.technicalAccuracy}
                      label="Technical Accuracy"
                      color="text-primary"
                    />
                    <ScoreBox
                      value={evaluation.completeness}
                      label="Completeness"
                      color="text-green-400"
                    />
                    <ScoreBox
                      value={evaluation.conciseness}
                      label="Conciseness"
                      color="text-yellow-400"
                    />
                    <ScoreBox
                      value={evaluation.problemSolving}
                      label="Problem Solving"
                      color="text-blue-400"
                    />
                  </div>

                  {/* ===== TOTAL SCORE ===== */}
                  <div className="max-w-[80%] mx-auto bg-background/60 border border-border p-4 rounded-xl mb-10">
                    <p className="font-size-32px font-poppins-bold text-primary">
                      Total Marks: {evaluation.totalScore}
                    </p>
                    <p className="font-size-18px text-text-secondary">
                      Overall Percentage: {evaluation.overallPercentage}%
                    </p>
                  </div>

                  {/* ===== PER-QUESTION FEEDBACK (COLLAPSIBLE) ===== */}
                  <div className="max-w-[85%] mx-auto text-left space-y-4 mb-10">
                    <h3 className="font-size-24px font-poppins-semibold mb-4">
                      Question Feedback
                    </h3>

                    {evaluation.questions.map((q: any, index: number) => (
                      <QuestionAccordion q={q} index={index} key={index} />
                    ))}
                  </div>

                  {/* ===== FINAL SUMMARY ===== */}
                  <div className="max-w-[80%] mx-auto mb-6 text-left">
                    <h3 className="font-poppins-semibold mb-2">Final Summary</h3>
                    <p className="text-text-secondary">{evaluation.aiSummary}</p>
                  </div>

                  <Button
                    onClick={handleViewAnalytics}
                    className="px-8 w-full mx-auto max-w-[80%]"
                    size="lg"
                  >
                    View Detailed Analytics
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  );
};

// ScoreBox Component to display individual scores
const ScoreBox = ({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) => (
  <div className="flex flex-col gap-1 bg-background/60 border border-border rounded-lg p-4 items-center">
    <p className={`font-size-28px font-poppins-bold ${color}`}>{value}%</p>
    <p className="font-size-14px text-text-secondary text-center">{label}</p>
  </div>
);

// Question Accordion Component for collapsible question feedback
const QuestionAccordion = ({ q, index }: any) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-background/60 p-4 rounded-lg border border-border">
      {/* HEADER */}
      <div
        className="flex justify-between items-center cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <p className="text-primary font-medium">
          Q{index + 1}: {q.question}
        </p>
        <span className="text-gray-300 text-sm">{isOpen ? "▲" : "▼"}</span>
      </div>

      {/* CONTENT */}
      {isOpen && (
        <div className="mt-3">
          <p className="text-gray-300 text-sm mb-1">
            <strong>Your Answer:</strong> {q.answer}
          </p>

          <p className="text-green-400 text-md mt-1 mb-1">Score: {q.score} / 10</p>

          <p className="text-gray-400 text-sm">{q.feedback}</p>
        </div>
      )}
    </div>
  );
};

export default InterviewFeedbackPage;
