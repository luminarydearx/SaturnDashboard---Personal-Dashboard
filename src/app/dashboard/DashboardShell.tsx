"use client";

import { useState, useEffect } from "react";
import { PublicUser } from "@/types";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BannedScreen from "@/components/BannedScreen";
import StarBackground from "@/components/StarBackground";
import { ThemeProvider } from "@/components/ui/ThemeContext";
import SettingsModal from "@/components/ui/SettingsModal";
// NOTE: ToastProvider is NOT imported here — layout.tsx provides it globally.

interface Props {
  user: PublicUser;
  children: React.ReactNode;
}

export default function DashboardShell({ user, children }: Props) {
  const [mobileOpen,    setMobileOpen]    = useState(false);
  const [collapsed,     setCollapsed]     = useState(false);
  const [settingsOpen,  setSettingsOpen]  = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem("sidebar-collapsed");
      if (v === "true") setCollapsed(true);
    } catch {}
  }, []);

  const toggle = () => {
    setCollapsed(cur => {
      const next = !cur;
      try { localStorage.setItem("sidebar-collapsed", String(next)); } catch {}
      return next;
    });
  };

  if (user.banned) {
    return (
      <>
        <StarBackground />
        <BannedScreen user={user} />
      </>
    );
  }

  const sw = collapsed ? 68 : 260;

  return (
    <ThemeProvider>
      <StarBackground />
      <div className="relative min-h-screen">
        <Sidebar
          user={user}
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          collapsed={collapsed}
          onToggleCollapse={toggle}
          onOpenSettings={() => setSettingsOpen(true)}
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
    </ThemeProvider>
  );
}
