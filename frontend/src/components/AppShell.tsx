import type { ReactNode } from "react";
import { Header } from "./Header";
import { Sidebar, MobileNav } from "./Sidebar";
import { ToastStack } from "./ToastStack";

/**
 * Top-level layout: header on top, sidebar on the left, content area on the
 * right. Footer is part of the content area so pages can compose above it.
 * ToastStack is mounted globally so any context can fire toasts.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 min-w-0">
          <MobileNav />
          <div className="mx-auto max-w-report px-6 md:px-10 lg:px-14 py-8 lg:py-12 animate-fade-in">
            {children}
          </div>
          <footer className="rule-top py-6 mt-12">
            <div className="mx-auto max-w-report px-6 md:px-10 lg:px-14 flex flex-wrap gap-x-8 gap-y-2 text-[11px] text-inkFaint">
              <span>Lumina pool client</span>
              <span>Poseidon2 + BN254 verification pending CAP-0074 / CAP-0075</span>
              <span>No funds are custodied by this interface</span>
            </div>
          </footer>
        </main>
      </div>
      <ToastStack />
    </div>
  );
}