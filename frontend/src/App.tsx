import { useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { TourGuide } from "./components/TourGuide";
import { FeedbackModal } from "./components/FeedbackModal";
import { LandingPage } from "./pages/LandingPage";
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { OverviewPage } from "./pages/OverviewPage";
import { WalletPage } from "./pages/WalletPage";
import { DepositPage } from "./pages/DepositPage";
import { NotesPage } from "./pages/NotesPage";
import { ProofLabPage } from "./pages/ProofLabPage";
import { CompliancePage } from "./pages/CompliancePage";
import { LedgerPage } from "./pages/LedgerPage";
import { DevelopersPage } from "./pages/DevelopersPage";
import { AboutPage } from "./pages/AboutPage";
import { LuminaProvider } from "./context/LuminaProvider";
import { useUI, shouldAutoOpenTour } from "./context/UIContext";

/** Auto-opens the tour exactly once per browser. Mounted inside the provider. */
function TourAutoOpen() {
  const { openTour } = useUI();
  useEffect(() => {
    if (shouldAutoOpenTour()) openTour();
  }, [openTour]);
  return null;
}

/** Scrolls to top on every route change so the user is anchored. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <LuminaProvider>
      <BrowserRouter>
        <ScrollToTop />
        <TourAutoOpen />
        <AppShell>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/overview" element={<OverviewPage />} />
            <Route path="/wallet" element={<WalletPage />} />
            <Route path="/deposit" element={<DepositPage />} />
            <Route path="/notes" element={<NotesPage />} />
            <Route path="/proof-lab" element={<ProofLabPage />} />
            <Route path="/compliance" element={<CompliancePage />} />
            <Route path="/ledger" element={<LedgerPage />} />
            <Route path="/developers" element={<DevelopersPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<LandingPage />} />
          </Routes>
        </AppShell>
        <TourGuide />
        <FeedbackModal />
      </BrowserRouter>
    </LuminaProvider>
  );
}