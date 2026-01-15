import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Download, Loader2, TrendingDown, TrendingUp } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import ContentHeader from "../components/layout/ContentHeader";
import AnimatedPage from "../components/ui/AnimatedPage";
import Button from "../components/ui/Button";
import ProgressBar from "../components/ui/ProgressBar";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { getAuthenticatedAxios } from "../utils/auth";

type AnswerQuality = {
  technicalAccuracy: number;
  completeness: number;
  conciseness: number;
  problemSolving: number;
};

type BodyLanguage = {
  eyeContact: number;
  engagement: number;
  attention: number;
  stability: number;
  dominantExpression?: string;
  expressionConfidence?: number;
  overallScore?: number;
};

type QuestionFeedback = {
  question: string;
  answer?: string;
  score?: number;
  feedback?: string;
};

type ReportDetail = {
  id: string;
  role?: string;
  date?: string;
  overallPercentage: number;
  totalScore?: number;
  aiSummary?: string;
  answerQuality: AnswerQuality;
  bodyLanguage: BodyLanguage;
  questions: QuestionFeedback[];
};

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function ReportDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [improvementLoading, setImprovementLoading] = useState(false);
  const [improvementDelta, setImprovementDelta] = useState<number | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    const fetchReport = async () => {
      if (!id) return;
      setLoading(true);
      setError("");

      try {
        const api = getAuthenticatedAxios();

        /**
         * Backend-driven report detail.
         * Expected: GET /api/reports/:id
         */
        const res = await api.get(`/api/reports/${encodeURIComponent(id)}`);
        const raw = res?.data?.report ?? res?.data ?? {};

        // Normalize (do NOT hardcode data; just map possible keys)
        const answerQualityRaw = raw?.answerQuality ?? raw?.evaluation ?? raw?.feedback?.evaluation ?? raw ?? {};
        const bodyLanguageRaw = raw?.bodyLanguage ?? raw?.body_language ?? raw?.body ?? raw?.feedback?.body_language ?? {};
        const feedbackRaw = raw?.feedback ?? {};

        const normalized: ReportDetail = {
          id: String(raw?._id || raw?.id || id),
          role: raw?.role || raw?.desiredRole || raw?.interviewRole || raw?.setup?.desiredRole,
          date: raw?.date || raw?.createdAt || raw?.updatedAt,
          overallPercentage: safeNum(raw?.overallPercentage ?? raw?.overallScore ?? raw?.score ?? raw?.totalScore ?? feedbackRaw?.overall_score ?? feedbackRaw?.score ?? 0),
          totalScore: safeNum(raw?.totalScore ?? raw?.marks),
          aiSummary: raw?.aiSummary || raw?.summary || raw?.finalSummary || feedbackRaw?.summary || feedbackRaw?.ai_summary || "",
          answerQuality: {
            technicalAccuracy: safeNum(answerQualityRaw?.technicalAccuracy ?? raw?.technicalAccuracy),
            completeness: safeNum(answerQualityRaw?.completeness ?? raw?.completeness),
            conciseness: safeNum(answerQualityRaw?.conciseness ?? raw?.conciseness),
            problemSolving: safeNum(answerQualityRaw?.problemSolving ?? raw?.problemSolving),
          },
          bodyLanguage: {
            eyeContact: safeNum(bodyLanguageRaw?.eyeContact),
            engagement: safeNum(bodyLanguageRaw?.engagement),
            attention: safeNum(bodyLanguageRaw?.attention),
            stability: safeNum(bodyLanguageRaw?.stability),
            dominantExpression: bodyLanguageRaw?.dominantExpression || bodyLanguageRaw?.dominantBehavior || bodyLanguageRaw?.dominant_behavior,
            expressionConfidence: safeNum(bodyLanguageRaw?.expressionConfidence),
            overallScore: safeNum(bodyLanguageRaw?.overallScore),
          },
          questions: Array.isArray(raw?.questions)
            ? raw.questions.map((q: any) => ({
              question: String(q?.question ?? ""),
              answer: q?.answer,
              score: safeNum(q?.score),
              feedback: q?.feedback,
            }))
            : Array.isArray(raw?.perQuestion)
              ? raw.perQuestion.map((q: any) => ({
                question: String(q?.question ?? ""),
                answer: q?.answer,
                score: safeNum(q?.score),
                feedback: q?.feedback,
              }))
              : [],
        };

        if (mounted) setReport(normalized);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.response?.data?.message || "Failed to load report.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchReport();
    return () => {
      mounted = false;
    };
  }, [id]);

  /**
   * Improvement vs last interview (backend API)
   * Required: do NOT compute locally; fetch from backend.
   * Expected: GET /api/reports/:id/improvement -> { deltaPercentage: number }
   */
  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!id) return;
      setImprovementLoading(true);
      setImprovementDelta(null);

      try {
        const api = getAuthenticatedAxios();
        const res = await api.get(`/api/reports/${encodeURIComponent(id)}/improvement`);
        const raw = res?.data?.deltaPercentage ?? res?.data?.delta ?? res?.data?.difference;
        const delta = Number(raw);
        if (!Number.isFinite(delta)) throw new Error("Invalid improvement payload");
        if (mounted) setImprovementDelta(delta);
      } catch {
        // If endpoint not available yet, we keep it silent (UI stays clean)
        if (mounted) setImprovementDelta(null);
      } finally {
        if (mounted) setImprovementLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [id]);

  /**
   * Download PDF:
   * - Backend-first: GET /api/reports/:id/pdf (future-ready)
   * - Fallback: generate PDF with jsPDF on the client (temporary)
   */
  const handleDownloadPdf = async () => {
    if (!report || !id) return;
    setPdfLoading(true);
    setPdfError("");

    const api = getAuthenticatedAxios();
    const filename = `report-${id}.pdf`;

    try {
      // Try backend PDF endpoint first (recommended for production)
      /**
       * IMPORTANT:
       * Some backends return JSON/HTML errors with 200/4xx that still downloads as ".pdf"
       * and then the PDF viewer says "Failed to load document".
       *
       * So we validate the response bytes for the "%PDF" header.
       */
      const res = await api.get(`/api/reports/${encodeURIComponent(id)}/pdf`, {
        responseType: "arraybuffer",
        headers: { Accept: "application/pdf" },
      });

      const buf = res?.data as ArrayBuffer;
      const bytes = new Uint8Array(buf || []);

      const isPdf =
        bytes.length >= 4 &&
        bytes[0] === 0x25 && // %
        bytes[1] === 0x50 && // P
        bytes[2] === 0x44 && // D
        bytes[3] === 0x46; // F

      if (!isPdf) {
        throw new Error("Backend did not return a valid PDF");
      }

      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setPdfLoading(false);
      return;
    } catch (e) {
      // Fallback: jsPDF (text-based summary)
      try {
        const mod = await import("jspdf");
        const doc = new mod.jsPDF({ unit: "pt", format: "a4" });

        const marginX = 48;
        let y = 56;
        const line = (text: string, size = 12, bold = false) => {
          doc.setFont("helvetica", bold ? "bold" : "normal");
          doc.setFontSize(size);
          doc.text(text, marginX, y);
          y += size + 8;
        };

        const ensureSpace = (next = 80) => {
          if (y + next > 780) {
            doc.addPage();
            y = 56;
          }
        };

        line("Interview Report", 18, true);
        line(`Role: ${report.role || "Interview"}`, 12);
        if (report.date) line(`Date: ${new Date(report.date).toLocaleString()}`, 12);
        line(`Overall: ${Math.round(report.overallPercentage)}%`, 14, true);
        ensureSpace(60);

        line("Answer Quality", 14, true);
        line(`Technical Accuracy: ${Math.round(report.answerQuality.technicalAccuracy)}%`);
        line(`Completeness: ${Math.round(report.answerQuality.completeness)}%`);
        line(`Conciseness: ${Math.round(report.answerQuality.conciseness)}%`);
        line(`Problem Solving: ${Math.round(report.answerQuality.problemSolving)}%`);
        ensureSpace(80);

        line("Body Language", 14, true);
        line(`Eye Contact: ${Math.round(report.bodyLanguage.eyeContact)}%`);
        line(`Engagement: ${Math.round(report.bodyLanguage.engagement)}%`);
        line(`Attention: ${Math.round(report.bodyLanguage.attention)}%`);
        line(`Stability: ${Math.round(report.bodyLanguage.stability)}%`);
        ensureSpace(120);

        line("AI Summary", 14, true);
        const summary = report.aiSummary || "No summary available.";
        const wrapped = doc.splitTextToSize(summary, 500);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        doc.text(wrapped, marginX, y);
        y += wrapped.length * 18;
        ensureSpace(120);

        if (report.questions.length > 0) {
          line("Per-question Feedback", 14, true);
          report.questions.forEach((q, idx) => {
            ensureSpace(120);
            line(`Q${idx + 1}: ${q.question}`, 12, true);
            if (q.score != null) line(`Score: ${q.score} / 10`, 12);
            if (q.feedback) {
              const fb = doc.splitTextToSize(`Feedback: ${q.feedback}`, 500);
              doc.text(fb, marginX, y);
              y += fb.length * 18;
            }
          });
        }

        doc.save(filename);
      } catch (e) {
        setPdfError("Failed to download PDF.");
      } finally {
        setPdfLoading(false);
      }
    }
  };

  const metrics = useMemo(
    () => [
      { key: "technicalAccuracy", label: "Technical Accuracy", color: "bg-primary" },
      { key: "completeness", label: "Completeness", color: "bg-green-500" },
      { key: "conciseness", label: "Conciseness", color: "bg-yellow-500" },
      { key: "problemSolving", label: "Problem Solving", color: "bg-blue-500" },
    ] as const,
    []
  );

  return (
    <AppLayout>
      <AnimatedPage contentClassName="pb-2">
        <ContentHeader
          title="Report"
          description="Detailed interview feedback"
          backButton
        />

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/60 px-4 py-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-text-primary">Loading report...</span>
            </div>
          </div>
        ) : error || !report ? (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-xl">Couldn’t load report</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-text-secondary mb-4">{error || "Report not found."}</p>
              <div className="flex gap-3">
                <Button onClick={() => navigate("/reports")} rounded variant="outline">
                  Back to reports
                </Button>
                <Button onClick={() => window.location.reload()} rounded>
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
            className="space-y-4 lg:space-y-[1vw]"
          >
            {/* Top Summary */}
            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-primary/8 via-transparent to-secondary/8" />
              <CardContent className="relative">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-text-secondary text-sm">Role</p>
                    <p className="text-text-primary font-poppins-semibold truncate">
                      {report.role || "Interview"}
                    </p>
                    {report.date && (
                      <p className="text-text-secondary text-sm mt-2">
                        {new Date(report.date).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-text-secondary text-sm">Overall</p>
                    <p className="text-primary font-poppins-bold text-3xl">
                      {Math.round(report.overallPercentage)}%
                    </p>
                    {report.totalScore ? (
                      <p className="text-text-secondary text-sm">Total: {report.totalScore}</p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                  {/* Improvement vs last interview */}
                  <div className="min-h-[32px]">
                    {improvementLoading ? (
                      <div className="inline-flex items-center gap-2 text-text-secondary text-sm">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span>Checking improvement…</span>
                      </div>
                    ) : improvementDelta == null ? null : (
                      <div
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${improvementDelta >= 0
                          ? "border-success/35 bg-success/10 text-success"
                          : "border-error/35 bg-error/10 text-error"
                          }`}
                      >
                        {improvementDelta >= 0 ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                        <span className="text-text-primary">
                          {improvementDelta >= 0 ? "+" : ""}
                          {Math.round(improvementDelta)}% vs last interview
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Download PDF */}
                  <div className="flex flex-col items-end">
                    <Button
                      variant="outline"
                      rounded
                      onClick={handleDownloadPdf}
                      disabled={pdfLoading}
                      loading={pdfLoading}
                      icons={<Download className="h-4 w-4" />}
                      iconsPosition="left"
                    >
                      Download Report
                    </Button>
                    {pdfError && <p className="text-xs text-error mt-2">{pdfError}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Answer Quality */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-semibold">Answer Quality</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {metrics.map((m) => (
                  <ProgressBar
                    key={m.key}
                    value={report.answerQuality[m.key]}
                    max={100}
                    label={m.label}
                    colorClass={m.color}
                  />
                ))}
              </CardContent>
            </Card>

            {/* Body Language */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-semibold">Body Language</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ProgressBar value={report.bodyLanguage.eyeContact} max={100} label="Eye Contact" />
                <ProgressBar value={report.bodyLanguage.engagement} max={100} label="Engagement" />
                <ProgressBar value={report.bodyLanguage.attention} max={100} label="Attention" />
                <ProgressBar value={report.bodyLanguage.stability} max={100} label="Stability" />

                {(report.bodyLanguage.dominantExpression || report.bodyLanguage.expressionConfidence) && (
                  <div className="mt-3 rounded-lg border border-border bg-background/60 p-4">
                    <p className="text-text-secondary text-sm">Dominant expression</p>
                    <p className="text-text-primary font-medium">
                      {report.bodyLanguage.dominantExpression || "—"}
                      {report.bodyLanguage.expressionConfidence
                        ? ` (${Math.round(report.bodyLanguage.expressionConfidence)}%)`
                        : ""}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Per-question feedback */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-semibold">Per-question Feedback</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {report.questions.length === 0 ? (
                  <p className="text-text-secondary">No per-question feedback available.</p>
                ) : (
                  report.questions.map((q, idx) => (
                    <QuestionAccordion key={idx} q={q} index={idx} />
                  ))
                )}
              </CardContent>
            </Card>

            {/* AI Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-semibold">AI Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-text-secondary leading-relaxed">
                  {report.aiSummary || "No summary available."}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatedPage>
    </AppLayout>
  );
}

function QuestionAccordion({ q, index }: { q: QuestionFeedback; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-background/60 p-4 rounded-lg border border-border">
      <div
        className="flex justify-between items-center cursor-pointer gap-3"
        onClick={() => setOpen((v) => !v)}
      >
        <p className="text-primary font-medium min-w-0">
          Q{index + 1}: <span className="text-text-primary">{q.question}</span>
        </p>
        <span className="text-text-secondary text-sm shrink-0">{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div className="mt-3 space-y-2">
          {q.answer && (
            <p className="text-text-secondary text-sm">
              <span className="text-text-primary font-semibold">Your Answer:</span> {q.answer}
            </p>
          )}
          {typeof q.score === "number" && (
            <p className="text-green-400 text-sm font-medium">Score: {q.score} / 10</p>
          )}
          {q.feedback && <p className="text-text-secondary text-sm">{q.feedback}</p>}
        </div>
      )}
    </div>
  );
}


