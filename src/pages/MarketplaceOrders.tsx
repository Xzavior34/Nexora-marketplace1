import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'sonner';
import { Loader2, Package, CheckCircle, AlertTriangle, Wallet } from 'lucide-react';

export default function MarketplaceOrders() {
  const { user } = useAuth();
  const [buyingOrders, setBuyingOrders] = useState([]);
  const [sellingOrders, setSellingOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (user) fetchAllOrders(); }, [user]);

  const fetchAllOrders = async () => {
    setLoading(true);
    // Fetch items you bought
    const { data: bought } = await supabase
      .from('escrow_transactions')
      .select('*, products(title, image_url)')
      .eq('payer_id', user?.id);
    
    // Fetch items you are selling
    const { data: sold } = await supabase
      .from('escrow_transactions')
      .select('*, products(title, image_url)')
      .eq('payee_id', user?.id);

    setBuyingOrders(bought || []);
    setSellingOrders(sold || []);
    setLoading(false);
  };

  const handleRelease = async (productId: string) => {
    const toastId = toast.loading("Releasing funds to seller...");
    try {
      const { data, error } = await supabase.rpc('release_product_escrow', {
        p_product_id: productId,
        p_buyer_id: user?.id
      });
      if (error) throw error;
      toast.success("Payment released! Seller has been paid.", { id: toastId });
      fetchAllOrders();
    } catch (err: any) {
      toast.error(err.message, { id: toastId });
    }
  };

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Marketplace Manager</h1>
      
      <Tabs defaultValue="buying">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="buying">My Purchases</TabsTrigger>
          <TabsTrigger value="selling">My Sales (Dashboard)</TabsTrigger>
        </TabsList>

        <TabsContent value="buying">
          <div className="space-y-4">
            {buyingOrders.length === 0 ? <p>No purchases yet.</p> : buyingOrders.map(order => (
              <Card key={order.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <img src={order.products?.image_url} className="w-12 h-12 rounded object-cover" />
                    <div>
                      <h3 className="font-bold">{order.products?.title}</h3>
                      <p className="text-sm text-muted-foreground">₦{(order.amount_kobo/100).toLocaleString()}</p>
                    </div>
                  </div>
                  {order.status === 'held' ? (
                    <Button onClick={() => handleRelease(order.product_id)} className="bg-green-600 hover:bg-green-700">
                      Confirm & Release
                    </Button>
                  ) : (
                    <Badge variant="outline" className="text-green-600 border-green-600">Released</Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="selling">
          <div className="space-y-4">
            {sellingOrders.length === 0 ? <p>No sales yet.</p> : sellingOrders.map(order => (
              <Card key={order.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <img src={order.products?.image_url} className="w-12 h-12 rounded object-cover" />
                    <div>
                      <h3 className="font-bold">{order.products?.title}</h3>
                      <p className="text-sm text-muted-foreground">Status: <span className="capitalize font-medium">{order.status}</span></p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">₦{((order.amount_kobo - order.platform_fee_kobo)/100).toLocaleString()}</p>
                    {order.status === 'held' && <p className="text-[10px] text-amber-600">Waiting for buyer...</p>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
