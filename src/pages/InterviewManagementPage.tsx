import { useState, useMemo, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import AdminLayout from "../components/layout/AdminLayout";
import ContentHeader from "../components/layout/ContentHeader";
import AnimatedPage from "../components/ui/AnimatedPage";
import { Card, CardContent } from "../components/ui/Card";
import Button from "../components/ui/Button";
import {
    Search,
    Eye,
    Calendar,
    User as UserIcon,
    CheckCircle2,
    XCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/api";

const InterviewManagementPage = () => {
    const navigate = useNavigate();
    const reduceMotion = useReducedMotion();
    const [searchQuery, setSearchQuery] = useState("");
    const [interviews, setInterviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalInterviews, setTotalInterviews] = useState(0);

    const fetchInterviews = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const queryParams = new URLSearchParams({
                page: currentPage.toString(),
                limit: "10",
                search: searchQuery,
            });

            const response = await fetch(`${API_BASE_URL}/api/admin/interviews?${queryParams}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();

                const rawInterviews = data.interviews || data.data || data;
                const mapped = (Array.isArray(rawInterviews) ? rawInterviews : []).map((int: any) => ({
                    id: int.sessionId || int._id,
                    userName: int.userName || int.userId?.name || int.user?.name || "Unknown",
                    role: int.role || int.setup?.role || "N/A",
                    date: int.date || (int.createdAt ? new Date(int.createdAt).toLocaleDateString() : "Recent"),
                    status: int.status || (int.isTerminated ? "Terminated" : "Completed"),
                    score: int.overallScore || int.score || 0,
                    reason: int.terminationReason || int.reason || ""
                }));

                setInterviews(mapped);
                setTotalPages(data.totalPages || 1);
                setTotalInterviews(data.totalResults || data.totalInterviews || data.total || (data.totalPages ? data.totalPages * 10 : mapped.length));
            }
        } catch (err) {
            console.error("Failed to fetch interviews:", err);
        } finally {
            setLoading(true);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInterviews();
    }, [currentPage, searchQuery]);

    const filteredInterviews = useMemo(() => {
        return interviews;
    }, [interviews]);

    return (
        <AdminLayout>
            <AnimatedPage>
                <ContentHeader
                    title="Interview Management"
                    description="Monitor and review all AI-conducted interview sessions"
                />

                {/* Filters Bar */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                        <input
                            type="text"
                            placeholder="Search by ID, User, or Role..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/35 text-sm"
                        />
                    </div>
                </div>

                {/* Interviews Table */}
                <Card className="overflow-hidden border-border">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-primary/5 border-b border-border">
                                        <th className="px-4 sm:px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary text-left">Interview / Date</th>
                                        <th className="px-4 sm:px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary text-left">User</th>
                                        <th className="hidden sm:table-cell px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary text-center">Role</th>
                                        <th className="px-4 sm:px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary text-center">Status</th>
                                        <th className="px-4 sm:px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                                                    <p className="text-sm text-text-secondary">Loading interviews...</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredInterviews.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-text-secondary italic">
                                                No interviews found.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredInterviews.map((interview, idx) => (
                                            <motion.tr
                                                key={interview.id}
                                                initial={reduceMotion ? false : { opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: idx * 0.05 }}
                                                className="hover:bg-primary/5 transition-colors group"
                                            >
                                                <td className="px-4 sm:px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-text-primary text-[10px] sm:text-xs break-all">#{interview.id}</span>
                                                        <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-text-secondary mt-0.5 whitespace-nowrap">
                                                            <Calendar className="w-3 h-3" /> {interview.date}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 sm:px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="hidden xs:flex w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 items-center justify-center shrink-0">
                                                            <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-xs sm:text-sm font-medium text-text-primary truncate max-w-[80px] sm:max-w-none">{interview.userName}</span>
                                                            <span className="sm:hidden text-[9px] text-text-secondary truncate">{interview.role}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="hidden sm:table-cell px-6 py-4 text-center">
                                                    <span className="text-sm text-text-secondary">{interview.role}</span>
                                                </td>
                                                <td className="px-4 sm:px-6 py-4 text-center">
                                                    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${interview.status === 'Completed' ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'
                                                        }`}>
                                                        <span className="hidden sm:inline-flex items-center gap-1.5">
                                                            {interview.status === 'Completed' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                                                            {interview.status}
                                                        </span>
                                                        <span className="sm:hidden">{interview.status === 'Completed' ? 'Done' : 'Term'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 sm:px-6 py-4 text-center">
                                                    <div className="flex justify-center">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs bg-primary/5 hover:bg-primary/10 border border-primary/10 hover:border-primary/20"
                                                            onClick={() => navigate(`/admin/interviews/${interview.id}`)}
                                                            icons={<Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                                                            iconsPosition="left"
                                                        >
                                                            <span className="hidden xs:inline">Review</span>
                                                        </Button>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 px-2">
                        <p className="text-sm text-text-secondary order-2 sm:order-1 font-medium">
                            Showing <span className="font-bold text-text-primary">{(currentPage - 1) * 10 + 1}-{Math.min(currentPage * 10, totalInterviews)}</span> of <span className="font-bold text-text-primary underline decoration-primary/30 underline-offset-4">{totalInterviews}</span> interviews
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
                                    // Simple pagination window logic
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
        </AdminLayout >
    );
};

export default InterviewManagementPage;
