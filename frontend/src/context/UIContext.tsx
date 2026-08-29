import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type UIState = {
  tourOpen: boolean;
  feedbackOpen: boolean;
  openTour: () => void;
  closeTour: () => void;
  openFeedback: () => void;
  closeFeedback: () => void;
};

const UIContext = createContext<UIState | null>(null);

const TOUR_SEEN_KEY = "lumina.tourSeen";

export function UIProvider({ children }: { children: ReactNode }) {
  const [tourOpen, setTourOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const openTour = useCallback(() => setTourOpen(true), []);
  const closeTour = useCallback(() => {
    setTourOpen(false);
    try {
      localStorage.setItem(TOUR_SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);
  const openFeedback = useCallback(() => setFeedbackOpen(true), []);
  const closeFeedback = useCallback(() => setFeedbackOpen(false), []);

  const value = useMemo<UIState>(
    () => ({ tourOpen, feedbackOpen, openTour, closeTour, openFeedback, closeFeedback }),
    [tourOpen, feedbackOpen, openTour, closeTour, openFeedback, closeFeedback],
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI(): UIState {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used inside <UIProvider>");
  return ctx;
}

export function shouldAutoOpenTour(): boolean {
  try {
    return localStorage.getItem(TOUR_SEEN_KEY) !== "1";
  } catch {
    return true;
  }
}