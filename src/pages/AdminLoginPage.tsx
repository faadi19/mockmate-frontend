import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { ImagesPath } from "../utils/images";
import { AlertCircle } from "lucide-react";

const AdminLoginPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
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
        <div className="relative bg-background overflow-hidden min-h-screen">
            {/* Diagonal Background Element (Mimicking LoginPage) */}
            <div className="w-[120vw] absolute top-[-30vh] left-[-5vw] h-[40vh] bg-gradient-to-r from-primary/80 to-secondary/80 rotate-[-6deg] custom-shadow"></div>

            <div className="min-h-screen flex relative z-10">
                {/* Left side - Logo (Visible on Large Screens - Mimicking LoginPage) */}
                <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-8">
                    <div className="w-full max-w-md flex items-center justify-center relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl blur-3xl"></div>
                        <div className="relative z-10 w-full flex items-center justify-center">
                            <img
                                src={ImagesPath.signupSideLogo}
                                alt="Admin Login"
                                className="w-full max-w-[28vw] object-contain"
                                style={{
                                    filter: `
                                        hue-rotate(-55deg)
                                        saturate(1.2)
                                        brightness(1.05)
                                        drop-shadow(0 0 20px rgba(59, 130, 246, 0.3)) 
                                        drop-shadow(0 0 40px rgba(20, 184, 166, 0.2))
                                    `,
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Right side - Login Form */}
                <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
                    <motion.div
                        className="w-full max-w-md"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="text-center mb-4 lg:mb-[1.5vw]">
                            <h1 className="font-size-40px font-poppins-semibold text-text-primary mb-1 lg:mb-[0.7vw] tracking-wide uppercase">
                                WELCOME ADMIN
                            </h1>
                            <p className="font-size-20px font-poppins-regular text-text-secondary">
                                Please enter your administrative credentials.
                            </p>
                        </div>

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

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <Input
                                    type="text"
                                    id="username"
                                    placeholder="Username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </div>

                            <div>
                                <Input
                                    type="password"
                                    id="password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>

                            <Button type="submit" className="w-full" disabled={isLoading} rounded>
                                {isLoading ? "Logging in..." : "Login"}
                            </Button>

                            <div className="mt-8 pt-6 border-t border-border/50 text-center">
                                <p className="text-xs text-text-secondary leading-relaxed opacity-70">
                                    Authorized personnel only. All access attempts are monitored and logged.
                                </p>
                            </div>
                        </form>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default AdminLoginPage;
