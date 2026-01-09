import { useState, useEffect } from "react";
import AdminLayout from "../components/layout/AdminLayout";
import ContentHeader from "../components/layout/ContentHeader";
import AnimatedPage from "../components/ui/AnimatedPage";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";
import { API_BASE_URL } from "../config/api";
import {
    Shield,
    Eye,
    Clock,
    AlertTriangle,
    Save,
    CheckCircle2,
    Cpu,
    RefreshCw
} from "lucide-react";

const AiSettingsPage = () => {
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [success, setSuccess] = useState(false);

    // Settings State
    const [settings, setSettings] = useState({
        eyeContactThreshold: 45,
        faceMismatchTolerance: 15,
        warningCountdown: 10,
        cheatingPenalty: 30,
        enableFaceID: true,
        enableCheatingDetection: true,
        enableBehaviorAnalysis: true,
        proctoringStrictness: 'medium'
    });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const token = localStorage.getItem("token");
                const response = await fetch(`${API_BASE_URL}/api/admin/ai-settings`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    setSettings({
                        eyeContactThreshold: data.eyeContactThreshold || 45,
                        faceMismatchTolerance: data.faceMismatchThreshold || 15,
                        warningCountdown: data.warningCountdown || 10,
                        cheatingPenalty: data.penaltyPoints || 30,
                        enableFaceID: data.proctoringEnabled ?? true,
                        enableCheatingDetection: data.cheatingDetectionEnabled ?? true,
                        enableBehaviorAnalysis: data.behaviorAnalysisEnabled ?? true,
                        proctoringStrictness: data.strictness || 'medium'
                    });
                }
            } catch (err) {
                console.error("Failed to fetch AI settings:", err);
            } finally {
                setFetching(false);
            }
        };

        fetchSettings();
    }, []);

    const handleSave = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_BASE_URL}/api/admin/ai-settings`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    eyeContactThreshold: settings.eyeContactThreshold,
                    faceMismatchThreshold: settings.faceMismatchTolerance,
                    warningCountdown: settings.warningCountdown,
                    penaltyPoints: settings.cheatingPenalty,
                    proctoringEnabled: settings.enableFaceID,
                    cheatingDetectionEnabled: settings.enableCheatingDetection,
                    behaviorAnalysisEnabled: settings.enableBehaviorAnalysis,
                    strictness: settings.proctoringStrictness
                }),
            });

            if (response.ok) {
                setSuccess(true);
                setTimeout(() => setSuccess(false), 3000);
            }
        } catch (err) {
            console.error("Failed to save AI settings:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AdminLayout>
            <AnimatedPage>
                <ContentHeader
                    title="AI & Proctoring Settings"
                    description="Configure AI sensitivity, security thresholds, and system behavior"
                    sideButtons={
                        <Button
                            onClick={handleSave}
                            disabled={loading}
                            icons={success ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                            iconsPosition="left"
                        >
                            {loading ? 'Saving...' : success ? 'Saved!' : 'Save Changes'}
                        </Button>
                    }
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Column 1: Thresholds & Sliders */}
                    <div className="space-y-8">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-xl flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-primary" /> Proctoring Thresholds
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-8">
                                {/* Eye Contact */}
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="text-sm font-medium text-text-primary flex items-center gap-2">
                                            <Eye className="w-4 h-4 text-text-secondary" /> Eye Contact Threshold
                                        </label>
                                        <span className="px-3 py-1 bg-primary/10 text-primary text-sm font-bold rounded-lg border border-primary/20">
                                            {settings.eyeContactThreshold}%
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0" max="100"
                                        value={settings.eyeContactThreshold}
                                        onChange={(e) => setSettings({ ...settings, eyeContactThreshold: parseInt(e.target.value) })}
                                        className="w-full h-1.5 bg-primary/10 rounded-lg appearance-none cursor-pointer accent-primary"
                                    />
                                    <p className="text-[10px] text-text-secondary mt-2">Minimum percentage of eye-contact required before flagging as "not paying attention".</p>
                                </div>

                                {/* Face Mismatch */}
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="text-sm font-medium text-text-primary flex items-center gap-2">
                                            <Shield className="w-4 h-4 text-text-secondary" /> Face Mismatch Tolerance
                                        </label>
                                        <span className="px-3 py-1 bg-primary/10 text-primary text-sm font-bold rounded-lg border border-primary/20">
                                            {settings.faceMismatchTolerance}%
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0" max="100"
                                        value={settings.faceMismatchTolerance}
                                        onChange={(e) => setSettings({ ...settings, faceMismatchTolerance: parseInt(e.target.value) })}
                                        className="w-full h-1.5 bg-primary/10 rounded-lg appearance-none cursor-pointer accent-primary"
                                    />
                                    <p className="text-[10px] text-text-secondary mt-2">Similarity delta allowed before triggering identity mismatch alerts.</p>
                                </div>

                                {/* Warning Countdown */}
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="text-sm font-medium text-text-primary flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-text-secondary" /> Warning Duration
                                        </label>
                                        <span className="px-3 py-1 bg-primary/10 text-primary text-sm font-bold rounded-lg border border-primary/20">
                                            {settings.warningCountdown}s
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="5" max="60"
                                        value={settings.warningCountdown}
                                        onChange={(e) => setSettings({ ...settings, warningCountdown: parseInt(e.target.value) })}
                                        className="w-full h-1.5 bg-primary/10 rounded-lg appearance-none cursor-pointer accent-primary"
                                    />
                                    <p className="text-[10px] text-text-secondary mt-2">Time in seconds session remains open after a security warning is issued.</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-xl flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-orange-400" /> Penalties & Enforcement
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="text-sm font-medium text-text-primary">Cheating Penalty Score Deduction</label>
                                        <span className="px-3 py-1 bg-red-500/10 text-red-500 text-sm font-bold rounded-lg border border-red-500/20">
                                            -{settings.cheatingPenalty}%
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0" max="100"
                                        value={settings.cheatingPenalty}
                                        onChange={(e) => setSettings({ ...settings, cheatingPenalty: parseInt(e.target.value) })}
                                        className="w-full h-1.5 bg-red-500/10 rounded-lg appearance-none cursor-pointer accent-red-500"
                                    />
                                </div>

                                <div className="pt-4 flex gap-4">
                                    {['low', 'medium', 'high'].map(level => (
                                        <button
                                            key={level}
                                            onClick={() => setSettings({ ...settings, proctoringStrictness: level as any })}
                                            className={`flex-1 py-3 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all ${settings.proctoringStrictness === level
                                                ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-[1.02]'
                                                : 'bg-card border-border text-text-secondary hover:border-primary/50'
                                                }`}
                                        >
                                            {level} Strictness
                                        </button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Column 2: Toggles & Feature Flags */}
                    <div className="space-y-8">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-xl flex items-center gap-2">
                                    <Cpu className="w-5 h-5 text-text-secondary" /> Feature Management
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {[
                                    { id: 'enableFaceID', label: 'Face Identity Verification', desc: 'Require initial and continuous face matching during sessions.', key: 'enableFaceID' },
                                    { id: 'enableCheatingDetection', label: 'Generic Cheating Detection', desc: 'Enable pattern recognition for phone use, multi-person, and camera tampering.', key: 'enableCheatingDetection' },
                                    { id: 'enableBehaviorAnalysis', label: 'Behavioral Insights AI', desc: 'Analyze candidate expressions, posture, and engagement levels.', key: 'enableBehaviorAnalysis' },
                                ].map(feature => (
                                    <div key={feature.id} className="flex items-start justify-between p-4 rounded-2xl bg-card border border-border hover:border-primary/30 transition-colors">
                                        <div className="space-y-1">
                                            <p className="text-sm font-bold text-text-primary">{feature.label}</p>
                                            <p className="text-xs text-text-secondary leading-relaxed">{feature.desc}</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer ml-4">
                                            <input
                                                type="checkbox"
                                                checked={(settings as any)[feature.key]}
                                                onChange={() => setSettings({ ...settings, [feature.key]: !(settings as any)[feature.key] })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-primary/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                        </label>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        <Card className="bg-primary border-none text-white overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                            <CardContent className="p-8 relative z-10">
                                <RefreshCw className="w-10 h-10 mb-4 opacity-50" />
                                <h3 className="text-2xl font-bold mb-2">Sync AI Models</h3>
                                <p className="text-sm text-white/80 mb-6 leading-relaxed">
                                    Manually trigger a re-sync of the locally cached AI models. Use this after pushing updates to job roles or question banks.
                                </p>
                                <Button variant="outline" className="bg-white/10 border-white/20 hover:bg-white/20 text-white w-full">
                                    Sync Now
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </AnimatedPage>
        </AdminLayout>
    );
};

export default AiSettingsPage;
