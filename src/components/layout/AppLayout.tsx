import { ReactNode, useState } from "react";
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="flex h-screen bg-background text-text-primary overflow-x-hidden relative">
      {/* Sidebar - Desktop: fixed, Mobile: absolute/fixed with overlay */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0 lg:static transition-transform duration-300 ease-in-out`}
      >
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      </div>

      {/* Backdrop for mobile sidebar */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden relative">
        {fixLayout ? (
          <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
            <Header onMenuClick={toggleSidebar} />
            <div className="flex-1 relative overflow-x-hidden">
              <div
                className={`absolute top-0 left-0 right-0 bottom-0 overflow-y-auto overflow-x-hidden px-4 lg:px-[2vw] pb-4 lg:pb-[2vw] ${mainClassName}`}
              >
                {children}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
            <div className="flex-1 relative overflow-x-hidden">
              <div
                className={`absolute top-0 left-0 right-0 bottom-0 overflow-y-auto overflow-x-hidden scrollbar-hide ${mainClassName}`}
              >
                <Header onMenuClick={toggleSidebar} />
                <div className="px-4 lg:px-[2vw] pb-4 lg:pb-[2vw] max-w-full">
                  {children}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AppLayout;
