import { WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

const OfflineBanner = () => {
  const isOnline = useOnlineStatus();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-destructive text-destructive-foreground text-center text-sm py-2 px-4 flex items-center justify-center gap-2 overflow-hidden"
        >
          <WifiOff className="w-4 h-4" />
          You're offline — changes will sync when reconnected
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineBanner;
