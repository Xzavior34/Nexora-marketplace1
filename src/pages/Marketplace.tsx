import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProductCardSkeleton } from '@/components/ui/skeleton';
import { ProductImageCarousel } from '@/components/marketplace/ProductImageCarousel';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Search,
  ShoppingCart,
  Package,
  Download,
  Loader2,
  ImageIcon,
  MessageCircle,
  Send,
  Star,
  AlertTriangle,
  ClipboardList
} from 'lucide-react';
import { format } from 'date-fns';
import { DeleteProductButton } from '@/components/marketplace/DeleteProductButton';
import { checkMessageSafety } from '@/lib/safety';
import { TransactionSuccessModal } from '@/components/TransactionSuccessModal';
import { ProductModal } from '@/components/marketplace/ProductModal';

interface Product {
  id: string;
  title: string;
  description: string;
  price_kobo: number;
  category: string;
  image_url: string | null;
  image_urls?: string[]; 
  product_type: string;
  stock: number;
  seller_id: string;
  seller?: {
    full_name: string | null;
    avatar_url: string | null;
    average_rating: number | null;
  };
}

interface ChatMessage {
  id: string;
  content: string;
  sender_id: string;
  recipient_id?: string | null;
  created_at: string;
  sender?: { full_name: string | null; avatar_url: string | null };
}

const categories = ['All', 'Electronics', 'Books', 'Fashion', 'Food', 'Services', 'Digital', 'Other'];

