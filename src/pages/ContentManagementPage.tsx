import { useState, useEffect } from "react";
import AdminLayout from "../components/layout/AdminLayout";
import ContentHeader from "../components/layout/ContentHeader";
import AnimatedPage from "../components/ui/AnimatedPage";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";
import { API_BASE_URL } from "../config/api";
import {
    Plus,
    Trash2,
    Edit2,
    Search,
    BookOpen,
    ChevronRight,
    Database
} from "lucide-react";

const ContentManagementPage = () => {
    const [selectedRole, setSelectedRole] = useState<any>(null);
    const [roles, setRoles] = useState<any[]>([]);
    const [questions, setQuestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [questionsLoading, setQuestionsLoading] = useState(false);

    useEffect(() => {
        const fetchRoles = async () => {
            try {
                const token = localStorage.getItem("token");
                const response = await fetch(`${API_BASE_URL}/api/admin/roles`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    const rolesList = data.roles || data || [];
                    setRoles(rolesList);
                    if (rolesList.length > 0 && !selectedRole) {
                        setSelectedRole(rolesList[0]);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch roles:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchRoles();
    }, []);

    useEffect(() => {
        const fetchQuestions = async () => {
            if (!selectedRole) return;

            try {
                setQuestionsLoading(true);
                const token = localStorage.getItem("token");
                const roleId = selectedRole.id || selectedRole._id;
                const response = await fetch(`${API_BASE_URL}/api/admin/questions?roleId=${roleId}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    setQuestions(data.questions || data || []);
                }
            } catch (err) {
                console.error("Failed to fetch questions:", err);
            } finally {
                setQuestionsLoading(false);
            }
        };

        fetchQuestions();
    }, [selectedRole]);

    return (
        <AdminLayout>
            <AnimatedPage>
                <ContentHeader
                    title="Content Management"
                    description="Curate job roles and manage the question library"
                    sideButtons={
                        <Button icons={<Plus className="w-4 h-4" />} iconsPosition="left">
                            New Role
                        </Button>
                    }
                />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Roles List (Left) */}
                    <div className="lg:col-span-4 space-y-4">
                        <h3 className="text-sm font-bold text-text-secondary uppercase tracking-widest px-1">Job Roles</h3>
                        {loading ? (
                            <p className="text-text-secondary p-4">Loading roles...</p>
                        ) : roles.length === 0 ? (
                            <p className="text-text-secondary p-4 italic">No roles configured.</p>
                        ) : roles.map((role) => (
                            <button
                                key={role.id || role._id}
                                onClick={() => setSelectedRole(role)}
                                className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 group ${selectedRole?.name === role.name
                                    ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-[1.02]'
                                    : 'bg-card border-border text-text-primary hover:border-primary/50'
                                    }`}
                            >
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="font-bold">{role.name}</p>
                                        <p className={`text-xs ${selectedRole?.name === role.name ? 'text-white/70' : 'text-text-secondary'}`}>
                                            {role.questionsCount || 0} Questions in Bank
                                        </p>
                                    </div>
                                    <ChevronRight className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${selectedRole?.name === role.name ? 'text-white' : 'text-text-secondary'
                                        }`} />
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Question Bank (Right) */}
                    <div className="lg:col-span-8 space-y-6">
                        <Card>
                            <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-6 border-b border-border">
                                <CardTitle className="text-xl flex items-center gap-2">
                                    <Database className="w-5 h-5 text-primary" /> {selectedRole?.name || "Select Role"} Bank
                                </CardTitle>
                                <div className="flex gap-2">
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                                        <input
                                            type="text"
                                            placeholder="Search questions..."
                                            className="pl-9 pr-4 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                        />
                                    </div>
                                    <Button size="sm" icons={<Plus className="w-4 h-4" />}>Add Question</Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-border">
                                    {questionsLoading ? (
                                        <div className="p-12 text-center text-text-secondary">Loading question bank...</div>
                                    ) : !selectedRole ? (
                                        <div className="p-12 text-center text-text-secondary italic">Please select a job role to view questions.</div>
                                    ) : questions.length === 0 ? (
                                        <div className="p-12 text-center text-text-secondary italic">No questions found for this role.</div>
                                    ) : questions.map((q, idx) => (
                                        <div key={idx} className="p-6 hover:bg-primary/5 transition-colors group">
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="space-y-3 flex-1">
                                                    <p className="text-text-primary font-medium leading-relaxed">"{q.text}"</p>
                                                    <div className="flex gap-3">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${q.difficulty === 'Easy' ? 'bg-green-500/10 text-green-400' :
                                                            q.difficulty === 'Medium' ? 'bg-yellow-500/10 text-yellow-500' :
                                                                'bg-red-500/10 text-red-500'
                                                            }`}>
                                                            {q.difficulty}
                                                        </span>
                                                        <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded uppercase tracking-wider">
                                                            Weight: {q.weight}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="sm" className="w-8 h-8 p-0 hover:bg-primary/10">
                                                        <Edit2 className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm" className="w-8 h-8 p-0 text-red-500 hover:bg-red-500/10">
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {questions.length > 5 && (
                                    <div className="p-4 bg-primary/5 flex items-center justify-center">
                                        <button className="text-primary text-sm font-bold flex items-center gap-2 hover:underline">
                                            <BookOpen className="w-4 h-4" /> Load More Questions
                                        </button>
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

export default ContentManagementPage;
