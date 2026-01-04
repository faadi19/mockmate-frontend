import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
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
      if (!token) return; // Don't fetch if no token
      
      try {
        const res = await axios.get(
          "http://localhost:5000/api/dashboard/summary",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (res.data?.summary) {
          setSummary(res.data.summary);
        }
      } catch (err) {
        console.error("Dashboard Load Error:", err);
        // Keep default values on error - component will still render
      }
    };

    fetchDashboard();
  }, [token]);

  // Fetch AI tips
  useEffect(() => {
    const fetchAITips = async () => {
      if (!token) return; // Don't fetch if no token
      
      try {
        const res = await fetch("http://localhost:5000/api/dashboard/ai-tips", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          console.error("AI Tips Error: Response not ok", res.status);
          return;
        }

        const data = await res.json();
        if (data.success) {
          /**
           * Backend can return:
           * - tips: string[]
           * - tips: object[] (new)
           * - tips: single object (current response in your screenshot)
           * Also resources can be array OR object -> normalize to array for UI.
           */
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

          const rawTips = data.tips ?? [];
          let normalized: AITip[] = [];

          if (Array.isArray(rawTips)) {
            if (rawTips.length > 0 && typeof rawTips[0] === "string") {
              normalized = rawTips.map((tip: string) => ({ tip, text: tip }));
            } else {
              normalized = rawTips.map((t: any) => normalizeTipObject(t));
            }
          } else if (rawTips && typeof rawTips === "object") {
            // single object -> wrap into array
            normalized = [normalizeTipObject(rawTips)];
          } else {
            normalized = [];
          }

          setAiTips(normalized);
        }
      } catch (err) {
        console.error("AI Tips Error:", err);
        // Set empty array on error to prevent rendering issues
        setAiTips([]);
      }
    };

    fetchAITips();
  }, [token]);

  const handleStartInterview = () => {
    navigate("/interview-setup");
  };

  // CARD VALUES
  const cardData = [
    {
      title: "Interviews Completed",
      value: summary.interviewsCompleted,
      icon: ImagesPath.usersIcon,
      colorClass: "text-text-primary",
    },
    {
      title: "Average Score",
      value: `${summary.averagePercentage}%`,
      icon: ImagesPath.clockIcon,
      colorClass: "text-text-primary",
    },
    {
      title: "Improvement",
      value:
        summary.improvement > 0
          ? `+${summary.improvement}%`
          : summary.improvement < 0
          ? `${summary.improvement}%`
          : "0%",
      icon: ImagesPath.skillsIcon,
      colorClass:
        summary.improvement > 0
          ? "text-green-400"
          : summary.improvement < 0
          ? "text-red-400"
          : "text-text-primary",
    },
  ];

  const safeAiTips = Array.isArray(aiTips) ? aiTips : [];

  return (
    <AppLayout>
      <AnimatedPage contentClassName="pb-2">
        <ContentHeader
          title="Dashboard"
          description="Track your interview preparation progress"
          sideButtons={
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
          }
        />

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
              <Card className="relative rounded-xl lg:rounded-[1.5vw] transition-all duration-300 hover:shadow-xl hover:border-primary/40 hover:bg-primary/5">
                <CardContent className="p-4 lg:p-[0.8vw]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`font-size-40px font-poppins-bold ${card.colorClass || "text-text-primary"}`}>
                        {card.value}
                      </h3>
                      <p className="font-size-20px font-poppins-regular text-text-secondary">
                        {card.title}
                      </p>
                    </div>
                    <img
                      src={card.icon}
                      alt={card.title}
                      className="w-6 lg:w-[1.8vw] absolute top-4 right-4 opacity-90"
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* LAST SUMMARY */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <Card className="rounded-xl lg:rounded-[1.5vw] p-5">
            <CardHeader>
              <CardTitle className="font-size-28px">
                Last Interview Summary
              </CardTitle>
            </CardHeader>

            <CardContent>
              {summary.lastInterviewSummary ? (
                <p className="text-text-secondary leading-relaxed font-size-20px">
                  {summary.lastInterviewSummary}
                </p>
              ) : (
                <p className="text-text-secondary">No interviews completed yet.</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

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
            <CardTitle className="font-size-24px font-poppins-bold">
              AI Tips for Your Next Interview
            </CardTitle>
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
                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                      isBook 
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
