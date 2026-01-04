import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/api";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import AppLayout from "../components/layout/AppLayout";
import Button from "../components/ui/Button";
import ContentHeader from "../components/layout/ContentHeader";
import InputField from "../components/ui/InputField";
import { ImagesPath } from "../utils/images";
import CustomDropdown, { Options } from "../components/ui/CustomDropdown";
import { Card, CardContent } from "../components/ui/Card";
import AnimatedPage from "../components/ui/AnimatedPage";

const InterviewSetupPage = () => {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [role, setRole] = useState("");
  const [industry, setIndustry] = useState("");
  const [educationLevel, setEducationLevel] = useState<Options | null>(null);
  const [experienceLevel, setExperienceLevel] = useState<Options | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [jobDescription, setJobDescription] = useState<string[]>([]);
  const [isValidRole, setIsValidRole] = useState<boolean | null>(null);
  const [loadingJD, setLoadingJD] = useState(false);
  const [setupId, setSetupId] = useState<string | null>(null);

  const educationOptions = [
    {
      value: "High School",
      label: "High School",
    },
    {
      value: "Associate Degree",
      label: "Associate Degree",
    },
    {
      value: "Bachelor's Degree",
      label: "Bachelor's Degree",
    },
    {
      value: "Master's Degree",
      label: "Master's Degree",
    },
    {
      value: "PhD",
      label: "PhD",
    },
    {
      value: "Self-taught",
      label: "Self-taught",
    },
  ];

  const experienceLevelOptions = [
    {
      value: "entry level",
      label: "entry level",
    },
    {
      value: "mid level",
      label: "mid level",
    },
    {
      value: "senior level",
      label: "senior level",
    },
  ];

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clear JD and validation state immediately when role input changes (only on form, not review screen)
  useEffect(() => {
    if (!showReview) {
      setJobDescription([]);
      setIsValidRole(null);
    }
  }, [role, showReview]);

  // Fetch job description when review screen is shown
  useEffect(() => {
    if (!showReview || !role) return;

    const fetchJobDescription = async () => {
      try {
        setLoadingJD(true);
        // Send role AS-IS (no normalization)
        const roleValue = role.trim();

        const res = await fetch(`${API_BASE_URL}/api/roles/${encodeURIComponent(roleValue)}/jd`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (res.ok) {
          const data = await res.json();

          // Debug: Log the response
          console.log("JD API Response:", data);

          // Check backend response for validRole
          if (data.success && data.validRole === true) {
            setIsValidRole(true);
            // Handle different possible response formats
            const jdArray = data.jobDescriptions || data.jd || data.jobDescription || [];
            if (Array.isArray(jdArray) && jdArray.length > 0) {
              // Limit to 4-5 bullet points
              const jdList = jdArray.slice(0, 5);
              console.log("Setting JD:", jdList);
              setJobDescription(jdList);
            } else {
              console.log("JD array is empty or invalid");
              setJobDescription([]);
            }
          } else if (data.success && data.validRole === false) {
            // Invalid role from backend
            console.log("Invalid role from backend");
            setIsValidRole(false);
            setJobDescription([]);
          } else {
            // Handle case where validRole might not be in response but jobDescriptions exist
            const jdArray = data.jobDescriptions || data.jd || data.jobDescription || [];
            if (Array.isArray(jdArray) && jdArray.length > 0) {
              console.log("JD found without validRole check, setting as valid");
              setIsValidRole(true);
              setJobDescription(jdArray.slice(0, 5));
            } else {
              console.log("No JD found and validRole not true");
              setIsValidRole(null);
              setJobDescription([]);
            }
          }
        } else {
          console.log("API response not OK:", res.status);
          setIsValidRole(null);
          setJobDescription([]);
        }
      } catch (err) {
        console.error("Error fetching job description:", err);
        setIsValidRole(null);
        setJobDescription([]);
      } finally {
        setLoadingJD(false);
      }
    };

    fetchJobDescription();
  }, [showReview, role]);

  // Handle Continue button - show review screen
  const handleContinue = async () => {
    if (!role || !industry || !educationLevel || !experienceLevel) return;

    const token = localStorage.getItem("token");
    if (!token) {
      setError("Not authorized. Please sign in.");
      navigate("/login");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        desiredRole: role,
        industry,
        educationLevel: educationLevel.value,
        experienceLevel: experienceLevel.value,
      };

      console.log("Sending setup request:", payload);

      const res = await fetch(`${API_BASE_URL}/api/interview/setup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }).catch((fetchError) => {
        // Network error (CORS, connection refused, etc.)
        console.error("Fetch error:", fetchError);
        throw new Error(`Network error: ${fetchError.message}. Please check if the backend server is running.`);
      });

      if (!res.ok) {
        let errorMessage = `Request failed: ${res.status}`;
        try {
          const body = await res.json();
          errorMessage = body.message || body.error || errorMessage;
        } catch (parseError) {
          // If response is not JSON, try to get text
          try {
            const text = await res.text();
            if (text) errorMessage = text;
          } catch (e) {
            // Ignore
          }
        }
        throw new Error(errorMessage);
      }

      // parse created setup id
      const created = await res.json().catch((parseError) => {
        console.error("Error parsing response:", parseError);
        throw new Error("Invalid response from server");
      });

      console.log("Setup response:", created);

      const createdSetupId = created?.setup?._id || created?._id || created?.id;
      if (!createdSetupId) {
        throw new Error("Setup created but no setup id returned from server.");
      }

      // Store setup id and show review screen
      setSetupId(createdSetupId);
      localStorage.setItem("setupId", createdSetupId);
      setShowReview(true);
    } catch (err: any) {
      console.error("Setup error:", err);
      const errorMessage = err?.message || "Something went wrong. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle Start Interview button - actually start the interview
  const handleStartInterview = async () => {
    if (!setupId) return;

    const token = localStorage.getItem("token");
    if (!token) {
      setError("Not authorized. Please sign in.");
      navigate("/login");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // ⭐ CLEAR OLD SESSION DATA BEFORE STARTING NEW INTERVIEW
      const oldSessionId = localStorage.getItem("interviewSessionId");
      if (oldSessionId) {
        localStorage.removeItem("interviewSessionId");
        localStorage.removeItem(`interviewChat_${oldSessionId}`);
        localStorage.removeItem(`interviewQuestionIndex_${oldSessionId}`);
        localStorage.removeItem(`interviewTotalQuestions_${oldSessionId}`);
        localStorage.removeItem(`interviewSetupId_${oldSessionId}`);
      }
      localStorage.removeItem("interviewCompleted");

      // start interview session using the setup id
      const startRes = await fetch(`${API_BASE_URL}/api/interview/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ setupId }),
      });

      if (!startRes.ok) {
        const body = await startRes.json().catch(() => ({}));
        const msg = body.message || body.error || `Failed to start interview: ${startRes.status}`;
        throw new Error(msg);
      }

      const startBody = await startRes.json().catch(() => ({}));
      const sessionId = startBody?.session?._id || startBody?._id || startBody?.id;
      if (sessionId) {
        localStorage.setItem("interviewSessionId", sessionId);
        // Link setupId with sessionId to verify on restore
        localStorage.setItem(`interviewSetupId_${sessionId}`, setupId);
      }

      // navigate to interview chat
      navigate("/interview-chat");
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // Review Screen
  if (showReview) {
    return (
      <AppLayout>
        <AnimatedPage contentClassName="pb-2">
          <ContentHeader
            title="Review Interview Details"
            description="Please review the job description before starting"
            backButton
            onBackButtonClick={() => setShowReview(false)}
          />

          <div className="flex flex-col gap-6 lg:gap-[1.5vw] max-w-3xl mx-auto w-full px-4 sm:px-0">
            {/* Invalid Role Message */}
            {!loadingJD && isValidRole === false && (
              <Card className="bg-warning/10 border border-warning/30 rounded-lg">
                <CardContent className="p-6">
                  <p className="text-warning text-center">
                    This role does not exist or is not recognized.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Job Description Card - Show when loading, when validRole === true, or when JD exists */}
            {(loadingJD || isValidRole === true || (jobDescription.length > 0 && isValidRole !== false)) && (
              <Card className="bg-background/60 border border-border rounded-lg">
                <CardContent className="p-6">
                  {loadingJD ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-full max-w-xl">
                        <div className="h-4 w-2/3 bg-border/60 rounded mb-3 animate-pulse" />
                        <div className="h-3 w-full bg-border/50 rounded mb-2 animate-pulse" />
                        <div className="h-3 w-11/12 bg-border/50 rounded mb-2 animate-pulse" />
                        <div className="h-3 w-10/12 bg-border/50 rounded animate-pulse" />
                      </div>
                    </div>
                  ) : jobDescription.length > 0 ? (
                    <div>
                      <h3 className="text-lg font-semibold text-text-primary mb-4">
                        This interview will be based on the following job description
                      </h3>
                      <ul className="space-y-3 text-text-secondary">
                        {jobDescription.map((jd, idx) => (
                          <li key={idx} className="flex items-start">
                            <span className="mr-3 text-primary mt-1">•</span>
                            <span className="flex-1">{jd}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-lg font-semibold text-text-primary mb-4">
                        This interview will be based on the following job description
                      </h3>
                      <p className="text-text-secondary">Job description not available for this role.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            {/* Start Interview Button */}
            <Button
              onClick={handleStartInterview}
              className="w-full flex items-center justify-center gap-2"
              disabled={loading}
              loading={loading}
              icons={
                !loading ? (
                  <ArrowRight className="size-5 lg:size-[1.5vw] text-text-secondary" />
                ) : undefined
              }
              iconsPosition="right"
              rounded
              size="lg"
            >
              {loading ? "Starting Interview..." : "Start Interview"}
            </Button>
          </div>
        </AnimatedPage>
      </AppLayout>
    );
  }

  // Setup Form Screen
  return (
    <AppLayout>
      <AnimatedPage contentClassName="pb-2">
        <ContentHeader
          title="Interview Setup"
          description="Please provide your details to personalize the interview"
          backButton
        />

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="flex flex-col gap-6 lg:gap-[1.5vw] max-w-full"
        >
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.02, ease: "easeOut" }}
          >
            <InputField
              label="Desired Role"
              labelIcon={
                <img
                  src={ImagesPath.roleIcon}
                  alt="role"
                  className="w-[90%] object-contain"
                />
              }
              type="text"
              placeholder="e.g. Front End Developer"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
          </motion.div>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.06, ease: "easeOut" }}
          >
            <InputField
              label="Industry"
              labelIcon={
                <img
                  src={ImagesPath.industryIcon}
                  alt="industry"
                  className="w-[90%] object-contain"
                />
              }
              type="text"
              placeholder="e.g. Technology"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
            />
          </motion.div>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
          >
            <CustomDropdown
              label="Education Level"
              labelIcon={
                <img
                  src={ImagesPath.educationIcon}
                  alt="education"
                  className="w-[90%] object-contain"
                />
              }
              options={educationOptions}
              value={educationLevel ? [educationLevel] : []}
              onOptionChange={(options) => setEducationLevel(options[0])}
              dropdownPosition="top"
            />
          </motion.div>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.14, ease: "easeOut" }}
          >
            <CustomDropdown
              label="Experience Level"
              labelIcon={
                <img
                  src={ImagesPath.clockIcon}
                  alt="education"
                  className="w-[90%] object-contain"
                />
              }
              options={experienceLevelOptions}
              value={experienceLevel ? [experienceLevel] : []}
              onOptionChange={(options) => setExperienceLevel(options[0])}
              dropdownPosition="top"
            />
          </motion.div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <Button
            onClick={handleContinue}
            className="w-full flex items-center justify-center gap-2"
            disabled={
              !role || !industry || !educationLevel || !experienceLevel || loading
            }
            loading={loading}
            icons={
              !loading ? (
                <ArrowRight className="size-5 lg:size-[1.5vw] text-text-secondary" />
              ) : undefined
            }
            iconsPosition="right"
            rounded
            size="lg"
          >
            {loading ? "Processing..." : "Continue"}
          </Button>

          {loading && (
            <div className="flex flex-col items-center justify-center py-4">
              <p className="text-sm text-text-secondary text-center">
                Setting up your personalized interview session...
              </p>
            </div>
          )}
        </motion.div>
      </AnimatedPage>
    </AppLayout>
  );
};

export default InterviewSetupPage;
