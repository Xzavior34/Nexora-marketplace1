import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, ArrowRight, RefreshCw, Loader2, Search, Lock, Wallet } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const ADMIN_EMAIL = "unigig60@gmail.com";

interface LogRow {
  id: string;
  escrow_id: string;
  task_id: string | null;
  payer_id: string | null;
  payee_id: string | null;
  old_status: string | null;
  new_status: string;
  amount_kobo: number | null;
  wallet_transaction_id: string | null;
  reference: string | null;
  changed_at: string;
}

const naira = (k?: number | null) => `₦${((k ?? 0) / 100).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;

const statusColor = (s: string | null) => {
  switch ((s || "").toLowerCase()) {
    case "released": return "bg-green-500/20 text-green-700 border-green-500/30";
    case "refunded": return "bg-orange-500/20 text-orange-700 border-orange-500/30";
    case "failed": return "bg-red-500/20 text-red-700 border-red-500/30";
    case "in_progress": return "bg-blue-500/20 text-blue-700 border-blue-500/30";
    case "held": return "bg-yellow-500/20 text-yellow-700 border-yellow-500/30";
    case "pending": return "bg-muted text-muted-foreground";
    default: return "bg-muted text-muted-foreground";
  }
};

export default function AdminEscrowAudit() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!authLoading && user?.email?.toLowerCase() !== ADMIN_EMAIL) {
      toast.error("Access denied. Admin only.");
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("escrow_state_log")
        .select("*")
        .order("changed_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      setRows((data || []) as LogRow[]);
    } catch (e: any) {
      toast.error("Failed to load audit log: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.email?.toLowerCase() === ADMIN_EMAIL) fetchLogs();
  }, [user]);

  // Realtime new transitions
  useEffect(() => {
    if (user?.email?.toLowerCase() !== ADMIN_EMAIL) return;
    const ch = supabase
      .channel("admin-escrow-audit")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "escrow_state_log" },
        (p) => setRows((prev) => [p.new as LogRow, ...prev].slice(0, 300)))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.escrow_id.toLowerCase().includes(q) ||
      r.task_id?.toLowerCase().includes(q) ||
      r.payer_id?.toLowerCase().includes(q) ||
      r.payee_id?.toLowerCase().includes(q) ||
      r.reference?.toLowerCase().includes(q) ||
      r.new_status.toLowerCase().includes(q)
    );
  });

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto p-4 pb-24">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Lock className="h-6 w-6 text-primary" /> Escrow Audit
          </h1>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs}>
          <RefreshCw className="h-4 w-4 mr-2" />Refresh
        </Button>
      </div>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by escrow id, task, user, reference, status..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            State transitions ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[70vh]">
            <div className="space-y-2">
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No escrow transitions logged yet.
                </p>
              )}
              {filtered.map((r) => (
                <div key={r.id} className="border rounded-lg p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      {r.old_status && (
                        <>
                          <Badge variant="outline" className={statusColor(r.old_status)}>
                            {r.old_status}
                          </Badge>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        </>
                      )}
                      <Badge className={statusColor(r.new_status)}>{r.new_status}</Badge>
                    </div>
                    <span className="text-muted-foreground">
                      {formatDistanceToNow(new Date(r.changed_at), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-muted-foreground">
                    <p><b className="text-foreground">Escrow:</b> <code className="text-[10px]">{r.escrow_id}</code></p>
                    {r.task_id && <p><b className="text-foreground">Task:</b> <code className="text-[10px]">{r.task_id}</code></p>}
                    {r.payer_id && <p><b className="text-foreground">Payer:</b> <code className="text-[10px]">{r.payer_id}</code></p>}
                    {r.payee_id && <p><b className="text-foreground">Payee:</b> <code className="text-[10px]">{r.payee_id}</code></p>}
                    {r.amount_kobo != null && (
                      <p className="flex items-center gap-1">
                        <Wallet className="h-3 w-3" />
                        <b className="text-foreground">Amount:</b> {naira(r.amount_kobo)}
                      </p>
                    )}
                    {r.wallet_transaction_id && (
                      <p><b className="text-foreground">Wallet tx:</b> <code className="text-[10px]">{r.wallet_transaction_id}</code></p>
                    )}
                    {r.reference && (
                      <p className="md:col-span-2">
                        <b className="text-foreground">Ref:</b> <code className="text-[10px]">{r.reference}</code>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