export default function Marketplace() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsProduct, setDetailsProduct] = useState<Product | null>(null);

  const [buying, setBuying] = useState(false);
  const [successModal, setSuccessModal] = useState({ open: false, amount: '' });
  
  const [chatOpen, setChatOpen] = useState(false);
  const [chatProduct, setChatProduct] = useState<Product | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [safetyError, setSafetyError] = useState('');
  const [shake, setShake] = useState(false);

  useEffect(() => {
    fetchProducts();
    const channel = supabase
      .channel('products-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => fetchProducts())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [category]);

  useEffect(() => {
    if (!chatOpen || !chatProduct || !user) return;

    const chatChannel = supabase
      .channel(`chat-${chatProduct.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `task_id=eq.${chatProduct.id}` },
        async (payload) => {
          const newMsg = payload.new as ChatMessage;
          const isRelevant = 
            (newMsg.sender_id === user.id && newMsg.recipient_id === chatProduct.seller_id) || 
            (newMsg.sender_id === chatProduct.seller_id && newMsg.recipient_id === user.id);

          if (!isRelevant) return;
          
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', newMsg.sender_id)
            .single();

          setChatMessages((prev) => {
            if (prev.some((msg) => msg.id === newMsg.id)) return prev;
            return [...prev, { ...newMsg, sender: senderProfile || undefined }];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(chatChannel); };
  }, [chatOpen, chatProduct, user]);

  const fetchProducts = async () => {
    setLoading(true);
    let query = supabase
      .from('products')
      .select('*')
      .eq('is_available', true)
      .gt('stock', 0)
      .order('created_at', { ascending: false });

    if (category !== 'All') query = query.eq('category', category);

    const { data, error } = await query;
    if (error) { toast.error('Failed to load products'); setLoading(false); return; }

    const sellerIds = [...new Set(data?.map(p => p.seller_id) || [])];
    const { data: sellers } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, average_rating')
      .in('id', sellerIds);

    const sellerMap = new Map(sellers?.map(s => [s.id, s]) || []);
    setProducts((data || []).map(p => ({ ...p, seller: sellerMap.get(p.seller_id) || undefined })));
    setLoading(false);
  };

  const filteredProducts = products.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleBuy = (product: Product) => {
    if (!user) { toast.error('Please sign in'); navigate('/auth'); return; }
    if (product.seller_id === user.id) { toast.error("You can't buy your own product"); return; }
    setSelectedProduct(product);
    setBuyModalOpen(true);
  };

  const handleOpenChat = async (product: Product) => {
    if (!user) { toast.error('Please sign in'); navigate('/auth'); return; }
    if (product.seller_id === user.id) { toast.error("You can't chat with yourself"); return; }
    setChatProduct(product);
    setChatOpen(true);
    setLoadingChat(true);
    
    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('task_id', product.id)
      .or(`and(sender_id.eq.${user.id},recipient_id.eq.${product.seller_id}),and(sender_id.eq.${product.seller_id},recipient_id.eq.${user.id})`)
      .order('created_at', { ascending: true });
    
    if (messages) {
      const senderIds = [...new Set(messages.map(m => m.sender_id))];
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', senderIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      setChatMessages(messages.map(m => ({ ...m, sender: profileMap.get(m.sender_id) || undefined })));
    }
    setLoadingChat(false);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !chatProduct) return;
    const safetyResult = checkMessageSafety(newMessage.trim());
    if (!safetyResult.safe) {
      if (safetyError) { setShake(true); setTimeout(() => setShake(false), 500); }
      setSafetyError(safetyResult.message);
      setTimeout(() => setSafetyError(''), 5000);
      return;
    }
    setSafetyError('');
    setSendingMessage(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({ 
          task_id: chatProduct.id, 
          sender_id: user.id, 
          recipient_id: chatProduct.seller_id,
          content: newMessage.trim() 
        })
        .select()
        .single();
      if (error) throw error;
      setChatMessages(prev => [...prev, { ...data, sender: { full_name: profile?.full_name || null, avatar_url: profile?.avatar_url || null } }]);
      setNewMessage('');
    } catch { toast.error('Failed to send message'); }
    finally { setSendingMessage(false); }
  };

  const confirmPurchase = async () => {
    if (!selectedProduct || !user || !profile) return;
    setBuying(true);
    const toastId = toast.loading("Securing funds in escrow...");

    try {
      // Logic: Move funds to Escrow and award Spin Ticket via RPC
      const { data: result, error: rpcErr } = await supabase.rpc('purchase_product_escrow', {
        p_product_id: selectedProduct.id,
        p_buyer_id: user.id,
        p_seller_id: selectedProduct.seller_id
      });

      if (rpcErr) throw rpcErr;
      const res = result as any;
      
      if (!res.success) {
        toast.error(res.error || 'Purchase failed', { id: toastId });
        return;
      }

      setBuyModalOpen(false);
      toast.success("Funds held in Escrow! You earned 1 Spin Ticket! 🎟️", { id: toastId });
      
      setSuccessModal({ open: true, amount: formatNaira(selectedProduct.price_kobo) });

      // Automatic Redirection to Reward Wheel
      setTimeout(() => {
        navigate(`/spin-to-win?productId=${selectedProduct.id}`);
      }, 1500);

      setSelectedProduct(null);
      fetchProducts();
    } catch (err) { 
      toast.error('Failed to complete purchase', { id: toastId }); 
    } finally { 
      setBuying(false); 
    }
  };

  const formatNaira = (kobo: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(kobo / 100);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden w-full">
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-7xl">
        
        {/* Header */}
        <div className="flex flex-row items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Marketplace</h1>
            <p className="text-sm text-muted-foreground hidden sm:block">Buy and sell securely with Escrow</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/marketplace/orders')} size="sm" className="shrink-0 border-primary text-primary hover:bg-primary/5">
              <ClipboardList className="h-4 w-4 mr-1" /> My Orders
            </Button>
            <Button onClick={() => navigate('/post-product')} size="sm" className="shrink-0">
              <Plus className="h-4 w-4 mr-1" />Sell Product
            </Button>
          </div>
        </div>

        {/* Filters: scrollable category chips + search */}
        <div className="space-y-3 mb-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 input-premium rounded-full h-11"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`shrink-0 px-4 h-9 rounded-full text-xs font-medium border transition-all ${
                  category === cat
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Recommended strip */}
        {!loading && filteredProducts.length > 0 && category === 'All' && !search && (
          <section className="mb-6">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-base font-semibold text-foreground">Recommended for you</h2>
              <span className="text-xs text-muted-foreground">Trending now</span>
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-2">
              {filteredProducts.slice(0, 6).map((product) => (
                <Card
                  key={`rec-${product.id}`}
                  className="shrink-0 w-40 overflow-hidden cursor-pointer hover:shadow-lg transition-all group"
                  onClick={() => { setDetailsProduct(product); setDetailsModalOpen(true); }}
                >
                  <div className="aspect-square bg-muted relative overflow-hidden">
                    <ProductImageCarousel
                      images={product.image_urls?.length ? product.image_urls : product.image_url ? [product.image_url] : []}
                      alt={product.title}
                    />
                  </div>
                  <CardContent className="p-2.5">
                    <p className="text-sm font-bold text-primary">{formatNaira(product.price_kobo)}</p>
                    <h3 className="text-xs font-medium line-clamp-1 mt-0.5">{product.title}</h3>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 md:gap-4 w-full">
            {[...Array(10)].map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">No products found</h2>
            <p className="text-muted-foreground mb-4">{search ? 'Try a different search term' : 'Be the first to list a product!'}</p>
            {user && <Button onClick={() => navigate('/post-product')}><Plus className="h-4 w-4 mr-2" />Sell Something</Button>}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 md:gap-4 w-full">
            {filteredProducts.map((product) => (
              <Card 
                key={product.id} 
                className="overflow-hidden hover:shadow-lg transition-shadow group cursor-pointer flex flex-col"
                onClick={() => { setDetailsProduct(product); setDetailsModalOpen(true); }}
              >
                <div className="aspect-square bg-muted relative overflow-hidden shrink-0">
                  <ProductImageCarousel
                    images={product.image_urls?.length ? product.image_urls : product.image_url ? [product.image_url] : []}
                    alt={product.title}
                  />
                  <Badge className="absolute top-2 left-2 text-[10px] z-10" variant="secondary">
                    {product.product_type === 'digital' ? <><Download className="h-3 w-3 mr-0.5" />Digital</> : <><Package className="h-3 w-3 mr-0.5" />Physical</>}
                  </Badge>
                </div>

                <CardContent className="p-3 space-y-1 flex-1">
                  <p className="text-lg font-bold text-primary leading-tight">{formatNaira(product.price_kobo)}</p>
                  <h3 className="font-medium text-foreground text-sm line-clamp-2 leading-snug">{product.title}</h3>
                  <div className="flex items-center gap-1 pt-1 mt-auto">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={product.seller?.avatar_url || undefined} />
                      <AvatarFallback className="text-[8px]">{product.seller?.full_name?.charAt(0) || 'S'}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground truncate">{product.seller?.full_name || 'Seller'}</span>
                  </div>
                </CardContent>

                <CardFooter className="p-3 pt-0 flex gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {user && product.seller_id === user.id ? (
                    <DeleteProductButton productId={product.id} productTitle={product.title} onDeleted={fetchProducts} />
                  ) : (
                    <>
                      <Button size="sm" className="flex-1 h-9 text-xs" onClick={(e) => { e.stopPropagation(); handleBuy(product); }} disabled={product.stock === 0}>
                        <ShoppingCart className="h-3.5 w-3.5 mr-1" />
                        {product.stock === 0 ? 'Sold Out' : 'Buy Now'}
                      </Button>
                      {user && (
                        <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={(e) => { e.stopPropagation(); handleOpenChat(product); }}>
                          <MessageCircle className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>

      <ProductModal 
        product={detailsProduct} 
        isOpen={detailsModalOpen} 
        onClose={() => setDetailsModalOpen(false)} 
        onBuy={handleBuy} 
        onChat={handleOpenChat} 
      />

      <Dialog open={buyModalOpen} onOpenChange={setBuyModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Purchase</DialogTitle>
            <DialogDescription>Your funds will be held in Escrow until you confirm receipt.</DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4 py-4">
              <div className="flex justify-between"><span className="text-muted-foreground">Price</span><span className="font-semibold">{formatNaira(selectedProduct.price_kobo)}</span></div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Your Balance</span>
                <span className={profile && profile.wallet_balance < selectedProduct.price_kobo ? 'text-destructive' : 'text-foreground'}>{formatNaira(profile?.wallet_balance || 0)}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBuyModalOpen(false)}>Cancel</Button>
            <Button onClick={confirmPurchase} disabled={buying || !profile || (selectedProduct ? profile.wallet_balance < selectedProduct.price_kobo : true)}>
              {buying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShoppingCart className="h-4 w-4 mr-2" />}
              Pay Securely
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TransactionSuccessModal open={successModal.open} onClose={() => setSuccessModal({ open: false, amount: '' })} amount={successModal.amount} message="Purchase successful! Funds held in Escrow." />

      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5" />Chat with Seller</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-64 border rounded-lg p-4">
            {loadingChat ? (
              <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : chatMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <MessageCircle className="h-8 w-8 mb-2 opacity-50" /><p className="text-sm">No messages yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {chatMessages.map((msg) => {
                  const isOwn = msg.sender_id === user?.id;
                  return (
                    <div key={msg.id} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={msg.sender?.avatar_url || undefined} />
                        <AvatarFallback>{msg.sender?.full_name?.charAt(0) || 'U'}</AvatarFallback>
                      </Avatar>
                      <div className={`max-w-[70%] ${isOwn ? 'text-right' : ''}`}>
                        <div className={`rounded-2xl px-3 py-2 text-sm ${isOwn ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted rounded-tl-sm'}`}>{msg.content}</div>
                        <p className="text-xs text-muted-foreground mt-1">{format(new Date(msg.created_at), 'h:mm a')}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
          <div className="space-y-2">
            <div className={`flex gap-2 ${shake ? 'animate-shake' : ''}`}>
              <Textarea placeholder="Type a message..." value={newMessage} onChange={(e) => { setNewMessage(e.target.value); if (safetyError) setSafetyError(''); }} className={`flex-1 min-h-[60px] max-h-[120px] ${safetyError ? 'border-destructive' : ''}`} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} />
              <Button size="icon" onClick={handleSendMessage} disabled={!newMessage.trim() || sendingMessage}>
                {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            {safetyError && (
              <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 p-2 rounded-md">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" /><span>{safetyError}</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
