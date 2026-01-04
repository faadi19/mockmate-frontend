import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import InterviewSetupPage from './pages/InterviewSetupPage';
import PerformancePage from './pages/PerformancePage';
import HelpPage from './pages/HelpPage';
import ProfileSettingsPage from './pages/ProfileSettingsPage';
import ProfileInfoPage from './pages/ProfileInfoPage';
import InterviewChatPage from './pages/InterviewChatPage';
import InterviewFeedbackPage from './pages/InterviewFeedbackPage';
import UploadResumePage from './pages/UploadResumePage';
import GoogleCallbackPage from './pages/GoogleCallbackPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import VerifyOtpPage from './pages/VerifyOtpPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ReportsPage from './pages/ReportsPage';
import ReportDetailPage from './pages/ReportDetailPage';
import ReportsComparePage from './pages/ReportsComparePage';
import PrivateRoute from './components/PrivateRoute';
import ErrorBoundary from './components/ErrorBoundary';
import ToastHost from './components/ui/ToastHost';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <ToastHost />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/verify-otp" element={<VerifyOtpPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
            <Route path="/dashboard" element={
              <PrivateRoute>
                <ErrorBoundary>
                  <DashboardPage />
                </ErrorBoundary>
              </PrivateRoute>
            } />
            <Route path="/interview-setup" element={
              <PrivateRoute>
                <InterviewSetupPage />
              </PrivateRoute>
            } />
            <Route path="/upload-resume" element={
              <PrivateRoute>
                <UploadResumePage />
              </PrivateRoute>
            } />
            <Route path="/performance" element={
              <PrivateRoute>
                <PerformancePage />
              </PrivateRoute>
            } />
            <Route path="/help" element={
              <PrivateRoute>
                <HelpPage />
              </PrivateRoute>
            } />
            <Route path="/profile-settings" element={
              <PrivateRoute>
                <ProfileSettingsPage />
              </PrivateRoute>
            } />
            <Route path="/profile-info" element={
              <PrivateRoute>
                <ProfileInfoPage />
              </PrivateRoute>
            } />
            <Route path="/interview-chat" element={
              <PrivateRoute>
                <InterviewChatPage />
              </PrivateRoute>
            } />
            <Route path="/interview-feedback" element={
              <PrivateRoute>
                <InterviewFeedbackPage />
              </PrivateRoute>
            } />
            <Route path="/reports" element={
              <PrivateRoute>
                <ReportsPage />
              </PrivateRoute>
            } />
            <Route path="/reports/compare" element={
              <PrivateRoute>
                <ReportsComparePage />
              </PrivateRoute>
            } />
            <Route path="/reports/:id" element={
              <PrivateRoute>
                <ReportDetailPage />
              </PrivateRoute>
            } />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;