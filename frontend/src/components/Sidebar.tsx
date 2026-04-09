"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Upload,
  MessageSquare,
  LogOut,
  Brain,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/chat", label: "AI Chat", icon: MessageSquare },
];

export default function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside
      className={`fixed left-0 top-0 z-40 flex h-screen flex-col border-r transition-all duration-300 ${
        collapsed ? "w-[72px]" : "w-[240px]"
      }`}
      style={{
        background: "var(--bg-secondary)",
        borderColor: "var(--border-subtle)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6">
        <div
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
          style={{ background: "var(--gradient-brand)" }}
        >
          <Brain className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
            Meeting Hub
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="mt-2 flex-1 space-y-1 px-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                active
                  ? "text-white"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
              style={{
                background: active ? "var(--brand-glow)" : "transparent",
                borderLeft: active
                  ? "3px solid var(--brand-primary)"
                  : "3px solid transparent",
              }}
              title={collapsed ? label : undefined}
            >
              <Icon
                className={`h-5 w-5 flex-shrink-0 transition-colors ${
                  active ? "text-[var(--brand-hover)]" : ""
                }`}
              />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t px-3 py-4" style={{ borderColor: "var(--border-subtle)" }}>
        {!collapsed && user && (
          <div className="mb-3 px-3">
            <p className="text-xs font-medium text-[var(--text-primary)] truncate">
              {user.full_name}
            </p>
            <p className="text-xs text-[var(--text-muted)] truncate">{user.email}</p>
          </div>
        )}
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--text-muted)] transition-all hover:bg-[var(--bg-elevated)] hover:text-[var(--accent-red)]"
          title="Logout"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border text-xs transition-all hover:scale-110"
        style={{
          background: "var(--bg-card)",
          borderColor: "var(--border-subtle)",
          color: "var(--text-muted)",
        }}
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>
    </aside>
  );
}
