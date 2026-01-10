import { useState, useMemo, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import AdminLayout from "../components/layout/AdminLayout";
import { API_BASE_URL } from "../config/api";
import ContentHeader from "../components/layout/ContentHeader";
import AnimatedPage from "../components/ui/AnimatedPage";
import { Card, CardContent } from "../components/ui/Card";
import Button from "../components/ui/Button";
import {
    Search,
    FileText,
    Download,
    Scale,
    Calendar,
    Filter,
    BarChart3,
    ChevronRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const ReportsManagementPage = () => {
    const navigate = useNavigate();
    const reduceMotion = useReducedMotion();
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [selectedReports, setSelectedReports] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [reports, setReports] = useState<any[]>([]);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalReports, setTotalReports] = useState(0);

    const fetchReports = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");

            const queryParams = new URLSearchParams({
                page: currentPage.toString(),
                limit: "12", // Increased limit to show more reports at once
                search: searchQuery,
                role: roleFilter !== 'all' ? roleFilter : '',
            });

            const response = await fetch(`${API_BASE_URL}/api/admin/interviews?${queryParams}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();

                // Robustly extract the reports/interviews array
                const rawReports = data.interviews || data.reports || data.data || (Array.isArray(data) ? data : []);

                const normalized = (Array.isArray(rawReports) ? rawReports : []).map((r: any) => ({
                    id: r._id || r.id || "N/A",
                    userName: r.userId?.name || r.userName || "Unknown User",
                    role: r.role || r.setup?.role || "Interview",
                    date: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "N/A",
                    score: Math.round(r.overallScore || r.score || (r.feedback?.overall_score) || 0),
                    behavior: r.feedback?.dominant_behavior || "Analyzed",
                }));

                setReports(normalized);
                setTotalPages(data.totalPages || 1);
                setTotalReports(data.totalResults || data.totalInterviews || normalized.length);
            }
        } catch (err) {
            console.error("Failed to fetch reports:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, [currentPage, searchQuery, roleFilter]);

    const filteredReports = useMemo(() => {
        return reports;
    }, [reports]);

    const toggleSelection = (id: string) => {
        setSelectedReports(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : prev.length < 2 ? [...prev, id] : [prev[1], id]
        );
    };

    const handleCompare = () => {
        if (selectedReports.length === 2) {
            navigate(`/reports/compare?left=${selectedReports[0]}&right=${selectedReports[1]}`);
        }
    };

    return (
        <AdminLayout>
            <AnimatedPage>
                <ContentHeader
                    title="Reports Management"
                    description="Global repository of all interview reports and comparative analytics"
                    sideButtons={
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={selectedReports.length !== 2}
                                onClick={handleCompare}
                                icons={<Scale className="w-4 h-4" />}
                                iconsPosition="left"
                            >
                                Compare ({selectedReports.length})
                            </Button>
                            <Button
                                variant="default"
                                size="sm"
                                icons={<Download className="w-4 h-4" />}
                                iconsPosition="left"
                            >
                                Export CSV
                            </Button>
                        </div>
                    }
                />

                {/* Filters Bar */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                        <input
                            type="text"
                            placeholder="Search by User or Report ID..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/35 text-sm"
                        />
                    </div>
                    <select
                        value={roleFilter}
                        onChange={(e) => {
                            setRoleFilter(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="px-4 py-2 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/35"
                    >
                        <option value="all">All Roles</option>
                        <option value="Frontend Developer">Frontend</option>
                        <option value="Backend Developer">Backend</option>
                        <option value="SQA Engineer">SQA</option>
                    </select>
                </div>

                {/* Reports Grid */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-card/30 rounded-3xl border border-border/50 border-dashed">
                        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                        <p className="text-text-secondary font-medium">Fetching interview reports...</p>
                    </div>
                ) : filteredReports.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-card/30 rounded-3xl border border-border/50 border-dashed text-center">
                        <Scale className="w-12 h-12 text-text-secondary/30 mb-4" />
                        <h3 className="text-lg font-bold text-text-primary mb-1">No reports found</h3>
                        <p className="text-text-secondary text-sm max-w-xs">We couldn't find any reports matching your search or filters.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredReports.map((r, idx) => (
                            <motion.div
                                key={r.id}
                                initial={reduceMotion ? false : { opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.05 }}
                            >
                                <Card className={`group hover:border-primary/40 transition-all duration-300 relative ${selectedReports.includes(r.id) ? 'border-primary bg-primary/[0.03] ring-1 ring-primary/50' : ''
                                    }`}>
                                    <CardContent className="p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                                                    <FileText className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-text-primary font-bold group-hover:text-primary transition-colors">{r.userName}</p>
                                                    <p className="text-[10px] text-text-secondary uppercase tracking-widest font-bold">#{r.id}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 border-border rounded text-primary focus:ring-primary/30 cursor-pointer"
                                                    checked={selectedReports.includes(r.id)}
                                                    onChange={() => toggleSelection(r.id)}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-3 mb-6">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-text-secondary flex items-center gap-2"><Filter className="w-3.5 h-3.5" /> Role</span>
                                                <span className="text-text-primary font-medium">{r.role}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-text-secondary flex items-center gap-2"><BarChart3 className="w-3.5 h-3.5" /> Dominant Behavior</span>
                                                <span className="px-2 py-0.5 bg-primary/10 text-primary text-[11px] font-bold rounded uppercase tracking-wider">{r.behavior}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-text-secondary flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> Date</span>
                                                <span className="text-text-primary">{r.date}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-4 border-t border-border">
                                            <div className="flex flex-col">
                                                <p className="text-[10px] text-text-secondary uppercase font-bold mb-0.5">Overall Score</p>
                                                <p className="text-2xl font-bold text-primary">{r.score}%</p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="p-2 h-auto rounded-xl hover:bg-primary/10 group/btn"
                                                onClick={() => navigate(`/reports/${r.id}`)}
                                            >
                                                <ChevronRight className="w-6 h-6 text-text-secondary group-hover/btn:text-primary group-hover/btn:translate-x-1 transition-all" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 px-2">
                        <p className="text-sm text-text-secondary order-2 sm:order-1">
                            Showing <span className="font-semibold text-text-primary">{reports.length}</span> of <span className="font-semibold text-text-primary">{totalReports}</span> reports
                        </p>
                        <div className="flex items-center gap-2 order-1 sm:order-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="px-3"
                            >
                                Previous
                            </Button>
                            <div className="flex items-center gap-1">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum = i + 1;
                                    if (totalPages > 5 && currentPage > 3) {
                                        pageNum = currentPage - 3 + i + 1;
                                        if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                                    }
                                    if (pageNum <= 0) return null;

                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setCurrentPage(pageNum)}
                                            className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${currentPage === pageNum
                                                ? "bg-primary text-white shadow-lg shadow-primary/25"
                                                : "text-text-secondary hover:bg-primary/10 hover:text-primary"
                                                }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3"
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </AnimatedPage>
        </AdminLayout>
    );
};

export default ReportsManagementPage;
