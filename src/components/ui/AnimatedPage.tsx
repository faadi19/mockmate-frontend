import { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { twMerge } from "tailwind-merge";

type AnimatedPageProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  particles?: boolean;
};

export default function AnimatedPage({
  children,
  className,
  contentClassName,
  particles = true,
}: AnimatedPageProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className={twMerge("relative overflow-x-hidden", className)}>
      {/* Background accents */}
      {!reduceMotion && (
        <>
          <motion.div
            className="pointer-events-none absolute -top-20 -left-20 h-64 w-64 rounded-full blur-3xl opacity-25 overflow-hidden"
            style={{
              background:
                "radial-gradient(circle at 30% 30%, rgb(var(--primary) / 0.55), transparent 65%)",
            }}
            animate={{ x: [0, 30, 0], y: [0, 18, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="pointer-events-none absolute top-10 -right-20 h-72 w-72 rounded-full blur-3xl opacity-20 overflow-hidden"
            style={{
              background:
                "radial-gradient(circle at 60% 40%, rgb(var(--secondary) / 0.55), transparent 65%)",
            }}
            animate={{ x: [0, -35, 0], y: [0, 22, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      )}

      {particles && !reduceMotion && (
        <div className="pointer-events-none absolute inset-0 opacity-20">
          {Array.from({ length: 10 }).map((_, i) => (
            <motion.div
              // eslint-disable-next-line react/no-array-index-key
              key={i}
              className="absolute h-1 w-1 rounded-full bg-white/70"
              style={{
                left: `${(i * 9 + 13) % 100}%`,
                top: `${(i * 13 + 19) % 100}%`,
              }}
              animate={{ opacity: [0.2, 0.8, 0.2], scale: [1, 1.5, 1] }}
              transition={{
                duration: 3.8 + (i % 3),
                repeat: Infinity,
                ease: "easeInOut",
                delay: (i % 5) * 0.25,
              }}
            />
          ))}
        </div>
      )}

      {/* Content entrance */}
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className={twMerge("relative z-10", contentClassName)}
      >
        {children}
      </motion.div>
    </div>
  );
}


