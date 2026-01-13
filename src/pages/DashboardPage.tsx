import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Target, CheckCircle2, Trophy, XCircle, TrendingUp } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import Button from "../components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import ContentHeader from "../components/layout/ContentHeader";
import { ImagesPath } from "../utils/images";
import axios from "axios";
import { API_BASE_URL } from "../config/api";
import AnimatedPage from "../components/ui/AnimatedPage";

const DashboardPage = () => {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  // DEFAULT INSTANT UI VALUES (no loading screen)
  const [summary, setSummary] = useState({
    interviewsCompleted: 0,
    averagePercentage: 0,
    improvement: 0,
    lastInterviewSummary: "",
  });

  interface AITip {
    tip?: string;
    text?: string;
    summary?: string;
    example?: string;
    resources?: Array<{
      type: 'book' | 'website' | 'Book' | 'Website';
      title?: string;
      name?: string;
      url?: string;
      link?: string;
    }>;
  }

  const [aiTips, setAiTips] = useState<AITip[]>([]);
  const token = localStorage.getItem("token");

  // Fetch summary (runs instantly)
  useEffect(() => {
    const fetchDashboard = async () => {
      if (!token) return;

      try {
        const res = await axios.get(
          `${API_BASE_URL}/api/dashboard/summary`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (res.data?.summary) {
          setSummary(res.data.summary);
        }
      } catch (err) {
        console.error("Dashboard Load Error:", err);
      }
    };

    fetchDashboard();
  }, [token]);

  // Fetch AI tips
  useEffect(() => {
    const fetchAITips = async () => {
      if (!token) return;

      try {
        // Fetching the absolute latest session insights (default backend behavior when no role is sent)
        const res = await axios.get(`${API_BASE_URL}/api/dashboard/ai-tips`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data?.success) {
          const extractUrl = (value: string): string => {
            const match = value.match(/https?:\/\/\S+/i);
            return match ? match[0] : "";
          };

          const normalizeResources = (raw: any): AITip["resources"] => {
            if (Array.isArray(raw)) return raw;
            if (!raw || typeof raw !== "object") return [];
            return Object.entries(raw).map(([key, val]) => {
              const strVal = typeof val === "string" ? val : JSON.stringify(val);
              const url = extractUrl(strVal);
              const title = strVal.split(" - ")[0]?.trim() || key;
              const type = key.toLowerCase().includes("book") ? "book" : "website";
              return { type, title, url };
            });
          };

          const normalizeTipObject = (t: any): AITip => {
            const summaryText = t?.tip || t?.text || t?.summary || "";
            return {
              tip: summaryText,
              text: summaryText,
              summary: t?.summary,
              example: t?.example,
              resources: normalizeResources(t?.resources),
            };
          };

          const rawTips = res.data.tips ?? [];
          let normalized: AITip[] = [];

          if (Array.isArray(rawTips)) {
            if (rawTips.length > 0 && typeof rawTips[0] === "string") {
              normalized = rawTips.map((tip: string) => ({ tip, text: tip }));
            } else {
              normalized = rawTips.map((t: any) => normalizeTipObject(t));
            }
          } else if (rawTips && typeof rawTips === "object") {
            normalized = [normalizeTipObject(rawTips)];
          } else {
            normalized = [];
          }

          setAiTips(normalized);
        }
      } catch (err) {
        console.error("AI Tips Error:", err);
        setAiTips([]);
      }
    };

    fetchAITips();
  }, [token]);

  const handleStartInterview = () => {
    navigate("/interview-setup");
  };

  // HELPER LOGIC FOR COACHING TONE
  const getImprovementTrend = (value: number) => {
    if (value > 5) return { label: "Performance Climbing", color: "text-green-400" };
    if (value > 0) return { label: "Steady Progress", color: "text-primary" };
    if (value === 0) return { label: "Maintained Level", color: "text-text-secondary" };
    return { label: "Focus Requested", color: "text-orange-400" };
  };

  const getScoreContext = (score: number) => {
    if (score >= 80) return "Global Benchmark: Senior Readiness";
    if (score >= 70) return "Global Benchmark: Mid-Level Readiness";
    if (score >= 60) return "Global Benchmark: Entry-Level Readiness";
    return "Below Industry Benchmark (60%)";
  };

  const trend = getImprovementTrend(summary.improvement);
  const scoreContext = getScoreContext(summary.averagePercentage);

  // Parse summary for bullet points (Coaching Insights)
  const summaryBullets = summary.lastInterviewSummary
    ? summary.lastInterviewSummary
      .replace(/vs\./gi, "vs_TEMP") // Temporary placeholder to avoid splitting on vs.
      .split('.')
      .map(s => s.replace(/vs_TEMP/gi, "vs.")) // Restore vs.
      .filter(s => s.trim().length > 10)
      .slice(0, 3)
    : [];

  const cardData = [
    {
      title: "Interviews Completed",
      value: summary.interviewsCompleted,
      icon: ImagesPath.usersIcon,
      colorClass: "text-text-primary",
      subtitle: "Total sessions logged",
    },
    {
      title: "Proficiency Level",
      value: `${summary.averagePercentage}%`,
      icon: ImagesPath.clockIcon,
      colorClass: "text-text-primary",
      subtitle: scoreContext,
    },
    {
      title: "Growth Trend",
      value: trend.label,
      icon: ImagesPath.skillsIcon,
      colorClass: trend.color,
      subtitle: summary.improvement !== 0 ? `${summary.improvement > 0 ? '+' : ''}${summary.improvement}% vs last evaluation` : "Session baseline established",
    },
  ];

  const safeAiTips = Array.isArray(aiTips) ? aiTips : [];

  return (
    <AppLayout>
      <AnimatedPage contentClassName="pb-2">
        <ContentHeader
          title="AI Career Coach"
          description="Strategic insights to help you land your desired role"
          sideButtons={
            <div className="flex items-center gap-3">
              <motion.div whileHover={reduceMotion ? undefined : { y: -2 }} whileTap={reduceMotion ? undefined : { scale: 0.98 }}>
                <Button
                  onClick={() => navigate("/reports")}
                  variant="outline"
                  size="lg"
                >
                  View Reports
                </Button>
              </motion.div>
              <motion.div whileHover={reduceMotion ? undefined : { y: -2 }} whileTap={reduceMotion ? undefined : { scale: 0.98 }}>
                <Button
                  onClick={handleStartInterview}
                  size="lg"
                  icons={<ArrowRight className="size-5 lg:size-[1vw]" />}
                  iconsPosition="right"
                >
                  Start Interview
                </Button>
              </motion.div>
            </div>
          }
        />

        {/* CAREER CONTEXT BANNER */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
          animate={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
          className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-8 flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-xs text-text-secondary uppercase tracking-wider font-bold">Targeting</p>
              <h2 className="text-xl font-poppins-bold text-text-primary">
                Technical Professional <span className="text-primary font-poppins-regular ml-2">| All Roles Data</span>
              </h2>
            </div>
          </div>
          <div className="hidden md:block text-right">
            <p className="text-xs text-text-secondary">Current Focus</p>
            <p className="text-sm font-semibold text-primary">Technical Proficiency & Communication</p>
          </div>
        </motion.div>

        {/* STATS */}
        <motion.div
          initial={reduceMotion ? false : "hidden"}
          animate={reduceMotion ? undefined : "show"}
          variants={{
            hidden: { opacity: 0 },
            show: { opacity: 1, transition: { staggerChildren: 0.08 } },
          }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 max-w-full"
        >
          {cardData.map((card, index) => (
            <motion.div
              key={index}
              variants={{
                hidden: { opacity: 0, y: 14 },
                show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
              }}
              whileHover={reduceMotion ? undefined : { y: -6 }}
              transition={{ type: "spring", stiffness: 240, damping: 18 }}
            >
              <Card className="relative h-full rounded-xl lg:rounded-[1.5vw] transition-all duration-300 hover:shadow-xl hover:border-primary/40 hover:bg-primary/5">
                <CardContent className="p-4 lg:p-[0.8vw]">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-size-20px font-poppins-regular text-text-secondary">
                      {card.title}
                    </p>
                    <img
                      src={card.icon}
                      alt={card.title}
                      className="w-5 lg:w-[1.2vw] opacity-70"
                    />
                  </div>
                  <div>
                    <h3 className={`font-size-36px font-poppins-bold ${card.colorClass || "text-text-primary"}`}>
                      {card.value}
                    </h3>
                    <p className="text-xs text-text-secondary mt-1 font-medium italic">
                      {card.subtitle}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* PERFORMANCE ANALYSIS & COACHING RECOMMENDATION */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, x: -12 }}
            animate={reduceMotion ? undefined : { opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="h-full rounded-xl lg:rounded-[1.5vw] p-5 overflow-hidden border-l-4 border-l-primary">
              <CardHeader className="pb-3 px-0">
                <CardTitle className="font-size-24px flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  Coach Insights: Last Session
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0">
                {summaryBullets.length > 0 ? (
                  <div className="space-y-4">
                    {summaryBullets.map((bullet, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />
                        <p className="text-text-secondary text-sm leading-relaxed">{bullet.trim()}.</p>
                      </div>
                    ))}
                    <div className="pt-2">
                      <Button
                        variant="ghost"
                        onClick={() => navigate("/reports")}
                        className="text-primary p-0 hover:bg-transparent hover:underline"
                        icons={<ArrowRight className="h-4 w-4" />}
                        iconsPosition="right"
                      >
                        View full performance report
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-text-secondary italic">Complete an interview to see personalized insights.</p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, x: 12 }}
            animate={reduceMotion ? undefined : { opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="h-full rounded-xl lg:rounded-[1.5vw] p-5 overflow-hidden bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
              <CardHeader className="pb-3 px-0">
                <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  <button className="flex items-center gap-2 whitespace-nowrap bg-green-400/10 text-green-400 px-3 py-1.5 rounded-full text-sm font-bold border border-green-400/20">
                    <CheckCircle2 className="h-4 w-4" />
                    Strengths
                  </button>
                  <button className="flex items-center gap-2 whitespace-nowrap bg-orange-400/10 text-orange-400 px-3 py-1.5 rounded-full text-sm font-bold border border-orange-400/20">
                    <TrendingUp className="h-4 w-4" />
                    Growth Areas
                  </button>
                </div>
              </CardHeader>
              <CardContent className="px-0">
                <div className="space-y-4">
                  {summary.interviewsCompleted > 0 ? (
                    <>
                      <div className="grid grid-cols-1 gap-3">
                        <div className="p-3 bg-background/40 rounded-xl border border-border flex items-start gap-3">
                          <div className="h-8 w-8 rounded-lg bg-green-400/10 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="h-5 w-5 text-green-400" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-text-primary">Reliable Technical Fundamentals</p>
                            <p className="text-xs text-text-secondary">Strong baseline in core concepts.</p>
                          </div>
                        </div>
                        <div className="p-3 bg-background/40 rounded-xl border border-border flex items-start gap-3">
                          <div className="h-8 w-8 rounded-lg bg-orange-400/10 flex items-center justify-center shrink-0">
                            <XCircle className="h-5 w-5 text-orange-400" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-text-primary">Advanced System Design</p>
                            <p className="text-xs text-text-secondary">Focus on scalability and optimization patterns.</p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-xs text-text-secondary font-bold uppercase mb-3">AI Coach Recommendation</p>
                        <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
                          <p className="text-sm text-text-primary font-medium mb-3">Target Mid-Level complexity to challenge your current baseline.</p>
                          <Button
                            onClick={() => navigate("/interview-setup")}
                            size="sm"
                            className="w-full"
                          >
                            Take Targeted Mock Interview
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-text-secondary italic">Evaluation in progress...</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* AI TIPS */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mt-8"
        >
          <Card className="rounded-xl p-5 lg:p-[2vw]">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <CardTitle className="font-size-24px font-poppins-bold">
                  AI-Generated Tips: Latest Interview Evaluation
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  <p className="text-sm text-text-secondary/80 font-medium">
                    Based on your most recent professional session
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {safeAiTips.length === 0 ? (
                <p className="text-text-secondary">
                  No tips available yet. Complete an interview to receive AI tips.
                </p>
              ) : (
                <div className="space-y-4">
                  {safeAiTips.map((tip, idx) => {
                    const tipText = tip.tip || tip.text || '';
                    const example = tip.example || '';
                    const resources = tip.resources || [];

                    return (
                      <Card key={idx} className="bg-background/60 border border-border rounded-lg">
                        <CardContent className="p-4">
                          {/* Tip Text */}
                          {tipText && (
                            <div className="mb-3">
                              <p className="text-text-secondary font-size-18px leading-relaxed">
                                {tipText}
                              </p>
                            </div>
                          )}

                          {/* Example */}
                          {example && (
                            <div className="mb-3 pl-4 border-l-2 border-primary/40">
                              <p className="text-sm font-semibold text-primary mb-1">Example:</p>
                              <p className="text-text-secondary text-sm italic">{example}</p>
                            </div>
                          )}

                          {/* Resources */}
                          {resources.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-border">
                              <p className="text-sm font-semibold text-primary mb-2">Resources:</p>
                              <div className="space-y-2">
                                {resources.map((resource, resIdx) => {
                                  const resourceType = resource.type?.toLowerCase() || '';
                                  const isBook = resourceType === 'book';
                                  const isWebsite = resourceType === 'website';
                                  const resourceName = resource.title || resource.name || '';
                                  const resourceUrl = resource.url || resource.link || '';

                                  return (
                                    <div key={resIdx} className="flex items-center gap-2 text-sm">
                                      <span className={`px-2 py-1 rounded text-xs font-semibold ${isBook
                                        ? 'bg-blue-600/20 text-blue-400'
                                        : isWebsite
                                          ? 'bg-green-600/20 text-green-400'
                                          : 'bg-gray-600/20 text-gray-400'
                                        }`}>
                                        {isBook ? 'Book' : isWebsite ? 'Website' : 'Resource'}
                                      </span>
                                      {resourceUrl ? (
                                        <a
                                          href={resourceUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-primary hover:text-primary/80 underline"
                                        >
                                          {resourceName || resourceUrl}
                                        </a>
                                      ) : (
                                        <span className="text-text-secondary">{resourceName || 'N/A'}</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatedPage>
    </AppLayout>
  );
};

export default DashboardPage;
