import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useLenis } from "@/hooks/useLenis";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Gigs from "./pages/Gigs";
import GigDetail from "./pages/GigDetail";
import PostGig from "./pages/PostGig";
import Profile from "./pages/Profile";
import PublicProfile from "./pages/PublicProfile";
import PaymentCallback from "./pages/PaymentCallback";
import Marketplace from "./pages/Marketplace";
import PostProduct from "./pages/PostProduct";
import MarketplaceOrders from "./pages/MarketplaceOrders";
import Proposals from "./pages/Proposals";
import AdminPayouts from "./pages/AdminPayouts";
import AdminWithdrawals from "./pages/AdminWithdrawals";
import AdminDashboard from "./pages/AdminDashboard";
import AdminMonitoring from "./pages/AdminMonitoring";
import Messages from "./pages/Messages";
import VerifyEmail from "./pages/VerifyEmail";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Referrals from "./pages/Referrals";
import ResetPassword from "./pages/ResetPassword";
import SpinToWin from "./pages/SpinToWin"; 
import Leaderboard from "./pages/Leaderboard"; // <-- Added import for Leaderboard
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Component to handle online status tracking
const OnlineStatusTracker = () => {
  useOnlineStatus();
  return null;
};

// Initialise Lenis smooth scroll globally
const LenisInit = () => {
  useLenis();
  return null;
};

const BottomNavWrapper = () => {
  const unread = useUnreadMessages();
  return <BottomNav unreadMessages={unread} />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <OnlineStatusTracker />
          <LenisInit />
          <Navbar />
          <div className="pb-16 md:pb-0">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/gigs" element={<Gigs />} />
              <Route path="/gigs/:id" element={<GigDetail />} />
              <Route path="/post-gig" element={<PostGig />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/:id" element={<PublicProfile />} />
              <Route path="/u/:id" element={<PublicProfile />} />
              <Route path="/payment/callback" element={<PaymentCallback />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/marketplace/orders" element={<MarketplaceOrders />} />
              <Route path="/post-product" element={<PostProduct />} />
              <Route path="/proposals" element={<Proposals />} />
              <Route path="/admin/payouts" element={<AdminPayouts />} />
              <Route path="/admin/withdrawals" element={<AdminWithdrawals />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/monitoring" element={<AdminMonitoring />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/referrals" element={<Referrals />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/spin-to-win" element={<SpinToWin />} />
              <Route path="/leaderboard" element={<Leaderboard />} /> {/* <-- Added route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
          <BottomNavWrapper />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
