"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PublicUser } from "@/types";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BannedScreen from "@/components/BannedScreen";
import StarBackground from "@/components/StarBackground";
import { ThemeProvider } from "@/components/ui/ThemeContext";
import SettingsModal from "@/components/ui/SettingsModal";
import { loadShortcuts, matchesShortcut } from "@/lib/shortcuts";

interface Props {
  user: PublicUser;
  children: React.ReactNode;
}

export default function DashboardShell({ user, children }: Props) {
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [collapsed,    setCollapsed]    = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const router = useRouter();

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

  // Global keyboard shortcuts (logout, open settings) — dynamic from localStorage
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag    = (e.target as HTMLElement)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable;
      if (typing) return;

      const sc = loadShortcuts(user.id);

      if (matchesShortcut(e, sc.logout)) {
        e.preventDefault();
        fetch("/api/auth/logout", { method: "POST" }).catch(() => {}).finally(() => { window.location.href = "/login"; });
      }
      if (matchesShortcut(e, sc.openSettings)) {
        e.preventDefault();
        setSettingsOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [router]);

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

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        user={user}
      />
    </ThemeProvider>
  );
}
