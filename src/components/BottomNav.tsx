// src/components/BottomNav.tsx
import React from "react";
import { useLocation, Link } from "wouter";
import {
  CalendarDays,
  CalendarPlus,
  Users,
  TrendingUp,
  GraduationCap,
} from "lucide-react";

export default function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    {
      href: "/calendar",
      label: "Calendario",
      icon: CalendarDays,
      match: (loc: string) => loc === "/" || loc.startsWith("/calendar"),
    },
    {
      href: "/appointments",
      label: "Turnos",
      icon: CalendarPlus,
      match: (loc: string) => loc.startsWith("/appointments"),
    },
    {
      href: "/clients",
      label: "Clientas",
      icon: Users,
      match: (loc: string) => loc.startsWith("/clients"),
    },
    {
      href: "/stats",
      label: "Balances",
      icon: TrendingUp,
      match: (loc: string) => loc.startsWith("/stats"),
    },
    {
      href: "/faculty",
      label: "Facultad",
      icon: GraduationCap,
      match: (loc: string) => loc.startsWith("/faculty"),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 glass-nav border-t border-[#EED7E2]/80 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] pt-2 px-3">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = item.match(location);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-200 ${
                isActive
                  ? "text-[#D48C9E] font-extrabold"
                  : "text-[#826F84] hover:text-[#2E1E2F] font-semibold"
              }`}
            >
              {isActive && (
                <span className="absolute inset-0 bg-[#FBF0F4] rounded-2xl -z-10 animate-fade-in border border-[#EED7E2]/50" />
              )}
              <Icon
                className={`w-5 h-5 transition-transform duration-200 ${
                  isActive ? "scale-110 stroke-[2.4]" : "stroke-[1.9]"
                }`}
              />
              <span className="text-[10px] tracking-tight mt-1 leading-none">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
