import {
  CheckIcon,
  ChevronRight,
  Edit,
  EyeIcon,
  EyeOffIcon,
  Loader2,
  XIcon,
} from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import { useNavigate } from "react-router-dom";
import ContentHeader from "../components/layout/ContentHeader";
import { ImagesPath } from "../utils/images";
import { useEffect, useRef, useState } from "react";
import ConfirmationModal from "../components/ui/ConfirmationModal";
import axios from "axios";
import { API_BASE_URL } from "../config/api";
import { useAuth } from "../contexts/AuthContext";
import { motion, useReducedMotion } from "framer-motion";
import AnimatedPage from "../components/ui/AnimatedPage";

// -------------------------------------------------------
// Reusable editable input
// -------------------------------------------------------
const CustomInput = ({
  label,
  onSave,
  value,
  loading,
  readOnly,
  placeholder,
  type,
}: {
  label: string;
  onSave: (value: string) => void;
  value: string;
  loading?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  type?: "text" | "password";
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [inputType, setInputType] = useState<"text" | "password">(type || "text");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(value);
    setIsEditing(false);
    inputRef.current?.blur();
  }, [value]);

  const togglePassword = () => {
    setInputType((prev) => (prev === "password" ? "text" : "password"));
  };

  return (
    <div className="flex flex-col gap-2 lg:gap-[0.5vw]">
      <label className="font-size-20px font-poppins-regular text-white">
        {label}
      </label>

      <div className="flex items-center gap-2 bg-card border border-border px-4 rounded-full max-w-full">
        <input
          ref={inputRef}
          type={inputType}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          readOnly={!isEditing || readOnly}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-text-primary outline-none py-2 min-w-0"
        />

        {isEditing && type === "password" && (
          <button onClick={togglePassword} className="cursor-pointer">
            {inputType === "password" ? (
              <EyeOffIcon className="text-primary" />
            ) : (
              <EyeIcon className="text-primary" />
            )}
          </button>
        )}

        {!readOnly && (
          <button
            onClick={() => {
              if (isEditing) {
                setIsEditing(false);
                setInputValue(value);
              } else {
                inputRef.current?.focus();
                setIsEditing(true);
              }
            }}
          >
            {isEditing ? (
              <XIcon className="text-error" />
            ) : (
              <Edit className="text-primary" />
            )}
          </button>
        )}

        {isEditing && (
          <button
            onClick={() => onSave(inputValue)}
            className="cursor-pointer"
          >
            {loading ? (
              <Loader2 className="animate-spin text-primary" />
            ) : (
              <CheckIcon className="text-success" />
            )}
          </button>
        )}
      </div>
    </div>
  );
};

