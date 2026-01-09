import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { Shield, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";

const AdminLoginPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const fromPath = (location.state as any)?.from || "/admin/dashboard";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || !password) {
            setError("Please fill in all fields.");
            return;
        }

        setIsLoading(true);
        setError("");

        try {
            const user = (await login(username, password)) as any;

            console.log("Admin Login Attempt - User Object:", user);

            // Critical: Ensure the logged in user is actually an admin
            if (user?.role !== 'admin') {
                setError("Access Denied: Administrative privileges required.");
                return;
            }

            navigate(fromPath, { replace: true });
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || "Authentication failed.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-6 relative overflow-hidden">
            {/* Ambient Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-20"
                    style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md relative z-10"
            >
                {/* Brand Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 border border-primary/20 rounded-2xl mb-4">
                        <Shield className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Admin Portal</h1>
                    <p className="text-text-secondary">Secure Administrative Access</p>
                </div>

                <div className="bg-card/50 backdrop-blur-xl border border-white/5 p-8 rounded-3xl shadow-2xl">
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3"
                        >
                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-red-400 font-medium leading-relaxed">{error}</p>
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-text-secondary uppercase tracking-widest ml-1">Username</label>
                            <Input
                                type="text"
                                placeholder="Enter admin username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="bg-background/50 border-white/5 focus:border-primary/50 h-12"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-text-secondary uppercase tracking-widest ml-1">Password</label>
                            <div className="relative">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="bg-background/50 border-white/5 focus:border-primary/50 h-12 pr-12"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-12 text-sm font-bold tracking-wide shadow-lg shadow-primary/20"
                            disabled={isLoading}
                            icons={<Lock className="w-4 h-4" />}
                            iconsPosition="left"
                            rounded
                        >
                            {isLoading ? "Authenticating..." : "Authorized Access Only"}
                        </Button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-white/5 text-center">
                        <p className="text-xs text-text-secondary leading-relaxed">
                            Authorized personnel only. All access attempts are monitored and logged.
                            If you've forgotten your credentials, contact the system administrator.
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default AdminLoginPage;
