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
    const [violations, setViolations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [typeFilter, setTypeFilter] = useState("all");
    const [previewModal, setPreviewModal] = useState<{
        isOpen: boolean;
        violation: any | null;
    }>({
        isOpen: false,
        violation: null
    });

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalViolations, setTotalViolations] = useState(0);

    const fetchViolations = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const queryParams = new URLSearchParams({
                page: currentPage.toString(),
                limit: "10",
                search: searchQuery,
                type: typeFilter !== 'all' ? typeFilter : ''
            });

            const response = await fetch(`${API_BASE_URL}/api/admin/violations?${queryParams}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                const rawViolations = data.violations || data.data || data || [];
                const extractedViolations: any[] = (Array.isArray(rawViolations) ? rawViolations : []).map((v: any, index: number) => {
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

                setViolations(extractedViolations);
                setTotalPages(data.totalPages || 1);
                setTotalViolations(data.totalResults || data.totalViolations || data.total || (data.totalPages ? data.totalPages * 10 : extractedViolations.length));
            }
        } catch (err) {
            console.error("Failed to fetch violations:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchViolations();
    }, [currentPage, searchQuery, typeFilter]);

    const filteredViolations = useMemo(() => {
        return violations.filter(v => {
            if (typeFilter === "all") return true;
            const type = v.type.toLowerCase();
            const filter = typeFilter.toLowerCase();

            if (filter === "identitymismatch") return type.includes("face") || type.includes("identity");
            if (filter === "cameraoff") return type.includes("camera");
            if (filter === "multiplefaces") return type.includes("multiple");
            if (filter === "phonedetected") return type.includes("phone");

            return type.includes(filter);
        });
    }, [violations, typeFilter]);

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
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/35 text-sm"
                        />
                    </div>
                    <select
                        value={typeFilter}
                        onChange={(e) => {
                            setTypeFilter(e.target.value);
                            setCurrentPage(1);
                        }}
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
                                        <th className="px-4 sm:px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary text-left">Type / Time</th>
                                        <th className="hidden sm:table-cell px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary text-center">User</th>
                                        <th className="hidden md:table-cell px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary text-center">Interview</th>
                                        <th className="px-4 sm:px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary text-center">Action</th>
                                        <th className="px-4 sm:px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary text-center">Evidence</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                                                    <p className="text-sm text-text-secondary">Loading security logs...</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredViolations.length === 0 ? (
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
                                                <td className="px-4 sm:px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-2 font-medium text-text-primary text-xs sm:text-sm whitespace-nowrap">
                                                            {getIcon(v.type)}
                                                            <span>{v.type}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-text-secondary mt-1 whitespace-nowrap">
                                                            <Calendar className="w-3 h-3" /> {v.timestamp}
                                                        </div>
                                                        <div className="sm:hidden text-[9px] text-text-secondary mt-1 font-medium">
                                                            Candidate: {v.user}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="hidden sm:table-cell px-6 py-4">
                                                    <div className="flex items-center justify-center gap-2 text-sm text-text-primary font-medium whitespace-nowrap">
                                                        <UserIcon className="w-4 h-4 text-text-secondary" /> {v.user}
                                                    </div>
                                                </td>
                                                <td className="hidden md:table-cell px-6 py-4 text-center">
                                                    <code className="text-xs bg-primary/10 text-primary px-2 py-1 rounded whitespace-nowrap font-mono">{v.interviewId}</code>
                                                </td>
                                                <td className="px-4 sm:px-6 py-4 text-center">
                                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-medium whitespace-nowrap ${v.action === 'Terminated' ? 'text-red-400 bg-red-500/10' :
                                                        v.action === 'Flagged' ? 'text-yellow-400 bg-yellow-500/10' :
                                                            'text-green-400 bg-green-500/10'
                                                        }`}>
                                                        {v.action === 'Terminated' ? <XCircle className="w-3.5 h-3.5" /> :
                                                            v.action === 'Flagged' ? <AlertTriangle className="w-3.5 h-3.5" /> :
                                                                <CheckCircle2 className="w-3.5 h-3.5" />}
                                                        {v.action}
                                                    </div>
                                                </td>
                                                <td className="px-4 sm:px-6 py-4 text-center">
                                                    {v.screenshot ? (
                                                        <div className="flex justify-center">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs bg-primary/5 hover:bg-primary/10 border border-primary/10 hover:border-primary/20"
                                                                onClick={() => setPreviewModal({ isOpen: true, violation: v })}
                                                                icons={<Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                                                                iconsPosition="left"
                                                            >
                                                                <span className="hidden xs:inline">Review</span>
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] sm:text-xs text-text-secondary italic">None</span>
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

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 px-2">
                        <p className="text-sm text-text-secondary order-2 sm:order-1 font-medium">
                            Showing <span className="font-bold text-text-primary">{(currentPage - 1) * 10 + 1}-{Math.min(currentPage * 10, totalViolations)}</span> of <span className="font-bold text-text-primary underline decoration-primary/30 underline-offset-4">{totalViolations}</span> security flags
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
