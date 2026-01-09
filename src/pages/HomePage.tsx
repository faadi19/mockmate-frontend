import { motion, useReducedMotion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  LineChart,
} from "lucide-react";
import Button from "../components/ui/Button";
import { useAuth } from "../contexts/AuthContext";
import mmLogo from "../assets/mmLogo1-transparent.png"; // ✅ logo import
import { ImagesPath } from "../utils/images";
import { setDemoMode } from "../utils/demoMode";

const HomePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const reduceMotion = useReducedMotion();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      if (user?.role === 'admin') {
        navigate("/admin/dashboard");
      } else {
        navigate("/dashboard");
      }
    } else {
      navigate("/signup");
    }
  };

  const featureCards = [
    {
      icon: ImagesPath.aiDrivenMockInterviewsIcon,
      title: "AI-Driven Mock Interviews",
      desc: "Get realistic interview practice sessions powered by cutting-edge AI technology",
    },
    {
      icon: ImagesPath.nlpAnalysisIcon,
      title: "NLP Analysis",
      desc: "Analyze your interview responses with advanced natural language processing techniques",
    },
    {
      icon: ImagesPath.emotionDetectionIcon,
      title: "Emotion Detection",
      desc: "Understand emotional cues and improve your interview confidence with emotion detection insights",
    },
  ];

  return (
    <div className="relative w-screen bg-background h-screen overflow-y-auto overflow-x-hidden">
      <div className="w-screen h-screen absolute top-0 left-0">
        <img
          src={ImagesPath.mainHomePageBg}
          alt="Home Background"
          className="w-full h-full object-cover filter blur-3xl opacity-40 saturate-150 hue-rotate-[-35deg]"
        />
        {/* Color overlay to align the blurred background with the current theme (blue/teal), not purple */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-primary/25 via-secondary/15 to-background/70" />
        {/* Subtle black vignette/shadow for depth and better readability */}
        <div className="absolute inset-0 pointer-events-none [background:radial-gradient(70%_60%_at_50%_35%,transparent_0%,rgba(0,0,0,0.35)_70%,rgba(0,0,0,0.55)_100%)]" />

        {/* Floating blobs (premium animated background) */}
        {!reduceMotion && (
          <>
            <motion.div
              className="absolute -top-24 -left-24 h-72 w-72 rounded-full blur-3xl opacity-35"
              style={{
                background:
                  "radial-gradient(circle at 30% 30%, rgb(var(--primary) / 0.55), transparent 65%)",
              }}
              animate={{ x: [0, 40, 0], y: [0, 20, 0] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute top-10 right-[-120px] h-80 w-80 rounded-full blur-3xl opacity-25"
              style={{
                background:
                  "radial-gradient(circle at 60% 40%, rgb(var(--secondary) / 0.55), transparent 65%)",
              }}
              animate={{ x: [0, -45, 0], y: [0, 25, 0] }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute bottom-[-120px] left-[35%] h-96 w-96 rounded-full blur-3xl opacity-20"
              style={{
                background:
                  "radial-gradient(circle at 50% 50%, rgb(var(--primary) / 0.40), transparent 70%)",
              }}
              animate={{ x: [0, 30, 0], y: [0, -25, 0] }}
              transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
            />
          </>
        )}

        {/* Subtle particle dots */}
        {!reduceMotion && (
          <div className="absolute inset-0 pointer-events-none opacity-25">
            {Array.from({ length: 14 }).map((_, i) => (
              <motion.div
                // eslint-disable-next-line react/no-array-index-key
                key={i}
                className="absolute h-1 w-1 rounded-full bg-white/70"
                style={{
                  left: `${(i * 7 + 13) % 100}%`,
                  top: `${(i * 11 + 17) % 100}%`,
                }}
                animate={{ opacity: [0.2, 0.9, 0.2], scale: [1, 1.6, 1] }}
                transition={{
                  duration: 3.5 + (i % 4),
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: (i % 6) * 0.2,
                }}
              />
            ))}
          </div>
        )}
      </div>
      <div className="text-text-primary relative z-10 max-w-[90%] lg:max-w-[80vw] mx-auto">
        <header className="w-full mx-auto px-4 py-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <img
              src={mmLogo}
              alt="MockMate Logo"
              className="w-[3vw] h-[3vw] min-w-[50px] min-h-[50px] object-contain block shrink-0 -translate-y-[1px] drop-shadow-[0_0_8px_rgb(var(--primary)/0.35)]"
            />
            <span className="text-text-primary font-poppins-regular font-size-40px drop-shadow-[0_0_10px_rgb(var(--primary)/0.25)]">
              <strong>M</strong>ock<strong>M</strong>ate
            </span>
          </div>
          <div className="flex gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/login")}
              size="lg"
            >
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                Log in
              </span>
            </Button>
            <Button onClick={() => navigate("/signup")} size="lg">
              Sign up
            </Button>
          </div>
        </header>

        <main className="w-full mx-auto">
          <section className="w-full mx-auto py-10 md:py-[4vw]">
            <div className="w-full text-center">
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="flex flex-col items-center"
              >
                {/* Badge removed as per request */}

                <motion.h1
                  className="font-size-62px font-poppins-bold leading-none md:font-size-60px mb-4 lg:mb-[1vw]"
                  initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                  animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.05, ease: "easeOut" }}
                >
                  Master Your{" "}
                  <span className="gradient-text">Interview Skills</span> with AI
                </motion.h1>

                <motion.p
                  className="font-size-20px font-poppins-regular md:font-size-22px text-text-secondary mb-5 lg:mb-[1.2vw] w-full max-w-3xl"
                  initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                  animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.12, ease: "easeOut" }}
                >
                  Practice with intelligent AI interviews that adapt to your responses,
                  and get measurable improvement with real-time insights.
                </motion.p>
              </motion.div>

              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                className="mb-10 lg:mb-[4vw] w-full"
              >
                <div className="flex items-center justify-center gap-4 flex-wrap">
                  <Button
                    onClick={handleGetStarted}
                    size="lg"
                    className="relative overflow-hidden"
                    icons={<ArrowRight className="size-5 lg:size-[1.5vw]" />}
                    iconsPosition="right"
                  >
                    <span className="relative z-10 font-size-20px font-poppins-bold leading-none">
                      Get Started
                    </span>
                    {!reduceMotion && (
                      <motion.span
                        aria-hidden
                        className="absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                        animate={{ x: ["0%", "250%"] }}
                        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                      />
                    )}
                  </Button>
                  {/* View Demo button removed as requested */}
                </div>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-[1vw]">
                {featureCards.map((item, index) => (
                  <motion.div
                    key={item.title}
                    initial={reduceMotion ? false : { opacity: 0, y: 24 }}
                    whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{ duration: 0.6, delay: index * 0.08, ease: "easeOut" }}
                    className="relative group h-full"
                  >
                    <motion.div
                      whileHover={reduceMotion ? undefined : { y: -6, rotateX: 2, rotateY: -2 }}
                      transition={{ type: "spring", stiffness: 260, damping: 18 }}
                      className="bg-card/70 rounded-2xl lg:rounded-[1vw] p-4 lg:p-[0.9vw] flex flex-col md:flex-row justify-start h-full transition-all duration-300 hover:shadow-glow border border-border gap-4 lg:gap-[0.8vw] items-center cursor-pointer"
                    >
                      <div className="w-16 h-16 lg:w-[7vw] lg:h-[7vw] rounded-full overflow-hidden bg-background/50 border border-border shadow-sm shrink-0">
                        <img
                          src={item.icon}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex flex-col justify-center">
                        <h3 className="font-size-30px font-poppins-bold leading-tight text-center md:text-left mb-2 lg:mb-[0.4vw]">
                          {item.title}
                        </h3>
                        <p className="font-size-20px font-poppins-light text-text-secondary leading-tight text-center md:text-left">
                          {item.desc}
                        </p>
                      </div>
                    </motion.div>
                  </motion.div>
                ))}
              </div>

              {/* How it works */}
              <div className="mt-14 lg:mt-[5vw]">
                <motion.h2
                  className="font-size-40px font-poppins-bold mb-6"
                  initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                  whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                >
                  A smarter way to prepare
                </motion.h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    {
                      title: "Choose a role",
                      desc: "Pick your target position and difficulty level.",
                      icon: <ShieldCheck className="h-5 w-5 text-primary" />,
                    },
                    {
                      title: "Practice live",
                      desc: "Answer AI questions in a realistic interview flow.",
                      icon: <Sparkles className="h-5 w-5 text-primary" />,
                    },
                    {
                      title: "Track progress",
                      desc: "See analytics, tips, and your improvement over time.",
                      icon: <LineChart className="h-5 w-5 text-primary" />,
                    },
                  ].map((step, i) => (
                    <motion.div
                      // eslint-disable-next-line react/no-array-index-key
                      key={i}
                      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.6 }}
                      transition={{ duration: 0.6, delay: i * 0.08, ease: "easeOut" }}
                      className="bg-card/60 border border-border rounded-2xl p-5 text-left"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                          {step.icon}
                        </div>
                        <h3 className="font-size-24px font-poppins-semibold">{step.title}</h3>
                      </div>
                      <p className="text-text-secondary">{step.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default HomePage;
