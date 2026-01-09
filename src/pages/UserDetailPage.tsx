import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const token = localStorage.getItem("token");

                // 1. Fetch User Profile
                const userRes = await fetch(`${API_BASE_URL}/api/admin/users`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const allUsers = await userRes.json();
                const matchedUser = Array.isArray(allUsers) ? allUsers.find((u: any) => u._id === id || u.id === id) : null;

                if (!matchedUser) {
                    console.error("User not found");
                    // You might want to handle this case better (e.g. redirect or show error)
                }

                // 2. Fetch User Interviews
                const interviewRes = await fetch(`${API_BASE_URL}/api/admin/interviews`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const allInterviews = await interviewRes.json();
                const interviews = (allInterviews.interviews || allInterviews).filter((int: any) =>
                    int.userId === id || int.user?._id === id || (matchedUser && matchedUser._id && int.userId === matchedUser._id)
                );

                // 3. Calculate Stats
                let totalScore = 0;
                let violationCount = 0;
                let completedCount = 0;

                const mappedInterviews = interviews.map((int: any) => {
                    const score = int.overallScore || int.score || 0;
                    totalScore += score;
                    if (int.status === 'Completed' || !int.isTerminated) completedCount++;

                    const vCount = int.violations ? int.violations.length : 0;
                    violationCount += vCount;

                    return {
                        id: int.sessionId || int._id,
                        role: int.role || int.setup?.role || "N/A",
                        date: int.createdAt ? new Date(int.createdAt).toLocaleDateString() : "Recent",
                        score: score,
                        status: int.isTerminated ? "Terminated" : "Completed",
                        violations: vCount
                    };
                });

                const avgScore = mappedInterviews.length > 0 ? (totalScore / mappedInterviews.length).toFixed(1) : 0;

                setUserData({
                    id: matchedUser?._id || id,
                    name: matchedUser?.name || "Unknown User",
                    email: matchedUser?.email || "N/A",
                    role: matchedUser?.role || "User",
                    status: matchedUser?.status || "Active",
                    joinedDate: matchedUser?.createdAt ? new Date(matchedUser.createdAt).toLocaleDateString() : "N/A",
                    totalInterviews: mappedInterviews.length,
                    avgScore: avgScore,
                    violationCount: violationCount,
                    improvement: "N/A", // Calculation requires more historical analysis, skipping for now
                    skills: matchedUser?.skills || ["N/A"],
                    interviews: mappedInterviews
                });

            } catch (err) {
                console.error("Failed to fetch user details:", err);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchUserData();
    }, [id]);

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
                <div className="p-8 text-center text-red-400">User not found</div>
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
                    {/* Left Column: Profile Card */}
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

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Key Skills</CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-wrap gap-2">
                                {userData.skills.map(skill => (
                                    <span key={skill} className="px-3 py-1.5 bg-card border border-border rounded-xl text-sm text-text-secondary">
                                        {skill}
                                    </span>
                                ))}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Performance & History */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Stats Overview */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card className="bg-primary/5 border-primary/20">
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-text-secondary text-sm mb-1 uppercase tracking-wider font-bold">Average Score</p>
                                            <h3 className="text-3xl font-bold text-text-primary">{userData.avgScore}%</h3>
                                        </div>
                                        <Target className="w-8 h-8 text-primary opacity-50" />
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="bg-green-500/5 border-green-500/20">
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-text-secondary text-sm mb-1 uppercase tracking-wider font-bold">Improvement</p>
                                            <h3 className="text-3xl font-bold text-green-400">{userData.improvement}</h3>
                                        </div>
                                        <ShieldCheck className="w-8 h-8 text-green-400 opacity-50" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Interview History */}
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
                                                <th className="px-6 py-4 text-xs font-semibold uppercase text-text-secondary">Score</th>
                                                <th className="px-6 py-4 text-xs font-semibold uppercase text-text-secondary">Result</th>
                                                <th className="px-6 py-4 text-xs font-semibold uppercase text-text-secondary text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {userData.interviews.map(interview => (
                                                <tr key={interview.id} className="hover:bg-primary/5 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-text-primary">#{interview.id}</span>
                                                            <span className="text-xs text-text-secondary">{interview.date}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-sm text-text-primary">{interview.role}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`font-bold ${interview.score >= 80 ? 'text-green-400' : interview.score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                                {interview.score}%
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${interview.status === 'Completed' ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'
                                                            }`}>
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
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </AnimatedPage>
        </AdminLayout>
    );
};

export default UserDetailPage;
