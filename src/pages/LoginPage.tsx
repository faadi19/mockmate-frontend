import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { ImagesPath } from "../utils/images";
import { handleGoogleAuth } from "../utils/auth";

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors = { email: "", password: "" };
    let isValid = true;

    if (!email) {
      newErrors.email = "Email is required";
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Email is invalid";
      isValid = false;
    }

    if (!password) {
      newErrors.password = "Password is required";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const demoBlocked = (location.state as any)?.demoBlocked;
  const fromPath = (location.state as any)?.from;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({ email: "", password: "" });

    try {
      /**
       * IMPORTANT:
       * Use AuthContext.login() so it updates:
       * - token state (isAuthenticated)
       * - user state
       * - localStorage + lastActivity
       *
       * If we only set localStorage here, PrivateRoute will still see isAuthenticated=false
       * and redirect back to /login.
       */
      await login(email, password);

      const redirectTo = fromPath || "/dashboard";
      navigate(redirectTo, { replace: true });
    } catch (err: any) {
      console.error("Login failed:", err.response?.data || err.message);

      setErrors({
        email: "",
        password: err.response?.data?.message || err.message || "Invalid email or password",
      });
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="relative bg-background">
      <div className="w-[120vw] absolute top-[-30vh] left-[-5vw] h-[40vh] bg-gradient-to-r from-primary/80 to-secondary/80 rotate-[-6deg] custom-shadow"></div>
      <div className="min-h-screen flex relative z-10">
        {/* Left side - Logo */}
        <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-8">
          <div className="w-full max-w-md flex items-center justify-center relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl blur-3xl"></div>
            <div className="relative z-10 w-full flex items-center justify-center">
              <img
                src={ImagesPath.signupSideLogo}
                alt="Sign up to MockMate"
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
              <h1 className="font-size-40px font-poppins-semibold text-text-primary mb-1 lg:mb-[0.7vw] tracking-wide">
                WELCOME BACK
              </h1>
              <p className="font-size-20px font-poppins-regular text-text-secondary">
                Please enter your details.
              </p>
            </div>

            {demoBlocked && (
              <div className="mb-4 rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-left">
                <p className="text-sm text-text-primary font-poppins-medium">
                  Demo mode: to access <span className="font-semibold">{fromPath || "this feature"}</span>, please sign in.
                </p>
                <p className="text-sm text-text-secondary mt-1">
                  Don’t have an account?{" "}
                  <Link to="/signup" className="text-primary hover:text-primary/80 font-medium">
                    Create one
                  </Link>
                  .
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Input
                  type="email"
                  id="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={errors.email}
                />
              </div>

              <div>
                <Input
                  type="password"
                  id="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={errors.password}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-border bg-card text-primary focus:ring-primary/35"
                  />
                  <label
                    htmlFor="remember-me"
                    className="ml-2 block text-sm text-text-secondary"
                  >
                    Remember me
                  </label>
                </div>
                <div className="text-sm">
                  <Link
                    to="/forgot-password"
                    className="text-primary hover:text-primary/80"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading} rounded>
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>

              <div className="mt-4 text-center">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={(e) => {
                    e.preventDefault();
                    void handleGoogleAuth("login");
                  }}
                  icons={
                    <svg
                      className="h-5 w-5 mr-2"
                      aria-hidden="true"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
                    </svg>
                  }
                  iconsPosition="left"
                >
                  Sign in with Google
                </Button>
              </div>

              <p className="mt-4 text-center text-sm text-gray-400">
                Don't have an account?{" "}
                <Link
                  to="/signup"
                  className="text-primary hover:text-primary/80 font-medium"
                >
                  Sign up
                </Link>
              </p>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
