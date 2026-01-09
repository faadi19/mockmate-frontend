import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface AdminRouteProps {
    children: ReactNode;
}

const AdminRoute = ({ children }: AdminRouteProps) => {
    const { user, loading, isAuthenticated } = useAuth();

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    // Check if authenticated AND user has admin role
    if (!isAuthenticated || user?.role !== 'admin') {
        return <Navigate to="/admin/login" state={{ from: window.location.pathname }} replace />;
    }

    return <>{children}</>;
};

export default AdminRoute;
