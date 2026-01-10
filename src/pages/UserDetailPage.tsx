import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "../components/layout/AdminLayout";
import ContentHeader from "../components/layout/ContentHeader";
import AnimatedPage from "../components/ui/AnimatedPage";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";
import { API_BASE_URL } from "../config/api";
import {
    User,
    Mail,
    Calendar,
    Target,
    AlertTriangle,
    ChevronRight,
    ShieldCheck,
    History
} from "lucide-react";

const UserDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Interview History Pagination
    const [interviews, setInterviews] = useState<any[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loadingInterviews, setLoadingInterviews] = useState(false);

    useEffect(() => {
        const fetchUserData = async () => {
            if (!id || id === 'undefined') {
                setLoading(false);
                return;
            }

            try {
                const token = localStorage.getItem("token");
                const userRes = await fetch(`${API_BASE_URL}/api/admin/profile/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const data = await userRes.json();
                const profile = data.user || data.profile || data;
                const stats = data.stats || profile.stats;

                setUserData({
                    id: profile._id || id,
                    name: profile.name || "Unknown User",
                    email: profile.email || "N/A",
                    role: profile.role || "User",
                    status: profile.status || "Active",
                    joinedDate: profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "N/A",
                    totalInterviews: stats?.totalInterviews || 0,
                    avgScore: stats?.avgScore || 0,
                    violationCount: stats?.totalViolations ?? profile.violationCount ?? 0,
                    improvement: profile.improvement || "N/A",
                    skills: profile.skills || []
                });

            } catch (err) {
                console.error("Failed to fetch user details:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [id]);

    useEffect(() => {
        const fetchInterviews = async () => {
            if (!id || id === 'undefined' || !userData) return;

            setLoadingInterviews(true);
            try {
                const token = localStorage.getItem("token");
                const response = await fetch(`${API_BASE_URL}/api/admin/interviews?userId=${id}&page=${currentPage}&limit=10`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (response.ok) {
                    const data = await response.json();
                    const rawInterviews = data.interviews || data || [];

                    const mapped = (Array.isArray(rawInterviews) ? rawInterviews : []).map((int: any) => ({
                        id: int.sessionId || int._id,
                        role: int.role || int.setup?.role || "N/A",
                        date: int.createdAt ? new Date(int.createdAt).toLocaleDateString() : "Recent",
                        score: int.overallScore || int.score || 0,
                        status: int.status || (int.isTerminated ? "Terminated" : "Completed"),
                    }));

                    setInterviews(mapped);
                    setTotalPages(data.totalPages || 1);
                }
            } catch (err) {
                console.error("Failed to fetch interviews:", err);
            } finally {
                setLoadingInterviews(false);
            }
        };

        fetchInterviews();
    }, [id, currentPage, userData?.id]);

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            </AdminLayout>
        );
    }

    if (!userData) {
        return (
            <AdminLayout>
                <div className="p-8 text-center">
                    <p className="text-red-400 text-lg font-medium mb-4">User not found</p>
                    <Button onClick={() => navigate('/admin/users')}>Back to User Management</Button>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <AnimatedPage>
                <ContentHeader
                    title="User Profile"
                    description={`Viewing details for ${userData.name}`}
                    backButton
                />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Profile Card */}
                    <div className="lg:col-span-1 space-y-6">
                        <Card className="overflow-hidden">
                            <div className="h-24 bg-gradient-to-r from-primary/30 to-purple-600/30" />
                            <CardContent className="relative px-6 pb-6">
                                <div className="absolute -top-12 left-6">
                                    <div className="w-24 h-24 rounded-2xl bg-card border-4 border-background flex items-center justify-center shadow-xl">
                                        <User className="w-12 h-12 text-primary" />
                                    </div>
                                </div>
                                <div className="pt-14">
                                    <h2 className="text-2xl font-bold text-text-primary">{userData.name}</h2>
                                    <p className="text-text-secondary flex items-center gap-2 mt-1">
                                        <Mail className="w-4 h-4" /> {userData.email}
                                    </p>

                                    <div className="flex gap-2 mt-4">
                                        <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-lg uppercase tracking-wider border border-primary/20">
                                            {userData.role}
                                        </span>
                                        <span className="px-3 py-1 bg-green-500/10 text-green-400 text-xs font-bold rounded-lg uppercase tracking-wider border border-green-500/20">
                                            {userData.status}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-8 space-y-4 pt-6 border-t border-border">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-text-secondary flex items-center gap-2">
                                            <Calendar className="w-4 h-4" /> Member Since
                                        </span>
                                        <span className="text-text-primary font-medium">{userData.joinedDate}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-text-secondary flex items-center gap-2">
                                            <History className="w-4 h-4" /> Total Interviews
                                        </span>
                                        <span className="text-text-primary font-medium">{userData.totalInterviews}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm text-red-400">
                                        <span className="flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4" /> Total Violations
                                        </span>
                                        <span className="font-bold">{userData.violationCount}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {userData.skills.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Key Skills</CardTitle>
                                </CardHeader>
                                <CardContent className="flex flex-wrap gap-2">
                                    {userData.skills.map((skill: string) => (
                                        <span key={skill} className="px-3 py-1.5 bg-card border border-border rounded-xl text-sm text-text-secondary">
                                            {skill}
                                        </span>
                                    ))}
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Interview History */}
                    <div className="lg:col-span-2 space-y-6">

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-xl">Interview History</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-primary/5 border-b border-border">
                                                <th className="px-6 py-4 text-xs font-semibold uppercase text-text-secondary">ID / Date</th>
                                                <th className="px-6 py-4 text-xs font-semibold uppercase text-text-secondary">Role</th>
                                                <th className="px-6 py-4 text-xs font-semibold uppercase text-text-secondary text-center">Score</th>
                                                <th className="px-6 py-4 text-xs font-semibold uppercase text-text-secondary">Result</th>
                                                <th className="px-6 py-4 text-xs font-semibold uppercase text-text-secondary text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {loadingInterviews ? (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-12 text-center text-text-secondary">
                                                        <div className="flex flex-col items-center gap-2">
                                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                                            <span>Loading History...</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : interviews.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-8 text-center text-text-secondary">No interview history found.</td>
                                                </tr>
                                            ) : (
                                                interviews.map((interview: any) => (
                                                    <tr key={interview.id} className="hover:bg-primary/5 transition-colors group">
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col">
                                                                <span className="font-medium text-text-primary">#{interview.id?.substring(0, 8)}...</span>
                                                                <span className="text-xs text-text-secondary">{interview.date}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="text-sm text-text-primary">{interview.role}</span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className={`font-bold ${interview.score >= 80 ? 'text-green-400' : interview.score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                                {interview.score}%
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${interview.status === 'Completed' ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'}`}>
                                                                {interview.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="w-8 h-8 p-0"
                                                                onClick={() => navigate(`/admin/interviews/${interview.id}`)}
                                                            >
                                                                <ChevronRight className="w-5 h-5" />
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination Controls */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-card/30">
                                        <p className="text-sm text-text-secondary">
                                            Page <span className="text-text-primary font-medium">{currentPage}</span> of {totalPages}
                                        </p>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={currentPage === 1 || loadingInterviews}
                                                onClick={() => setCurrentPage(p => p - 1)}
                                            >
                                                Back
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={currentPage === totalPages || loadingInterviews}
                                                onClick={() => setCurrentPage(p => p + 1)}
                                            >
                                                Next
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </AnimatedPage>
        </AdminLayout>
    );
};

export default UserDetailPage;
