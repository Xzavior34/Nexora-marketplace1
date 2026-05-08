import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Copy, 
  Wallet,
  Building2,
  CreditCard,
  User,
  Loader2,
  RefreshCw,
  ShieldCheck
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";

const ADMIN_EMAIL = "unigig60@gmail.com";

interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount_kobo: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  status: string;
  admin_notes: string | null;
  processed_at: string | null;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

export default function AdminPayouts() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: "approve" | "reject";
    request: WithdrawalRequest | null;
  }>({ open: false, action: "approve", request: null });
  const [adminNotes, setAdminNotes] = useState("");
  const [filter, setFilter] = useState<"pending" | "completed" | "rejected" | "all">("pending");

  useEffect(() => {
    if (!authLoading && user?.email !== ADMIN_EMAIL) {
      toast.error("Access denied. Admin only.");
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user?.email === ADMIN_EMAIL) {
      fetchRequests();
    }
  }, [user, filter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("withdrawal_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch user details for each request
      const requestsWithUsers = await Promise.all(
        (data || []).map(async (req) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("email, full_name")
            .eq("id", req.user_id)
            .single();
          
          return {
            ...req,
            user_email: profile?.email,
            user_name: profile?.full_name,
          };
        })
      );

      setRequests(requestsWithUsers);
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error("Failed to fetch withdrawal requests");
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async (action: "approve" | "reject") => {
    if (!confirmDialog.request) return;

    setProcessing(confirmDialog.request.id);
    try {
      const { data, error } = await supabase.functions.invoke("admin-process-withdrawal", {
        body: {
          request_id: confirmDialog.request.id,
          action,
          admin_notes: adminNotes || undefined,
        },
      });

      if (error) throw error;

      // Audit log (fire-and-forget; do not block UI)
      supabase.rpc('log_admin_action', {
        p_action: action === "approve" ? 'withdrawal_approve' : 'withdrawal_reject',
        p_target_type: 'withdrawal_request',
        p_target_id: confirmDialog.request.id,
        p_metadata: { admin_notes: adminNotes || null, amount_kobo: confirmDialog.request.amount_kobo, user_id: confirmDialog.request.user_id } as any,
      }).then(() => {});

      toast.success(
        action === "approve" 
          ? "Withdrawal approved and marked as completed" 
          : "Withdrawal rejected and funds refunded"
      );
      
      fetchRequests();
    } catch (error: any) {
      console.error("Process error:", error);
      toast.error(error.message || "Failed to process request");
    } finally {
      setProcessing(null);
      setConfirmDialog({ open: false, action: "approve", request: null });
      setAdminNotes("");
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const formatNaira = (kobo: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(kobo / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user?.email !== ADMIN_EMAIL) {
    return null;
  }

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const totalPending = requests
    .filter((r) => r.status === "pending")
    .reduce((sum, r) => sum + r.amount_kobo, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Admin Payouts
                </h1>
                <p className="text-sm text-muted-foreground">Manage withdrawal requests</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchRequests} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats Card */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Withdrawals</p>
                <p className="text-3xl font-bold">{pendingCount}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold text-primary">{formatNaira(totalPending)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          {(["pending", "completed", "rejected", "all"] as const).map((status) => (
            <Button
              key={status}
              variant={filter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(status)}
              className="capitalize whitespace-nowrap shrink-0"
            >
              {status === "pending" && <Clock className="h-4 w-4 mr-1" />}
              {status === "completed" && <CheckCircle2 className="h-4 w-4 mr-1" />}
              {status === "rejected" && <XCircle className="h-4 w-4 mr-1" />}
              {status}
            </Button>
          ))}
        </div>

        {/* Requests List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : requests.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No {filter !== "all" ? filter : ""} requests</p>
              <p className="text-sm text-muted-foreground">
                {filter === "pending" 
                  ? "All withdrawal requests have been processed" 
                  : "No requests found with this status"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <Card key={request.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-primary" />
                        {formatNaira(request.amount_kobo)}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {request.user_name || "Unknown User"} • {request.user_email}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={
                        request.status === "pending"
                          ? "secondary"
                          : request.status === "completed"
                          ? "default"
                          : "destructive"
                      }
                      className="capitalize"
                    >
                      {request.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                      {request.status === "completed" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                      {request.status === "rejected" && <XCircle className="h-3 w-3 mr-1" />}
                      {request.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Bank Details - Easy to copy */}
                  <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Bank:</span>
                        <span className="font-medium">{request.bank_name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(request.bank_name, "Bank name")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Account:</span>
                        <span className="font-mono font-medium text-lg">{request.account_number}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(request.account_number, "Account number")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Name:</span>
                        <span className="font-medium">{request.account_name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(request.account_name, "Account name")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <div className="flex items-center gap-2 text-sm">
                        <Wallet className="h-4 w-4 text-primary" />
                        <span className="text-muted-foreground">Amount:</span>
                        <span className="font-bold text-primary text-lg">
                          {formatNaira(request.amount_kobo)}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard((request.amount_kobo / 100).toString(), "Amount")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Timestamps and notes */}
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Requested: {formatDate(request.created_at)}</p>
                    {request.processed_at && (
                      <p>Processed: {formatDate(request.processed_at)}</p>
                    )}
                    {request.admin_notes && (
                      <p className="italic">Notes: {request.admin_notes}</p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {request.status === "pending" && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        className="flex-1"
                        onClick={() => setConfirmDialog({ open: true, action: "approve", request })}
                        disabled={processing === request.id}
                      >
                        {processing === request.id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                        )}
                        Approve & Mark Paid
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => setConfirmDialog({ open: true, action: "reject", request })}
                        disabled={processing === request.id}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ ...confirmDialog, open: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === "approve" ? "Approve Withdrawal?" : "Reject Withdrawal?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === "approve" ? (
                <>
                  Confirm that you have manually transferred{" "}
                  <strong>{confirmDialog.request && formatNaira(confirmDialog.request.amount_kobo)}</strong>{" "}
                  to the user's bank account. This action cannot be undone.
                </>
              ) : (
                <>
                  This will reject the withdrawal request and refund{" "}
                  <strong>{confirmDialog.request && formatNaira(confirmDialog.request.amount_kobo)}</strong>{" "}
                  back to the user's wallet.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Add a note (optional)..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="resize-none"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleProcess(confirmDialog.action)}
              className={confirmDialog.action === "reject" ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {confirmDialog.action === "approve" ? "Confirm Payment Sent" : "Reject & Refund"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
