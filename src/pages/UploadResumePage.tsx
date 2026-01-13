import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Upload, FileText, X, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import ContentHeader from "../components/layout/ContentHeader";
import Button from "../components/ui/Button";
import { Card, CardContent } from "../components/ui/Card";
import AnimatedPage from "../components/ui/AnimatedPage";
import axios from "axios";
import { API_BASE_URL } from "../config/api";
import { useFaceVerification } from "../hooks/useFaceVerification";

const UploadResumePage = () => {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"success" | "error" | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // JD Review Screen States
  const [showReview, setShowReview] = useState(false);
  const [jobDescription, setJobDescription] = useState<string[]>([]);
  const [isValidRole, setIsValidRole] = useState<boolean | null>(null);
  // const [loadingJD, setLoadingJD] = useState(false); // Removed unused state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [setupId, setSetupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Allowed file types
  const allowedTypes = [
    "application/pdf", // PDF
    "application/msword", // .doc
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
    "image/png", // PNG
  ];

  const allowedExtensions = [".pdf", ".doc", ".docx", ".png"];

  const validateFile = (file: File): boolean => {
    // Check file type
    if (!allowedTypes.includes(file.type)) {
      // Fallback: check extension if MIME type is not recognized
      const fileName = file.name.toLowerCase();
      const hasValidExtension = allowedExtensions.some((ext) =>
        fileName.endsWith(ext)
      );
      if (!hasValidExtension) {
        setErrorMessage(
          "Invalid file type. Please upload only PDF, Word (.doc, .docx), or PNG files."
        );
        return false;
      }
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setErrorMessage("File size exceeds 10MB. Please upload a smaller file.");
      return false;
    }

    return true;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage("");
    setUploadStatus(null);

    if (validateFile(file)) {
      setSelectedFile(file);
    } else {
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    setErrorMessage("");
    setUploadStatus(null);

    if (validateFile(file)) {
      setSelectedFile(file);
    } else {
      setSelectedFile(null);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadStatus(null);
    setErrorMessage("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadStatus(null);
    setErrorMessage("");

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("resume", selectedFile);

      const response = await axios.post(
        `${API_BASE_URL}/api/resume/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.success) {
        setUploadStatus("success");
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }

        // Debug: Log full response
        console.log("Resume upload response:", response.data);

        // Handle auto-redirect if redirectTo is provided
        if (response.data.redirectTo && response.data.interview) {
          const { sessionId: responseSessionId, question, totalQuestions } = response.data.interview;

          // Extract jobDescription from response - check multiple possible locations
          const jdArray = response.data.jobDescription ||
            response.data.jobDescriptions ||
            response.data.jd ||
            response.data.interview?.jobDescription ||
            response.data.interview?.jobDescriptions ||
            response.data.interview?.jd ||
            [];

          console.log("Extracted JD array:", jdArray);

          // Store session data temporarily (will be used when starting interview)
          if (responseSessionId) {
            setSessionId(responseSessionId);
            // Store initial question and total questions
            if (question) {
              const initialChat = [
                {
                  role: "assistant" as const,
                  content: question,
                },
              ];
              localStorage.setItem(`interviewChat_${responseSessionId}`, JSON.stringify(initialChat));
            }
            if (totalQuestions) {
              localStorage.setItem(`interviewTotalQuestions_${responseSessionId}`, totalQuestions.toString());
            }
            localStorage.setItem(`interviewQuestionIndex_${responseSessionId}`, "0");

            // Store a setupId for resume-based interviews (using sessionId as identifier)
            const resumeSetupId = `resume_${responseSessionId}`;
            setSetupId(resumeSetupId);
            localStorage.setItem("setupId", resumeSetupId);
            localStorage.setItem(`interviewSetupId_${responseSessionId}`, resumeSetupId);
          }

          // Set job description and show review screen
          if (Array.isArray(jdArray) && jdArray.length > 0) {
            // Ensure all items are strings to prevent React rendering errors
            const jdList = jdArray
              .slice(0, 5)
              .map((item: any) => {
                if (typeof item === 'string') return item;
                if (typeof item === 'object' && item !== null) {
                  return item.text || item.description || item.content || JSON.stringify(item);
                }
                return String(item);
              });

            console.log("Setting JD:", jdList);
            setJobDescription(jdList);
            setIsValidRole(true);
            // Show review screen after setting state
            setTimeout(() => {
              setShowReview(true);
            }, 100);
          } else {
            console.log("JD array is empty or invalid");
            setJobDescription([]);
            setIsValidRole(null);
            // Show review screen even if no JD (user can still proceed)
            setTimeout(() => {
              setShowReview(true);
            }, 100);
          }
        } else {
          // Clear success message after 3 seconds if no redirect
          setTimeout(() => {
            setUploadStatus(null);
          }, 3000);
        }
      }
    } catch (error: any) {
      setUploadStatus("error");
      const status = error.response?.status;
      if (status === 400 || status === 422) {
        setErrorMessage(
          "Uploaded file does not appear to be a professional resume. Please upload a valid CV."
        );
      } else {
        setErrorMessage(
          error.response?.data?.message ||
          "Failed to upload resume. Please try again."
        );
      }
    } finally {
      setIsUploading(false);
    }
  };

  const getFileIcon = () => {
    if (!selectedFile) return null;
    const fileName = selectedFile.name.toLowerCase();
    if (fileName.endsWith(".pdf")) {
      return <FileText className="w-12 h-12 text-red-500" />;
    } else if (fileName.endsWith(".doc") || fileName.endsWith(".docx")) {
      return <FileText className="w-12 h-12 text-blue-500" />;
    } else if (fileName.endsWith(".png")) {
      return <FileText className="w-12 h-12 text-green-500" />;
    }
    return <FileText className="w-12 h-12 text-primary" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  // Handle Start Interview button - actually start the interview
  const handleStartInterview = async () => {
    if (!sessionId) return;

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
      if (oldSessionId && oldSessionId !== sessionId) {
        localStorage.removeItem("interviewSessionId");
        localStorage.removeItem(`interviewChat_${oldSessionId}`);
        localStorage.removeItem(`interviewQuestionIndex_${oldSessionId}`);
        localStorage.removeItem(`interviewTotalQuestions_${oldSessionId}`);
        localStorage.removeItem(`interviewSetupId_${oldSessionId}`);
      }
      localStorage.removeItem("interviewCompleted");

      // Store sessionId
      localStorage.setItem("interviewSessionId", sessionId);
      if (setupId) {
        localStorage.setItem("setupId", setupId);
        localStorage.setItem(`interviewSetupId_${sessionId}`, setupId);
      }

      // Navigate to interview chat
      navigate(`/interview-chat?sessionId=${sessionId}`, { replace: true });
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // Face Verification State
  const [showFaceVerification, setShowFaceVerification] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isStartingInterview, setIsStartingInterview] = useState(false);

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

          <div className="flex flex-col gap-6 lg:gap-[1.5vw] max-w-3xl mx-auto">
            {/* Invalid Role Message */}
            {isValidRole === false && (
              <Card className="bg-warning/10 border border-warning/30 rounded-lg">
                <CardContent className="p-6">
                  <p className="text-warning text-center">
                    This role does not exist or is not recognized.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Job Description Card - Always show card */}
            <Card className="bg-background/60 border border-border rounded-lg">
              <CardContent className="p-6">
                {false ? (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-text-secondary">Loading job description...</p>
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
                          // Add a small delay for the user to see the success state if needed, 
                          // but the loader itself is good feedback.
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
              </div>)}
          </div>
        </AnimatedPage>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <AnimatedPage contentClassName="pb-2">
        <ContentHeader title="Upload Resume" />

        <div className="max-w-4xl mx-auto mt-8 w-full px-4 sm:px-0">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            whileHover={reduceMotion ? undefined : { y: -4 }}
            className="bg-card rounded-2xl border border-border p-6 lg:p-8 shadow-sm"
          >
            {/* Instructions */}
            <div className="mb-6">
              <p className="text-text-primary text-sm lg:text-base mb-2">
                Upload your resume to help us personalize your interview experience.
              </p>
              <p className="text-text-secondary text-xs lg:text-sm">
                Accepted formats: PDF, Word (.doc, .docx), or PNG (Max size: 10MB)
              </p>
            </div>

            {/* Upload Area */}
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-6 sm:p-8 lg:p-12 transition-all duration-300 ${selectedFile
                ? "border-primary bg-primary/5"
                : "border-border bg-background/30 hover:border-primary/60 hover:bg-primary/5"
                }`}
            >
              {!selectedFile ? (
                <div className="flex flex-col items-center justify-center text-center space-y-4">
                  <Upload className="w-20 h-20 text-primary" />
                  <div className="space-y-2">
                    <p className="text-text-primary font-medium text-lg lg:text-xl">
                      Drag and drop your resume here
                    </p>
                    <p className="text-text-secondary text-sm lg:text-base">or</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.png"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="flex justify-center">
                    <Button
                      className="cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Browse Files
                    </Button>
                  </label>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center space-y-4">
                  <div className="flex items-center justify-center">
                    {getFileIcon()}
                  </div>
                  <div className="space-y-2">
                    <p className="text-text-primary font-medium text-lg lg:text-xl break-all px-4">
                      {selectedFile.name}
                    </p>
                    <p className="text-text-secondary text-sm lg:text-base">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                  <button
                    onClick={handleRemoveFile}
                    className="inline-flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors text-sm lg:text-base"
                  >
                    <X className="w-4 h-4" />
                    Remove File
                  </button>
                </div>
              )}
            </div>

            {/* Error Message */}
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 flex items-center gap-2 p-3 bg-red-900/20 border border-red-500/30 rounded-lg"
              >
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <p className="text-red-400 text-sm">{errorMessage}</p>
              </motion.div>
            )}

            {/* Success Message */}
            {uploadStatus === "success" && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 flex items-center gap-2 p-3 bg-green-900/20 border border-green-500/30 rounded-lg"
              >
                <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                <p className="text-green-400 text-sm">
                  Resume uploaded successfully!
                </p>
              </motion.div>
            )}

            {/* Upload Button */}
            {/* Upload Button */}
            {selectedFile && (
              <div className="mt-6 flex flex-col items-center gap-3">
                <Button
                  onClick={handleUpload}
                  disabled={isUploading}
                  loading={isUploading}
                  className="min-w-[180px]"
                >
                  {isUploading ? "Analyzing Resume..." : "Upload Resume"}
                </Button>

                {isUploading && (
                  <p className="text-sm text-text-secondary animate-pulse">
                    Please wait while we verify your details...
                  </p>
                )}
              </div>
            )}
          </motion.div>

          {/* Additional Info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 bg-card/60 rounded-xl border border-border p-4"
          >
            <h3 className="text-text-primary font-medium mb-2 text-sm lg:text-base">
              Why upload your resume?
            </h3>
            <ul className="text-text-secondary text-xs lg:text-sm space-y-1 list-disc list-inside">
              <li>Personalized interview questions based on your experience</li>
              <li>Better assessment of your skills and qualifications</li>
              <li>Improved feedback tailored to your background</li>
            </ul>
          </motion.div>
        </div>
      </AnimatedPage>
    </AppLayout>
  );
};

export default UploadResumePage;

