import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Menu, X, Workflow, Plus, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import SidebarThemeToggle from "@/components/Layout/SidebarThemeToggle";
import { Logo } from "@/components/Logo";

const NAV_ITEMS = [
  { href: "/workflows", label: "Workflows", Icon: Workflow, exact: false },
  { href: "/workflows/new", label: "New Workflow", Icon: Plus, exact: true },
];

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Desktop sidebar collapse (persisted). Mobile uses the drawer (sidebarOpen).
  // Read localStorage after mount â€” SSR always renders expanded, so a lazy
  // initializer would cause a hydration mismatch for collapsed users.
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem("sidebarCollapsed") === "1") setCollapsed(true);
    } catch {}
  }, []);

  const isActive = (item) =>
    item.exact
      ? router.pathname === item.href
      : (router.pathname === item.href || router.pathname.startsWith(`${item.href}/`)) &&
        router.pathname !== "/workflows/new";

  const navLinkClass = (active) =>
    `nav-link font-secondary text-[13px] font-regular flex items-center gap-3 px-3 py-1.5 rounded transition-colors cursor-pointer ${
      active
        ? "bg-muted text-foreground dark:bg-white/[0.06] dark:text-foreground"
        : "hover:bg-muted/60 hover:text-foreground"
    }`;

  // Auto-close sidebar on mobile when route changes
  useEffect(() => {
    const handleRouteChange = () => setSidebarOpen(false);
    router.events.on("routeChangeStart", handleRouteChange);
    return () => router.events.off("routeChangeStart", handleRouteChange);
  }, [router.events]);

  const toggleCollapsed = () =>
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem("sidebarCollapsed", next ? "1" : "0");
      } catch (_) {}
      return next;
    });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-56 bg-card border-r border-border transform transition-all lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${
          collapsed
            ? "sidebar-collapsed lg:w-16 lg:[&_nav]:overflow-visible lg:[&_.nav-link]:justify-center"
            : "lg:w-56"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header: logo + collapse/expand controls */}
          <div
            className={`group flex items-center gap-3 h-16 border-b border-border justify-between px-6 ${
              collapsed ? "lg:justify-center lg:px-2" : ""
            }`}
          >
            <span className={`min-w-0 ${collapsed ? "lg:hidden" : ""}`}>
              <Logo className="text-base" />
            </span>
            {/* Desktop collapsed: expand */}
            <button
              onClick={toggleCollapsed}
              className={`hidden p-1.5 text-muted-foreground/50 hover:text-foreground hover:bg-muted rounded transition-colors ${
                collapsed ? "lg:inline-flex" : ""
              }`}
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen className="w-5 h-5" />
            </button>
            {/* Desktop expanded: collapse */}
            <button
              onClick={toggleCollapsed}
              className={`hidden flex-shrink-0 p-1.5 text-muted-foreground/50 hover:text-foreground hover:bg-muted rounded transition-colors ${
                collapsed ? "" : "lg:inline-flex"
              }`}
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="w-5 h-5" />
            </button>
            {/* Mobile: close drawer */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 -mr-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} className={navLinkClass(isActive(item))}>
                <item.Icon className="w-[18px] h-[18px] flex-shrink-0" />
                <span className={`nav-label font-medium ${collapsed ? "lg:hidden" : ""}`}>
                  {item.label}
                </span>
                <span className="nav-tip">{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Rail bottom: theme toggle */}
          <div className={`px-3 py-4 flex ${collapsed ? "lg:px-2 justify-center" : ""}`}>
            <SidebarThemeToggle />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div
        className={`flex flex-col h-screen supports-[height:100dvh]:h-dvh ${collapsed ? "lg:pl-16" : "lg:pl-56"}`}
      >
        {/* Mobile hamburger strip (hidden on desktop) */}
        <div className="fixed top-0 left-0 right-0 z-10 flex items-center h-16 border-b border-border bg-background lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex-shrink-0 p-2 ml-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
        <main className="flex-1 min-h-0 overflow-y-auto pt-16 lg:pt-6">{children}</main>
      </div>
    </div>
  );
}
