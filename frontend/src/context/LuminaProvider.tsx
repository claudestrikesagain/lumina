import type { ReactNode } from "react";
import { WalletProvider } from "./WalletContext";
import { PoolProvider } from "./PoolContext";
import { NoteVaultProvider } from "./NoteVaultContext";
import { ToastProvider } from "./ToastContext";
import { UIProvider } from "./UIContext";

/**
 * One wrapper that installs every context the app needs, in the right order.
 * Inner providers can read outer ones without re-implementing them.
 */
export function LuminaProvider({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <UIProvider>
        <WalletProvider>
          <PoolProvider>
            <NoteVaultProvider>{children}</NoteVaultProvider>
          </PoolProvider>
        </WalletProvider>
      </UIProvider>
    </ToastProvider>
  );
}