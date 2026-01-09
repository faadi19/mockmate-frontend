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
import AdminRoute from './components/AdminRoute';
import ErrorBoundary from './components/ErrorBoundary';
import ToastHost from './components/ui/ToastHost';

// Admin Pages
import AdminDashboardPage from './pages/AdminDashboardPage';
import UserManagementPage from './pages/UserManagementPage';
import UserDetailPage from './pages/UserDetailPage';
import InterviewManagementPage from './pages/InterviewManagementPage';
import InterviewDetailPage from './pages/InterviewDetailPage';
import ViolationsPanel from './pages/ViolationsPanel';
import ReportsManagementPage from './pages/ReportsManagementPage';
import AiSettingsPage from './pages/AiSettingsPage';
import ContentManagementPage from './pages/ContentManagementPage';

import AdminLoginPage from './pages/AdminLoginPage';

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
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/verify-otp" element={<VerifyOtpPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />

            {/* User Private Routes */}
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

            {/* Admin Private Routes */}
            <Route path="/admin/dashboard" element={
              <AdminRoute>
                <AdminDashboardPage />
              </AdminRoute>
            } />
            <Route path="/admin/users" element={
              <AdminRoute>
                <UserManagementPage />
              </AdminRoute>
            } />
            <Route path="/admin/users/:id" element={
              <AdminRoute>
                <UserDetailPage />
              </AdminRoute>
            } />
            <Route path="/admin/interviews" element={
              <AdminRoute>
                <InterviewManagementPage />
              </AdminRoute>
            } />
            <Route path="/admin/interviews/:id" element={
              <AdminRoute>
                <InterviewDetailPage />
              </AdminRoute>
            } />
            <Route path="/admin/proctoring" element={
              <AdminRoute>
                <ViolationsPanel />
              </AdminRoute>
            } />
            <Route path="/admin/reports" element={
              <AdminRoute>
                <ReportsManagementPage />
              </AdminRoute>
            } />
            <Route path="/admin/settings" element={
              <AdminRoute>
                <AiSettingsPage />
              </AdminRoute>
            } />
            <Route path="/admin/content" element={
              <AdminRoute>
                <ContentManagementPage />
              </AdminRoute>
            } />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;