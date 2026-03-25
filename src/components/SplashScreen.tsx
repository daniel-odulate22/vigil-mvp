import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

const SplashScreen = ({ onComplete, duration = 3000 }: SplashScreenProps) => {
  const [showTitle, setShowTitle] = useState(false);

  useEffect(() => {
    const titleTimer = setTimeout(() => setShowTitle(true), 800);
    const completeTimer = setTimeout(() => onComplete(), duration);

    return () => {
      clearTimeout(titleTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete, duration]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Shield icon */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center mb-6"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
            <path d="m9 12 2 2 4-4"/>
          </svg>
        </motion.div>

        {/* Title */}
        <AnimatePresence>
          {showTitle && (
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <h1 className="text-4xl font-display font-bold text-foreground tracking-widest">
                VIGIL
              </h1>
              <motion.p
                className="mt-2 text-muted-foreground text-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                Your Medication. Protected.
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading dots */}
        <motion.div
          className="absolute bottom-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-primary"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SplashScreen;
