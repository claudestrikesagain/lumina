import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  describeError,
  getAspRoot,
  getRoot,
  isDeployed,
} from "../lib/contract";

type PoolState = {
  root: string | null;
  aspRoot: string | null;
  /** version counter — bumped on every successful read so consumers can re-render */
  version: number;
  loading: boolean;
  error: string | null;
  /** Trigger an immediate re-read (e.g. after a deposit lands). */
  refresh: () => Promise<void>;
};

const PoolContext = createContext<PoolState | null>(null);

const POLL_MS = 30_000;

export function PoolProvider({ children }: { children: ReactNode }) {
  const [root, setRoot] = useState<string | null>(null);
  const [aspRoot, setAspRoot] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const aliveRef = useRef(true);

  const load = useCallback(async () => {
    if (!isDeployed()) {
      setRoot(null);
      setAspRoot(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [r, a] = await Promise.all([getRoot(), getAspRoot()]);
      if (!aliveRef.current) return;
      setRoot(r);
      setAspRoot(a);
      setVersion((v) => v + 1);
    } catch (e) {
      if (!aliveRef.current) return;
      setRoot(null);
      setAspRoot(null);
      setError(describeError(e));
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    void load();
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => {
      aliveRef.current = false;
      window.clearInterval(id);
    };
  }, [load]);

  const value = useMemo<PoolState>(
    () => ({ root, aspRoot, version, loading, error, refresh: load }),
    [root, aspRoot, version, loading, error, load],
  );

  return <PoolContext.Provider value={value}>{children}</PoolContext.Provider>;
}

export function usePoolContext(): PoolState {
  const ctx = useContext(PoolContext);
  if (!ctx) throw new Error("usePoolContext must be used inside <PoolProvider>");
  return ctx;
}