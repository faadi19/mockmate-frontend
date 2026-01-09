import { useState, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import AdminLayout from "../components/layout/AdminLayout";
import ContentHeader from "../components/layout/ContentHeader";
import AnimatedPage from "../components/ui/AnimatedPage";
import { Card, CardContent } from "../components/ui/Card";
import Button from "../components/ui/Button";
import {
    Search,
    FileText,
    Download,
    Scale,
    User as UserIcon,
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

    // Mock Reports Data
    const reports = [
        { id: "REP-901", userName: "Ahmed Khan", role: "Frontend Developer", date: "2024-03-20", score: 92, behavior: "Confident" },
        { id: "REP-902", userName: "Jane Smith", role: "Backend Developer", date: "2024-03-21", score: 88, behavior: "Professional" },
        { id: "REP-903", userName: "Alice Brown", role: "SQA Engineer", date: "2024-03-23", score: 76, behavior: "Engaged" },
        { id: "REP-904", userName: "David Wilson", role: "Frontend Developer", date: "2024-03-25", score: 81, behavior: "Analytical" },
        { id: "REP-905", userName: "Priya Sharma", role: "Product Designer", date: "2024-03-26", score: 84, behavior: "Creative" },
    ];

    const filteredReports = useMemo(() => {
        return reports.filter(r => {
            const matchesSearch = r.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.id.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesRole = roleFilter === "all" || r.role.toLowerCase() === roleFilter.toLowerCase();
            return matchesSearch && matchesRole;
        });
    }, [searchQuery, roleFilter]);

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
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/35 text-sm"
                        />
                    </div>
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="px-4 py-2 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/35"
                    >
                        <option value="all">All Roles</option>
                        <option value="Frontend Developer">Frontend</option>
                        <option value="Backend Developer">Backend</option>
                        <option value="SQA Engineer">SQA</option>
                    </select>
                </div>

                {/* Reports Grid */}
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
            </AnimatedPage>
        </AdminLayout>
    );
};

export default ReportsManagementPage;
