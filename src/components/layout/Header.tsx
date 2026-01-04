import { useState, useEffect, useRef } from "react";
import { ChevronDown, Settings, HelpCircle, LogOut } from "lucide-react";
import mmLogo from "../../assets/mmLogo1-transparent.png";
import { useNavigate } from "react-router-dom";
import ConfirmationModal from "../ui/ConfirmationModal";

const Header = () => {
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const menuItems = [
    {
      icon: Settings,
      label: "Settings",
      onClick: () => {
        setIsDropdownOpen(false);
        navigate("/profile-settings");
      },
      color: "#a855f7",
    },
    {
      icon: HelpCircle,
      label: "Help",
      onClick: () => {
        setIsDropdownOpen(false);
        navigate("/help");
      },
      color: "#3c9a72",
    },
    {
      icon: LogOut,
      label: "Log Out",
      onClick: () => {
        setIsDropdownOpen(false);
        setShowLogoutModal(true);
      },
      color: "#f6616a",
    },
  ];

  return (
    <>
      <div className="flex relative z-20 gap-4 justify-end items-center lg:gap-[6rem] py-3 lg:py-[1vw] px-1.5 lg:px-[1vw] bg-card/80 backdrop-blur-xl border-b border-border shadow-lg">
        <div className="relative" ref={dropdownRef}>
          <div
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-1 lg:gap-[0.5vw] cursor-pointer hover:bg-primary/10 rounded-full transition-all duration-300 px-3 py-1.5 lg:px-[1vw] lg:py-[0.5vw] border border-transparent hover:border-border shadow-sm"
          >
            <img
              src={mmLogo}
              alt="MockMate Logo"
              className="w-[2vw] h-[2vw] min-w-[20px] min-h-[20px] object-contain block shrink-0 -translate-y-[1px] drop-shadow-[0_0_6px_rgb(var(--primary)/0.22)]"
            />
            <h1 className="text-text-primary font-poppins-semibold font-size-20px drop-shadow-[0_0_8px_rgb(var(--primary)/0.18)]">
              MockMate
            </h1>
            <ChevronDown
              size={20}
              className={`text-text-secondary lg:size-[1.5vw] transition-transform duration-300 ${
                isDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </div>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 lg:w-[12vw] min-w-full bg-card border border-border rounded-lg lg:rounded-[0.8vw] shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 backdrop-blur-xl">
              {menuItems.map((item, index) => (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className={`w-full flex items-center gap-3 lg:gap-[0.8vw] px-4 py-3 lg:px-[1vw] lg:py-[0.8vw] hover:bg-primary/10 transition-all duration-200 group ${
                    index !== menuItems.length - 1
                      ? "border-b border-border"
                      : ""
                  }`}
                >
                  <item.icon
                    className="w-5 h-5 lg:w-[1.5vw] lg:h-[1.5vw] transition-transform group-hover:scale-110 text-primary group-hover:text-primary/80"
                  />
                  <span
                    className="font-size-18px font-poppins-regular text-text-primary group-hover:text-text-primary transition-colors"
                  >
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <ConfirmationModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
        title="Confirm Logout"
        message="Are you sure you want to log out? You will need to sign in again to access your account."
        confirmText="Log Out"
        cancelText="Cancel"
        confirmColor="#f6616a"
      />
    </>
  );
};

export default Header;
