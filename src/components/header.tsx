"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

const navItems = [
  { href: "/", label: "Sessions" },
  { href: "/feed", label: "Feed" },
  { href: "/ledger", label: "Ledger" },
  { href: "/players", label: "Players" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-lg lg:max-w-7xl items-center gap-2 px-3 sm:px-4 lg:px-8">
        <Link
          href="/"
          className="shrink-0 font-semibold tracking-tight text-base sm:text-lg"
        >
          PokerHouse
        </Link>
        <nav className="ml-auto flex items-center gap-0.5 sm:gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors sm:px-2.5 sm:py-2 sm:text-sm",
                pathname === item.href
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {item.label}
            </Link>
          ))}
          <AnimatedThemeToggler />
        </nav>
      </div>
    </header>
  );
}
