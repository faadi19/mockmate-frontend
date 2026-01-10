import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import AdminLayout from "../components/layout/AdminLayout";
import { API_BASE_URL } from "../config/api";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "../components/ui/Card";
import ContentHeader from "../components/layout/ContentHeader";
import AnimatedPage from "../components/ui/AnimatedPage";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import { useNavigate } from "react-router-dom";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Tooltip,
    Legend,
    Filler,
} from "chart.js";
import { Users, Video, Calendar, AlertCircle, ShieldAlert } from "lucide-react";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Tooltip,
    Legend,
    Filler
);

const AdminDashboardPage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);


    // Stats State
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalInterviews: 0,
        interviewsToday: 0,
        cheatingIncidents: 0,
        faceMismatches: 0,
    });

    const [chartData, setChartData] = useState<any>({
        interviewsPerDay: { labels: [], datasets: [] },
        roleWise: { labels: [], datasets: [] },
        violations: { labels: [], datasets: [] },
        recentViolations: []
    });

    const chartColors = useMemo(() => {
        return {
            primary: "rgba(59, 130, 246, 1)", // Blue (UI Primary)
            primaryLight: "rgba(59, 130, 246, 0.2)",
            secondary: "rgba(147, 51, 234, 1)", // Purple (Secondary)
            danger: "rgba(239, 68, 68, 1)", // Red
            warning: "rgba(245, 158, 11, 1)", // Amber
            info: "rgba(14, 165, 233, 1)", // Sky Blue
            success: "rgba(34, 197, 94, 1)", // Green
        };
    }, []);

    useEffect(() => {
        let isMounted = true;

        const fetchDashboardData = async () => {
            try {
                const token = localStorage.getItem("token");

                // 1. Fetch Dashboard Summary (Stats)
                try {
                    const summaryRes = await fetch(`${API_BASE_URL}/api/admin/dashboard/summary`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    if (summaryRes.ok && isMounted) {
                        const data = await summaryRes.json();
                        const summary = data.summary || data; // Handle { success: true, summary: {...} } structure
                        setStats({
                            totalUsers: summary.totalUsers || 0,
                            totalInterviews: summary.totalInterviews || 0,
                            interviewsToday: summary.interviewsToday || 0,
                            cheatingIncidents: summary.totalViolations || 0,
                            faceMismatches: summary.faceMismatchCount || 0
                        });
                    }
                } catch (e) {
                    console.error("Summary fetch error:", e);
                }

                // 2. Fetch Interviews & Violations
                const [interviewsRes, violationsRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/admin/interviews`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
                    fetch(`${API_BASE_URL}/api/admin/violations`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null)
                ]);

                let interviews: any[] = [];
                let violations: any[] = [];

                if (interviewsRes?.ok) {
                    const data = await interviewsRes.json();
                    interviews = data.interviews || (Array.isArray(data) ? data : []);
                }

                if (violationsRes?.ok) {
                    const data = await violationsRes.json();
                    violations = data.violations || (Array.isArray(data) ? data : []);
                }

                if (isMounted) {
                    // Process Interviews
                    const last7Days = Array.from({ length: 7 }, (_, i) => {
                        const d = new Date();
                        d.setDate(d.getDate() - (6 - i));
                        return d.toLocaleDateString();
                    });

                    const dailyCounts = last7Days.map(date =>
                        interviews.filter((i: any) => new Date(i.createdAt).toLocaleDateString() === date).length
                    );

                    const roles: Record<string, number> = {};
                    interviews.forEach((i: any) => {
                        const r = i.role || i.setup?.role || "Unknown";
                        roles[r] = (roles[r] || 0) + 1;
                    });

                    // Process Violations
                    const violationCounts = { "Camera Off": 0, "Face Mismatch": 0, "Multiple Faces": 0, "Phone Detected": 0 };

                    const sortedViolations = [...violations].sort((a, b) =>
                        new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
                    );

                    violations.forEach((v: any) => {
                        const vType = v.type || v.violationType || "Other";
                        const type = vType.toUpperCase();

                        if (type.includes("CAMERA")) violationCounts["Camera Off"]++;
                        else if (type.includes("FACE") || type.includes("IDENTITY")) violationCounts["Face Mismatch"]++;
                        else if (type.includes("MULTIPLE")) violationCounts["Multiple Faces"]++;
                        else if (type.includes("PHONE")) violationCounts["Phone Detected"]++;
                    });

                    const recent = sortedViolations.slice(0, 5).map((v: any) => ({
                        id: v._id || Math.random(),
                        type: v.type || v.violationType || "Violation",
                        user: v.userId?.name || (v.user ? (typeof v.user === 'string' ? v.user : v.user.name) : "Unknown"),
                        userId: v.userId?._id || v.userId,
                        time: v.timestamp ? new Date(v.timestamp).toLocaleString() : "Recent"
                    }));

                    setChartData({
                        interviewsPerDay: {
                            labels: last7Days.map(d => d.split('/')[1] + '/' + d.split('/')[2]),
                            datasets: [{
                                label: "Interviews",
                                data: dailyCounts,
                                borderColor: chartColors.primary,
                                backgroundColor: chartColors.primaryLight,
                                fill: true,
                                tension: 0.4,
                            }]
                        },
                        roleWise: {
                            labels: Object.keys(roles),
                            datasets: [{
                                label: "Interviews",
                                data: Object.values(roles),
                                backgroundColor: chartColors.primary,
                                borderRadius: 6,
                            }]
                        },
                        violations: {
                            labels: Object.keys(violationCounts),
                            datasets: [{
                                data: Object.values(violationCounts),
                                backgroundColor: [chartColors.warning, chartColors.danger, chartColors.info, chartColors.secondary],
                                borderWidth: 0,
                            }]
                        },
                        recentViolations: recent
                    });
                }

            } catch (err) {
                console.error("Dashboard fetch error:", err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchDashboardData();
        return () => { isMounted = false; };
    }, [chartColors]);

    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: "rgba(255, 255, 255, 0.05)",
                },
                ticks: {
                    color: "rgba(255, 255, 255, 0.5)",
                },
            },
            x: {
                grid: {
                    display: false,
                },
                ticks: {
                    color: "rgba(255, 255, 255, 0.5)",
                },
            },
        },
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: "bottom" as const,
                labels: {
                    color: "rgba(255, 255, 255, 0.7)",
                    padding: 20,
                    font: {
                        size: 12,
                    },
                },
            },
        },
        cutout: "70%",
    };

    const statCards = [
        { title: "Total Users", value: stats.totalUsers, icon: Users, color: "text-blue-400" },
        { title: "Total Interviews", value: stats.totalInterviews, icon: Video, color: "text-purple-400" },
        { title: "Interviews Today", value: stats.interviewsToday, icon: Calendar, color: "text-green-400" },
        { title: "Cheating Incidents", value: stats.cheatingIncidents, icon: AlertCircle, color: "text-orange-400" },
        { title: "Face Mismatches", value: stats.faceMismatches, icon: ShieldAlert, color: "text-red-400" },
    ];

    // Helper for loading skeletons
    const CardSkeleton = () => (
        <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-700/50 rounded w-1/2"></div>
            <div className="h-8 bg-gray-700/50 rounded w-3/4"></div>
        </div>
    );

    const ChartSkeleton = () => (
        <div className="animate-pulse h-full w-full flex items-end gap-2 p-4">
            <div className="w-1/5 h-1/3 bg-gray-700/30 rounded"></div>
            <div className="w-1/5 h-2/3 bg-gray-700/30 rounded"></div>
            <div className="w-1/5 h-1/2 bg-gray-700/30 rounded"></div>
            <div className="w-1/5 h-3/4 bg-gray-700/30 rounded"></div>
            <div className="w-1/5 h-1/4 bg-gray-700/30 rounded"></div>
        </div>
    );

    return (
        <AdminLayout>
            <AnimatedPage>
                <ContentHeader
                    title="Admin Dashboard"
                    description="Real-time overview of system performance and violations"
                />

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                    {statCards.map((stat, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card className="hover:border-primary/50 transition-colors">
                                <CardContent className="p-6">
                                    {loading ? <CardSkeleton /> : (
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-text-secondary text-sm mb-1">{stat.title}</p>
                                                <h3 className="text-2xl font-bold text-text-primary">{stat.value.toLocaleString()}</h3>
                                            </div>
                                            <stat.icon className={`w-6 h-6 ${stat.color} opacity-80`} />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Main Activity Chart */}
                    <Card className="lg:col-span-1">
                        <CardHeader>
                            <CardTitle className="text-lg">Interviews per Day</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            {loading ? <ChartSkeleton /> : <Line data={chartData.interviewsPerDay} options={commonOptions} />}
                        </CardContent>
                    </Card>

                    {/* Role Distribution */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Role-wise Interviews</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            {loading ? <ChartSkeleton /> : <Bar data={chartData.roleWise} options={commonOptions} />}
                        </CardContent>
                    </Card>

                    {/* Violation Distribution */}
                    <Card className="lg:col-span-1">
                        <CardHeader>
                            <CardTitle className="text-lg">Violation Distribution</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[350px]">
                            {loading ? <ChartSkeleton /> : <Doughnut data={chartData.violations} options={doughnutOptions} />}
                        </CardContent>
                    </Card>

                    {/* Recent Alerts / Quick Actions Placeholder */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Critical Incident Alerts</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? <div className="space-y-4 animate-pulse">{[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-700/30 rounded"></div>)}</div> : (
                                <div className="space-y-4">
                                    {chartData.recentViolations.length === 0 ? (
                                        <p className="text-sm text-text-secondary text-center py-4">No recent critical incidents.</p>
                                    ) : (
                                        chartData.recentViolations.map((v: any, i: number) => (
                                            <div
                                                key={i}
                                                onClick={() => navigate('/admin/proctoring')}
                                                className="flex items-center gap-4 p-3 rounded-lg bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 transition-colors cursor-pointer"
                                            >
                                                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                                                    <ShieldAlert className="w-5 h-5 text-red-500" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-text-primary">{v.type}</p>
                                                    <p className="text-xs text-text-secondary">User: {v.user} • {v.time}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                    <button
                                        onClick={() => navigate('/admin/proctoring')}
                                        className="w-full py-2 text-sm text-primary hover:text-primary-light transition-colors font-medium"
                                    >
                                        View All Incidents →
                                    </button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </AnimatedPage>
        </AdminLayout>
    );
};

export default AdminDashboardPage;
