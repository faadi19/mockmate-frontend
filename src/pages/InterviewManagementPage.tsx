import { useState, useMemo, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import AdminLayout from "../components/layout/AdminLayout";
import ContentHeader from "../components/layout/ContentHeader";
import AnimatedPage from "../components/ui/AnimatedPage";
import { Card, CardContent } from "../components/ui/Card";
import Button from "../components/ui/Button";
import {
    Search,
    Video,
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
    const [statusFilter, setStatusFilter] = useState("all");
    const [interviews, setInterviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInterviews = async () => {
            try {
                const token = localStorage.getItem("token");
                const response = await fetch(`${API_BASE_URL}/api/admin/interviews`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const data = await response.json();

                    // Map backend data to UI format if needed
                    const mapped = (data.interviews || data || []).map((int: any) => ({
                        id: int.sessionId || int._id,
                        userName: int.userName || int.userId?.name || int.user?.name || "Unknown",
                        role: int.role || int.setup?.role || "N/A",
                        date: int.date || new Date(int.createdAt).toLocaleDateString() || "Recent",
                        status: int.status || (int.isTerminated ? "Terminated" : "Completed"),
                        score: int.overallScore || int.score || 0,
                        reason: int.terminationReason || int.reason || ""
                    }));

                    setInterviews(mapped);
                }
            } catch (err) {
                console.error("Failed to fetch interviews:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchInterviews();
    }, []);

    const filteredInterviews = useMemo(() => {
        return interviews.filter(interview => {
            const userName = interview.userName || "";
            const id = interview.id || "";
            const role = interview.role || "";
            const matchesSearch = userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                role.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === "all" || interview.status.toLowerCase() === statusFilter.toLowerCase();
            return matchesSearch && matchesStatus;
        });
    }, [interviews, searchQuery, statusFilter]);

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
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/35"
                    >
                        <option value="all">All Status</option>
                        <option value="Completed">Completed</option>
                        <option value="Terminated">Terminated</option>
                    </select>
                </div>

                {/* Interviews Table */}
                <Card className="overflow-hidden border-border">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-primary/5 border-b border-border">
                                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">Interview ID / Date</th>
                                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">User</th>
                                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary text-center">Target Role</th>
                                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary text-center">Status</th>
                                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {filteredInterviews.length === 0 ? (
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
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-text-primary">#{interview.id}</span>
                                                        <div className="flex items-center gap-1.5 text-[11px] text-text-secondary mt-0.5">
                                                            <Calendar className="w-3 h-3" /> {interview.date}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                            <UserIcon className="w-4 h-4 text-primary" />
                                                        </div>
                                                        <span className="text-sm font-medium text-text-primary">{interview.userName}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="text-sm text-text-secondary">{interview.role}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${interview.status === 'Completed' ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'
                                                        }`}>
                                                        {interview.status === 'Completed' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                                                        {interview.status}
                                                    </div>
                                                    {interview.reason && (
                                                        <p className="text-[10px] text-red-500/70 mt-1 ml-5 italic">{interview.reason}</p>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex justify-center">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="bg-primary/5 hover:bg-primary/10 border border-primary/10 hover:border-primary/20"
                                                            onClick={() => navigate(`/admin/interviews/${interview.id}`)}
                                                            icons={<Eye className="w-4 h-4" />}
                                                            iconsPosition="left"
                                                        >
                                                            Review
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
            </AnimatedPage>
        </AdminLayout>
    );
};

export default InterviewManagementPage;
