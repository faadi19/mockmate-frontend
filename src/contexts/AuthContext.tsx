import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config/api";
import { clearDemoMode } from "../utils/demoMode";

type User = {
  id: string;
  name: string;
  email: string;
  dob: string;
  citizenship: string;
  role?: string;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<User | null>;
  signup: (
    name: string,
    email: string,
    password: string,
    dob: string,
    citizenship: string
  ) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  handleGoogleAuthCallback: (token: string, user?: User) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Session timeout: 24 hours (in milliseconds)
  const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

  // Check if session is expired
  const isSessionExpired = (): boolean => {
    const lastActivity = localStorage.getItem("lastActivity");
    if (!lastActivity) return true;

    const lastActivityTime = parseInt(lastActivity, 10);
    const now = Date.now();
    return (now - lastActivityTime) > SESSION_TIMEOUT;
  };

  // Update last activity timestamp
  const updateLastActivity = () => {
    localStorage.setItem("lastActivity", Date.now().toString());
  };

  // Auto logout function
  const autoLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("lastActivity");
    setUser(null);
    setToken(null);
    window.location.href = "/login";
  };

  // Load from localStorage on refresh
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (savedToken) {
      setToken(savedToken);
      if (!localStorage.getItem("lastActivity")) {
        updateLastActivity();
      }
    }
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Failed to parse saved user:", e);
        localStorage.removeItem("user");
      }
    }
    setLoading(false);

    // Axios Interceptor for 401s
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Only logout if not already on login page to avoid loops
          if (!window.location.pathname.includes('/login')) {
            console.warn("Session expired or invalid token. Logging out.");
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            localStorage.removeItem("lastActivity");
            setUser(null);
            setToken(null);
            // Use window.location for hard redirect to clear state
            window.location.href = "/login";
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  // Track user activity and check session timeout
  useEffect(() => {
    if (!token) return;

    // Check session on mount (but don't logout on refresh)
    const checkSessionOnMount = () => {
      if (!localStorage.getItem("lastActivity")) {
        updateLastActivity();
      }
    };

    const checkTimer = setTimeout(checkSessionOnMount, 1000);

    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    let activityTimer: any; // Use any to avoid NodeJS type error

    const handleActivity = () => {
      if (!activityTimer) {
        activityTimer = setTimeout(() => {
          updateLastActivity();
          activityTimer = null;
        }, 5000); // Throttled: update once every 5 seconds
      }
    };

    // Add event listeners
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Removed aggressive setInterval auto-logout. 
    // We now rely on the 401 Interceptor to handle expired sessions from the backend.

    return () => {
      clearTimeout(checkTimer);
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (activityTimer) clearTimeout(activityTimer);
    };
  }, [token]);

  // 1️⃣ LOGIN
  const login = async (email: string, password: string) => {
    clearDemoMode();
    const res = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      email,
      password,
    });

    const token = res.data.token;
    const user = res.data.user;

    setToken(token);
    setUser(user);

    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    updateLastActivity(); // Set activity timestamp on login
    return user;
  };

  // 2️⃣ SIGNUP
  const signup = async (
    name: string,
    email: string,
    password: string,
    dob: string,
    citizenship: string
  ) => {
    clearDemoMode();
    const res = await axios.post(`${API_BASE_URL}/api/auth/register`, {
      name,
      email,
      password,
      dob,
      citizenship,
    });

    const token = res.data.token;
    const user = res.data.user;

    setToken(token);
    setUser(user);

    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    updateLastActivity(); // Set activity timestamp on signup
  };

  // 3️⃣ REFRESH USER DATA
  const refreshUser = async () => {
    const currentToken = token || localStorage.getItem("token");
    if (!currentToken) return;

    try {
      const res = await axios.get(`${API_BASE_URL}/api/profile/me`, {
        headers: { Authorization: `Bearer ${currentToken}` },
      });

      setUser(res.data.user);
      localStorage.setItem("user", JSON.stringify(res.data.user));
    } catch (error) {
      console.error("Failed to refresh user:", error);
    }
  };

  // 4️⃣ HANDLE GOOGLE OAUTH CALLBACK
  const handleGoogleAuthCallback = async (authToken: string, authUser?: User) => {
    clearDemoMode();
    setToken(authToken);
    localStorage.setItem("token", authToken);
    updateLastActivity();

    // If user is provided, use it; otherwise fetch from backend
    if (authUser) {
      setUser(authUser);
      localStorage.setItem("user", JSON.stringify(authUser));
    } else {
      // Fetch user data from backend
      try {
        const res = await axios.get(`${API_BASE_URL}/api/profile/me`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        setUser(res.data.user);
        localStorage.setItem("user", JSON.stringify(res.data.user));
      } catch (error) {
        console.error("Failed to fetch user data:", error);
        // Token is still saved, user can be fetched later
      }
    }
  };

  // 5️⃣ LOGOUT
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("lastActivity");

    setUser(null);
    setToken(null);

    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        loading,
        login,
        signup,
        logout,
        refreshUser,
        handleGoogleAuthCallback,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
