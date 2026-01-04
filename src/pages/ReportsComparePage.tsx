import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Loader2, ArrowLeftRight } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import ContentHeader from "../components/layout/ContentHeader";
import AnimatedPage from "../components/ui/AnimatedPage";
import Button from "../components/ui/Button";
import ProgressBar from "../components/ui/ProgressBar";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { getAuthenticatedAxios } from "../utils/auth";

type Metrics = {
  overallPercentage: number;
  answerQuality: {
    technicalAccuracy: number;
    completeness: number;
    conciseness: number;
    problemSolving: number;
  };
  bodyLanguage: {
    eyeContact: number;
    engagement: number;
    attention: number;
    stability: number;
  };
  role?: string;
  date?: string;
};

function num(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function extractId(raw: any) {
  return String(raw?._id || raw?.id || raw?.reportId || raw?.sessionId || "");
}

function betterClass(a: number, b: number) {
  if (a === b) return "border-border bg-card";
  return a > b ? "border-success/40 bg-success/10" : "border-error/40 bg-error/10";
}

export default function ReportsComparePage() {
  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const [search] = useSearchParams();

  const leftId = search.get("left") || "";
  const rightId = search.get("right") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [left, setLeft] = useState<Metrics | null>(null);
  const [right, setRight] = useState<Metrics | null>(null);

  const ready = useMemo(() => !!leftId && !!rightId, [leftId, rightId]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!ready) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const api = getAuthenticatedAxios();

        /**
         * Backend comparison API (required):
         * GET /api/reports/compare?leftId=...&rightId=...
         *
         * Expected response shapes can vary; we normalize without hardcoding values.
         */
        const res = await api.get("/api/reports/compare", {
          // Send multiple aliases to stay compatible with various backends
          params: {
            leftId,
            rightId,
            firstId: leftId,
            secondId: rightId,
            id1: leftId,
            id2: rightId,
            reportId1: leftId,
            reportId2: rightId,
          },
        });

        const data = res?.data ?? {};
        // If backend explicitly indicates comparison is unavailable, show message instead of throwing
        const comparisonAvailable =
          typeof data.comparisonAvailable === "boolean" ? data.comparisonAvailable : true;
        if (!comparisonAvailable) {
          if (!mounted) return;
          setLeft(null);
          setRight(null);
          setError(data.message || "Comparison unavailable for these reports.");
          return;
        }

        /**
         * Backwards/forwards compatible keys:
         * - first/second (older frontend expectation)
         * - previous/latest (newer semantic keys)
         * - left/right (some implementations)
         */
        const lRaw =
          data.first ||
          data.previous ||
          data.left ||
          data.reportA ||
          data.a ||
          data?.comparison?.left ||
          data?.reports?.[0];
        const rRaw =
          data.second ||
          data.latest ||
          data.right ||
          data.reportB ||
          data.b ||
          data?.comparison?.right ||
          data?.reports?.[1];

        const normalize = (raw: any): Metrics => {
          const aq = raw?.answerQuality ?? raw?.evaluation ?? raw ?? {};
          const bl = raw?.bodyLanguage ?? raw?.body_language ?? raw?.body ?? {};
          return {
            role: raw?.role || raw?.desiredRole || raw?.setup?.desiredRole,
            date: raw?.date || raw?.createdAt || raw?.updatedAt,
            overallPercentage: num(raw?.overallPercentage ?? raw?.overallScore ?? raw?.score ?? raw?.totalScore),
            answerQuality: {
              technicalAccuracy: num(aq?.technicalAccuracy ?? raw?.technicalAccuracy),
              completeness: num(aq?.completeness ?? raw?.completeness),
              conciseness: num(aq?.conciseness ?? raw?.conciseness),
              problemSolving: num(aq?.problemSolving ?? raw?.problemSolving),
            },
            bodyLanguage: {
              eyeContact: num(bl?.eyeContact),
              engagement: num(bl?.engagement),
              attention: num(bl?.attention),
              stability: num(bl?.stability),
            },
          };
        };

        if (!lRaw || !rRaw) {
          throw new Error(data.message || "Comparison data missing in response.");
        }

        // Guard: ensure backend compared the reports the user selected
        const returnedLeftId = extractId(lRaw);
        const returnedRightId = extractId(rRaw);
        const matchesRequested =
          (returnedLeftId === leftId && returnedRightId === rightId) ||
          (returnedLeftId === rightId && returnedRightId === leftId);

        if (!matchesRequested) {
          /**
           * Fallback (important UX requirement):
           * If backend ignores selected IDs and returns latest/previous, we still allow
           * comparing ANY TWO same-role reports by fetching both report details directly.
           * This still uses backend data (no hardcoding).
           */
          const [aRes, bRes] = await Promise.all([
            api.get(`/api/reports/${encodeURIComponent(leftId)}`),
            api.get(`/api/reports/${encodeURIComponent(rightId)}`),
          ]);

          const aRaw = aRes?.data?.report ?? aRes?.data ?? {};
          const bRaw = bRes?.data?.report ?? bRes?.data ?? {};

          const a = normalize(aRaw);
          const b = normalize(bRaw);

          // Ensure same role before comparing (as required)
          const roleA = (a.role || "").toLowerCase();
          const roleB = (b.role || "").toLowerCase();
          if (roleA && roleB && roleA !== roleB) {
            throw new Error(
              "The selected reports are from different roles. Please select two reports from the same role."
            );
          }

          if (!mounted) return;
          setLeft(a);
          setRight(b);
          return;
        }

        if (!mounted) return;
        setLeft(normalize(lRaw));
        setRight(normalize(rRaw));
      } catch (err: any) {
        if (!mounted) return;
        const rawMsg = err?.response?.data?.message || err?.message || "";
        if (rawMsg === "COMPARE_MISMATCH") {
          setError(
            "The selected reports could not be compared. The server returned results for different reports than the ones you selected. Please go back, select two reports from the same role, and try again."
          );
        } else {
          setError(rawMsg || "Failed to compare reports.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [leftId, rightId, ready]);

  return (
    <AppLayout>
      <AnimatedPage contentClassName="pb-2">
        <ContentHeader
          title="Compare Reports"
          description="Side-by-side report comparison"
          backButton
        />

        {!ready ? (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-xl">Select 2 reports to compare</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-text-secondary mb-4">Go back to the reports list and select two items.</p>
              <Button onClick={() => navigate("/reports")} rounded>
                Back to reports
              </Button>
            </CardContent>
          </Card>
        ) : loading ? (
          <div className="flex justify-center py-10">
            <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/60 px-4 py-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-text-primary">Comparing...</span>
            </div>
          </div>
        ) : error || !left || !right ? (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-xl">Couldn’t compare</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-text-secondary mb-4">{error || "Unknown error"}</p>
              <div className="flex gap-3">
                <Button variant="outline" rounded onClick={() => navigate("/reports")}>
                  Back
                </Button>
                <Button rounded onClick={() => window.location.reload()}>
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-[1vw]">
              <CompareColumn
                title="Report A"
                icon={<ArrowLeftRight className="h-4 w-4 text-primary" />}
                data={left}
                other={right}
              />
              <CompareColumn
                title="Report B"
                icon={<ArrowLeftRight className="h-4 w-4 text-primary" />}
                data={right}
                other={left}
              />
            </div>
          </motion.div>
        )}
      </AnimatedPage>
    </AppLayout>
  );
}

function CompareColumn({
  title,
  icon,
  data,
  other,
}: {
  title: string;
  icon: React.ReactNode;
  data: Metrics;
  other: Metrics;
}) {
  return (
    <div className="space-y-4">
      <Card className={`border ${betterClass(data.overallPercentage, other.overallPercentage)}`}>
        <CardHeader>
          <CardTitle className="text-2xl font-semibold flex items-center gap-2">
            {icon} {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-text-secondary text-sm">Role</p>
              <p className="text-text-primary font-poppins-semibold truncate">{data.role || "Interview"}</p>
              {data.date && <p className="text-text-secondary text-sm mt-2">{new Date(data.date).toLocaleString()}</p>}
            </div>
            <div className="text-right">
              <p className="text-text-secondary text-sm">Overall</p>
              <p className={`text-3xl font-poppins-bold ${data.overallPercentage >= other.overallPercentage ? "text-success" : "text-error"}`}>
                {Math.round(data.overallPercentage)}%
              </p>
              <p className="text-text-secondary text-xs">
                Δ {Math.round(data.overallPercentage - other.overallPercentage)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Answer Quality</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ProgressBar
            value={data.answerQuality.technicalAccuracy}
            max={100}
            label="Technical Accuracy"
            colorClass={data.answerQuality.technicalAccuracy >= other.answerQuality.technicalAccuracy ? "bg-success" : "bg-error"}
          />
          <ProgressBar
            value={data.answerQuality.completeness}
            max={100}
            label="Completeness"
            colorClass={data.answerQuality.completeness >= other.answerQuality.completeness ? "bg-success" : "bg-error"}
          />
          <ProgressBar
            value={data.answerQuality.conciseness}
            max={100}
            label="Conciseness"
            colorClass={data.answerQuality.conciseness >= other.answerQuality.conciseness ? "bg-success" : "bg-error"}
          />
          <ProgressBar
            value={data.answerQuality.problemSolving}
            max={100}
            label="Problem Solving"
            colorClass={data.answerQuality.problemSolving >= other.answerQuality.problemSolving ? "bg-success" : "bg-error"}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Body Language</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ProgressBar
            value={data.bodyLanguage.eyeContact}
            max={100}
            label="Eye Contact"
            colorClass={data.bodyLanguage.eyeContact >= other.bodyLanguage.eyeContact ? "bg-success" : "bg-error"}
          />
          <ProgressBar
            value={data.bodyLanguage.engagement}
            max={100}
            label="Engagement"
            colorClass={data.bodyLanguage.engagement >= other.bodyLanguage.engagement ? "bg-success" : "bg-error"}
          />
          <ProgressBar
            value={data.bodyLanguage.attention}
            max={100}
            label="Attention"
            colorClass={data.bodyLanguage.attention >= other.bodyLanguage.attention ? "bg-success" : "bg-error"}
          />
          <ProgressBar
            value={data.bodyLanguage.stability}
            max={100}
            label="Stability"
            colorClass={data.bodyLanguage.stability >= other.bodyLanguage.stability ? "bg-success" : "bg-error"}
          />
        </CardContent>
      </Card>
    </div>
  );
}


