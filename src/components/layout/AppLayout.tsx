import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

interface AppLayoutProps {
  children: ReactNode;
  mainClassName?: string;
  fixLayout?: boolean;
}

const AppLayout = ({
  children,
  mainClassName,
  fixLayout = false,
}: AppLayoutProps) => {
  return (
    <div className="flex h-screen bg-background text-text-primary overflow-x-hidden">
      <Sidebar />
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

      {/* Logout Confirmation Modal */}
    </div>
  );
};

export default AppLayout;
