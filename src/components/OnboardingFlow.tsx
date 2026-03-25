import { useState } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Shield, ScanBarcode, Wifi, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OnboardingFlowProps {
  onComplete: () => void;
}

const slides = [
  {
    id: 'safety',
    icon: Shield,
    title: 'Safety First',
    subtitle: 'Your medications, verified',
    description: 'Scan barcodes to confirm you have the right medication. Never second-guess your prescriptions again.',
  },
  {
    id: 'scan',
    icon: ScanBarcode,
    title: 'Instant Scanning',
    subtitle: 'Scan in seconds',
    description: 'Point your camera, scan the barcode, and instantly log your dose. Medication tracking made effortless.',
  },
  {
    id: 'offline',
    icon: Wifi,
    title: 'Works Offline',
    subtitle: 'Always available',
    description: 'Track your medications even without internet. Everything syncs automatically when you reconnect.',
  },
];

const OnboardingFlow = ({ onComplete }: OnboardingFlowProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);

  const isLastSlide = currentSlide === slides.length - 1;

  const goToSlide = (index: number) => {
    if (index < 0 || index >= slides.length) return;
    setDirection(index > currentSlide ? 1 : -1);
    setCurrentSlide(index);
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.x < -threshold && currentSlide < slides.length - 1) {
      goToSlide(currentSlide + 1);
    } else if (info.offset.x > threshold && currentSlide > 0) {
      goToSlide(currentSlide - 1);
    }
  };

  const slideVariants = {
    enter: (direction: number) => ({ x: direction > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({ x: direction < 0 ? 300 : -300, opacity: 0 }),
  };

  const slide = slides[currentSlide];
  const Icon = slide.icon;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-background overflow-hidden">
      <div className="absolute top-6 right-6 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={onComplete}
          className="text-muted-foreground hover:text-foreground"
        >
          Skip
        </Button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 pt-16">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={slide.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="flex flex-col items-center text-center max-w-sm cursor-grab active:cursor-grabbing"
          >
            <motion.div
              className="w-28 h-28 rounded-full bg-primary/15 flex items-center justify-center mb-8"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            >
              <Icon className="w-14 h-14 text-primary" strokeWidth={1.5} />
            </motion.div>

            <motion.h2
              className="text-2xl font-semibold text-foreground mb-2"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15 }}
            >
              {slide.title}
            </motion.h2>

            <motion.p
              className="text-primary text-sm font-medium mb-4"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {slide.subtitle}
            </motion.p>

            <motion.p
              className="text-muted-foreground text-sm leading-relaxed"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25 }}
            >
              {slide.description}
            </motion.p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="pb-12 px-8">
        <div className="flex justify-center gap-2 mb-8">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? 'w-8 bg-primary'
                  : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        <Button
          onClick={() => {
            if (isLastSlide) onComplete();
            else goToSlide(currentSlide + 1);
          }}
          className="w-full h-14 text-base font-semibold gap-2"
          size="lg"
        >
          {isLastSlide ? 'Get Started' : (
            <>
              Continue
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default OnboardingFlow;
