import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, Upload, FileText } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import mmLogo from '../../assets/mmLogo1-transparent.png';
import { ImagesPath } from '../../utils/images';
import { useState } from 'react';
import ConfirmationModal from '../ui/ConfirmationModal';
import { isDemoMode } from '../../utils/demoMode';

const Sidebar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [blockedFeature, setBlockedFeature] = useState<string>('');
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  const navItems = [
    { 
      name: 'Dashboard', 
      path: '/dashboard',
      icon: ImagesPath.dashboardIcon,
    },
    { 
      name: 'Practice Interview', 
      path: '/interview-setup',
      icon: ImagesPath.userInterviewIcon,
    },
    { 
      name: 'Upload Resume', 
      path: '/upload-resume',
      icon: Upload,
      isLucideIcon: true,
    },
    { 
      name: 'Performance', 
      path: '/performance',
      icon: ImagesPath.userPerformanceIcon,
    },
    {
      name: 'Reports',
      path: '/reports',
      icon: FileText,
      isLucideIcon: true,
    }
  ];

  const bottomNavItems = [
    { 
      name: 'Help', 
      path: '/help',
      icon: ImagesPath.helpIcon,
    },
    { 
      name: 'Settings', 
      path: '/profile-settings',
      icon: ImagesPath.settingsIcon,
    }
  ];

  const NavLink = ({ item }: { item: { name: string; path: string; icon: any; isLucideIcon?: boolean } }) => {
    const isActive = location.pathname === item.path;
    const IconComponent = item.isLucideIcon ? item.icon : null;
    
    const handleClick = (e: React.MouseEvent) => {
      // Demo mode: allow only Dashboard view without auth. Everything else prompts signup/login.
      const demo = isDemoMode() && !isAuthenticated;
      const demoAllowed = item.path === '/dashboard';

      if (demo && !demoAllowed) {
        e.preventDefault();
        e.stopPropagation();
        setBlockedFeature(item.name);
        setDemoModalOpen(true);
        return;
      }

      if (item.path) navigate(item.path);
    };
    
    return (
      <Link 
        to={item.path}
        onClick={handleClick}
        className={twMerge(
          "flex items-center gap-2 lg:gap-[0.7vw] px-2.5 lg:px-[1vw] py-2.5 lg:py-[0.5vw] text-text-secondary hover:text-text-primary hover:bg-primary/10 transition-all duration-300 rounded-full group",
          isActive && "bg-primary text-white shadow-lg shadow-[0_10px_30px_rgb(var(--primary)/0.22)]"
        )}
      >
        {item.isLucideIcon && IconComponent ? (
          <IconComponent 
            className={twMerge(
              "w-5 h-5 lg:w-[1.5vw] lg:h-[1.5vw] transition-transform group-hover:scale-110",
              // Make lucide icons match the muted sidebar icon tone (avoid looking too bright)
              isActive
                ? "text-white opacity-100 drop-shadow-[0_0_4px_rgba(255,255,255,0.5)]"
                : "text-text-secondary/70 opacity-70 group-hover:text-text-primary group-hover:opacity-100"
            )} 
          />
        ) : (
          <img 
            src={item.icon} 
            alt={item.name} 
            className={twMerge(
              "w-5 h-5 lg:w-[1.5vw] lg:h-[1.5vw] transition-transform group-hover:scale-110",
              // Make image icons match the same muted tone (fixes Help looking too white)
              isActive
                ? "opacity-100 drop-shadow-[0_0_4px_rgba(255,255,255,0.5)]"
                : "opacity-70 brightness-90 group-hover:opacity-100 group-hover:brightness-100"
            )} 
          />
        )}
        <span className="font-size-20px font-poppins-regular">{item.name}</span>
      </Link>
    );
  };
  
  return (
    <div className="w-[20vw] min-w-[200px] max-w-[350px] bg-card border-r border-border h-screen flex flex-col p-2.5 lg:p-[1vw]">
      {/* Logo and App Name */}
      <div className="flex items-center gap-2 mb-8 lg:mb-[3vw] px-3 lg:px-[1vw] pt-2 lg:pt-[1vw] cursor-pointer hover:opacity-90 transition-opacity" onClick={() => navigate('/dashboard')}>
        <img
          src={mmLogo}
          alt="MockMate Logo"
          className="w-[3vw] h-[3vw] min-w-[30px] min-h-[30px] object-contain block shrink-0 -translate-y-[1px] drop-shadow-[0_0_8px_rgb(var(--primary)/0.28)]"
        />
        <span className="text-text-primary font-poppins-regular font-size-40px drop-shadow-[0_0_10px_rgb(var(--primary)/0.18)]"><strong>M</strong>ock<strong>M</strong>ate</span>
      </div>

      {/* Top Navigation Items */}
      <div className="flex flex-col gap-2 lg:gap-[0.8vw]">
        {navItems.map((item) => (
          <NavLink key={item.name} item={item}  />
        ))}
      </div>

      {/* Bottom Navigation Items */}
      <div className="mt-auto flex flex-col gap-2 lg:gap-[0.3vw]">
        {bottomNavItems.map((item) => (
          <NavLink key={item.name} item={item} />
        ))}
      </div>

      <ConfirmationModal
        isOpen={demoModalOpen}
        onClose={() => setDemoModalOpen(false)}
        onConfirm={() => {
          setDemoModalOpen(false);
          navigate('/signup', { state: { demoBlocked: true, from: location.pathname } });
        }}
        title="Demo Mode"
        message={`You're currently viewing a demo. To use “${blockedFeature}”, please create an account and sign in.`}
        confirmText="Sign up"
        cancelText="Close"
      />
    </div>
  );
};

export default Sidebar;
