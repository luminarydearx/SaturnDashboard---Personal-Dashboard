"use client";

import BackupStatus from "@/components/ui/BackupStatus";

import { useState, useEffect } from "react";
import { PublicUser } from "@/types";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BannedScreen from "@/components/BannedScreen";
import StarBackground from "@/components/StarBackground";
import { ToastProvider } from "@/components/ui/Toast";
import { ThemeProvider } from "@/components/ui/ThemeContext";

interface Props {
  user: PublicUser;
  children: React.ReactNode;
}

export default function DashboardShell({ user, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // On mount, read persisted collapsed state from localStorage.
  useEffect(() => {
    try {
      const v = localStorage.getItem("sidebar-collapsed");
      if (v === "true") setCollapsed(true);
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = () => {
    setCollapsed((current: boolean) => {
      const newValue = !current;
      try {
        localStorage.setItem("sidebar-collapsed", newValue.toString());
      } catch {}
      return newValue;
    });
  };

  if (user.banned) {
    return (
      <>
        <StarBackground />
        {/* ✅ 3. Pass owner ke BannedScreen */}
        <BannedScreen user={user} />
      </>
    );
  }

  const sw = collapsed ? 68 : 260;

  return (
    <ThemeProvider>
      <ToastProvider>
        <StarBackground />
        {/* No z-index here - would trap fixed modals inside stacking context */}
        <div className="relative min-h-screen">
          <Sidebar
            user={user}
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            collapsed={collapsed}
            onToggleCollapse={toggle}
          />
          <style>{`
            .dashboard-content { margin-left: 0; }
            @media (min-width: 1024px) { .dashboard-content { margin-left: ${sw}px; } }
          `}</style>
          <div className="dashboard-content flex flex-col min-h-screen transition-all duration-300 ease-in-out">
            <Navbar
              user={user}
              onMenuClick={() => setMobileOpen(true)}
              onToggleSidebar={toggle}
            />
            <main className="flex-1 p-4 md:p-6 animate-fadeInUp">
              {children}
            </main>
            <Footer />
          </div>
        </div>
        {/* Auto-backup widget — only visible to owner */}
        {(user.role === "owner" || user.role === "co-owner") && <BackupStatus autoTrigger={true} />}
      </ToastProvider>
    </ThemeProvider>
  );
}
