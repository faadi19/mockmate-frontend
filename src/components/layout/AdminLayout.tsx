import { ReactNode } from "react";
import AdminSidebar from "./AdminSidebar";
import Header from "./Header";

interface AdminLayoutProps {
    children: ReactNode;
    mainClassName?: string;
    fixLayout?: boolean;
}

const AdminLayout = ({
    children,
    mainClassName,
    fixLayout = false,
}: AdminLayoutProps) => {
    return (
        <div className="flex h-screen bg-background text-text-primary overflow-x-hidden">
            <AdminSidebar />
            {fixLayout ? (
                <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
                    <Header />
                    <div className="flex-1 relative overflow-x-hidden">
                        <div
                            className={`absolute top-0 left-0 right-0 bottom-0 overflow-y-auto overflow-x-hidden px-4 lg:px-[2vw] pb-4 lg:pb-[2vw] ${mainClassName}`}
                        >
                            {children}
                        </div>
                    </div>
                </main>
            ) : (
                <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
                    <div className="flex-1 relative overflow-x-hidden">
                        <div
                            className={`absolute top-0 left-0 right-0 bottom-0 overflow-y-auto overflow-x-hidden scrollbar-hide ${mainClassName}`}
                        >
                            <Header />
                            <div className="px-4 lg:px-[2vw] pb-4 lg:pb-[2vw] max-w-full">{children}</div>
                        </div>
                    </div>
                </main>
            )}
        </div>
    );
};

export default AdminLayout;
