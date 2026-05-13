import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  ArrowLeft, CheckCircle2, XCircle, Wallet, Building2,
  CreditCard, Loader2, RefreshCw, ShieldCheck, Package,
  Briefcase, Trash2, Search, Users, DollarSign, AlertOctagon, MessageCircle, Send,
  Trophy, Plus, Star, FileText, Sparkles // Added new icons
} from "lucide-react";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";

// Keeping your dispute details component
import { DisputeDetails } from "@/components/disputes/DisputeDetails";

const ADMIN_EMAIL = "unigig60@gmail.com";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [activeTab, setActiveTab] = useState("withdrawals");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);

  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [withdrawalFilter, setWithdrawalFilter] = useState<string>("pending");
  const [gigs, setGigs] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [stats, setStats] = useState({ users: 0, gigs: 0, products: 0, withdrawals: 0, wallets: 0, disputes: 0 });

  const [messageUser, setMessageUser] = useState<any | null>(null);
  const [messageText, setMessageText] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{open: boolean, action: "approve" | "reject", request: any | null}>({ open: false, action: "approve", request: null });

  // --- NEW: Leaderboard & Fake Content State ---
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [fakeStats, setFakeStats] = useState({ fake_completed_gigs: 0, fake_posted_gigs: 0, fake_reviews: 0 });
  const [contentUser, setContentUser] = useState<any | null>(null);
  const [userFakeGigs, setUserFakeGigs] = useState<any[]>([]);
  const [userFakeReviews, setUserFakeReviews] = useState<any[]>([]);
  const [newFakeGig, setNewFakeGig] = useState({ title: '', price: 5000 });
  const [newFakeReview, setNewFakeReview] = useState({ reviewer_name: 'Anonymous User', rating: 5, comment: '' });
  const [isCreatingFake, setIsCreatingFake] = useState(false);
  const [newFakeUser, setNewFakeUser] = useState({ full_name: '', email: '', university: '' });
  const [autoBoost, setAutoBoost] = useState(false);
  // ---------------------------------------------

  useEffect(() => {
    if (!authLoading && user?.email?.toLowerCase() !== ADMIN_EMAIL) {
      toast.error("Access denied. Admin only.");
      navigate("/");
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (user?.email?.toLowerCase() === ADMIN_EMAIL) fetchData();
  }, [user, activeTab, withdrawalFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await fetchStats();
      if (activeTab === "users") await fetchUsers();
      if (activeTab === "gigs") await fetchGigs();
      if (activeTab === "products") await fetchProducts();
      if (activeTab === "withdrawals") await fetchWithdrawals();
      if (activeTab === "disputes") await fetchDisputes();
    } catch (err: any) {
      toast.error("Sync error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const [u, g, p, w, d] = await Promise.all([
        supabase.from("profiles").select("wallet_balance"),
        supabase.from("tasks").select("id"),
        supabase.from("products").select("id"),
        supabase.from("withdrawal_requests").select("id").eq("status", "pending"),
        supabase.from("disputes").select("id")
      ]);
      const total = (u.data || []).reduce((sum, curr) => sum + (curr.wallet_balance || 0), 0);
      setStats({ 
        users: u.data?.length || 0, 
        gigs: g.data?.length || 0, 
        products: p.data?.length || 0, 
        withdrawals: w.data?.length || 0, 
        wallets: total, 
        disputes: d.data?.length || 0 
      });
    } catch (err: any) {
      console.error("Stats Error", err);
    }
  };

  const fetchUsers = async () => {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setUsers(data || []);
  };

  const fetchGigs = async () => {
    const { data } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
    const enriched = await Promise.all((data || []).map(async (g) => {
      const { data: p } = await supabase.from("profiles").select("full_name").eq("id", g.poster_id).single();
      return { ...g, poster_name: p?.full_name };
    }));
    setGigs(enriched);
  };

  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("*").order("created_at", { ascending: false });
    const enriched = await Promise.all((data || []).map(async (p) => {
      const { data: s } = await supabase.from("profiles").select("full_name").eq("id", p.seller_id).single();
      return { ...p, seller_name: s?.full_name };
    }));
    setProducts(enriched);
  };

  const fetchWithdrawals = async () => {
    try {
      let query = supabase.from("withdrawal_requests").select("*").order("created_at", { ascending: false });
      if (withdrawalFilter !== "all") query = query.eq("status", withdrawalFilter);
      
      const { data, error } = await query;
      if (error) throw error;

      const enrichedWithdrawals = await Promise.all((data || []).map(async (req) => {
        const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", req.user_id).single();
        return { ...req, profiles: profile };
      }));

      setWithdrawals(enrichedWithdrawals);
    } catch (err: any) {
      toast.error("Withdrawals failed to load: " + err.message);
    }
  };

  const fetchDisputes = async () => {
    try {
      const { data: dData, error } = await supabase.from('disputes').select('*').order('created_at', { ascending: false });
      if (error) throw error;

      const enrichedDisputes = await Promise.all((dData || []).map(async (d) => {
        const { data: reporter } = await supabase.from('profiles').select('id, full_name, email').eq('id', d.reporter_id).single();
        const { data: reported } = await supabase.from('profiles').select('id, full_name, email').eq('id', d.reported_id).single();
        const { data: task } = await supabase.from('tasks').select('*').eq('id', d.task_id).single();
        
        const { data: appeals } = await supabase.from('appeals').select('*').eq('dispute_id', d.id);
        
        return { 
          ...d, 
          reporter: reporter || { full_name: 'Unknown' }, 
          reported: reported || { full_name: 'Unknown' }, 
          task: task || { title: 'Unknown Task' },
          appeals: appeals || []
        };
      }));
      
      setDisputes(enrichedDisputes);
    } catch (err: any) {
      toast.error("Disputes failed to load: " + err.message);
    }
  };

  const sendAdminMessage = async () => {
    if (!messageUser || !messageText.trim()) return;
    setProcessing("messaging");
    try {
      const { error } = await supabase.rpc('admin_send_message_bypass', {
        p_sender_id: user?.id,
        p_recipient_id: messageUser.id,
        p_content: messageText
      });
      if (error) throw error;

      await supabase.from("notifications").insert({ 
        user_id: messageUser.id, 
        title: "🛡️ Official Admin Message", 
        body: messageText 
      });

      toast.success("Message delivered successfully!");
      setMessageUser(null);
      setMessageText("");
    } catch (err: any) {
      toast.error("Message Failed: " + err.message);
    } finally { setProcessing(null); }
  };

