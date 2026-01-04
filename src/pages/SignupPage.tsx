import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import Input from "../components/ui/Input";
import { ImagesPath } from "../utils/images";
import Button from "../components/ui/Button";
import { handleGoogleAuth } from "../utils/auth";
import axios from "axios";
import { API_BASE_URL } from "../config/api";

const SignupPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [dob, setDob] = useState("");
  const [citizenship, setCitizenship] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  // Calculate maximum date (15 years ago from today)
  const getMaxDate = () => {
    const today = new Date();
    const maxDate = new Date(today.getFullYear() - 15, today.getMonth(), today.getDate());
    return maxDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  };

  const [errors, setErrors] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    dob: "",
    citizenship: "",
    terms: "",
  });

  const [isLoading, setIsLoading] = useState(false);

  const demoBlocked = (location.state as any)?.demoBlocked;
  const fromPath = (location.state as any)?.from;

  const validateForm = () => {
    const newErrors = {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      dob: "",
      citizenship: "",
      terms: "",
    };

    let isValid = true;

    if (!fullName.trim()) {
      newErrors.fullName = "Full name is required";
      isValid = false;
    }

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
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
      isValid = false;
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
      isValid = false;
    }

    if (!dob) {
      newErrors.dob = "Date of birth is required";
      isValid = false;
    } else {
      // Check if user is at least 15 years old
      const birthDate = new Date(dob);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const dayDiff = today.getDate() - birthDate.getDate();

      const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;

      if (actualAge < 15) {
        newErrors.dob = "You must be at least 15 years old to sign up";
        isValid = false;
      }
    }

    if (!citizenship.trim()) {
      newErrors.citizenship = "Citizenship is required";
      isValid = false;
    }

    if (!agreeToTerms) {
      newErrors.terms = "You must agree to the terms and privacy policy";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/register`, {
        name: fullName,
        email,
        password,
        dob,
        citizenship,
      }, {
        headers: { "Content-Type": "application/json" }
      });

      console.log("Registered user:", response.data);

      // Optionally save token to localStorage
      localStorage.setItem("token", response.data.token);

      // Redirect to dashboard
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Signup failed:", error.response?.data || error.message);
      setErrors((prev) => ({
        ...prev,
        email: error.response?.data?.message || "Signup failed",
      }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative bg-background">
      <div className="w-[120vw] absolute top-[-30vh] left-[-5vw] h-[40vh] bg-gradient-to-r from-primary/80 to-secondary/80 rotate-[-6deg] custom-shadow"></div>
      <div className="min-h-screen flex relative z-10">

        {/* Left Side */}
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

        {/* RIGHT SIDE FORM */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <motion.div
            className="w-full max-w-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center mb-8">
              <h1 className="font-size-55px font-poppins-semibold text-text-primary mb-2 tracking-wide">
                SIGN UP
              </h1>
              <p className="font-size-20px font-poppins-regular text-text-secondary">
                Begin your interview journey now!
              </p>
            </div>

            {demoBlocked && (
              <div className="mb-4 rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-left">
                <p className="text-sm text-text-primary font-poppins-medium">
                  You’re viewing a demo. To use <span className="font-semibold">{fromPath || "this feature"}</span>, please create an account.
                </p>
                <p className="text-sm text-text-secondary mt-1">
                  Already have an account?{" "}
                  <Link to="/login" className="text-primary hover:text-primary/80 font-medium">
                    Sign in
                  </Link>
                  .
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="text"
                id="fullName"
                placeholder="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                error={errors.fullName}
              />

              <Input
                type="email"
                id="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
              />

              <Input
                type="password"
                id="password"
                placeholder="Password"
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

              {/* DOB FIELD */}
              <Input
                type="date"
                id="dob"
                label="Date of Birth"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                max={getMaxDate()}
                error={errors.dob}
              />

              {/* CITIZENSHIP */}
              <Input
                type="text"
                id="citizenship"
                placeholder="Citizenship"
                value={citizenship}
                onChange={(e) => setCitizenship(e.target.value)}
                error={errors.citizenship}
              />

              {/* TERMS */}
              <div className="flex items-start">
                <input
                  id="terms"
                  type="checkbox"
                  checked={agreeToTerms}
                  onChange={(e) => setAgreeToTerms(e.target.checked)}
                  className="h-4 w-4 rounded border-border bg-card text-primary focus:ring-primary/35"
                />

                <label htmlFor="terms" className="ml-3 text-text-secondary text-sm">
                  By signing up, you agree to our{" "}
                  <a className="text-primary hover:text-primary/80">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a className="text-primary hover:text-primary/80">
                    Privacy Policy
                  </a>
                </label>
              </div>

              {errors.terms && (
                <p className="text-sm text-red-500">{errors.terms}</p>
              )}

              <Button type="submit" className="w-full" disabled={isLoading} rounded>
                {isLoading ? "Creating account..." : "Sign up"}
              </Button>

              <div className="mt-4 text-center">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={(e) => {
                    e.preventDefault();
                    void handleGoogleAuth("signup");
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
                  Sign up with Google
                </Button>
              </div>

              <p className="mt-4 text-center text-sm text-gray-400">
                Already have an account?{" "}
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
};

export default SignupPage;
