import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { FileText, Loader2, Scale } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import ContentHeader from "../components/layout/ContentHeader";
import AnimatedPage from "../components/ui/AnimatedPage";
import Button from "../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { getAuthenticatedAxios } from "../utils/auth";

type ReportListItem = {
  id: string;
  role: string;
  date: string;
  overallPercentage: number;
};

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

export default function ReportsPage() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [compareHint, setCompareHint] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    const fetchReports = async () => {
      setLoading(true);
      setError("");

      try {
        const api = getAuthenticatedAxios();

        /**
         * Backend-driven reports list.
         * Expected: GET /api/reports -> array of past interviews/reports.
         * We do NOT hardcode data; UI renders what backend returns.
         */
        const res = await api.get("/api/reports");
        const raw = res?.data?.reports ?? res?.data ?? [];
        const list = Array.isArray(raw) ? raw : [];

        const normalized: ReportListItem[] = list
          .map((r: any): ReportListItem | null => {
            const id = r?._id || r?.id || r?.reportId || r?.sessionId;
            if (!id) return null;

            const role =
              r?.role ||
              r?.desiredRole ||
              r?.interviewRole ||
              r?.setup?.desiredRole ||
              "Interview";

            const date = r?.date || r?.createdAt || r?.updatedAt || "";
            const overallPercentage =
              Number(r?.overallPercentage ?? r?.overallScore ?? r?.score ?? r?.totalScore ?? 0) || 0;

            return { id: String(id), role: String(role), date: String(date), overallPercentage };
          })
          .filter(Boolean) as ReportListItem[];

        if (mounted) setReports(normalized);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.response?.data?.message || "Failed to load reports.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchReports();
    return () => {
      mounted = false;
    };
  }, []);

  const hasReports = useMemo(() => reports.length > 0, [reports.length]);
  const selectedItems = useMemo(
    () => reports.filter((r) => selectedIds.includes(r.id)),
    [reports, selectedIds]
  );
  const sameRoleSelected =
    selectedItems.length < 2 ||
    selectedItems.every((x) => x.role.toLowerCase() === selectedItems[0].role.toLowerCase());
  const canCompare = selectedIds.length === 2 && sameRoleSelected;

  const toggleSelect = (id: string) => {
    setCompareHint("");
    setSelectedIds((prev) => {
      const exists = prev.includes(id);
      if (exists) return prev.filter((x) => x !== id);
      // allow selecting max 2
      if (prev.length >= 2) return prev;

      // Enforce SAME ROLE selection for comparison (UX requirement)
      const candidate = reports.find((r) => r.id === id);
      const already = prev.map((pid) => reports.find((r) => r.id === pid)).filter(Boolean) as ReportListItem[];
      if (candidate && already.length === 1) {
        const roleA = already[0].role.toLowerCase();
        const roleB = candidate.role.toLowerCase();
        if (roleA !== roleB) {
          setCompareHint("Please select two reports of the same role to compare.");
          return prev; // block selecting different role
        }
      }
      return [...prev, id];
    });
  };

  const goCompare = () => {
    if (selectedIds.length !== 2) return;
    const [left, right] = selectedIds;
    navigate(`/reports/compare?left=${encodeURIComponent(left)}&right=${encodeURIComponent(right)}`);
  };

  return (
    <AppLayout>
      <AnimatedPage contentClassName="pb-2">
        <ContentHeader
          title="Reports"
          description="View your past interview reports"
          backButton
          sideButtons={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                rounded
                disabled={!canCompare}
                onClick={goCompare}
                icons={<Scale className="h-4 w-4" />}
                iconsPosition="left"
                title={
                  canCompare
                    ? "Compare selected reports"
                    : selectedIds.length === 2 && !sameRoleSelected
                      ? "Select two reports of the same role"
                      : "Select 2 reports to compare"
                }
              >
                Compare
              </Button>
              {selectedIds.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  rounded
                  onClick={() => setSelectedIds([])}
                >
                  Clear ({selectedIds.length})
                </Button>
              )}
            </div>
          }
        />

        {compareHint && (
          <div className="mb-4 rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-left">
            <p className="text-sm text-text-primary">{compareHint}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/60 px-4 py-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-text-primary">Loading reports...</span>
            </div>
          </div>
        ) : error ? (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-xl">Couldn’t load reports</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-text-secondary mb-4">{error}</p>
              <Button onClick={() => window.location.reload()} rounded>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : !hasReports ? (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-xl">No reports yet</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-text-secondary mb-6">
                Once you complete an interview, your report will appear here.
              </p>
              <Button onClick={() => navigate("/interview-setup")} rounded>
                Start an interview
              </Button>
            </CardContent>
          </Card>
        ) : (
          <motion.div
            initial={reduceMotion ? false : "hidden"}
            animate={reduceMotion ? undefined : "show"}
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { staggerChildren: 0.06 } },
            }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-[1vw]"
          >
            {reports.map((r) => (
              <motion.div
                key={r.id}
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
                }}
                whileHover={reduceMotion ? undefined : { y: -4 }}
                transition={{ type: "spring", stiffness: 240, damping: 18 }}
              >
                <Card className="relative overflow-hidden">
                  <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-primary/8 via-transparent to-secondary/8" />

                  <CardContent className="relative">
                    {/* Select checkbox (for comparison) */}
                    <div className="flex justify-end mb-2">
                      <label className="inline-flex items-center gap-2 text-xs text-text-secondary select-none cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(r.id)}
                          onChange={() => toggleSelect(r.id)}
                          className="h-4 w-4 rounded border-border bg-card text-primary focus:ring-primary/35"
                        />
                        Compare
                      </label>
                    </div>

                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-text-secondary text-sm">Role</p>
                        <p className="text-text-primary font-poppins-semibold truncate">
                          {r.role}
                        </p>

                        <p className="text-text-secondary text-sm mt-3">Date</p>
                        <p className="text-text-primary">{formatDate(r.date)}</p>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1">
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="text-text-primary font-semibold">
                            {Math.round(r.overallPercentage)}%
                          </span>
                        </div>
                        <span className="text-xs text-text-secondary">Overall</span>
                      </div>
                    </div>

                    <div className="mt-5">
                      <Button
                        className="w-full"
                        rounded
                        onClick={() => navigate(`/reports/${encodeURIComponent(r.id)}`)}
                      >
                        View Report
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatedPage>
    </AppLayout>
  );
}


