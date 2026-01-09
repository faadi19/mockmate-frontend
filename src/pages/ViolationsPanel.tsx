import { useState, useMemo, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import AdminLayout from "../components/layout/AdminLayout";
import ContentHeader from "../components/layout/ContentHeader";
import AnimatedPage from "../components/ui/AnimatedPage";
import { Card, CardContent } from "../components/ui/Card";
import Button from "../components/ui/Button";
import { API_BASE_URL } from "../config/api";
import {
    Search,
    ShieldAlert,
    Calendar,
    User as UserIcon,
    AlertTriangle,
    Camera,
    Users as MultiUsers,
    Smartphone,
    CheckCircle2,
    XCircle,
    Eye
} from "lucide-react";
import ConfirmationModal from "../components/ui/ConfirmationModal";

const ViolationsPanel = () => {
    const reduceMotion = useReducedMotion();
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");

    const [previewModal, setPreviewModal] = useState<{
        isOpen: boolean;
        violation: any | null;
    }>({
        isOpen: false,
        violation: null
    });

    const [violations, setViolations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchViolations = async () => {
            try {
                const token = localStorage.getItem("token");
                const response = await fetch(`${API_BASE_URL}/api/admin/violations`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    const rawViolations = data.violations || data || [];
                    const extractedViolations: any[] = rawViolations.map((v: any, index: number) => {
                        console.log("Raw Violation:", v); // Debug log
                        const vType = v.type || v.violationType || "Unknown Violation";
                        return {
                            id: v._id || `v-${index}`,
                            type: vType,
                            user: v.userId?.name || "Unknown",
                            interviewId: v.interviewId?._id || v.interviewId || "Unknown",
                            timestamp: v.timestamp ? new Date(v.timestamp).toLocaleString() : new Date().toLocaleString(),
                            action: v.actionTaken || "Flagged",
                            critical: v.actionTaken === "Terminated" || vType.includes("Identity"),
                            screenshot: v.screenshotUrl || v.screenshot || null
                        };
                    });

                    // Sort by timestamp descending (newest first)
                    // Note: If timestamp is a string, simple sort might generally work or need parsing.
                    extractedViolations.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

                    setViolations(extractedViolations);
                }
            } catch (err) {
                console.error("Failed to fetch violations:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchViolations();
    }, []);

    const filteredViolations = useMemo(() => {
        return violations.filter(v => {
            const matchesSearch = (v.user || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                (v.interviewId || "").toLowerCase().includes(searchQuery.toLowerCase());

            let matchesType = false;
            if (typeFilter === "all") {
                matchesType = true;
            } else {
                const type = v.type.toLowerCase().replace(/\s/g, ''); // e.g. "identitymismatch"
                const filter = typeFilter.toLowerCase();

                if (filter === "identitymismatch") {
                    // Check for both "Face" and "Identity"
                    matchesType = type.includes("face") || type.includes("identity");
                } else if (filter === "cameraoff") {
                    matchesType = type.includes("camera");
                } else if (filter === "multiplefaces") {
                    matchesType = type.includes("multiple");
                } else if (filter === "phonedetected") {
                    matchesType = type.includes("phone");
                } else {
                    matchesType = type.includes(filter);
                }
            }
            return matchesSearch && matchesType;
        });
    }, [searchQuery, typeFilter, violations]);

    const getIcon = (type: string) => {
        const t = type.toLowerCase();
        if (t.includes('identity')) return <ShieldAlert className="w-4 h-4 text-red-500" />;
        if (t.includes('multiple')) return <MultiUsers className="w-4 h-4 text-orange-500" />;
        if (t.includes('camera')) return <Camera className="w-4 h-4 text-yellow-500" />;
        if (t.includes('phone')) return <Smartphone className="w-4 h-4 text-purple-500" />;
        return <AlertTriangle className="w-4 h-4 text-blue-500" />;
    };

    return (
        <AdminLayout>
            <AnimatedPage>
                <ContentHeader
                    title="Proctoring Panel"
                    description="Review security flags and suspect behavior logs"
                />

                {/* Filters Bar */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                        <input
                            type="text"
                            placeholder="Search by User or Interview ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/35 text-sm"
                        />
                    </div>
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="px-4 py-2 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/35"
                    >
                        <option value="all">All Types</option>
                        <option value="identitymismatch">Identity Mismatch</option>
                        <option value="multiplefaces">Multiple Faces</option>
                        <option value="cameraoff">Camera Off</option>
                        <option value="phonedetected">Phone Detected</option>
                    </select>
                </div>

                {/* Violations Table */}
                <Card className="overflow-hidden border-border">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-primary/5 border-b border-border">
                                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">Type / Timestamp</th>
                                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">User</th>
                                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">Interview</th>
                                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">System Action</th>
                                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary text-center">Evidence</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {filteredViolations.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-text-secondary italic">
                                                No security flags found.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredViolations.map((v, idx) => (
                                            <motion.tr
                                                key={v.id}
                                                initial={reduceMotion ? false : { opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: idx * 0.05 }}
                                                className={`hover:bg-primary/5 transition-colors group ${v.critical ? 'bg-red-500/[0.02]' : ''}`}
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-2 font-medium text-text-primary">
                                                            {getIcon(v.type)}
                                                            {v.type}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-[11px] text-text-secondary mt-1">
                                                            <Calendar className="w-3 h-3" /> {v.timestamp}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2 text-sm text-text-primary font-medium">
                                                        <UserIcon className="w-4 h-4 text-text-secondary" /> {v.user}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <code className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">#{v.interviewId}</code>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${v.action === 'Terminated' ? 'text-red-400 bg-red-500/10' :
                                                        v.action === 'Flagged' ? 'text-yellow-400 bg-yellow-500/10' :
                                                            'text-green-400 bg-green-500/10'
                                                        }`}>
                                                        {v.action === 'Terminated' ? <XCircle className="w-3.5 h-3.5" /> :
                                                            v.action === 'Flagged' ? <AlertTriangle className="w-3.5 h-3.5" /> :
                                                                <CheckCircle2 className="w-3.5 h-3.5" />}
                                                        {v.action}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {v.screenshot ? (
                                                        <div className="flex justify-center">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="bg-primary/5 hover:bg-primary/10 border border-primary/10 hover:border-primary/20"
                                                                onClick={() => setPreviewModal({ isOpen: true, violation: v })}
                                                                icons={<Eye className="w-4 h-4" />}
                                                                iconsPosition="left"
                                                            >
                                                                Review
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-text-secondary italic">No Data</span>
                                                    )}
                                                </td>
                                            </motion.tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Evidence Preview Modal */}
                <ConfirmationModal
                    isOpen={previewModal.isOpen}
                    onClose={() => setPreviewModal({ isOpen: false, violation: null })}
                    onConfirm={() => setPreviewModal({ isOpen: false, violation: null })}
                    title="Evidence Review"
                    confirmText="Dismiss"
                    cancelText=""
                    message={
                        <div className="mt-4 space-y-4">
                            <div className="rounded-xl overflow-hidden border border-border bg-black aspect-video flex items-center justify-center">
                                <img
                                    src={previewModal.violation?.screenshot?.startsWith('http')
                                        ? previewModal.violation.screenshot
                                        : `${API_BASE_URL}${previewModal.violation?.screenshot}`}
                                    alt="Evidence Screenshot"
                                    className="w-full h-full object-contain"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm text-left">
                                <div>
                                    <p className="text-text-secondary text-xs uppercase font-bold">Violation Type</p>
                                    <p className="text-text-primary">{previewModal.violation?.type}</p>
                                </div>
                                <div>
                                    <p className="text-text-secondary text-xs uppercase font-bold">Timestamp</p>
                                    <p className="text-text-primary">{previewModal.violation?.timestamp}</p>
                                </div>
                                <div>
                                    <p className="text-text-secondary text-xs uppercase font-bold">Candidate</p>
                                    <p className="text-text-primary">{previewModal.violation?.user}</p>
                                </div>
                                <div>
                                    <p className="text-text-secondary text-xs uppercase font-bold">Interview ID</p>
                                    <p className="text-text-primary">#{previewModal.violation?.interviewId}</p>
                                </div>
                            </div>
                        </div>
                    }
                />
            </AnimatedPage>
        </AdminLayout>
    );
};

export default ViolationsPanel;
