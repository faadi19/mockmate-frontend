import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { handleGoogleAuth, type GoogleAuthMode } from '../utils/auth';

type ErrorUi = {
  title: string;
  message: string;
  primaryCta: { label: string; onClick: () => void };
  secondaryCta?: { label: string; onClick: () => void };
};

const GoogleCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleGoogleAuthCallback } = useAuth();
  const [errorUi, setErrorUi] = useState<ErrorUi | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get token from query parameters (support multiple param names + URL hash)
        const hashParams = new URLSearchParams(
          typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : ''
        );

        const token =
          searchParams.get('token') ||
          searchParams.get('authToken') ||
          searchParams.get('access_token') ||
          searchParams.get('jwt') ||
          searchParams.get('id_token') ||
          hashParams.get('token') ||
          hashParams.get('authToken') ||
          hashParams.get('access_token') ||
          hashParams.get('jwt') ||
          hashParams.get('id_token');

        // Backend may also send a 'message' on redirect; treat it as informational (not an error).
        const messageParam = searchParams.get('message');

        // Only treat real error fields as errors.
        const errorParam = searchParams.get('error') || searchParams.get('error_description');

        const getMode = (): GoogleAuthMode | null => {
          const qsMode = searchParams.get('mode');
          if (qsMode === 'login' || qsMode === 'signup') return qsMode;
          try {
            const stored = sessionStorage.getItem('googleAuthMode');
            if (stored === 'login' || stored === 'signup') return stored;
          } catch {
            // ignore
          }
          return null;
        };

        const decodeParam = (val: string) => {
          const plusFixed = val.replace(/\+/g, ' ');
          try {
            return decodeURIComponent(plusFixed);
          } catch {
            return plusFixed;
          }
        };

        const buildErrorUi = (raw: string, mode: GoogleAuthMode | null): ErrorUi => {
          const decoded = decodeParam(raw).trim();
          const normalized = decoded.toLowerCase();

          const goLogin = () => navigate('/login', { replace: true });
          const goSignup = () => navigate('/signup', { replace: true });
          const retry = () => void handleGoogleAuth(mode ?? 'login');

          // 1) User already exists / already registered (common during signup)
          const alreadyExists =
            /already/.test(normalized) &&
            (/(exist|exists|registered|signup|sign up|account)/.test(normalized) || /(user|email)/.test(normalized));

          if (alreadyExists) {
            return {
              title: 'Account already exists',
              message:
                "Looks like you’ve already signed up with this email. Please sign in instead.",
              primaryCta: { label: 'Go to Login', onClick: goLogin },
              secondaryCta: { label: 'Try Again', onClick: retry },
            };
          }

          // 2) No account found (common during login)
          const notFound = /(not found|no user|doesn'?t exist|does not exist)/.test(normalized);
          if (notFound) {
            return {
              title: 'Account not found',
              message:
                "We couldn’t find an account for this Google email. Please sign up first.",
              primaryCta: { label: 'Go to Signup', onClick: goSignup },
              secondaryCta: { label: 'Try Again', onClick: retry },
            };
          }

          // 3) User cancelled / denied consent
          const cancelled = /(access_denied|denied|cancel|cancelled|canceled)/.test(normalized);
          if (cancelled) {
            return {
              title: 'Sign-in cancelled',
              message: 'You cancelled Google authentication. Please try again when ready.',
              primaryCta: { label: 'Try Again', onClick: retry },
              secondaryCta: { label: 'Go Back', onClick: () => navigate(-1) },
            };
          }

          // 4) Fallback: keep it user-friendly, but if backend sent a short non-technical message, show it.
          const looksTechnical =
            /(typeerror|referenceerror|syntaxerror|stack|at\s+\w|\bnext\b|\bfunction\b)/i.test(decoded) ||
            decoded.length > 180;

          return {
            title: 'Authentication failed',
            message: looksTechnical
              ? 'Authentication failed. Please try again or sign in with email and password.'
              : decoded,
            primaryCta: { label: mode === 'signup' ? 'Go to Signup' : 'Go to Login', onClick: mode === 'signup' ? goSignup : goLogin },
            secondaryCta: { label: 'Try Again', onClick: retry },
          };
        };

        // Check for error from backend (decode URL-encoded error)
        if (errorParam) {
          setErrorUi(buildErrorUi(errorParam, getMode()));
          setLoading(false);
          return;
        }

        // Check if token exists
        if (!token) {
          // If backend said "success" but token isn't present, show a clearer message.
          const msg = messageParam ? decodeParam(messageParam).trim() : '';
          const looksSuccess = /\bsuccess\b/i.test(msg);

          setErrorUi(
            looksSuccess
              ? {
                  title: 'Login completed, but session was not created',
                  message:
                    'Google authentication succeeded, but we did not receive a login token from the server. Please try again.',
                  primaryCta: { label: 'Try Again', onClick: () => void handleGoogleAuth(getMode() ?? 'login') },
                  secondaryCta: { label: 'Go to Login', onClick: () => navigate('/login', { replace: true }) },
                }
              : {
                  title: 'Authentication failed',
                  message: 'No authentication token received. Please try again.',
                  primaryCta: { label: 'Go to Login', onClick: () => navigate('/login', { replace: true }) },
                  secondaryCta: { label: 'Try Again', onClick: () => void handleGoogleAuth(getMode() ?? 'login') },
                }
          );
          setLoading(false);
          return;
        }

        // Handle Google OAuth callback - saves token and fetches user
        await handleGoogleAuthCallback(token);

        // Redirect to dashboard using navigate (React Router v6)
        navigate('/dashboard', { replace: true });
      } catch (err: any) {
        console.error('Google OAuth callback error:', err);
        setErrorUi({
          title: 'Authentication failed',
          message: 'An error occurred during authentication. Please try again.',
          primaryCta: { label: 'Go to Login', onClick: () => navigate('/login', { replace: true }) },
          secondaryCta: { label: 'Try Again', onClick: () => void handleGoogleAuth('login') },
        });
        setLoading(false);
      }
    };

    handleCallback();
  }, [searchParams, navigate, handleGoogleAuthCallback]);

  return (
    <div className="relative bg-background min-h-screen flex items-center justify-center">
      <div className="w-[120vw] absolute top-[-30vh] left-[-5vw] h-[40vh] bg-gradient-to-r from-primary/80 to-secondary/80 rotate-[-6deg] custom-shadow"></div>
      
      <motion.div
        className="relative z-10 w-full max-w-md p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {loading && !errorUi && (
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mb-4"></div>
            <h2 className="font-size-24px font-poppins-semibold text-text-primary mb-2">
              Completing authentication...
            </h2>
            <p className="font-size-16px font-poppins-regular text-text-secondary">
              Please wait while we sign you in.
            </p>
          </div>
        )}

        {errorUi && (
          <div className="text-center">
            <div className="mb-4">
              <svg
                className="mx-auto h-12 w-12 text-error"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="font-size-24px font-poppins-semibold text-text-primary mb-2">
              {errorUi.title}
            </h2>
            <p className="font-size-16px font-poppins-regular text-error mb-6">
              {errorUi.message}
            </p>
            <div className="flex gap-4 justify-center">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  errorUi.primaryCta.onClick();
                }}
                className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors font-poppins-medium shadow-sm"
              >
                {errorUi.primaryCta.label}
              </button>
              {errorUi.secondaryCta && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    errorUi.secondaryCta?.onClick();
                  }}
                  className="px-6 py-2 border border-border text-text-primary rounded-md hover:bg-primary/10 transition-colors font-poppins-medium"
                >
                  {errorUi.secondaryCta.label}
                </button>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default GoogleCallbackPage;

