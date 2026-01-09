import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
    BarChart3,
    Users,
    Video,
    AlertTriangle,
    FileCheck,
    Settings,
    Library,
    LogOut
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import mmLogo from '../../assets/mmLogo1-transparent.png';

const AdminSidebar = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const navItems = [
        {
            name: 'Admin Dashboard',
            path: '/admin/dashboard',
            icon: BarChart3,
        },
        {
            name: 'User Management',
            path: '/admin/users',
            icon: Users,
        },
        {
            name: 'Interview Logs',
            path: '/admin/interviews',
            icon: Video,
        },
        {
            name: 'Proctoring Panel',
            path: '/admin/proctoring',
            icon: AlertTriangle,
        },
        {
            name: 'All Reports',
            path: '/admin/reports',
            icon: FileCheck,
        },
        {
            name: 'Role & Questions',
            path: '/admin/content',
            icon: Library,
        }
    ];

    const bottomNavItems = [
        {
            name: 'AI Settings',
            path: '/admin/settings',
            icon: Settings,
        }
    ];

    const NavLink = ({ item }: { item: { name: string; path: string; icon: any } }) => {
        const isActive = location.pathname === item.path;
        const IconComponent = item.icon;

        return (
            <Link
                to={item.path}
                className={twMerge(
                    "flex items-center gap-2 lg:gap-[0.7vw] px-2.5 lg:px-[1vw] py-2.5 lg:py-[0.5vw] text-text-secondary hover:text-text-primary hover:bg-primary/10 transition-all duration-300 rounded-full group",
                    isActive && "bg-primary text-white shadow-lg shadow-[0_10px_30px_rgb(var(--primary)/0.22)]"
                )}
            >
                <IconComponent
                    className={twMerge(
                        "w-5 h-5 lg:w-[1.5vw] lg:h-[1.5vw] transition-transform group-hover:scale-110",
                        isActive
                            ? "text-white opacity-100 drop-shadow-[0_0_4px_rgba(255,255,255,0.5)]"
                            : "text-text-secondary/70 opacity-70 group-hover:text-text-primary group-hover:opacity-100"
                    )}
                />
                <span className="font-size-20px font-poppins-regular whitespace-nowrap">{item.name}</span>
            </Link>
        );
    };

    return (
        <div className="w-[20vw] min-w-[220px] max-w-[350px] bg-card border-r border-border h-screen flex flex-col p-2.5 lg:p-[1vw]">
            {/* Logo and App Name */}
            <div className="flex items-center gap-2 mb-8 lg:mb-[3vw] px-3 lg:px-[1vw] pt-2 lg:pt-[1vw] cursor-pointer" onClick={() => navigate('/admin/dashboard')}>
                <img
                    src={mmLogo}
                    alt="MockMate Logo"
                    className="w-[3vw] h-[3vw] min-w-[30px] min-h-[30px] object-contain block shrink-0 -translate-y-[1px] drop-shadow-[0_0_8px_rgb(var(--primary)/0.28)]"
                />
                <div className="flex flex-col">
                    <span className="text-text-primary font-poppins-regular font-size-32px leading-none"><strong>M</strong>ock<strong>M</strong>ate</span>
                    <span className="text-primary text-[10px] uppercase tracking-widest font-bold ml-1">Admin Panel</span>
                </div>
            </div>

            {/* Top Navigation Items */}
            <div className="flex flex-col gap-2 lg:gap-[0.8vw]">
                {navItems.map((item) => (
                    <NavLink key={item.name} item={item} />
                ))}
            </div>

            {/* Bottom Navigation Items */}
            <div className="mt-auto flex flex-col gap-2 lg:gap-[0.3vw]">
                {bottomNavItems.map((item) => (
                    <NavLink key={item.name} item={item} />
                ))}

                <button
                    onClick={logout}
                    className="flex items-center gap-2 lg:gap-[0.7vw] px-2.5 lg:px-[1vw] py-2.5 lg:py-[0.5vw] text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-300 rounded-full group mt-2"
                >
                    <LogOut className="w-5 h-5 lg:w-[1.5vw] lg:h-[1.5vw]" />
                    <span className="font-size-20px font-poppins-regular">Logout</span>
                </button>
            </div>
        </div>
    );
};

export default AdminSidebar;
