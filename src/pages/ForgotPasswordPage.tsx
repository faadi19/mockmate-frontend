import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { getAxios } from "../utils/auth";
import { ImagesPath } from "../utils/images";

export default function ForgotPasswordPage() {
  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");

  const validate = () => {
    // Basic validation per requirements
    if (!email.trim()) {
      setError("Email is required");
      return false;
    }
    setError("");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setStatus("loading");
    try {
      // Unauthenticated call: forgot password
      const api = getAxios();
      await api.post("/api/auth/forgot-password", { email: email.trim() });
      setStatus("success");

      // Persist email for refresh-safe OTP verification
      sessionStorage.setItem("resetEmail", email.trim());
    } catch (err: any) {
      // Show backend error messages (e.g. "Email could not be sent")
      setError(err?.response?.data?.message || "Something went wrong. Please try again.");
      setStatus("idle");
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
                FORGOT PASSWORD
              </h1>
              <p className="font-size-20px font-poppins-regular text-text-secondary">
                Enter your email to receive a reset link.
              </p>
            </div>

            {status === "success" ? (
              <div className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-left">
                <p className="text-sm text-text-primary font-poppins-medium">
                  OTP sent successfully. Please check your email.
                </p>
                <p className="text-sm text-text-secondary mt-2">
                  <button
                    type="button"
                    onClick={() => navigate("/verify-otp", { state: { email: email.trim() } })}
                    className="text-primary hover:text-primary/80 font-medium"
                  >
                    Verify OTP
                  </button>
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <Input
                  type="email"
                  id="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={error}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={status === "loading"}
                  loading={status === "loading"}
                  rounded
                >
                  Send OTP
                </Button>

                <p className="text-center text-sm text-gray-400">
                  Remembered your password?{" "}
                  <Link to="/login" className="text-primary hover:text-primary/80 font-medium">
                    Sign in
                  </Link>
                </p>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}


