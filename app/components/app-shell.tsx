"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ClipboardList,
  LayoutDashboard,
  Search,
  Settings,
  Sun,
  Moon,
  Warehouse,
} from "lucide-react";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";
type Language = "en" | "ar";

type AppPreferences = {
  theme: Theme;
  language: Language;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
};

const PreferencesContext = createContext<AppPreferences | null>(null);

export function useAppPreferences() {
  const preferences = useContext(PreferencesContext);
  if (!preferences) throw new Error("useAppPreferences must be used inside AppShell");
  return preferences;
}

const translations = {
  en: {
    dashboard: "Dashboard",
    projects: "Inventory",
    settings: "Settings",
    workspace: "WORKSPACE",
    search: "Search inventory...",
    notifications: "Notifications",
    today: "Thursday, November 6, 2026",
    account: "Warehouse team",
    role: "Operations",
  },
  ar: {
    dashboard: "لوحة المعلومات",
    projects: "المخزون",
    settings: "الإعدادات",
    workspace: "مساحة العمل",
    search: "ابحث في المخزون...",
    notifications: "الإشعارات",
    today: "الخميس، ٦ نوفمبر ٢٠٢٦",
    account: "فريق المستودع",
    role: "العمليات",
  },
} as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<Theme>("light");
  const [language, setLanguage] = useState<Language>("en");
  const [ready, setReady] = useState(false);
  const copy = translations[language];

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("stockly-theme");
    const savedLanguage = window.localStorage.getItem("stockly-language");
    if (savedTheme === "dark" || savedTheme === "light") setTheme(savedTheme);
    if (savedLanguage === "ar" || savedLanguage === "en") setLanguage(savedLanguage);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem("stockly-theme", theme);
    window.localStorage.setItem("stockly-language", language);
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [theme, language, ready]);

  const activePage = pathname.startsWith("/Inventory") || pathname.startsWith("/Projects")
    ? "projects"
    : pathname.startsWith("/Setting")
      ? "settings"
      : "dashboard";

  const navItems = [
    { key: "dashboard", href: "/", icon: LayoutDashboard, label: copy.dashboard },
    { key: "projects", href: "/Inventory", icon: ClipboardList, label: copy.projects },
    { key: "settings", href: "/Setting", icon: Settings, label: copy.settings },
  ];

  return (
    <PreferencesContext.Provider value={{ theme, language, setTheme, setLanguage }}>
      <div className="app-shell">
        <aside className="sidebar">
          <Link className="brand" href="/" aria-label="Stockly dashboard">
            <span className="brand-mark"><Warehouse size={19} strokeWidth={2.2} /></span>
            <span>stockly<span className="brand-period">.</span></span>
          </Link>

          <div className="workspace-label">{copy.workspace}</div>
          <nav className="side-nav" aria-label={copy.workspace}>
            {navItems.map(({ key, href, icon: Icon, label }) => (
              <Link
                key={key}
                href={href}
                className={`nav-link${activePage === key ? " active" : ""}`}
                aria-current={activePage === key ? "page" : undefined}
              >
                <Icon size={18} strokeWidth={1.8} />
                <span>{label}</span>
                {key === "dashboard" && <span className="nav-dot" />}
              </Link>
            ))}
          </nav>

        </aside>

        <div className="main-column">
          <header className="topbar">
            <div className="breadcrumbs"><span>Stockly</span><span className="breadcrumb-slash">/</span><strong>{copy[activePage]}</strong></div>
            <div className="topbar-actions">
              <span className="date-label">{copy.today}</span>
              <label className="search-box">
                <Search size={16} />
                <input aria-label={copy.search} placeholder={copy.search} />
                <kbd>/</kbd>
              </label>
              <button className="icon-button notification-button" type="button" aria-label={copy.notifications}>
                <Bell size={18} />
                <span className="notification-dot" />
              </button>
            </div>
          </header>
          <main className="page-content">{children}</main>
        </div>
      </div>
    </PreferencesContext.Provider>
  );
}

export function ThemeGlyph({ value }: { value: Theme }) {
  return value === "light" ? <Sun size={17} /> : <Moon size={17} />;
}