const handleDeleteUser = async (targetId: string, email: string) => {
    if (email.toLowerCase() === ADMIN_EMAIL) return toast.error("Cannot delete the admin account.");
    if (!window.confirm("Are you absolutely sure? This deletes ALL their data.")) return;
    
    setProcessing(targetId);
    try {
      // 🚨 THIS IS THE LINE TO FIX 🚨
      // Change "target_user_id: targetId" to "p_user_id: targetId"
      const { data, error } = await supabase.rpc('admin_delete_user', { p_user_id: targetId });
      
      if (error) throw error;
      
      const result = data as any;
      if (result && result.success === false) {
        throw new Error(result.error);
      }

      supabase.rpc('log_admin_action', {
        p_action: 'user_delete', p_target_type: 'user', p_target_id: targetId,
        p_metadata: { email } as any,
      }).then(() => {});

      toast.success("User completely deleted.");
      fetchUsers();
      fetchStats();
    } catch (err: any) {
      toast.error("Delete Failed: " + err.message);
    } finally {
      setProcessing(null);
    }
  };
  const handleWithdrawalAction = async () => {
    if (!confirmDialog.request) return;
    setProcessing("withdrawal");
    try {
      const newStatus = confirmDialog.action === "approve" ? "completed" : "rejected";
      const { error } = await supabase.from("withdrawal_requests").update({ status: newStatus }).eq("id", confirmDialog.request.id);
      if (error) throw error;
      
      toast.success(`Withdrawal marked as ${newStatus}.`);
      setConfirmDialog({ open: false, action: "approve", request: null });
      fetchWithdrawals();
      fetchStats();
    } catch (err: any) {
      toast.error("Update Failed: " + err.message);
    } finally {
      setProcessing(null);
    }
  };

  // --- NEW: Leaderboard & Fake Content Functions ---
  const handleCreateFakeAccount = async () => {
    if (!newFakeUser.full_name || !newFakeUser.email) return;
    setProcessing("create_fake");
    try {
      const newProfile = {
        id: crypto.randomUUID(),
        full_name: newFakeUser.full_name,
        email: newFakeUser.email,
        university: newFakeUser.university,
        is_verified: true,
        wallet_balance: 0,
        fake_completed_gigs: autoBoost ? 150 : 0,
        fake_posted_gigs: autoBoost ? 150 : 0,
        fake_reviews: autoBoost ? 50 : 0
      };

      const { error } = await supabase.from("profiles").insert(newProfile);
      
      if (error) {
        console.warn("Supabase insert failed, local simulation:", error);
        setUsers([newProfile, ...users]);
      } else {
        fetchUsers();
      }
      
      toast.success(autoBoost ? "Ghost account created & boosted!" : "Fake account created!");
      setIsCreatingFake(false);
      setNewFakeUser({ full_name: '', email: '', university: '' });
      setAutoBoost(false);
    } catch (err: any) {
      toast.error("Creation Failed: " + err.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleUpdateFakeStats = async () => {
    if (!editingUser) return;
    setProcessing("fake_stats");
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          fake_completed_gigs: fakeStats.fake_completed_gigs,
          fake_posted_gigs: fakeStats.fake_posted_gigs,
          fake_reviews: fakeStats.fake_reviews
        })
        .eq("id", editingUser.id);

      if (error) {
        console.warn("Supabase update failed, simulating locally:", error);
        setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...fakeStats } : u));
      } else {
        fetchUsers();
      }
      toast.success("Leaderboard stats updated!");
      setEditingUser(null);
    } catch (err: any) {
      toast.error("Update Failed: " + err.message);
    } finally {
      setProcessing(null);
    }
  };

  const openContentModal = async (u: any) => {
    setContentUser(u);
    setProcessing("fetch_content");
    try {
      const { data: gigsData, error: gigsError } = await supabase.from("tasks").select("*").eq("worker_id", u.id).eq("status", "completed");
      if (!gigsError) setUserFakeGigs(gigsData || []);

      const { data: reviewsData, error: reviewsError } = await supabase.from("reviews").select("*").eq("target_user_id", u.id);
      if (!reviewsError) setUserFakeReviews(reviewsData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(null);
    }
  };

  const handleAddFakeGig = async () => {
    if (!contentUser || !newFakeGig.title) return;
    setProcessing("add_gig");
    try {
      const gigObj: any = {
        id: crypto.randomUUID(),
        title: newFakeGig.title,
        description: newFakeGig.title,
        category: 'Other',
        price_kobo: (newFakeGig.price || 0) * 100,
        status: 'completed',
        worker_id: contentUser.id,
        poster_id: contentUser.id 
      };

      const { error } = await (supabase.from("tasks") as any).insert(gigObj);
      if (error) setUserFakeGigs([gigObj, ...userFakeGigs]); else openContentModal(contentUser);
      
      setNewFakeGig({ title: '', price: 5000 });
      toast.success("Fake gig added!");
    } catch (err: any) { toast.error(err.message); } finally { setProcessing(null); }
  };

  const handleAddFakeReview = async () => {
    if (!contentUser || !newFakeReview.comment) return;
    setProcessing("add_review");
    try {
      const reviewObj: any = {
        id: crypto.randomUUID(),
        target_user_id: contentUser.id,
        reviewee_id: contentUser.id,
        reviewer_id: contentUser.id,
        task_id: crypto.randomUUID(),
        reviewer_name: newFakeReview.reviewer_name,
        rating: newFakeReview.rating,
        comment: newFakeReview.comment
      };

      const { error } = await (supabase.from("reviews") as any).insert(reviewObj);
      if (error) setUserFakeReviews([reviewObj, ...userFakeReviews]); else openContentModal(contentUser);
      
      setNewFakeReview({ reviewer_name: 'Anonymous User', rating: 5, comment: '' });
      toast.success("Fake review added!");
    } catch (err: any) { toast.error(err.message); } finally { setProcessing(null); }
  };

  const handleBulkSeed = async (type: 'gigs' | 'reviews') => {
    if (!contentUser) return;
    setProcessing(`bulk_${type}`);
    try {
      if (type === 'gigs') {
        const mockTitles = ["Logo Design", "Data Entry", "Electrical Repairs", "Nationwide Flyer Distribution", "Proofreading & Editing", "Video Editing", "Social Media Management"];
        const bulkGigs: any[] = Array.from({ length: 10 }).map(() => ({
          id: crypto.randomUUID(),
          title: mockTitles[Math.floor(Math.random() * mockTitles.length)],
          description: 'Seeded gig',
          category: 'Other',
          price_kobo: (Math.floor(Math.random() * 10000) + 1000) * 100,
          status: 'completed',
          worker_id: contentUser.id,
          poster_id: contentUser.id
        }));
        
        const { error } = await (supabase.from("tasks") as any).insert(bulkGigs);
        if (error) setUserFakeGigs([...bulkGigs, ...userFakeGigs]); else openContentModal(contentUser);
        toast.success("10 Fake Gigs seeded!");
      } else {
        const mockNames = ["Alex Johnson", "Sarah Smith", "Michael Chen", "Emma Davis", "David O.", "Grace K."];
        const mockComments = ["Great work!", "Delivered on time.", "Highly recommended.", "Perfect communication.", "Exceeded expectations!", "Very professional."];
        const bulkReviews: any[] = Array.from({ length: 10 }).map(() => ({
          id: crypto.randomUUID(),
          target_user_id: contentUser.id,
          reviewee_id: contentUser.id,
          reviewer_id: contentUser.id,
          task_id: crypto.randomUUID(),
          reviewer_name: mockNames[Math.floor(Math.random() * mockNames.length)],
          rating: 5,
          comment: mockComments[Math.floor(Math.random() * mockComments.length)]
        }));
        
        const { error } = await (supabase.from("reviews") as any).insert(bulkReviews);
        if (error) setUserFakeReviews([...bulkReviews, ...userFakeReviews]); else openContentModal(contentUser);
        toast.success("10 Fake Reviews seeded!");
      }
    } catch (err: any) { toast.error("Bulk seed failed: " + err.message); } finally { setProcessing(null); }
  };
  // ------------------------------------------------

  const formatNaira = (k: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format((k || 0) / 100);

  if (authLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b p-3 sm:p-4 flex justify-between items-center gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="shrink-0"><ArrowLeft /></Button>
          <h1 className="text-base sm:text-xl font-bold flex items-center gap-1.5 truncate"><ShieldCheck className="text-primary h-5 w-5 shrink-0"/> <span className="truncate">Admin Hub</span></h1>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button variant="outline" size="sm" onClick={() => navigate("/admin/monitoring")} className="px-2 sm:px-3"><ShieldCheck className="h-4 w-4 sm:mr-1.5" /><span className="hidden sm:inline">Monitor</span></Button>
          <Button variant="outline" size="sm" onClick={fetchData} className="px-2 sm:px-3"><RefreshCw className={`h-4 w-4 sm:mr-1.5 ${loading ? "animate-spin" : ""}`} /><span className="hidden sm:inline">Sync</span></Button>
        </div>
      </header>

      <main className="container mx-auto p-3 sm:p-4 space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 text-center w-full">
            <Card><CardContent className="p-2.5 sm:p-4"><Users className="mx-auto mb-1 text-primary h-4 w-4 sm:h-5 sm:w-5"/><p className="text-base sm:text-2xl font-bold">{stats.users}</p><p className="text-[9px] sm:text-[10px] uppercase text-muted-foreground">Users</p></CardContent></Card>
            <Card><CardContent className="p-2.5 sm:p-4"><Briefcase className="mx-auto mb-1 text-blue-500 h-4 w-4 sm:h-5 sm:w-5"/><p className="text-base sm:text-2xl font-bold">{stats.gigs}</p><p className="text-[9px] sm:text-[10px] uppercase text-muted-foreground">Gigs</p></CardContent></Card>
            <Card><CardContent className="p-2.5 sm:p-4"><Package className="mx-auto mb-1 text-green-500 h-4 w-4 sm:h-5 sm:w-5"/><p className="text-base sm:text-2xl font-bold">{stats.products}</p><p className="text-[9px] sm:text-[10px] uppercase text-muted-foreground">Products</p></CardContent></Card>
            <Card><CardContent className="p-2.5 sm:p-4"><AlertOctagon className="mx-auto mb-1 text-red-500 h-4 w-4 sm:h-5 sm:w-5"/><p className="text-base sm:text-2xl font-bold">{stats.disputes}</p><p className="text-[9px] sm:text-[10px] uppercase text-muted-foreground">Disputes</p></CardContent></Card>
            <Card><CardContent className="p-2.5 sm:p-4"><Wallet className="mx-auto mb-1 text-amber-500 h-4 w-4 sm:h-5 sm:w-5"/><p className="text-base sm:text-2xl font-bold">{stats.withdrawals}</p><p className="text-[9px] sm:text-[10px] uppercase text-muted-foreground">Pending</p></CardContent></Card>
            <Card className="bg-primary/5 border-primary/20 col-span-3 sm:col-span-1"><CardContent className="p-2.5 sm:p-4"><DollarSign className="mx-auto mb-1 text-emerald-600 h-4 w-4 sm:h-5 sm:w-5"/><p className="text-sm sm:text-lg font-bold">{formatNaira(stats.wallets)}</p><p className="text-[9px] sm:text-[10px] uppercase text-muted-foreground">Total Funds</p></CardContent></Card>
          </div>

          <Button onClick={() => setIsCreatingFake(true)} size="sm" className="w-full sm:w-auto sm:self-end flex items-center gap-2 px-4 shadow-sm">
            <Plus className="h-4 w-4" />
            <span className="text-xs font-medium">Create Fake User</span>
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted w-full inline-flex justify-start overflow-x-auto scrollbar-hide h-auto p-1 mb-4 gap-1">
            <TabsTrigger value="withdrawals" className="text-xs px-3">Payouts</TabsTrigger>
            <TabsTrigger value="disputes" className="text-xs px-3">Disputes</TabsTrigger>
            <TabsTrigger value="gigs" className="text-xs px-3">Gigs</TabsTrigger>
            <TabsTrigger value="products" className="text-xs px-3">Products</TabsTrigger>
            <TabsTrigger value="users" className="text-xs px-3">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-3">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search email..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            {users.filter(u => u.email.includes(searchQuery)).map(u => (
              <Card key={u.id}>
                <CardContent className="p-3 sm:p-4 flex flex-col gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate">{u.full_name || "New User"}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                    <p className="text-[11px] text-muted-foreground">{formatNaira(u.wallet_balance)}</p>
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                       {u.is_ambassador && <Badge className="bg-amber-500/10 text-amber-600 text-[9px] border-none">Ambassador</Badge>}
                       <Badge variant={u.is_verified ? "default" : "outline"} className="text-[9px]">{u.is_verified ? "Verified" : "Unverified"}</Badge>
                       {(u.fake_completed_gigs > 0 || u.fake_posted_gigs > 0) && <Badge variant="secondary" className="text-[9px] bg-yellow-500/10 text-yellow-600 border-none">Boosted</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-wrap items-center">
                    {/* NEW: Manage Fake Content and Edit Stats Buttons */}
                    <Button size="icon" variant="outline" onClick={() => openContentModal(u)} title="Manage Mock Content" className="hover:text-green-600"><FileText className="h-4 w-4"/></Button>
                    <Button size="icon" variant="outline" onClick={() => { setEditingUser(u); setFakeStats({ fake_completed_gigs: u.fake_completed_gigs || 0, fake_posted_gigs: u.fake_posted_gigs || 0, fake_reviews: u.fake_reviews || 0 }); }} title="Boost Leaderboard" className="hover:text-yellow-600"><Trophy className="h-4 w-4"/></Button>
                    {/* Existing Buttons */}
                    <Button size="icon" variant="outline" onClick={() => setMessageUser(u)} title="Message"><MessageCircle className="h-4 w-4"/></Button>
                    <Button size="sm" variant={u.is_ambassador ? "secondary" : "outline"} onClick={async () => {
                      await supabase.from("profiles").update({ is_ambassador: !u.is_ambassador } as any).eq("id", u.id);
                      fetchUsers();
                      toast.success("Status Updated");
                    }}><ShieldCheck className="h-4 w-4 mr-1"/>Amb</Button>
                    <Button variant="destructive" size="icon" onClick={() => handleDeleteUser(u.id, u.email)} disabled={processing === u.id || u.email === ADMIN_EMAIL}>
                      {processing === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4"/>}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="gigs" className="space-y-3">
            {gigs.map(g => (
              <Card key={g.id}>
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-bold">{g.title}</p>
                    <p className="text-xs text-muted-foreground">Posted by: {g.poster_name || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">{g.category} • {formatNaira(g.price_kobo)}</p>
                  </div>
                  <Button variant="destructive" size="icon" onClick={async () => { if(confirm("Delete gig?")) { await supabase.from("tasks").delete().eq("id", g.id); supabase.rpc('log_admin_action', { p_action: 'gig_delete', p_target_type: 'task', p_target_id: g.id, p_metadata: { title: g.title, poster_id: g.poster_id } as any }).then(()=>{}); fetchGigs(); }}}><Trash2 className="h-4 w-4"/></Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="products" className="space-y-3">
            {products.map(p => (
              <Card key={p.id}>
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-bold">{p.title}</p>
                    <p className="text-xs text-muted-foreground">Seller: {p.seller_name || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">{p.category} • {formatNaira(p.price_kobo)}</p>
                  </div>
                <Button 
  variant="destructive" 
  size="icon" 
  className="shrink-0"
  disabled={processing === p.id}
  onClick={async (e) => {
    e.preventDefault();
    if (window.confirm(`Delete "${p.title}" permanently?`)) {
      setProcessing(p.id);
      try {
        const { error } = await supabase.from("products").delete().eq("id", p.id);
        if (error) {
          toast.error(error.message);
        } else {
          supabase.rpc('log_admin_action', { p_action: 'product_delete', p_target_type: 'product', p_target_id: p.id, p_metadata: { title: p.title, seller_id: p.seller_id } as any }).then(()=>{});
          toast.success("Product deleted");
          await fetchData();
        }
      } catch (err) {
        toast.error("An error occurred");
      } finally {
        setProcessing(null);
      }
    }
  }}
>
  {processing === p.id ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : (
    <Trash2 className="h-4 w-4" />
  )}
</Button>
 </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="disputes">
            {disputes.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">No active disputes found.</div>
            ) : (
              disputes.map(d => (
                <div key={d.id} className="relative group mb-4">
                  <DisputeDetails dispute={d} onResolve={() => fetchData()} />
                  <Button variant="ghost" size="sm" className="absolute top-4 right-4 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={async () => {
                    if(confirm("Delete dispute record?")) { await supabase.from("disputes").delete().eq("id", d.id); supabase.rpc('log_admin_action', { p_action: 'dispute_delete', p_target_type: 'dispute', p_target_id: d.id, p_metadata: {} as any }).then(()=>{}); fetchData(); }
                  }}><Trash2 className="h-4 w-4 mr-1" /> Delete</Button>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="withdrawals" className="space-y-4">
             <div className="flex gap-2">
               {["pending", "completed", "rejected", "all"].map(f => (
                 <Button key={f} variant={withdrawalFilter === f ? "default" : "outline"} size="sm" onClick={() => setWithdrawalFilter(f)} className="capitalize">{f}</Button>
               ))}
             </div>
             {withdrawals.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">No withdrawals found.</div>
             ) : (
               withdrawals.map(req => (
                 <Card key={req.id}>
                   <CardContent className="p-4 flex flex-col md:flex-row justify-between md:items-center gap-4">
                     <div>
                       <div className="flex items-center gap-2 mb-1">
                         <p className="font-bold">{req.profiles?.full_name || "Unknown User"}</p>
                         <Badge variant={req.status === "pending" ? "outline" : req.status === "completed" ? "default" : "destructive"} className="text-[10px] uppercase">
                           {req.status}
                         </Badge>
                       </div>
                       <p className="text-xs text-muted-foreground mb-2">{req.profiles?.email || 'No email attached'}</p>
                       <div className="bg-muted p-2 rounded-md text-sm font-mono space-y-1">
                         <p className="flex items-center gap-2"><Building2 className="h-3 w-3"/> {req.bank_name || "N/A"}</p>
                         <p className="flex items-center gap-2"><CreditCard className="h-3 w-3"/> {req.account_number || "N/A"}</p>
                         <p className="flex items-center gap-2 font-bold text-primary"><DollarSign className="h-3 w-3"/> {formatNaira(req.amount_kobo || 0)}</p>
                       </div>
                     </div>
                     
                     {req.status === "pending" && (
                       <div className="flex w-full md:w-auto gap-2">
                         <Button 
                           variant="outline" 
                           className="flex-1 md:flex-none text-destructive hover:text-destructive"
                           onClick={() => setConfirmDialog({ open: true, action: "reject", request: req })}
                         >
                           <XCircle className="h-4 w-4 mr-2" /> Reject
                         </Button>
                         <Button 
                           className="flex-1 md:flex-none"
                           onClick={() => setConfirmDialog({ open: true, action: "approve", request: req })}
                         >
                           <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
                         </Button>
                       </div>
                     )}
                   </CardContent>
                 </Card>
               ))
             )}
          </TabsContent>
        </Tabs>
      </main>

      {/* EXISTING MODALS */}
      <AlertDialog open={!!messageUser} onOpenChange={(open) => !open && setMessageUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Message User</AlertDialogTitle>
            <AlertDialogDescription>
              Send a direct message to {messageUser?.full_name || messageUser?.email}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea 
            placeholder="Type your message here..." 
            value={messageText} 
            onChange={e => setMessageText(e.target.value)}
            className="min-h-[100px]"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button onClick={sendAdminMessage} disabled={processing === "messaging" || !messageText.trim()}>
              {processing === "messaging" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Send Message
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="capitalize">{confirmDialog.action} Withdrawal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {confirmDialog.action} this withdrawal request for {confirmDialog.request?.profiles?.full_name}? 
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <Button onClick={handleWithdrawalAction} disabled={processing === "withdrawal"}>
              {processing === "withdrawal" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Confirm
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* --- NEW MODALS --- */}

      {/* Create Fake Account Modal */}
      <AlertDialog open={isCreatingFake} onOpenChange={setIsCreatingFake}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create Fake Account</AlertDialogTitle>
            <AlertDialogDescription>Create a mock user account for leaderboard testing.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase">Full Name</label>
              <Input placeholder="e.g. Top Earner" value={newFakeUser.full_name} onChange={e => setNewFakeUser({...newFakeUser, full_name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase">Email</label>
              <Input placeholder="e.g. fake@unigig.site" value={newFakeUser.email} onChange={e => setNewFakeUser({...newFakeUser, email: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase">Region / State</label>
              <Input placeholder="e.g. Lagos, Abuja, Ogun..." value={newFakeUser.university} onChange={e => setNewFakeUser({...newFakeUser, university: e.target.value})} />
            </div>
            {/* Auto-Boost Checkbox */}
            <div className="flex items-center space-x-2 pt-2">
              <input 
                type="checkbox" 
                id="autoBoost" 
                checked={autoBoost} 
                onChange={(e) => setAutoBoost(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="autoBoost" className="text-sm font-bold text-yellow-600 flex items-center gap-1">
                <Trophy className="w-4 h-4" /> Auto-Boost to Top of Leaderboard
              </label>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button onClick={handleCreateFakeAccount} disabled={processing === "create_fake" || !newFakeUser.full_name || !newFakeUser.email}>
              {processing === "create_fake" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Create Account
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leaderboard Boost Modal */}
      <AlertDialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leaderboard Boost: {editingUser?.full_name}</AlertDialogTitle>
            <AlertDialogDescription>Add fake stats to this account to manipulate leaderboard rankings.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase">Fake Gigs Done</label>
              <Input type="number" value={fakeStats.fake_completed_gigs} onChange={e => setFakeStats({...fakeStats, fake_completed_gigs: parseInt(e.target.value) || 0})} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase">Fake Gigs Posted</label>
              <Input type="number" value={fakeStats.fake_posted_gigs} onChange={e => setFakeStats({...fakeStats, fake_posted_gigs: parseInt(e.target.value) || 0})} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase">Fake Reviews</label>
              <Input type="number" value={fakeStats.fake_reviews} onChange={e => setFakeStats({...fakeStats, fake_reviews: parseInt(e.target.value) || 0})} />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button onClick={handleUpdateFakeStats} disabled={processing === "fake_stats"}>
              {processing === "fake_stats" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Apply Boost
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manage Fake Content Modal */}
      <AlertDialog open={!!contentUser} onOpenChange={(open) => !open && setContentUser(null)}>
        <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Manage Fake Content: {contentUser?.full_name}</AlertDialogTitle>
            <AlertDialogDescription>Seed actual fake gigs and reviews that will appear on their profile.</AlertDialogDescription>
          </AlertDialogHeader>
          
          <Tabs defaultValue="gigs" className="w-full mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="gigs">Fake Gigs ({userFakeGigs.length})</TabsTrigger>
              <TabsTrigger value="reviews">Fake Reviews ({userFakeReviews.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="gigs" className="space-y-4 mt-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input placeholder="Gig Title" value={newFakeGig.title} onChange={e => setNewFakeGig({...newFakeGig, title: e.target.value})} className="flex-1" />
                <Input type="number" placeholder="Price" className="w-full sm:w-24" value={newFakeGig.price} onChange={e => setNewFakeGig({...newFakeGig, price: parseInt(e.target.value) || 0})} />
                <div className="flex gap-2">
                  <Button onClick={handleAddFakeGig} disabled={processing === "add_gig" || !newFakeGig.title}>Add</Button>
                  <Button variant="secondary" onClick={() => handleBulkSeed('gigs')} disabled={processing === "bulk_gigs"}>
                    <Sparkles className="w-4 h-4 mr-2" /> Bulk Seed (10)
                  </Button>
                </div>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {userFakeGigs.map(gig => (
                  <div key={gig.id} className="flex justify-between items-center p-2 border rounded-md text-sm">
                    <div>
                      <p className="font-medium">{gig.title}</p>
                      <p className="text-xs text-muted-foreground">{formatNaira(gig.price)} • {gig.status}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => setUserFakeGigs(userFakeGigs.filter(g => g.id !== gig.id))}><Trash2 className="h-4 w-4"/></Button>
                  </div>
                ))}
                {userFakeGigs.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No fake gigs yet.</p>}
              </div>
            </TabsContent>
            
            <TabsContent value="reviews" className="space-y-4 mt-4">
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input placeholder="Reviewer Name" value={newFakeReview.reviewer_name} onChange={e => setNewFakeReview({...newFakeReview, reviewer_name: e.target.value})} className="flex-1" />
                  <Input type="number" min="1" max="5" className="w-full sm:w-20" value={newFakeReview.rating} onChange={e => setNewFakeReview({...newFakeReview, rating: parseInt(e.target.value) || 5})} />
                </div>
                <div className="flex flex-col sm:flex-row gap-2 mt-2">
                  <Input placeholder="Review Comment" value={newFakeReview.comment} onChange={e => setNewFakeReview({...newFakeReview, comment: e.target.value})} className="flex-1" />
                  <div className="flex gap-2">
                    <Button onClick={handleAddFakeReview} disabled={processing === "add_review" || !newFakeReview.comment}>Add</Button>
                    <Button variant="secondary" onClick={() => handleBulkSeed('reviews')} disabled={processing === "bulk_reviews"}>
                      <Sparkles className="w-4 h-4 mr-2" /> Bulk Seed (10)
                    </Button>
                  </div>
                </div>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {userFakeReviews.map(review => (
                  <div key={review.id} className="flex justify-between items-center p-2 border rounded-md text-sm">
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{review.reviewer_name}</span>
                        <span className="flex items-center text-amber-500 text-xs ml-2"><Star className="h-3 w-3 fill-amber-500 mr-1"/>{review.rating}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{review.comment}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => setUserFakeReviews(userFakeReviews.filter(r => r.id !== review.id))}><Trash2 className="h-4 w-4"/></Button>
                  </div>
                ))}
                {userFakeReviews.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No fake reviews yet.</p>}
              </div>
            </TabsContent>
          </Tabs>

          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

