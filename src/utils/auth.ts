import axios, { AxiosInstance } from 'axios';
import { API_BASE_URL } from '../config/api';

export type GoogleAuthMode = 'login' | 'signup';

/**
 * Get the stored authentication token from localStorage
 */
export const getToken = (): string | null => {
  return localStorage.getItem('token');
};

/**
 * Save the authentication token to localStorage
 */
export const setToken = (token: string): void => {
  localStorage.setItem('token', token);
};

/**
 * Remove the authentication token from localStorage
 */
export const removeToken = (): void => {
  localStorage.removeItem('token');
};

/**
 * Get the stored user data from localStorage
 */
export const getUser = (): any | null => {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};

/**
 * Save user data to localStorage
 */
export const setUser = (user: any): void => {
  localStorage.setItem('user', JSON.stringify(user));
};

/**
 * Remove user data from localStorage
 */
export const removeUser = (): void => {
  localStorage.removeItem('user');
};

/**
 * Create an axios instance with Authorization header automatically attached
 * Use this for authenticated API calls
 */
export const getAuthenticatedAxios = (): AxiosInstance => {
  const token = getToken();

  const instance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Add Authorization header if token exists
  if (token) {
    instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  // Request interceptor to add token to each request
  instance.interceptors.request.use(
    (config) => {
      const currentToken = getToken();
      if (currentToken) {
        config.headers.Authorization = `Bearer ${currentToken}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  return instance;
};

/**
 * Get the base axios instance (without auth headers)
 * Use this for unauthenticated API calls
 */
export const getAxios = (): AxiosInstance => {
  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

/**
 * Handle Google OAuth redirect
 * Redirects to backend OAuth start endpoint
 */
export const handleGoogleAuth = async (
  mode: GoogleAuthMode,
  redirectUri: string = 'http://localhost:5173/auth/google/callback'
): Promise<void> => {
  // Remember what the user intended (login vs signup) so the callback page can show the right UX.
  // sessionStorage keeps it per-tab and clears on tab close.
  try {
    sessionStorage.setItem('googleAuthMode', mode);
  } catch {
    // ignore storage errors (e.g., blocked third-party cookies/storage)
  }

  const params = new URLSearchParams({
    mode,
    redirect_uri: redirectUri,
  });

  // Option A: Simple direct redirect
  window.location.href = `${API_BASE_URL}/api/auth/google/start?${params.toString()}`;

  // Option B: Fetch URL from backend then redirect (uncomment if backend requires this)
  // try {
  //   const response = await axios.get(`${API_BASE_URL}/api/auth/google/start`, {
  //     params: {
  //       mode,
  //       redirect_uri: redirectUri
  //     }
  //   });
  //   if (response.data?.url) {
  //     window.location.href = response.data.url;
  //   } else {
  //     throw new Error('No URL received from backend');
  //   }
  // } catch (error) {
  //   console.error('Failed to get Google auth URL:', error);
  //   throw error;
  // }
};

