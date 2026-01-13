import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/api";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import AppLayout from "../components/layout/AppLayout";
import Button from "../components/ui/Button";
import ContentHeader from "../components/layout/ContentHeader";
import { ImagesPath } from "../utils/images";
import CustomDropdown, { Options } from "../components/ui/CustomDropdown";
import { Card, CardContent } from "../components/ui/Card";
import AnimatedPage from "../components/ui/AnimatedPage";
import { useFaceVerification } from "../hooks/useFaceVerification";
import { useRef } from "react";
import { standardizeRole } from "../utils/roleStandardizer";
import RoleAutocomplete from "../components/ui/RoleAutocomplete";
import IndustryAutocomplete from "../components/ui/IndustryAutocomplete";

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

  // Face Verification State
  const [showFaceVerification, setShowFaceVerification] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isStartingInterview, setIsStartingInterview] = useState(false);

  // No longer needed: Role Autocomplete logic moved to RoleAutocomplete component

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
      label: "Self-Taught",
    },
  ];

  const experienceLevelOptions = [
    {
      value: "entry level",
      label: "Entry Level",
    },
    {
      value: "mid level",
      label: "Mid Level",
    },
    {
      value: "senior level",
      label: "Senior Level",
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
        // Standardize the role using our AI-logic utility
        const standardized = standardizeRole(role);
        console.log(`Role Standardization: "${role}" -> "${standardized.standardized_role}" (Confidence: ${standardized.confidence_score})`);

        // Use the standardized role if confidence is good provided it's not empty, otherwise fallback to normalized input
        const roleValue = standardized.standardized_role || standardized.normalized_key || role.trim();

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
      // Re-standardize to ensure consistency
      const standardized = standardizeRole(role);
      const finalRole = standardized.standardized_role || role.trim();

      const payload = {
        desiredRole: finalRole,
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

  // Sync camera stream with video element
  useEffect(() => {
    if (cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream, showFaceVerification]);

  // Start Camera for Face Verification
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStream(stream);
      setLocalError(null);
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      setLocalError("Could not access camera. Please ensure permissions are granted.");
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  };

  // Initial Face Verification Check
  const { performVerification, isVerifying, error: faceApiError } = useFaceVerification({
    enabled: false, // We'll trigger it manually
    videoElement: videoRef.current,
  });


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

  // Full Screen Loader Overlay
  if (isStartingInterview) {
    return (
      <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-md flex flex-col items-center justify-center">
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-full border-4 border-primary/20 animate-pulse"></div>
          <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-t-primary animate-spin"></div>
          <CheckCircle2 className="absolute inset-0 m-auto text-primary w-8 h-8 animate-in zoom-in duration-500" />
        </div>
        <div className="text-center space-y-3">
          <h3 className="text-2xl font-bold text-text-primary">Identity Verified</h3>
          <p className="text-text-secondary text-lg">Preparing your interview session...</p>
          <div className="flex items-center justify-center gap-2 text-primary/80 text-sm mt-4 animate-pulse">
            <span className="w-2 h-2 bg-primary rounded-full animate-bounce delay-75"></span>
            <span className="w-2 h-2 bg-primary rounded-full animate-bounce delay-150"></span>
            <span className="w-2 h-2 bg-primary rounded-full animate-bounce delay-300"></span>
          </div>
        </div>
      </div>
    );
  }

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

            {/* Start Interview / Verify Face Button */}
            {!showFaceVerification ? (
              <Button
                onClick={() => {
                  setShowFaceVerification(true);
                  startCamera();
                }}
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
                {loading ? "Preparing..." : "Proceed to Identity Verification"}
              </Button>
            ) : (
              <div className="flex flex-col gap-4 w-full">
                <Card className="bg-background/60 border border-border rounded-lg overflow-hidden">
                  <CardContent className="p-0 relative aspect-video bg-black flex items-center justify-center">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    {!cameraStream && !localError && (
                      <p className="text-text-secondary absolute">Initializing camera...</p>
                    )}
                    {localError && !cameraStream && (
                      <p className="text-red-400 absolute px-4 text-center">{localError}</p>
                    )}
                    {isVerifying && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                          <p className="text-white text-sm font-semibold">Verifying Identity...</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {localError && cameraStream && (
                  <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300 mt-2">
                    <p className="text-sm text-red-400 text-center font-medium">
                      {localError}
                    </p>
                  </div>
                )}

                {faceApiError && <p className="text-sm text-red-400 text-center">{faceApiError}</p>}

                <div className="flex gap-4">
                  <Button
                    onClick={() => {
                      setShowFaceVerification(false);
                      stopCamera();
                    }}
                    variant="outline"
                    className="flex-1"
                    disabled={loading || isVerifying}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!videoRef.current) return;
                      setLoading(true);
                      setLocalError(null); // Clear previous errors on new attempt
                      try {
                        const status = await performVerification();

                        if (status === 'SUCCESS') {
                          // Successful verification - show loader then start
                          setIsStartingInterview(true);
                          stopCamera();
                          await handleStartInterview();
                        } else {
                          setLoading(false);
                          if (status === 'NO_FACE') {
                            setLocalError("Face not detected. Please ensure you are clearly visible in the camera frame.");
                          } else if (status === 'MULTI_FACE') {
                            setLocalError("Multiple faces detected. Please ensure only you are present in the frame.");
                          } else if (status === 'WRONG_FACE') {
                            setLocalError("Identity Mismatch: The person on camera does not match the registered candidate. Please ensure the correct candidate is present.");
                          } else {
                            setLocalError("An unexpected error occurred during verification. Please try again.");
                          }
                        }
                      } catch (e: any) {
                        setLoading(false);
                        setLocalError(e.message || "Verification failed");
                      }
                    }}
                    className="flex-1"
                    disabled={loading || isVerifying || !cameraStream}
                    loading={loading}
                  >
                    Verify & Start Interview
                  </Button>
                </div>
              </div>
            )}
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
            className="relative z-50"
          >
            <RoleAutocomplete
              label="Desired Role"
              labelIcon={
                <img
                  src={ImagesPath.roleIcon}
                  alt="role"
                  className="w-[90%] object-contain"
                />
              }
              value={role}
              onChange={setRole}
              onSelect={(val) => {
                setRole(val);
                setIsValidRole(true);
              }}
            />
          </motion.div>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.06, ease: "easeOut" }}
          >
            <IndustryAutocomplete
              label="Industry / Domain"
              labelIcon={
                <img
                  src={ImagesPath.industryIcon}
                  alt="industry"
                  className="w-[90%] object-contain"
                />
              }
              value={industry}
              onChange={setIndustry}
              onSelect={setIndustry}
            />
            <p className="mt-2 text-[10px] text-text-secondary/70 italic px-2">
              Note: Enter industry (e.g. Finance, Healthcare) here. Specific job titles go in the "Desired Role" field above.
            </p>
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
