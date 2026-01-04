import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { getAxios } from "../utils/auth";
import { ImagesPath } from "../utils/images";

type LocationState = { email?: string } | null;

export default function VerifyOtpPage() {
  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const location = useLocation();

  /**
   * Email source:
   * - Prefer navigation state (from Forgot Password page)
   * - Fallback to sessionStorage (handles refresh)
   */
  const email = useMemo(() => {
    const stateEmail = (location.state as LocationState)?.email;
    const stored = sessionStorage.getItem("resetEmail") || "";
    return (stateEmail || stored).trim();
  }, [location.state]);

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const validate = () => {
    if (!email) {
      setError("Email is missing. Please go back and request an OTP again.");
      return false;
    }
    const cleaned = otp.replace(/\D/g, "");
    if (cleaned.length !== 6) {
      setError("OTP must be 6 digits");
      return false;
    }
    setError("");
    return true;
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setError("");

    try {
      const api = getAxios();

      /**
       * Verify OTP endpoint (OTP-based flow)
       * Expected payload: { email, otp }
       * Response may optionally include a server-issued reset token.
       */
      const res = await api.post("/api/auth/verify-otp", {
        email,
        otp: otp.replace(/\D/g, ""),
      });

      const resetToken =
        res?.data?.resetToken || res?.data?.token || res?.data?.data?.resetToken || "";

      // Persist for refresh-safe reset step
      sessionStorage.setItem("resetEmail", email);
      sessionStorage.setItem("resetOtp", otp.replace(/\D/g, ""));
      if (resetToken) sessionStorage.setItem("resetToken", resetToken);

      // Proceed to reset password screen
      navigate("/reset-password", {
        replace: true,
        state: { email, otp: otp.replace(/\D/g, ""), resetToken },
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Invalid or expired OTP. Please try again.");
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
                VERIFY OTP
              </h1>
              <p className="font-size-20px font-poppins-regular text-text-secondary">
                Enter the 6-digit code sent to your email.
              </p>
              {email && (
                <p className="text-sm text-text-secondary mt-2">
                  Sent to <span className="text-text-primary font-medium">{email}</span>
                </p>
              )}
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-error/25 bg-error/10 px-4 py-3 text-left">
                <p className="text-sm text-text-primary">{error}</p>
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-5">
              <Input
                type="text"
                id="otp"
                placeholder="6-digit OTP"
                inputMode="numeric"
                value={otp}
                onChange={(e) => {
                  // Allow only digits, max 6
                  const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setOtp(v);
                }}
              />

              <Button type="submit" className="w-full" disabled={loading} loading={loading} rounded>
                Verify
              </Button>

              <p className="text-center text-sm text-gray-400">
                Back to{" "}
                <Link to="/forgot-password" className="text-primary hover:text-primary/80 font-medium">
                  Forgot Password
                </Link>
              </p>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}


