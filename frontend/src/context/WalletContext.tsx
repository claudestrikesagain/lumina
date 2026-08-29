import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit/sdk";
import { Networks } from "@creit.tech/stellar-wallets-kit/types";
import { AlbedoModule } from "@creit.tech/stellar-wallets-kit/modules/albedo";
import { FreighterModule } from "@creit.tech/stellar-wallets-kit/modules/freighter";
import { LobstrModule } from "@creit.tech/stellar-wallets-kit/modules/lobstr";
import { RabetModule } from "@creit.tech/stellar-wallets-kit/modules/rabet";
import { xBullModule } from "@creit.tech/stellar-wallets-kit/modules/xbull";
import { NETWORK_PASSPHRASE, type Signer } from "../lib/contract";
import { AppError, classifyWalletError, errorLabel } from "../lib/errors";

const STORAGE_KEY = "lumina.walletId";

let initialized = false;
function ensureInit() {
  if (initialized) return;
  StellarWalletsKit.init({
    network: Networks.TESTNET,
    modules: [
      new FreighterModule(),
      new xBullModule(),
      new AlbedoModule(),
      new RabetModule(),
      new LobstrModule(),
    ],
  });
  initialized = true;
}

type WalletState = {
  address: string | null;
  network: string | null;
  walletId: string | null;
  busy: boolean;
  error: AppError | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  sign: Signer;
  /** human-readable label for the current error, or null */
  errorLabel: string | null;
};

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [network, setNetwork] = useState<string | null>(null);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  ensureInit();

  const readNetwork = useCallback(async () => {
    const net = await StellarWalletsKit.getNetwork();
    setNetwork(net.network ?? null);
    if (net.networkPassphrase && net.networkPassphrase !== NETWORK_PASSPHRASE) {
      setError(
        new AppError(
          "network",
          `Your wallet is on "${net.networkPassphrase}" but this app targets "${NETWORK_PASSPHRASE}". Switch your wallet to Testnet.`,
        ),
      );
    }
  }, []);

  const connect = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await StellarWalletsKit.authModal();
      const { address: addr } = await StellarWalletsKit.getAddress();
      if (!addr) throw new Error("Wallet returned no address.");
      const id = StellarWalletsKit.selectedModule?.productId ?? null;
      setAddress(addr);
      setWalletId(id);
      if (id) localStorage.setItem(STORAGE_KEY, id);
      await readNetwork();
    } catch (e) {
      setAddress(null);
      setError(classifyWalletError(e));
    } finally {
      setBusy(false);
    }
  }, [readNetwork]);

  const disconnect = useCallback(async () => {
    try {
      await StellarWalletsKit.disconnect();
    } catch {
      /* best-effort */
    }
    localStorage.removeItem(STORAGE_KEY);
    setAddress(null);
    setNetwork(null);
    setWalletId(null);
    setError(null);
  }, []);

  // Restore a previously selected wallet's session on reload, best-effort.
  useEffect(() => {
    const savedId = localStorage.getItem(STORAGE_KEY);
    if (!savedId) return;
    let cancelled = false;
    (async () => {
      try {
        StellarWalletsKit.setWallet(savedId);
        const { address: addr } = await StellarWalletsKit.getAddress();
        if (cancelled || !addr) return;
        setAddress(addr);
        setWalletId(savedId);
        await readNetwork();
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [readNetwork]);

  const sign = useCallback<Signer>(
    async (xdrString: string) => {
      try {
        const res = await StellarWalletsKit.signTransaction(xdrString, {
          networkPassphrase: NETWORK_PASSPHRASE,
          address: address ?? undefined,
        });
        if (!res.signedTxXdr) throw new Error("Wallet returned no signed transaction.");
        return res.signedTxXdr;
      } catch (e) {
        throw classifyWalletError(e);
      }
    },
    [address],
  );

  const value = useMemo<WalletState>(
    () => ({
      address,
      network,
      walletId,
      busy,
      error,
      errorLabel: error ? errorLabel[error.kind] : null,
      connect,
      disconnect,
      sign,
    }),
    [address, network, walletId, busy, error, connect, disconnect, sign],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWalletContext(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWalletContext must be used inside <WalletProvider>");
  return ctx;
}