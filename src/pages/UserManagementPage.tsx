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
    UserX,
    CheckCircle2,
    Eye,
    ShieldCheck,
    Shield
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import ConfirmationModal from "../components/ui/ConfirmationModal";

const UserManagementPage = () => {
    const navigate = useNavigate();
    const reduceMotion = useReducedMotion();
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");

    // Modal states
    const [actionModal, setActionModal] = useState<{
        isOpen: boolean;
        userId: string | null;
        action: 'suspend' | 'activate' | null;
    }>({
        isOpen: false,
        userId: null,
        action: null
    });

    // Mock User Data
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setUsers(data.users || data || []);
            }
        } catch (err) {
            console.error("Failed to fetch users:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            const name = user.name || "";
            const email = user.email || "";
            const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                email.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesRole = roleFilter === "all" || user.role === roleFilter;
            const matchesStatus = statusFilter === "all" || user.status === statusFilter;
            return matchesSearch && matchesRole && matchesStatus;
        });
    }, [users, searchQuery, roleFilter, statusFilter]);

    const handleAction = (userId: string, action: 'suspend' | 'activate') => {
        setActionModal({
            isOpen: true,
            userId,
            action
        });
    };

    const confirmAction = async () => {
        if (!actionModal.userId || !actionModal.action) return;

        try {
            const token = localStorage.getItem("token");
            const newStatus = actionModal.action === 'suspend' ? 'suspended' : 'active';

            const response = await fetch(`${API_BASE_URL}/api/admin/users/${actionModal.userId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ status: newStatus }),
            });

            if (response.ok) {
                setUsers(prev => prev.map(u => {
                    const id = u.id || u._id;
                    if (id === actionModal.userId) {
                        return { ...u, status: newStatus };
                    }
                    return u;
                }));
            }
        } catch (err) {
            console.error("Failed to update user status:", err);
        } finally {
            setActionModal({ isOpen: false, userId: null, action: null });
        }
    };

    return (
        <AdminLayout>
            <AnimatedPage>
                <ContentHeader
                    title="User Management"
                    description="Manage MockMate users, roles, and account statuses"
                    sideButtons={
                        <Button icons={<UserPlus className="w-4 h-4" />} iconsPosition="left">
                            Add Admin
                        </Button>
                    }
                />

                {/* Filters Bar */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                        <input
                            type="text"
                            placeholder="Search users by name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/35 text-sm"
                        />
                    </div>
                    <div className="flex gap-2">
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="px-4 py-2 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/35"
                        >
                            <option value="all">All Roles</option>
                            <option value="user">Users</option>
                            <option value="admin">Admins</option>
                        </select>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/35"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="suspended">Suspended</option>
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
                                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">Name / Email</th>
                                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">Role</th>
                                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">Status</th>
                                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary text-center">Interviews</th>
                                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {filteredUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-text-secondary italic">
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
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-text-primary">{user.name}</span>
                                                        <span className="text-xs text-text-secondary">{user.email}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold uppercase tracking-wider ${user.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                                        }`}>
                                                        {user.role === 'admin' ? <ShieldCheck className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                                                        {user.role}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${user.status === 'active' ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'
                                                        }`}>
                                                        <div className={`w-1.5 h-1.5 rounded-full ${user.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`} />
                                                        {user.status}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="text-sm text-text-primary font-medium">{user.interviews}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="w-8 h-8 p-0"
                                                            onClick={() => navigate(`/admin/users/${user.id}`)}
                                                            title="View Profile"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                        {user.status === 'active' ? (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="w-8 h-8 p-0 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                                                onClick={() => handleAction(user.id, 'suspend')}
                                                                title="Suspend Account"
                                                            >
                                                                <UserX className="w-4 h-4" />
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="w-8 h-8 p-0 text-green-500 hover:text-green-400 hover:bg-green-500/10"
                                                                onClick={() => handleAction(user.id, 'activate')}
                                                                title="Activate Account"
                                                            >
                                                                <CheckCircle2 className="w-4 h-4" />
                                                            </Button>
                                                        )}
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

                {/* Confirmation Modal */}
                <ConfirmationModal
                    isOpen={actionModal.isOpen}
                    onClose={() => setActionModal({ isOpen: false, userId: null, action: null })}
                    onConfirm={confirmAction}
                    title={actionModal.action === 'suspend' ? "Suspend User Account" : "Activate User Account"}
                    message={`Are you sure you want to ${actionModal.action} this user? ${actionModal.action === 'suspend' ? "They will no longer be able to log in or start interviews." : "They will regain access to their account."}`}
                    confirmText={actionModal.action === 'suspend' ? "Suspend" : "Activate"}
                    cancelText="Cancel"
                    confirmColor={actionModal.action === 'suspend' ? 'rgb(var(--error))' : 'rgb(var(--primary))'}
                />
            </AnimatedPage>
        </AdminLayout>
    );
};

export default UserManagementPage;
