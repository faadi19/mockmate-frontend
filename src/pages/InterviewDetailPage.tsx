import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import AdminLayout from "../components/layout/AdminLayout";
import ContentHeader from "../components/layout/ContentHeader";
import AnimatedPage from "../components/ui/AnimatedPage";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { API_BASE_URL } from "../config/api";
import {
    BarChart,
    MessageSquare,
    Zap,
    Info,
    AlertCircle,
    Clock,
    User as UserIcon
} from "lucide-react";

interface InterviewDetail {
    id: string;
    userName: string;
    role: string;
    date: string;
    status: string;
    overallScore: number;
    duration: string;
    terminationReason: string | null;
    aiSummary: string;
    scores: {
        technical: number;
        communication: number;
        problemSolving: number;
        confidence: number;
    };
    transcript: Array<{ speaker: string; text: string }>;
    violations?: Array<{ type: string; actionTaken: string; screenshot?: string; timestamp: string }>;
}

const InterviewDetailPage = () => {
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [interviewData, setInterviewData] = useState<InterviewDetail | null>(null);

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const token = localStorage.getItem("token");
                const response = await fetch(`${API_BASE_URL}/api/admin/interviews/${id}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const json = await response.json();
                    console.log("Interview Detail Raw JSON:", json); // For debugging

                    // Unwrap if nested (added report check)
                    const data = json.report || json.interview || json.session || json.data || json;

                    // Map backend data
                    const feedback = data.feedback || {};
                    const evalData = data.evaluation || data.answerQuality || feedback.evaluation || {};
                    const scoresRaw = evalData.scores || evalData || {};
                    const bodyLang = data.bodyLanguage || feedback.body_language || {};

                    const details: InterviewDetail = {
                        id: data.sessionId || data._id || id || "",
                        userName:
                            data.userName ||
                            data.user?.name ||
                            data.userId?.name ||
                            (data.user?.firstName ? `${data.user.firstName} ${data.user.lastName || ''}`.trim() : null) ||
                            (data.userId?.firstName ? `${data.userId.firstName} ${data.userId.lastName || ''}`.trim() : null) ||
                            data.candidateName ||
                            "Unknown User",
                        role: data.role || data.setup?.role || "N/A",
                        date: data.date || new Date(data.createdAt).toLocaleDateString(),
                        status: data.status || (data.isTerminated ? "Terminated" : "Completed"),
                        overallScore: Math.round(
                            data.overallScore ??
                            data.score ??
                            data.overallPercentage ??
                            evalData.overallScore ??
                            evalData.score ??
                            feedback.overall_score ??
                            feedback.score ??
                            0
                        ),
                        duration: data.duration || "N/A",
                        terminationReason: data.terminationReason || null,
                        aiSummary:
                            data.aiSummary ||
                            data.summary ||
                            evalData.summary ||
                            evalData.aiSummary ||
                            feedback.summary ||
                            feedback.ai_summary ||
                            "No summary available.",
                        scores: {
                            technical: Math.round(scoresRaw.technical || scoresRaw.technicalAccuracy || 0),
                            communication: Math.round(scoresRaw.communication || scoresRaw.completeness || 0),
                            problemSolving: Math.round(scoresRaw.problemSolving || 0),
                            confidence: Math.round(scoresRaw.confidence || bodyLang.expressionConfidence || bodyLang.confidence || 0)
                        },
                        transcript: data.transcript || [],
                        violations: data.violations || []
                    };

                    setInterviewData(details);
                }
            } catch (err) {
                console.error("Failed to fetch interview details:", err);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchDetail();
    }, [id]);

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-full">
                    <p className="text-text-secondary animate-pulse">Loading interview details...</p>
                </div>
            </AdminLayout>
        );
    }

    if (!interviewData) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-full">
                    <p className="text-red-400">Interview session not found.</p>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <AnimatedPage>
                <ContentHeader
                    title="Interview Session Review"
                    description={`Deep dive into session #${interviewData.id}`}
                    backButton
                />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content: Transcript & Summary */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* AI Summary Card */}
                        <Card className="bg-primary/5 border-primary/20">
                            <CardHeader>
                                <CardTitle className="text-xl flex items-center gap-2">
                                    <Zap className="w-5 h-5 text-primary" /> AI Evaluation Summary
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-text-primary leading-relaxed italic">
                                    {interviewData.aiSummary.replace(/^"|"$/g, '')}
                                </p>
                            </CardContent>
                        </Card>

                        {/* Transcript Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-xl flex items-center gap-2">
                                    <MessageSquare className="w-5 h-5 text-text-secondary" /> Interview Transcript
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {interviewData.transcript.map((line, idx) => (
                                    <div key={idx} className={`flex gap-4 ${line.speaker === 'AI' ? 'flex-row' : 'flex-row-reverse'}`}>
                                        <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center ${line.speaker === 'AI' ? 'bg-primary/20 text-primary' : 'bg-purple-500/20 text-purple-400'
                                            }`}>
                                            {line.speaker === 'AI' ? <Zap className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
                                        </div>
                                        <div className={`max-w-[80%] p-4 rounded-2xl ${line.speaker === 'AI'
                                            ? 'bg-primary/10 text-text-primary rounded-tl-none border border-primary/10'
                                            : 'bg-card border border-border text-text-primary rounded-tr-none'
                                            }`}>
                                            <p className="text-sm">{line.text}</p>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar: Session Info & Scores */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Session Info */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Session Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-text-secondary flex items-center gap-2">
                                        <UserIcon className="w-4 h-4" /> Candidate
                                    </span>
                                    <span className="text-text-primary font-medium">{interviewData.userName}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-text-secondary flex items-center gap-2">
                                        <Clock className="w-4 h-4" /> Duration
                                    </span>
                                    <span className="text-text-primary font-medium">{interviewData.duration}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm font-bold">
                                    <span className="text-text-secondary flex items-center gap-2">
                                        <BarChart className="w-4 h-4" /> Overall Score
                                    </span>
                                    <span className="text-primary text-xl font-bold">{interviewData.overallScore}%</span>
                                </div>

                                {interviewData.status === 'Terminated' && (
                                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                                        <div className="flex items-center gap-2 text-red-500 font-bold text-xs uppercase tracking-widest mb-1">
                                            <AlertCircle className="w-3 h-3" /> Terminated
                                        </div>
                                        <p className="text-sm text-text-primary font-medium">{interviewData.terminationReason || "Policy Violation"}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Score Breakdown */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Score Breakdown</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {Object.entries(interviewData.scores).map(([key, value]) => (
                                    <div key={key}>
                                        <div className="flex justify-between items-center mb-1.5 capitalize text-sm">
                                            <span className="text-text-secondary font-medium">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                            <span className="text-text-primary font-bold">{value}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-primary/10 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${value}%` }}
                                                transition={{ duration: 1, ease: "easeOut" }}
                                                className="h-full bg-primary"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        <Card className="border-primary/30">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Info className="w-5 h-5 text-primary" /> Admin Quick Info
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-xs text-text-secondary leading-relaxed">
                                    This interview was fully proctored with face-identity verification and cheating detection enabled. All scores are AI-generated based on the candidate's transcript and behavior.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </AnimatedPage>
        </AdminLayout>
    );
};

export default InterviewDetailPage;
