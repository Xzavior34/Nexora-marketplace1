import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ShieldAlert, Activity, Users, Wallet, AlertTriangle, RefreshCw, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const ADMIN_EMAIL = "unigig60@gmail.com";

interface Stats {
  total_users: number;
  online_users: number;
  open_disputes: number;
  pending_withdrawals: number;
  total_wallet_kobo: number;
  held_escrow_kobo: number;
  sus_24h: number;
  audit_24h: number;
}

const naira = (kobo: number) => `₦${(kobo / 100).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;

export default function AdminMonitoring() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [audit, setAudit] = useState<any[]>([]);
  const [walletAudit, setWalletAudit] = useState<any[]>([]);
  const [sus, setSus] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user?.email?.toLowerCase() !== ADMIN_EMAIL) {
      toast.error("Access denied. Admin only.");
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [s, a, w, x] = await Promise.all([
        supabase.rpc("admin_get_monitoring_stats"),
        supabase.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("wallet_audit_log").select("*").order("changed_at", { ascending: false }).limit(50),
        supabase.from("suspicious_activity").select("*").order("created_at", { ascending: false }).limit(50),
      ]);
      if (s.data) setStats(s.data as unknown as Stats);
      setAudit(a.data || []);
      setWalletAudit(w.data || []);
      setSus(x.data || []);
    } catch (e: any) {
      toast.error("Failed to load: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.email?.toLowerCase() === ADMIN_EMAIL) fetchAll();
  }, [user]);

  // Realtime audit feed
  useEffect(() => {
    if (user?.email?.toLowerCase() !== ADMIN_EMAIL) return;
    const ch = supabase
      .channel("admin-monitoring")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "admin_audit_log" },
        (p) => setAudit((prev) => [p.new, ...prev].slice(0, 100)))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "suspicious_activity" },
        (p) => setSus((prev) => [p.new, ...prev].slice(0, 50)))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const handleSearch = async () => {
    if (!search.trim()) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, email, full_name, university, wallet_balance, is_admin, is_verified, last_seen_at, created_at")
      .or(`email.ilike.%${search}%,full_name.ilike.%${search}%`)
      .limit(25);
    setSearchResults(data || []);
  };

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="container max-w-6xl mx-auto p-4 pb-24">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}><ArrowLeft className="h-5 w-5" /></Button>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldAlert className="h-6 w-6 text-primary" /> Monitoring</h1>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAll}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Users} label="Total users" value={stats?.total_users ?? 0} />
        <StatCard icon={Activity} label="Online (2 min)" value={stats?.online_users ?? 0} accent="text-green-600" />
        <StatCard icon={AlertTriangle} label="Open disputes" value={stats?.open_disputes ?? 0} accent="text-orange-600" />
        <StatCard icon={Wallet} label="Pending payouts" value={stats?.pending_withdrawals ?? 0} accent="text-yellow-600" />
        <StatCard icon={Wallet} label="Total in wallets" value={naira(stats?.total_wallet_kobo ?? 0)} />
        <StatCard icon={Wallet} label="Held in escrow" value={naira(stats?.held_escrow_kobo ?? 0)} />
        <StatCard icon={ShieldAlert} label="Sus events (24h)" value={stats?.sus_24h ?? 0} accent="text-red-600" />
        <StatCard icon={Activity} label="Admin actions (24h)" value={stats?.audit_24h ?? 0} />
      </div>

      <Tabs defaultValue="audit">
        <TabsList className="w-full inline-flex justify-start overflow-x-auto scrollbar-hide gap-1">
          <TabsTrigger value="audit" className="text-xs px-3">Audit</TabsTrigger>
          <TabsTrigger value="wallet" className="text-xs px-3">Wallet</TabsTrigger>
          <TabsTrigger value="sus" className="text-xs px-3">Suspicious</TabsTrigger>
          <TabsTrigger value="search" className="text-xs px-3">Search</TabsTrigger>
        </TabsList>

        <TabsContent value="audit">
          <Card>
            <CardHeader><CardTitle className="text-base">Live admin actions</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[60vh]">
                <div className="space-y-2">
                  {audit.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No admin actions logged yet.</p>}
                  {audit.map((a) => (
                    <div key={a.id} className="border rounded-lg p-3 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="secondary">{a.action}</Badge>
                        <span className="text-muted-foreground">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</span>
                      </div>
                      <p className="text-muted-foreground"><b>{a.admin_email}</b> → {a.target_type || "—"} <code className="text-[10px]">{a.target_id || ""}</code></p>
                      {(a.before_data || a.after_data || a.metadata) && (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-primary">details</summary>
                          <pre className="mt-1 p-2 bg-muted rounded text-[10px] overflow-x-auto whitespace-pre-wrap break-all">
{JSON.stringify({ before: a.before_data, after: a.after_data, meta: a.metadata }, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wallet">
          <Card>
            <CardHeader><CardTitle className="text-base">Recent wallet changes</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[60vh]">
                <div className="space-y-2">
                  {walletAudit.map((w) => {
                    const delta = (w.new_balance_kobo ?? 0) - (w.old_balance_kobo ?? 0);
                    return (
                      <div key={w.id} className="border rounded-lg p-3 text-xs flex justify-between">
                        <div>
                          <p><code className="text-[10px]">{w.user_id}</code></p>
                          <p className="text-muted-foreground">{naira(w.old_balance_kobo || 0)} → {naira(w.new_balance_kobo || 0)}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant={delta >= 0 ? "default" : "destructive"}>{delta >= 0 ? "+" : ""}{naira(delta)}</Badge>
                          <p className="text-muted-foreground mt-1">{formatDistanceToNow(new Date(w.changed_at), { addSuffix: true })}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sus">
          <Card>
            <CardHeader><CardTitle className="text-base">Suspicious activity</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[60vh]">
                <div className="space-y-2">
                  {sus.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">All clear — no flags in the last 50 events.</p>}
                  {sus.map((s) => (
                    <div key={s.id} className="border rounded-lg p-3 text-xs">
                      <div className="flex justify-between mb-1">
                        <Badge variant={s.severity === "error" ? "destructive" : s.severity === "warn" ? "secondary" : "outline"}>
                          {s.activity_type}
                        </Badge>
                        <span className="text-muted-foreground">{formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}</span>
                      </div>
                      <p className="text-muted-foreground"><code className="text-[10px]">{s.user_id || s.user_email || "anon"}</code></p>
                      {s.details && <pre className="mt-1 p-2 bg-muted rounded text-[10px] overflow-x-auto whitespace-pre-wrap break-all">{JSON.stringify(s.details, null, 2)}</pre>}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="search">
          <Card>
            <CardHeader><CardTitle className="text-base">User search</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input placeholder="email or name…" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} />
                <Button onClick={handleSearch}><Search className="h-4 w-4" /></Button>
              </div>
              <ScrollArea className="h-[55vh]">
                <div className="space-y-2">
                  {searchResults.map((u) => (
                    <div key={u.id} className="border rounded-lg p-3 text-xs">
                      <div className="flex justify-between">
                        <div>
                          <p className="font-bold">{u.full_name || "(no name)"}</p>
                          <p className="text-muted-foreground">{u.email}</p>
                          <p className="text-muted-foreground">{u.university || "—"}</p>
                        </div>
                        <div className="text-right space-y-1">
                          <p className="font-bold">{naira(u.wallet_balance || 0)}</p>
                          {u.is_admin && <Badge>admin</Badge>}
                          {u.is_verified && <Badge variant="secondary">verified</Badge>}
                          {u.last_seen_at && new Date(u.last_seen_at).getTime() > Date.now() - 120000 && (
                            <Badge className="bg-green-500">online</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: any; accent?: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`h-4 w-4 ${accent || "text-muted-foreground"}`} />
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
        <p className={`text-lg font-bold ${accent || ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
