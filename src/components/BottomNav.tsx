import { NavLink, useLocation } from 'react-router-dom';
import { Pill, User, ScanBarcode, CalendarClock, Home } from 'lucide-react';
import { motion } from 'framer-motion';

interface BottomNavProps {
  onScanClick: () => void;
}

const BottomNav = ({ onScanClick }: BottomNavProps) => {
  const location = useLocation();

  const NavItem = ({ 
    to, 
    icon: Icon, 
    label 
  }: { 
    to: string; 
    icon: typeof Pill; 
    label: string;
  }) => {
    const isActive = location.pathname === to;
    
    return (
      <NavLink
        to={to}
        className={`relative flex flex-col items-center justify-center h-full transition-colors ${
          isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <motion.div
          className="flex flex-col items-center"
          whileTap={{ scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
          <Icon className="w-5 h-5" />
          <span className="text-[10px] mt-1 font-medium">{label}</span>
        </motion.div>
        {isActive && (
          <motion.div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full"
            layoutId="nav-indicator"
          />
        )}
      </NavLink>
    );
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom">
      {/* Offline indicator */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute -top-8 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground text-xs px-3 py-1 rounded-full flex items-center gap-1.5 shadow-lg"
          >
            <WifiOff className="w-3 h-3" />
            Offline Mode
          </motion.div>
        )}
      </AnimatePresence>
      <div className="grid grid-cols-5 h-16 max-w-md mx-auto">
        {/* Home - far left */}
        <NavItem to="/" icon={Home} label="Home" />
        
        {/* Meds */}
        <NavItem to="/prescriptions" icon={Pill} label="Meds" />
        
        {/* Scan button - center, elevated */}
        <motion.button
          onClick={onScanClick}
          className="flex flex-col items-center justify-center"
          whileTap={{ scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          aria-label="Scan medication barcode"
        >
          <div className="-mt-3 w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-md ring-2 ring-background">
            <ScanBarcode className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-[10px] mt-0.5 font-medium text-primary">Scan</span>
        </motion.button>
        
        {/* Schedule */}
        <NavItem to="/schedule" icon={CalendarClock} label="Schedule" />
        
        {/* Profile - far right */}
        <NavItem to="/profile" icon={User} label="Profile" />
      </div>
    </nav>
  );
};

export default BottomNav;
