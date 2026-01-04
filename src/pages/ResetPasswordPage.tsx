import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { getAxios } from "../utils/auth";
import { ImagesPath } from "../utils/images";
import { toastSuccess } from "../utils/toast";

type LocationState = { email?: string; otp?: string; resetToken?: string } | null;

export default function ResetPasswordPage() {
  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const location = useLocation();

  /**
   * OTP flow context source:
   * - Prefer navigation state (from Verify OTP)
   * - Fallback to sessionStorage (handles refresh)
   */
  const { email, otp, resetToken } = useMemo(() => {
    const state = location.state as LocationState;
    const stateEmail = (state?.email || "").trim();
    const stateOtp = (state?.otp || "").trim();
    const stateToken = (state?.resetToken || "").trim();

    const storedEmail = (sessionStorage.getItem("resetEmail") || "").trim();
    const storedOtp = (sessionStorage.getItem("resetOtp") || "").trim();
    const storedToken = (sessionStorage.getItem("resetToken") || "").trim();

    return {
      email: stateEmail || storedEmail,
      otp: stateOtp || storedOtp,
      resetToken: stateToken || storedToken,
    };
  }, [location.state]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string; api?: string }>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const validate = () => {
    const next: typeof errors = {};

    // Basic validation per requirements
    if (!password) next.password = "Password is required";
    else if (password.length < 8) next.password = "Password must be at least 8 characters";

    if (!confirmPassword) next.confirmPassword = "Confirm password is required";
    else if (password !== confirmPassword) next.confirmPassword = "Passwords do not match";

    // OTP flow requirements: we must have OTP context
    if (!email || !otp) {
      next.api = "OTP session missing or expired. Please restart the reset flow.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrors({});
    try {
      const api = getAxios();
      /**
       * Reset Password (OTP-based flow)
       *
       * Backends vary; support both common payload patterns:
       * - If verify-otp returned a resetToken: POST /api/auth/reset-password { token, password }
       * - Otherwise: POST /api/auth/reset-password { email, otp, password }
       */
      const payload = resetToken
        ? { token: resetToken, password, newPassword: password }
        : { email, otp, password, newPassword: password };

      await api.post("/api/auth/reset-password", payload);

      setDone(true);
      toastSuccess("Password reset successfully. Please sign in.");

      // Redirect user back to login after success (short delay so they can see the message)
      window.setTimeout(() => {
        // Clear OTP session data
        sessionStorage.removeItem("resetEmail");
        sessionStorage.removeItem("resetOtp");
        sessionStorage.removeItem("resetToken");
        navigate("/login", { replace: true });
      }, 800);
    } catch (err: any) {
      /**
       * Backend can return:
       * - Token expired
       * - Token invalid
       * - Password policy errors
       */
      setErrors({
        api: err?.response?.data?.message || "Failed to reset password. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative bg-background">
      <div className="w-[120vw] absolute top-[-30vh] left-[-5vw] h-[40vh] bg-gradient-to-r from-primary/80 to-secondary/80 rotate-[-6deg] custom-shadow" />
      <div className="min-h-screen flex relative z-10">
        {/* Left side - Logo */}
        <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12">
          <div className="max-w-md h-full">
            <img
              src={ImagesPath.signupSideLogo}
              alt="MockMate"
              className="w-full h-full lg:max-w-[30vw] object-contain"
            />
          </div>
        </div>

        {/* Right side - Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <motion.div
            className="w-full max-w-md"
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center mb-6 lg:mb-[2vw]">
              <h1 className="font-size-40px font-poppins-semibold text-text-primary mb-2 tracking-wide">
                RESET PASSWORD
              </h1>
              <p className="font-size-20px font-poppins-regular text-text-secondary">
                Choose a new password for your account.
              </p>
            </div>

            {errors.api && (
              <div className="mb-4 rounded-xl border border-error/25 bg-error/10 px-4 py-3 text-left">
                <p className="text-sm text-text-primary">{errors.api}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                type="password"
                id="password"
                placeholder="New Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
              />

              <Input
                type="password"
                id="confirmPassword"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={errors.confirmPassword}
              />

              {done ? (
                <div className="rounded-xl border border-success/25 bg-success/10 px-4 py-3 text-left">
                  <p className="text-sm text-text-primary">Password reset successfully. Redirecting…</p>
                </div>
              ) : (
                <Button type="submit" className="w-full" disabled={loading} loading={loading} rounded>
                  Reset password
                </Button>
              )}

              <p className="text-center text-sm text-gray-400">
                Back to{" "}
                <Link to="/login" className="text-primary hover:text-primary/80 font-medium">
                  Sign in
                </Link>
              </p>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}


