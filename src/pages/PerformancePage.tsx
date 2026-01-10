import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import AppLayout from "../components/layout/AppLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import ProgressBar from "../components/ui/ProgressBar";
import Button from "../components/ui/Button";

import { Bar, Line } from "react-chartjs-2";
import { TrendingUp, Briefcase } from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";

import ContentHeader from "../components/layout/ContentHeader";
import axios from "axios";
import { API_BASE_URL } from "../config/api";
import AnimatedPage from "../components/ui/AnimatedPage";

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip);

const PerformancePage = () => {
  const reduceMotion = useReducedMotion();
  const [summary, setSummary] = useState<any>({
    interviewsCompleted: 0,
    overallScore: 0,
    overallPercentage: 0,
    improvement: 0,
    progressOverTime: [],
    answerQuality: {
      technicalAccuracy: 0,
      completeness: 0,
      conciseness: 0,
      problemSolving: 0,
    },
    bodyLanguage: {
      eyeContact: 0,
      engagement: 0,
      attention: 0,
      stability: 0,
      expression: 'neutral',
      expressionConfidence: 0,
      dominantExpression: 'neutral',
      overallScore: 0,
    },
  });

  const [activeTab, setActiveTab] = useState("answer-quality");
  const [chartType, setChartType] = useState<"line" | "bar">("line");
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedInterviewId, setSelectedInterviewId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [interviewData, setInterviewData] = useState<Array<{ id: string; score: number; label: string }>>([]);
  // Store graph data separately to preserve it when showing interview-specific performance
  const [graphData, setGraphData] = useState<number[]>([]);
  const token = localStorage.getItem("token");

  /**
   * Theme-aware chart colors
   * We read CSS variables (space-separated RGB) and convert to rgba() strings for canvas.
   * Example var: "--primary" => "59 130 246"
   */
  const chartColors = useMemo(() => {
    const readVar = (name: string) =>
      getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const toRgba = (rgbVar: string, alpha: number) => {
      const parts = rgbVar.split(/\s+/).filter(Boolean);
      if (parts.length < 3) return `rgba(59,130,246,${alpha})`; // fallback (blue)
      return `rgba(${parts[0]},${parts[1]},${parts[2]},${alpha})`;
    };

    const primary = readVar("--primary");
    const secondary = readVar("--secondary");
    const textSecondary = readVar("--text-secondary");

    return {
      primary: (a: number) => toRgba(primary, a),
      secondary: (a: number) => toRgba(secondary, a),
      textSecondary: (a: number) => toRgba(textSecondary, a),
    };
  }, []);

  // Pretty role label for UI (keep original casing if backend provided it)
  const roleLabel =
    selectedRole === "all"
      ? "All roles"
      : (availableRoles.find((r) => r.toLowerCase() === selectedRole.toLowerCase()) ??
        selectedRole).replace(/^\w/, (c) => c.toUpperCase());

  /**
   * Show improvement comparison ONLY when:
   * - user is viewing role summary (not a specific interview)
   * - a previous interview exists for the same selected role
   */
  const hasSameRolePreviousInterview =
    selectedRole !== "all" && Array.isArray(interviewData) && interviewData.length >= 2;

  // Fetch available roles from backend
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        // Try to fetch roles from backend
        // If backend has a dedicated endpoint, use it; otherwise extract from summary
        const res = await axios.get(`${API_BASE_URL}/api/performance/summary`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Check if backend returns roles in response
        if (res?.data?.roles && Array.isArray(res.data.roles)) {
          setAvailableRoles(res.data.roles);
        } else if (res?.data?.summary?.availableRoles && Array.isArray(res.data.summary.availableRoles)) {
          setAvailableRoles(res.data.summary.availableRoles);
        } else {
          // Fallback: Use default roles if backend doesn't provide
          setAvailableRoles(["frontend", "backend", "sqa"]);
        }
      } catch (error) {
        console.error("Error fetching roles:", error);
        // Fallback to default roles on error
        setAvailableRoles(["frontend", "backend", "sqa"]);
      }
    };

    if (token) {
      fetchRoles();
    }
  }, [token]);

  // Fetch role-based summary (when no interview is selected)
  useEffect(() => {
    const fetchSummary = async () => {
      // Skip if an interview is selected (will be handled by interview-specific fetch)
      if (selectedInterviewId) {
        return;
      }

      try {
        setLoading(true);
        // Build API URL with role query parameter
        // Backend expects lowercase role values: "all", "frontend", "backend", "sqa"
        const url = new URL(`${API_BASE_URL}/api/performance/summary`);
        if (selectedRole !== "all") {
          url.searchParams.append("role", selectedRole.toLowerCase());
        }

        const res = await axios.get(url.toString(), {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res?.data?.summary) {
          // Create fresh summary object (NOT reused from previous interview)
          const freshSummary = {
            ...res.data.summary,
            // Ensure all fields are properly initialized
            answerQuality: {
              technicalAccuracy: res.data.summary.answerQuality?.technicalAccuracy || 0,
              completeness: res.data.summary.answerQuality?.completeness || 0,
              conciseness: res.data.summary.answerQuality?.conciseness || 0,
              problemSolving: res.data.summary.answerQuality?.problemSolving || 0,
            },
            bodyLanguage: {
              eyeContact: res.data.summary.bodyLanguage?.eyeContact || 0,
              engagement: res.data.summary.bodyLanguage?.engagement || 0,
              attention: res.data.summary.bodyLanguage?.attention || 0,
              stability: res.data.summary.bodyLanguage?.stability || 0,
              expression: res.data.summary.bodyLanguage?.expression || 'neutral',
              expressionConfidence: res.data.summary.bodyLanguage?.expressionConfidence || 0,
              dominantExpression: res.data.summary.bodyLanguage?.dominantExpression || 'neutral',
              overallScore: res.data.summary.bodyLanguage?.overallScore || 0,
            },
          };

          setSummary(freshSummary);
          // Reset to first page when data changes
          setCurrentPage(0);

          // Build interview data array with IDs
          // Backend may return progressOverTime as array of scores or array of objects with id
          const progressData = res.data.summary.progressOverTime || [];
          const interviews = progressData.map((item: any, index: number) => {
            if (typeof item === 'object' && item.id) {
              // Backend returns objects with id and score
              return {
                id: item.id,
                score: item.score || item.value || 0,
                label: item.label || `Interview ${index + 1}`
              };
            } else {
              // Backend returns simple array of scores, generate IDs
              return {
                id: `interview-${index}`,
                score: typeof item === 'number' ? item : 0,
                label: `Interview ${index + 1}`
              };
            }
          });
          setInterviewData(interviews);
          // Store graph data separately
          setGraphData(res.data.summary.progressOverTime || []);

          // Update available roles if backend returns them
          if (res?.data?.roles && Array.isArray(res.data.roles)) {
            setAvailableRoles(res.data.roles);
          } else if (res?.data?.summary?.availableRoles && Array.isArray(res.data.summary.availableRoles)) {
            setAvailableRoles(res.data.summary.availableRoles);
          }
        }
      } catch (error) {
        console.error("Performance Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [token, selectedRole, selectedInterviewId]);

  // Fetch interview-specific performance (when interview is selected)
  useEffect(() => {
    const fetchInterviewPerformance = async () => {
      if (!selectedInterviewId || !token) {
        return;
      }

      try {
        setLoading(true);
        console.log("🔍 Fetching performance for interviewId:", selectedInterviewId);

        const res = await axios.get(
          `${API_BASE_URL}/api/interview/${selectedInterviewId}/performance`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        console.log("✅ API Response for interviewId:", selectedInterviewId, res.data);

        if (res?.data) {
          // Extract interviewId from response for verification
          const responseInterviewId = res.data.interviewId || res.data.id || res.data.sessionId;
          console.log("📋 Response interviewId:", responseInterviewId);

          // Create completely new summary object to ensure state is NOT reused from previous interview
          // This ensures component re-renders with fresh data
          // Use current state values at the time of fetch
          const currentInterviewData = interviewData.length > 0 ? interviewData.length : 1;
          const currentGraphData = graphData.length > 0 ? graphData : [];

          const newSummary = {
            interviewsCompleted: currentInterviewData, // Keep total count for context
            overallScore: res.data.overallScore || 0,
            overallPercentage: res.data.overallPercentage || res.data.totalScore || 0,
            improvement: 0, // Not applicable for single interview
            progressOverTime: currentGraphData, // Keep graph data for visualization
            answerQuality: {
              technicalAccuracy: res.data.technicalAccuracy || res.data.answerQuality?.technicalAccuracy || 0,
              completeness: res.data.completeness || res.data.answerQuality?.completeness || 0,
              conciseness: res.data.conciseness || res.data.answerQuality?.conciseness || 0,
              problemSolving: res.data.problemSolving || res.data.answerQuality?.problemSolving || 0,
            },
            bodyLanguage: {
              eyeContact: res.data.bodyLanguage?.eyeContact || res.data.eyeContact || 0,
              engagement: res.data.bodyLanguage?.engagement || res.data.engagement || 0,
              attention: res.data.bodyLanguage?.attention || res.data.attention || 0,
              stability: res.data.bodyLanguage?.stability || res.data.stability || 0,
              expression: res.data.bodyLanguage?.expression || res.data.expression || 'neutral',
              expressionConfidence: res.data.bodyLanguage?.expressionConfidence || res.data.expressionConfidence || 0,
              dominantExpression: res.data.bodyLanguage?.dominantExpression || res.data.dominantExpression || 'neutral',
              overallScore: res.data.bodyLanguage?.overallScore ||
                (res.data.bodyLanguage?.eyeContact && res.data.bodyLanguage?.engagement &&
                  res.data.bodyLanguage?.attention && res.data.bodyLanguage?.stability
                  ? Math.round(
                    (res.data.bodyLanguage.eyeContact +
                      res.data.bodyLanguage.engagement +
                      res.data.bodyLanguage.attention +
                      res.data.bodyLanguage.stability) / 4
                  )
                  : 0),
            },
          };

          // Set completely new state (NOT reused from previous interview)
          // This triggers component re-render
          setSummary(newSummary);
          console.log("🔄 State updated with interview-specific performance for interviewId:", selectedInterviewId);
          console.log("📊 New summary data:", newSummary);
        }
      } catch (error) {
        console.error("❌ Error fetching interview performance:", error);
        // On error, deselect interview and show role average
        setSelectedInterviewId(null);
      } finally {
        setLoading(false);
      }
    };

    fetchInterviewPerformance();
  }, [selectedInterviewId, token]);

  // === SAFE GRAPH VALUES ===
  const hasData = interviewData.length > 0;
  const INTERVIEWS_PER_PAGE = 10;

  // If interview is selected, show only that interview; otherwise show all
  const displayData = selectedInterviewId
    ? interviewData.filter(item => item.id === selectedInterviewId)
    : interviewData;

  const allInterviewLabels = hasData
    ? displayData.map(item => item.label)
    : [];

  const allGraphScores = hasData ? displayData.map(item => item.score) : [];
  const allInterviewIds = hasData ? displayData.map(item => item.id) : [];

  // Calculate pagination
  const totalPages = Math.ceil(allInterviewLabels.length / INTERVIEWS_PER_PAGE);
  const startIndex = currentPage * INTERVIEWS_PER_PAGE;
  const endIndex = Math.min(startIndex + INTERVIEWS_PER_PAGE, allInterviewLabels.length);

  // Get current page data
  const baseLabels = allInterviewLabels.slice(startIndex, endIndex);
  const baseScores = allGraphScores.slice(startIndex, endIndex);
  const baseIds = allInterviewIds.slice(startIndex, endIndex);

  // Pad data to ensure it starts from left and maintains consistent scale width
  // This prevents a single bar from being centered in the middle of the chart
  const interviewLabels = [...baseLabels];
  const graphScores = [...baseScores];
  const interviewIds = [...baseIds];

  if (hasData && interviewLabels.length < INTERVIEWS_PER_PAGE) {
    const padCount = INTERVIEWS_PER_PAGE - interviewLabels.length;
    for (let i = 0; i < padCount; i++) {
      interviewLabels.push(""); // Empty label for padding
      graphScores.push(null as any); // Null data point won't be rendered
      interviewIds.push(`pad-${i}`); // Unique ID for padding elements
    }
  }

  // Handle page changes
  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  // === CHART DATA ===
  // Prepare colors for highlighting selected interview
  const backgroundColors = interviewIds.map((interviewId) => {
    const isSelected = selectedInterviewId === interviewId;
    if (chartType === "bar") {
      return isSelected ? chartColors.primary(1) : chartColors.primary(0.6);
    }
    return chartColors.primary(0.12);
  });

  const borderColors = interviewIds.map((interviewId) => {
    const isSelected = selectedInterviewId === interviewId;
    return isSelected ? "rgba(255, 255, 255, 1)" : chartColors.primary(1);
  });

  const borderWidths = interviewIds.map((interviewId) => {
    const isSelected = selectedInterviewId === interviewId;
    return isSelected ? 4 : (chartType === "bar" ? 0 : 3);
  });

  const pointRadii = chartType === "bar"
    ? 0
    : interviewIds.map((interviewId) => {
      return selectedInterviewId === interviewId ? 8 : 5;
    });

  const pointBackgroundColors = interviewIds.map((interviewId) => {
    return selectedInterviewId === interviewId
      ? "rgba(255, 255, 255, 1)"
      : chartColors.primary(1);
  });

  const pointBorderColors = interviewIds.map((interviewId) => {
    return selectedInterviewId === interviewId
      ? chartColors.primary(1)
      : "rgba(255, 255, 255, 1)";
  });

  const pointBorderWidths = interviewIds.map((interviewId) => {
    return selectedInterviewId === interviewId ? 3 : 2;
  });

  const chartData = {
    labels: interviewLabels,
    datasets: [
      {
        label: selectedInterviewId ? "Selected Interview Score" : "Interview Score",
        data: graphScores,
        backgroundColor: chartType === "bar"
          ? backgroundColors
          : chartColors.primary(0.12),
        borderColor: borderColors,
        borderWidth: borderWidths,
        borderRadius: chartType === "bar" ? 6 : 0,
        fill: chartType === "area" || chartType === "line",
        tension: chartType === "bar" ? 0 : 0.4,
        pointRadius: pointRadii,
        pointHoverRadius: chartType === "bar" ? 0 : 7,
        pointBackgroundColor: pointBackgroundColors,
        pointBorderColor: pointBorderColors,
        pointBorderWidth: pointBorderWidths,
        pointHoverBackgroundColor: chartColors.primary(1),
        pointHoverBorderColor: "rgba(255, 255, 255, 1)",
        pointHoverBorderWidth: 3,
      },
    ],
  };

  // Handle chart click to select interview
  const handleChartClick = (event: any, elements: any[]) => {
    if (elements && elements.length > 0) {
      const elementIndex = elements[0].index;
      const clickedInterviewId = interviewIds[elementIndex];

      console.log("🖱️ Chart clicked - elementIndex:", elementIndex, "interviewId:", clickedInterviewId);

      // Toggle selection: if same interview clicked, deselect; otherwise select
      if (selectedInterviewId === clickedInterviewId) {
        console.log("🔓 Deselecting interview:", clickedInterviewId);
        setSelectedInterviewId(null);
      } else {
        console.log("🔒 Selecting interview:", clickedInterviewId);
        setSelectedInterviewId(clickedInterviewId);
      }
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: handleChartClick,
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        titleColor: "rgba(255, 255, 255, 1)",
        bodyColor: "rgba(255, 255, 255, 1)",
        borderColor: chartColors.primary(1),
        borderWidth: 2,
        padding: 14,
        displayColors: false,
        titleFont: {
          size: 14,
          weight: 'bold' as const,
        },
        bodyFont: {
          size: 13,
        },
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => {
            return `Score: ${context.parsed.y}%`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: chartColors.textSecondary(0.9),
          maxRotation: 45,
          minRotation: 45,
          font: {
            size: 11,
          },
        },
        border: {
          color: "rgba(255,255,255,0.2)",
        },
        ...(chartType === "bar" && {
          categoryPercentage: 0.5,
          barPercentage: 0.6,
        }),
      },
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          color: chartColors.textSecondary(0.9),
          font: {
            size: 11,
          },
          stepSize: 10,
        },
        grid: {
          color: "rgba(255,255,255,0.08)",
          lineWidth: 1,
        },
        border: {
          color: "rgba(255,255,255,0.2)",
        },
      },
    },
    ...(chartType === "bar" && { maxBarThickness: 25 }),
  };

  return (
    <AppLayout>
      <AnimatedPage contentClassName="pb-2">
        <ContentHeader
          title="Performance"
          description="Track your interview performance metrics"
          backButton
        />

        {/* ===== TOP SECTION ===== */}
        <motion.div
          initial={reduceMotion ? false : "hidden"}
          animate={reduceMotion ? undefined : "show"}
          variants={{
            hidden: { opacity: 0 },
            show: { opacity: 1, transition: { staggerChildren: 0.08 } },
          }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4 max-w-full"
        >

          {/* ===== CHART ===== */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 14 },
              show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
            }}
            whileHover={reduceMotion ? undefined : { y: -4 }}
            transition={{ type: "spring", stiffness: 240, damping: 18 }}
            className="lg:col-span-2"
          >
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 flex-wrap">
                  <CardTitle className="text-2xl font-semibold">
                    Performance Per Interview
                  </CardTitle>
                  <div className="flex gap-2 items-center flex-wrap">
                    {/* Role Filter Dropdown */}
                    {/* NOTE: Option values must match backend exactly (lowercase) */}
                    {/* Roles are dynamically fetched from backend */}
                    {/* On role change, interview selection is reset */}
                    <select
                      value={selectedRole}
                      onChange={(e) => {
                        console.log("🔄 Role changed to:", e.target.value);
                        setSelectedRole(e.target.value);
                        setSelectedInterviewId(null); // Reset interview selection on role change
                      }}
                      className="px-3 py-1.5 text-xs sm:text-sm rounded-md bg-background border border-border text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/35 focus:border-transparent transition-colors hover:border-primary/60"
                      disabled={loading}
                    >
                      <option value="all">All Interviews</option>
                      {availableRoles.map((role) => (
                        <option key={role} value={role.toLowerCase()}>
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </option>
                      ))}
                    </select>

                    {/* Clear selection button - show only when interview is selected */}
                    {selectedInterviewId && (
                      <Button
                        variant="ghost"
                        onClick={() => setSelectedInterviewId(null)}
                        className="text-xs sm:text-sm px-3 py-1.5"
                        size="sm"
                        title="Clear selection to show role average"
                      >
                        Clear
                      </Button>
                    )}

                    {/* Chart Type Buttons */}
                    <Button
                      variant={chartType === "line" ? "default" : "ghost"}
                      onClick={() => setChartType("line")}
                      className="text-xs sm:text-sm px-3 py-1.5"
                      size="sm"
                    >
                      Line
                    </Button>
                    <Button
                      variant={chartType === "bar" ? "default" : "ghost"}
                      onClick={() => setChartType("bar")}
                      className="text-xs sm:text-sm px-3 py-1.5"
                      size="sm"
                    >
                      Bar
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="h-64 lg:h-[22vw] relative">
                  {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-primary text-sm">Loading...</div>
                    </div>
                  ) : !hasData ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-primary/[0.02] border border-dashed border-border/50 rounded-2xl">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <TrendingUp className="w-6 h-6 text-primary opacity-50" />
                      </div>
                      <h4 className="text-base font-semibold text-text-primary mb-1">No Performance Data Yet</h4>
                      <p className="text-sm text-text-secondary max-w-xs">
                        Complete your first interview for <span className="text-primary font-medium">{roleLabel}</span> to generate performance analytics.
                      </p>
                    </div>
                  ) : (
                    <>
                      {chartType === "line" ? (
                        <Line data={chartData} options={chartOptions} />
                      ) : (
                        <Bar data={chartData} options={chartOptions} />
                      )}
                    </>
                  )}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700">
                    <Button
                      variant="ghost"
                      onClick={handlePrevPage}
                      disabled={currentPage === 0}
                      className="text-sm"
                      size="sm"
                    >
                      Previous
                    </Button>

                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400">
                        Page {currentPage + 1} of {totalPages}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({startIndex + 1}-{endIndex} of {allInterviewLabels.length})
                      </span>
                    </div>

                    <Button
                      variant="ghost"
                      onClick={handleNextPage}
                      disabled={currentPage >= totalPages - 1}
                      className="text-sm"
                      size="sm"
                    >
                      Next
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* ===== STATS PANEL ===== */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 14 },
              show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
            }}
            whileHover={reduceMotion ? undefined : { y: -4 }}
            transition={{ type: "spring", stiffness: 240, damping: 18 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-semibold">Interview Stats</CardTitle>
              </CardHeader>

              <CardContent>
                <div className="space-y-4">

                  {/* Interviews Completed */}
                  <div>
                    <div className="flex justify-between mb-1 text-gray-300">
                      <span>Interviews Completed</span>
                      <span>{summary.interviewsCompleted}</span>
                    </div>
                    <ProgressBar
                      value={summary.interviewsCompleted}
                      max={Math.max(summary.interviewsCompleted, 1)}
                      colorClass="bg-primary"
                    />
                  </div>

                  {/* Overall Score */}
                  <div>
                    <div className="flex justify-between mb-1 text-gray-300">
                      <span>Overall Score</span>
                      <span>{summary.overallPercentage}%</span>
                    </div>
                    <ProgressBar value={summary.overallPercentage} max={100} colorClass="bg-primary" />
                  </div>

                  {/* Improvement */}
                  {selectedInterviewId ? (
                    <div className="rounded-lg border border-border bg-background/60 p-3">
                      <p className="text-sm text-text-secondary">
                        Comparison is shown only in role view. Click “Clear” above the chart to see role comparison.
                      </p>
                    </div>
                  ) : selectedRole === "all" ? (
                    <div className="rounded-lg border border-border bg-background/60 p-3">
                      <p className="text-sm text-text-secondary">
                        Select a specific role to see improvement vs your previous interview in that role.
                      </p>
                    </div>
                  ) : !hasSameRolePreviousInterview ? (
                    <div className="rounded-lg border border-border bg-background/60 p-3">
                      <p className="text-sm text-text-secondary">
                        No previous <span className="text-text-primary font-medium">{roleLabel}</span> interview found to compare yet.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-300">
                          Improvement vs previous {roleLabel} interview
                        </span>
                        <span
                          className={
                            summary.improvement > 0
                              ? "text-green-400 font-semibold"
                              : summary.improvement < 0
                                ? "text-red-400 font-semibold"
                                : "text-gray-300 font-semibold"
                          }
                        >
                          {summary.improvement > 0
                            ? `+${summary.improvement}%`
                            : summary.improvement < 0
                              ? `${summary.improvement}%`
                              : `0%`}
                        </span>
                      </div>
                      <ProgressBar
                        value={Math.abs(summary.improvement)}
                        max={100}
                        colorClass={
                          summary.improvement > 0
                            ? "bg-green-500"
                            : summary.improvement < 0
                              ? "bg-red-500"
                              : "bg-gray-500"
                        }
                      />
                    </div>
                  )}

                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* ========================================================
           DETAILED ANALYSIS
      ======================================================== */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.05 }}
        >
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-2xl font-semibold">Detailed Analysis</CardTitle>

                <div className="flex">
                  <Button
                    variant={activeTab === "answer-quality" ? "default" : "ghost"}
                    onClick={() => setActiveTab("answer-quality")}
                    className="rounded-r-none"
                  >
                    Answer Quality
                  </Button>

                  <Button
                    variant={activeTab === "body-language" ? "default" : "ghost"}
                    onClick={() => setActiveTab("body-language")}
                    className="rounded-l-none"
                  >
                    Body Language
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent>

              {/* =====================================================
                ANSWER QUALITY (Uses overallPercentage)
          ===================================================== */}
              {activeTab === "answer-quality" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

                  {/* HEADER + TOTAL SCORE */}
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">Answer Quality</h3>

                    <span className="text-xl text-primary">
                      {summary.overallPercentage ?? 0}%
                    </span>
                  </div>

                  {/* Sub-metrics */}
                  {Object.entries(summary.answerQuality).map(([key, value]: any) => (
                    <div key={key} className="mb-6">
                      <div className="flex justify-between text-gray-300 mb-1">
                        <span>{key.replace(/^\w/, (c: string) => c.toUpperCase())}</span>
                        <span>{value}%</span>
                      </div>

                      <ProgressBar value={value} max={100} colorClass="bg-primary" />
                    </div>
                  ))}

                </motion.div>
              )}

              {/* =====================================================
                BODY LANGUAGE (Real data from backend)
          ===================================================== */}
              {activeTab === "body-language" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

                  {/* HEADER + TOTAL SCORE */}
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">Body Language</h3>
                    <span className="text-xl text-primary">
                      {summary.bodyLanguage?.overallScore ||
                        (summary.bodyLanguage?.eyeContact && summary.bodyLanguage?.engagement && summary.bodyLanguage?.attention && summary.bodyLanguage?.stability
                          ? Math.round(
                            (summary.bodyLanguage.eyeContact +
                              summary.bodyLanguage.engagement +
                              summary.bodyLanguage.attention +
                              summary.bodyLanguage.stability) / 4
                          )
                          : 0)}%
                    </span>
                  </div>

                  {/* Expression Badge */}
                  {summary.bodyLanguage?.dominantExpression && (
                    <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300">Dominant Expression</span>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {summary.bodyLanguage.dominantExpression === 'happy' && '😊'}
                            {summary.bodyLanguage.dominantExpression === 'sad' && '😢'}
                            {summary.bodyLanguage.dominantExpression === 'nervous' && '😰'}
                            {summary.bodyLanguage.dominantExpression === 'neutral' && '😐'}
                            {summary.bodyLanguage.dominantExpression === 'shocked' && '😲'}
                          </span>
                          <span className="text-primary font-semibold capitalize">
                            {summary.bodyLanguage.dominantExpression}
                          </span>
                          {summary.bodyLanguage.expressionConfidence > 0 && (
                            <span className="text-gray-400 text-sm">
                              ({Math.round(summary.bodyLanguage.expressionConfidence)}%)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Body Language Metrics */}
                  {[
                    {
                      label: "Eye Contact",
                      value: summary.bodyLanguage?.eyeContact || 0,
                      key: "eyeContact"
                    },
                    {
                      label: "Engagement",
                      value: summary.bodyLanguage?.engagement || 0,
                      key: "engagement"
                    },
                    {
                      label: "Attention",
                      value: summary.bodyLanguage?.attention || 0,
                      key: "attention"
                    },
                    {
                      label: "Stability",
                      value: summary.bodyLanguage?.stability || 0,
                      key: "stability"
                    },
                  ].map(({ label, value, key }) => (
                    <div key={key} className="mb-6">
                      <div className="flex justify-between text-gray-300 mb-1">
                        <span>{label}</span>
                        <span>{value}%</span>
                      </div>

                      <ProgressBar value={value} max={100} colorClass="bg-primary" />
                    </div>
                  ))}

                  {/* No Data Message */}
                  {(!summary.bodyLanguage ||
                    (summary.bodyLanguage.eyeContact === 0 &&
                      summary.bodyLanguage.engagement === 0 &&
                      summary.bodyLanguage.attention === 0 &&
                      summary.bodyLanguage.stability === 0)) && (
                      <div className="text-center py-8 text-gray-400">
                        <p>No body language data available yet.</p>
                        <p className="text-sm mt-2">Complete an interview to see your body language analysis.</p>
                      </div>
                    )}

                </motion.div>
              )}

            </CardContent>
          </Card>
        </motion.div>
      </AnimatedPage>
    </AppLayout>
  );
};

export default PerformancePage;
