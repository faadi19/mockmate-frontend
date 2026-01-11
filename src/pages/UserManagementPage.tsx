import { useState, useMemo, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import AdminLayout from "../components/layout/AdminLayout";
import { API_BASE_URL } from "../config/api";
import ContentHeader from "../components/layout/ContentHeader";
import AnimatedPage from "../components/ui/AnimatedPage";
import { Card, CardContent } from "../components/ui/Card";
import Button from "../components/ui/Button";
import {
    Search,
    UserPlus,
    Eye,
    ShieldCheck,
    Shield
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const UserManagementPage = () => {
    const navigate = useNavigate();
    const reduceMotion = useReducedMotion();
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);



    // Mock User Data
    const [users, setUsers] = useState<any[]>([]);


    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem("token");
            const queryParams = new URLSearchParams({
                page: currentPage.toString(),
                limit: "10",
                search: searchQuery,
                role: roleFilter !== 'all' ? roleFilter : '',
            });

            const response = await fetch(`${API_BASE_URL}/api/admin/users?${queryParams}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                console.log("Admin Users API Data:", data); // DEBUG: Inspect API response
                const normalizedUsers = (data.users || []).map((u: any) => {
                    return {
                        ...u,
                        id: u.id || u._id
                    };
                });

                // Sort by ID or creation date if available (newest first)
                normalizedUsers.sort((a: any, b: any) => {
                    const dateA = new Date(a.createdAt || 0).getTime();
                    const dateB = new Date(b.createdAt || 0).getTime();
                    return dateB - dateA;
                });

                setUsers(normalizedUsers);
                setTotalPages(data.totalPages || 1);
                setTotalUsers(data.totalUsers || data.totalResults || data.total || (data.totalPages ? data.totalPages * 10 : normalizedUsers.length));
            }
        } catch (err) {
            console.error("Failed to fetch users:", err);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [currentPage, searchQuery, roleFilter]);

    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            if (roleFilter === "all") return true;
            return user.role?.toLowerCase() === roleFilter.toLowerCase();
        });
    }, [users, roleFilter]);


    return (
        <AdminLayout>
            <AnimatedPage>
                <ContentHeader
                    title="User Management"
                    description="Manage MockMate users, roles, and account statuses"
                />

                {/* Filters Bar */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                        <input
                            type="text"
                            placeholder="Search users by name or email..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/35 text-sm"
                        />
                    </div>
                    <div className="flex gap-2">
                        <select
                            value={roleFilter}
                            onChange={(e) => {
                                setRoleFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="px-4 py-2 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/35"
                        >
                            <option value="all">All Roles</option>
                            <option value="user">Users</option>
                            <option value="admin">Admins</option>
                        </select>
                    </div>
                </div>

                {/* Users Table */}
                <Card className="overflow-hidden border-border">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-primary/5 border-b border-border">
                                        <th className="px-4 sm:px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary text-left">User Details</th>
                                        <th className="hidden sm:table-cell px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary text-center">Role</th>
                                        <th className="hidden md:table-cell px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary text-center">Interviews</th>
                                        <th className="px-4 sm:px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {filteredUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-text-secondary italic">
                                                No users found matching your criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredUsers.map((user, idx) => (
                                            <motion.tr
                                                key={user.id}
                                                initial={reduceMotion ? false : { opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: idx * 0.05 }}
                                                className="hover:bg-primary/5 transition-colors group"
                                            >
                                                <td className="px-4 sm:px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-text-primary text-sm sm:text-base">{user.name}</span>
                                                        <span className="text-[10px] sm:text-xs text-text-secondary break-all max-w-[120px] sm:max-w-none">{user.email}</span>
                                                        {/* Mobile Role Badge */}
                                                        <div className="sm:hidden mt-1">
                                                            <span className={`text-[9px] font-bold uppercase ${user.role === 'admin' ? 'text-purple-400' : 'text-blue-400'}`}>
                                                                {user.role}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="hidden sm:table-cell px-6 py-4 text-center">
                                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${user.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-primary/10 text-primary border border-primary/20'
                                                        }`}>
                                                        {user.role === 'admin' ? <ShieldCheck className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                                                        {user.role || 'user'}
                                                    </div>
                                                </td>
                                                <td className="hidden md:table-cell px-6 py-4 text-center">
                                                    <span className="text-sm text-text-primary font-medium">
                                                        {user.stats?.totalInterviews ??
                                                            user.totalInterviews ??
                                                            user.interviewsCount ??
                                                            (Array.isArray(user.interviews) ? user.interviews.length : (user.interviews || 0))}
                                                    </span>
                                                </td>
                                                <td className="px-4 sm:px-6 py-4">
                                                    <div className="flex justify-center gap-1 sm:gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="w-7 h-7 sm:w-8 sm:h-8 p-0"
                                                            onClick={() => navigate(`/admin/users/${user.id}`)}
                                                            title="View Profile"
                                                        >
                                                            <Eye className="w-4 h-4" />
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

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 px-2">
                        <p className="text-sm text-text-secondary order-2 sm:order-1 font-medium">
                            Showing <span className="font-bold text-text-primary">{(currentPage - 1) * 10 + 1}-{Math.min(currentPage * 10, totalUsers)}</span> of <span className="font-bold text-text-primary underline decoration-primary/30 underline-offset-4">{totalUsers}</span> users
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
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${currentPage === page
                                            ? "bg-primary text-white shadow-lg shadow-primary/25"
                                            : "text-text-secondary hover:bg-primary/10 hover:text-primary"
                                            }`}
                                    >
                                        {page}
                                    </button>
                                ))}
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

            </AnimatedPage>
        </AdminLayout>
    );
};

export default UserManagementPage;
