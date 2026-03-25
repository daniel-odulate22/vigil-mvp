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
      </NavLink>
    );
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border safe-area-bottom">
      <div className="grid grid-cols-5 h-16 max-w-md mx-auto">
        <NavItem to="/" icon={Home} label="Home" />
        <NavItem to="/prescriptions" icon={Pill} label="Meds" />
        
        {/* Scan button */}
        <motion.button
          onClick={onScanClick}
          className="flex flex-col items-center justify-center"
          whileTap={{ scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          aria-label="Scan medication barcode"
        >
          <div className="-mt-4 w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30 ring-4 ring-background">
            <ScanBarcode className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-[10px] mt-0.5 font-medium text-primary">Scan</span>
        </motion.button>
        
        <NavItem to="/schedule" icon={CalendarClock} label="Schedule" />
        <NavItem to="/profile" icon={User} label="Profile" />
      </div>
    </nav>
  );
};

export default BottomNav;