// -------------------------------------------------------
// Profile Input Section
// -------------------------------------------------------
const ProfileSettingsComponent = ({
  user,
  token,
  refreshUser,
}: {
  user: any;
  token: string;
  refreshUser: () => Promise<void>;
}) => {
  const [loadingName, setLoadingName] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);

  const updateName = async (newName: string) => {
    setLoadingName(true);
    await axios.put(
      `${API_BASE_URL}/api/profile/update`,
      { name: newName },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    await refreshUser();
    setLoadingName(false);
  };

  const updateEmail = async (newEmail: string) => {
    setLoadingEmail(true);
    await axios.put(
      `${API_BASE_URL}/api/profile/update`,
      { email: newEmail },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    await refreshUser();
    setLoadingEmail(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <CustomInput
        label="Full Name"
        value={user.name}
        onSave={updateName}
        loading={loadingName}
      />
      <CustomInput
        label="Email"
        value={user.email}
        onSave={updateEmail}
        loading={loadingEmail}
        readOnly={true}
      />
    </div>
  );
};

// -------------------------------------------------------
// Password Section
// -------------------------------------------------------
const PasswordSecurityComponent = () => {
  const { token } = useAuth();

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handlePasswordUpdate = async () => {
    setError("");
    setSuccess("");

    if (!oldPassword || !newPassword) {
      setError("Both fields are required.");
      return;
    }

    try {
      setLoading(true);

      const res = await axios.put(
        `${API_BASE_URL}/api/profile/update-password`,
        {
          oldPassword,
          newPassword,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setSuccess("Password updated successfully!");

      // Clear fields
      setOldPassword("");
      setNewPassword("");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 lg:gap-[1.5vw]">

      {/* Old Password */}
      <CustomInput
        label="Old Password"
        value={oldPassword}
        type="password"
        placeholder="Enter current password..."
        onSave={(v) => setOldPassword(v)}
      />

      {/* New Password */}
      <CustomInput
        label="New Password"
        value={newPassword}
        type="password"
        placeholder="Enter new password..."
        onSave={(v) => setNewPassword(v)}
      />

      {/* Error Message */}
      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}

      {/* Success Message */}
      {success && (
        <p className="text-green-500 text-sm mt-1">{success}</p>
      )}

      {/* Submit Button */}
      <button
        onClick={handlePasswordUpdate}
        disabled={loading}
        className="mt-2 w-full bg-primary hover:bg-primary/90 text-white py-2 rounded-full transition"
      >
        {loading ? "Updating..." : "Update Password"}
      </button>
    </div>
  );
};

// -------------------------------------------------------
// Main Page
// -------------------------------------------------------
const ProfileSettingsPage = () => {
  const navigate = useNavigate();
  const { user, token, loading, refreshUser, logout } = useAuth();
  const reduceMotion = useReducedMotion();

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Fetch latest user from backend
  useEffect(() => {
    if (!loading && token) {
      refreshUser();
    }
  }, [loading, token, refreshUser]);

  if (loading) {
    return (
      <AppLayout>
        <AnimatedPage contentClassName="p-10">
          <div className="text-center text-text-primary">
            <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/60 px-4 py-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span>Loading settings...</span>
            </div>
          </div>
        </AnimatedPage>
      </AppLayout>
    );
  }

  if (!token) {
    return (
      <AppLayout>
        <AnimatedPage contentClassName="p-10">
          <div className="text-center text-text-primary">
            <p>Please log in to access settings.</p>
          </div>
        </AnimatedPage>
      </AppLayout>
    );
  }

  if (!user) {
    return (
      <AppLayout>
        <AnimatedPage contentClassName="p-10">
          <div className="text-center text-text-primary">Loading user data...</div>
        </AnimatedPage>
      </AppLayout>
    );
  }

  const accountTabs = [
    {
      title: "Profile Information",
      description: "Update your personal details",
      icon: ImagesPath.userCircleIcon,
      collapsedComponent: (
        <ProfileSettingsComponent
          user={user}
          token={token}
          refreshUser={refreshUser}
        />
      ),
    },
    {
      title: "Password & Security",
      description: "Manage your security preferences",
      icon: ImagesPath.passwordIcon,
      collapsedComponent: (
        <PasswordSecurityComponent />
      ),
    },
    {
      title: "Log Out",
      description: "Sign out of your account",
      onClick: () => setShowLogoutModal(true),
      icon: ImagesPath.logoutIcon,
      color: "#f6616a",
    },
  ];

  return (
    <AppLayout>
      <AnimatedPage contentClassName="pb-2">
        <ContentHeader
          title="Settings"
          description="Manage your account preferences"
          backButton
        />

        <div className="flex flex-col gap-6 max-w-full">
          <h2 className="font-size-28px font-poppins-semibold text-text-primary">Account</h2>

          <motion.div
            initial={reduceMotion ? false : "hidden"}
            animate={reduceMotion ? undefined : "show"}
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { staggerChildren: 0.08 } },
            }}
            className="flex flex-col gap-3"
          >
            {accountTabs.map((tab, idx) => (
              <motion.div
                key={tab.title}
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut", delay: idx * 0.02 } },
                }}
                whileHover={reduceMotion ? undefined : tab.onClick ? { y: -3 } : undefined}
                transition={{ type: "spring", stiffness: 240, damping: 18 }}
                className={`bg-card border border-border p-4 rounded-md ${tab.onClick
                    ? "cursor-pointer hover:bg-primary/5"
                    : ""
                  } transition-colors duration-200`}
                onClick={tab.onClick}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-text-primary">{tab.title}</h3>
                    <p className="text-text-secondary">{tab.description}</p>
                  </div>
                  <ChevronRight className="text-text-secondary" />
                </div>
                {tab.collapsedComponent}
              </motion.div>
            ))}
          </motion.div>
        </div>

        <ConfirmationModal
          isOpen={showLogoutModal}
          onClose={() => setShowLogoutModal(false)}
          onConfirm={logout}
          title="Confirm Logout"
          message="Are you sure you want to log out?"
          confirmText="Log Out"
          cancelText="Cancel"
          confirmColor="#f6616a"
        />
      </AnimatedPage>
    </AppLayout>
  );
};

export default ProfileSettingsPage;
