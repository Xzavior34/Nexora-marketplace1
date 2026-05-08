import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { MessageCircle, Search, ArrowLeft, Send, Loader2, AlertTriangle, Paperclip } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useUserOnlineStatus } from '@/hooks/useUserOnlineStatus';
import { AvatarWithStatus } from '@/components/OnlineIndicator';
import { checkMessageSafety } from '@/lib/safety';
import { toast } from 'sonner';

interface Conversation {
  id: string;
  task_id: string;
  application_id: string | null;
  other_user_id: string;
  other_user_name: string | null;
  other_user_avatar: string | null;
  task_title: string;
  last_message: string;
  last_message_time: string;
  last_sender_id: string;
  unread: boolean;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  recipient_id?: string | null;
  task_id?: string | null;
  application_id?: string | null;
  created_at: string;
  sender?: { full_name: string | null; avatar_url: string | null } | null;
}

export default function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [safetyError, setSafetyError] = useState('');
  const [shake, setShake] = useState(false);

  const userIds = useMemo(() => conversations.map(c => c.other_user_id).filter(Boolean), [conversations]);
  const { onlineStatus } = useUserOnlineStatus(userIds);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    if (user) { fetchConversations(); setupRealtimeConversations(); }
  }, [user]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    if (selectedConversation) {
      fetchMessages(selectedConversation);
      cleanup = setupRealtimeMessages(selectedConversation);
      markConversationAsRead(selectedConversation);
    }
    return () => { cleanup?.(); };
  }, [selectedConversation]);

  const setupRealtimeConversations = () => {
    const channel = supabase.channel('messages-realtime').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => { fetchConversations(); }).subscribe();
    return () => { supabase.removeChannel(channel); };
  };

  const fetchConversations = async () => {
    if (!user) return;

    try {
      const convos: Conversation[] = [];

      // 1. GIG CONVERSATIONS
      const { data: tasks } = await supabase.from('tasks').select(`id, title, poster_id, assignee_id, poster:profiles!tasks_poster_id_fkey(id, full_name, avatar_url), assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url)`).or(`poster_id.eq.${user.id},assignee_id.eq.${user.id}`).not('assignee_id', 'is', null);
      for (const task of tasks || []) {
        const { data: lastMsg } = await supabase.from('messages').select('content, created_at, sender_id').eq('task_id', task.id).is('application_id', null).order('created_at', { ascending: false }).limit(1).maybeSingle();
        if (lastMsg) {
          const isPoster = task.poster_id === user.id;
          const otherUser = isPoster ? task.assignee : task.poster;
          convos.push({ id: task.id, task_id: task.id, application_id: null, other_user_id: otherUser?.id || '', other_user_name: otherUser?.full_name || 'Unknown', other_user_avatar: otherUser?.avatar_url || null, task_title: task.title, last_message: lastMsg.content, last_message_time: lastMsg.created_at, last_sender_id: lastMsg.sender_id, unread: lastMsg.sender_id !== user.id });
        }
      }

      // Gig Apps (Applicant View)
      const { data: applicantApps } = await supabase.from('task_applications').select(`id, task_id, applicant_id, applicant:profiles!task_applications_applicant_id_fkey(id, full_name, avatar_url), task:tasks!task_applications_task_id_fkey(id, title, poster_id, poster:profiles!tasks_poster_id_fkey(id, full_name, avatar_url))`).eq('applicant_id', user.id);
      for (const app of applicantApps || []) {
        const { data: lastMsg } = await supabase.from('messages').select('content, created_at, sender_id').eq('application_id', app.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
        if (lastMsg && app.task) {
          const otherUser = app.task.poster;
          convos.push({ id: `app-${app.id}`, task_id: app.task_id, application_id: app.id, other_user_id: otherUser?.id || '', other_user_name: otherUser?.full_name || 'Unknown', other_user_avatar: otherUser?.avatar_url || null, task_title: app.task.title, last_message: lastMsg.content, last_message_time: lastMsg.created_at, last_sender_id: lastMsg.sender_id, unread: lastMsg.sender_id !== user.id });
        }
      }

      // Gig Apps (Poster View)
      const { data: posterTasks } = await supabase.from('tasks').select('id, title').eq('poster_id', user.id);
      if (posterTasks) {
        for (const pTask of posterTasks) {
          const { data: apps } = await supabase.from('task_applications').select(`id, applicant_id, applicant:profiles!task_applications_applicant_id_fkey(id, full_name, avatar_url)`).eq('task_id', pTask.id);
          for (const app of apps || []) {
            if (convos.some(c => c.application_id === app.id)) continue;
            const { data: lastMsg } = await supabase.from('messages').select('content, created_at, sender_id').eq('application_id', app.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
            if (lastMsg) {
              const otherUser = app.applicant;
              convos.push({ id: `app-poster-${app.id}`, task_id: pTask.id, application_id: app.id, other_user_id: otherUser?.id || '', other_user_name: otherUser?.full_name || 'Unknown', other_user_avatar: otherUser?.avatar_url || null, task_title: pTask.title, last_message: lastMsg.content, last_message_time: lastMsg.created_at, last_sender_id: lastMsg.sender_id, unread: lastMsg.sender_id !== user.id });
            }
          }
        }
      }

      // 2. MARKETPLACE LOGIC
      const { data: userMsgs } = await supabase.from('messages').select('task_id').eq('sender_id', user.id).is('application_id', null).not('recipient_id', 'is', null);
      const userTaskIds = [...new Set(userMsgs?.map(m => m.task_id) || [])];
      
      if (userTaskIds.length > 0) {
        const { data: productsBought } = await supabase.from('products').select('id, title, seller_id').in('id', userTaskIds).neq('seller_id', user.id);
        if (productsBought && productsBought.length > 0) {
          const sellerIds = [...new Set(productsBought.map(p => p.seller_id))];
          const { data: sellerProfiles } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', sellerIds);
          const sellerMap = new Map(sellerProfiles?.map(p => [p.id, p]));

          for (const prod of productsBought) {
             const { data: lastMsg } = await supabase.from('messages').select('content, created_at, sender_id')
               .eq('task_id', prod.id).or(`and(sender_id.eq.${user.id},recipient_id.eq.${prod.seller_id}),and(sender_id.eq.${prod.seller_id},recipient_id.eq.${user.id})`)
               .order('created_at', { ascending: false }).limit(1).maybeSingle();
               
             const seller = sellerMap.get(prod.seller_id);
             if (lastMsg && seller) {
                convos.push({ id: `prod-${prod.id}-${seller.id}`, task_id: prod.id, application_id: null, other_user_id: seller.id, other_user_name: seller.full_name, other_user_avatar: seller.avatar_url, task_title: `📦 ${prod.title}`, last_message: lastMsg.content, last_message_time: lastMsg.created_at, last_sender_id: lastMsg.sender_id, unread: lastMsg.sender_id !== user.id });
             }
          }
        }
      }

      const { data: myProducts } = await supabase.from('products').select('id, title').eq('seller_id', user.id);
      if (myProducts && myProducts.length > 0) {
        const myProductIds = myProducts.map(p => p.id);
        const { data: incomingMsgs } = await supabase.from('messages').select('task_id, sender_id').in('task_id', myProductIds).eq('recipient_id', user.id);
        
        const uniqueBuyers: {product_id: string, buyer_id: string}[] = [];
        const seen = new Set();
        incomingMsgs?.forEach(m => {
          const key = `${m.task_id}-${m.sender_id}`;
          if (!seen.has(key)) { seen.add(key); uniqueBuyers.push({ product_id: m.task_id, buyer_id: m.sender_id }); }
        });

        if (uniqueBuyers.length > 0) {
          const buyerIds = [...new Set(uniqueBuyers.map(b => b.buyer_id))];
          const { data: buyerProfiles } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', buyerIds);
          const buyerMap = new Map(buyerProfiles?.map(p => [p.id, p]));

          for (const pair of uniqueBuyers) {
            const prod = myProducts.find(p => p.id === pair.product_id);
            const buyer = buyerMap.get(pair.buyer_id);
            const { data: lastMsg } = await supabase.from('messages').select('content, created_at, sender_id')
              .eq('task_id', pair.product_id).or(`and(sender_id.eq.${user.id},recipient_id.eq.${pair.buyer_id}),and(sender_id.eq.${pair.buyer_id},recipient_id.eq.${user.id})`)
              .order('created_at', { ascending: false }).limit(1).maybeSingle();

            if (prod && buyer && lastMsg) {
               convos.push({ id: `prod-${prod.id}-${buyer.id}`, task_id: prod.id, application_id: null, other_user_id: buyer.id, other_user_name: buyer.full_name, other_user_avatar: buyer.avatar_url, task_title: `📦 ${prod.title}`, last_message: lastMsg.content, last_message_time: lastMsg.created_at, last_sender_id: lastMsg.sender_id, unread: lastMsg.sender_id !== user.id });
            }
          }
        }
      }

      // 3. NEW: DIRECT ADMIN MESSAGES (No Task ID)
      const { data: directMsgs } = await supabase
        .from('messages')
        .select('content, created_at, sender_id, recipient_id')
        .is('task_id', null)
        .is('application_id', null)
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (directMsgs && directMsgs.length > 0) {
        const otherUserIds = new Set<string>();
        directMsgs.forEach(m => {
          if (m.sender_id !== user.id) otherUserIds.add(m.sender_id);
          if (m.recipient_id && m.recipient_id !== user.id) otherUserIds.add(m.recipient_id);
        });

        if (otherUserIds.size > 0) {
          const { data: dmProfiles } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', Array.from(otherUserIds));
          const dmProfileMap = new Map(dmProfiles?.map(p => [p.id, p]));

          otherUserIds.forEach(otherId => {
            const lastMsg = directMsgs.find(m => (m.sender_id === user.id && m.recipient_id === otherId) || (m.sender_id === otherId && m.recipient_id === user.id));
            const profile = dmProfileMap.get(otherId);

            if (lastMsg && profile) {
              convos.push({ 
                id: `dm-${otherId}`, 
                task_id: 'direct', // Placeholder so it doesn't break UI
                application_id: null, 
                other_user_id: profile.id, 
                other_user_name: profile.full_name || 'User', 
                other_user_avatar: profile.avatar_url, 
                task_title: `🛡️ Direct Message`, 
                last_message: lastMsg.content, 
                last_message_time: lastMsg.created_at, 
                last_sender_id: lastMsg.sender_id, 
                unread: lastMsg.sender_id !== user.id 
              });
            }
          });
        }
      }

      convos.sort((a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime());
      setConversations(convos);

    } catch (err) { console.error('Error fetching conversations:', err); } 
    finally { setLoading(false); }
  };

  const fetchMessages = async (convo: Conversation) => {
    setMessagesLoading(true);
    try {
      let query = supabase.from('messages').select('*').order('created_at', { ascending: true });

      // NEW: Filter explicitly for Direct Messages
      if (convo.id.startsWith('dm-')) {
        query = query.is('task_id', null).is('application_id', null).or(`and(sender_id.eq.${user!.id},recipient_id.eq.${convo.other_user_id}),and(sender_id.eq.${convo.other_user_id},recipient_id.eq.${user!.id})`);
      } else if (convo.id.startsWith('prod-')) {
        query = query.eq('task_id', convo.task_id).or(`and(sender_id.eq.${user!.id},recipient_id.eq.${convo.other_user_id}),and(sender_id.eq.${convo.other_user_id},recipient_id.eq.${user!.id})`);
      } else if (convo.application_id) {
        query = query.eq('application_id', convo.application_id);
      } else {
        query = query.is('application_id', null).eq('task_id', convo.task_id);
      }

      const { data, error } = await query;
      if (error) throw error;

      const senderIds = [...new Set(data?.map(m => m.sender_id) || [])];
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', senderIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      setMessages((data || []).map(m => ({ ...m, sender: profileMap.get(m.sender_id) || null })));
    } catch (err) { console.error('Error fetching messages:', err); } 
    finally { setMessagesLoading(false); }
  };

  const setupRealtimeMessages = (convo: Conversation) => {
    // NEW: Listen to all message inserts and filter purely in Javascript to avoid missing any DMs
    const channel = supabase.channel(`messages-page-${convo.id}`).on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages'
      },
      async (payload) => {
        const newMsg = payload.new as Message;
        
        // Manual JS Filtering ensures we route the realtime message to the exact right chat
        if (convo.id.startsWith('dm-')) {
          if (newMsg.task_id || newMsg.application_id) return;
          const isRelevant = (newMsg.sender_id === user?.id && newMsg.recipient_id === convo.other_user_id) || (newMsg.sender_id === convo.other_user_id && newMsg.recipient_id === user?.id);
          if (!isRelevant) return;
        } else if (convo.id.startsWith('prod-')) {
          if (newMsg.task_id !== convo.task_id) return;
          const isRelevant = (newMsg.sender_id === user?.id && newMsg.recipient_id === convo.other_user_id) || (newMsg.sender_id === convo.other_user_id && newMsg.recipient_id === user?.id);
          if (!isRelevant) return;
        } else if (convo.application_id) {
          if (newMsg.application_id !== convo.application_id) return;
        } else {
          if (newMsg.task_id !== convo.task_id || newMsg.application_id !== null) return;
        }
        
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, { ...newMsg, sender: null }];
        });
        
        const { data: profile } = await supabase.from('profiles').select('id, full_name, avatar_url').eq('id', newMsg.sender_id).single();
        if (profile) setMessages(prev => prev.map(m => m.id === newMsg.id ? { ...m, sender: profile } : m));
      }
    ).subscribe();
    return () => { supabase.removeChannel(channel); };
  };

  const markConversationAsRead = (convo: Conversation) => {
    setConversations(prev => prev.map(c => c.id === convo.id ? { ...c, unread: false } : c));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !selectedConversation) return;

    const maxSize = 10 * 1024 * 1024; // 10MB limit
    if (file.size > maxSize) {
      toast.error('File too large. Max 10MB.');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      
      const { data, error } = await supabase.storage.from('chat-attachments').upload(path, file);
      if (error) throw error;

      const { data: urlData } = supabase.storage.from('chat-attachments').getPublicUrl(data.path);
      const fileUrl = urlData.publicUrl;
      const isImage = file.type.startsWith('image/');
      const content = isImage ? `📷 [Image: ${file.name}]\n${fileUrl}` : `📎 [File: ${file.name}]\n${fileUrl}`;

      // Set DB values appropriately
      const dbTaskId = selectedConversation.id.startsWith('dm-') ? null : selectedConversation.task_id;
      const dbRecipientId = (selectedConversation.id.startsWith('prod-') || selectedConversation.id.startsWith('dm-')) ? selectedConversation.other_user_id : null;

      await supabase.from('messages').insert({
        task_id: dbTaskId,
        application_id: selectedConversation.application_id,
        sender_id: user.id,
        recipient_id: dbRecipientId,
        content,
      });

      toast.success('File sent!');
      fetchConversations();
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !selectedConversation) return;

    const safetyResult = checkMessageSafety(newMessage.trim());
    if (!safetyResult.safe) {
      if (safetyError) { setShake(true); setTimeout(() => setShake(false), 500); }
      setSafetyError(safetyResult.message);
      setTimeout(() => setSafetyError(''), 5000);
      return;
    }

    setSafetyError('');
    const messageContent = newMessage.trim();
    setNewMessage('');
    setSending(true);

    const optimisticMessage: Message = { id: `temp-${Date.now()}`, content: messageContent, sender_id: user.id, created_at: new Date().toISOString(), sender: { full_name: user.email?.split('@')[0] || 'You', avatar_url: null } };
    setMessages(prev => [...prev, optimisticMessage]);

    // Set DB values appropriately
    const dbTaskId = selectedConversation.id.startsWith('dm-') ? null : selectedConversation.task_id;
    const dbRecipientId = (selectedConversation.id.startsWith('prod-') || selectedConversation.id.startsWith('dm-')) ? selectedConversation.other_user_id : null;

    try {
      const { data, error } = await supabase.from('messages').insert({
        task_id: dbTaskId,
        application_id: selectedConversation.application_id,
        sender_id: user.id,
        recipient_id: dbRecipientId, 
        content: messageContent,
      }).select().single();

      if (error) throw error;
      setMessages(prev => prev.map(m => m.id === optimisticMessage.id ? { ...data, sender: optimisticMessage.sender } : m));

      if (selectedConversation.other_user_id) {
        supabase.functions.invoke('send-push-notification', { body: { userId: selectedConversation.other_user_id, title: 'New Message', body: messageContent.substring(0, 50), data: { taskId: selectedConversation.task_id } } }).catch(console.error);
      }
      fetchConversations();
    } catch (err) {
      console.error('Error sending message:', err);
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      setNewMessage(messageContent); 
    } finally { setSending(false); }
  };

  const renderMessageContent = (content: string) => {
    const urlRegex = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|svg)(\?[^\s]*)?)/gi;
    const fileUrlRegex = /📎 \[File: (.+?)\]\n(https?:\/\/[^\s]+)/;
    const imageUrlRegex = /📷 \[Image: (.+?)\]\n(https?:\/\/[^\s]+)/;

    const imageMatch = content.match(imageUrlRegex);
    if (imageMatch) {
      return (
        <div className="space-y-1">
          <img src={imageMatch[2]} alt={imageMatch[1]} className="max-w-full rounded-lg max-h-48 object-cover cursor-pointer" onClick={() => window.open(imageMatch[2], '_blank')} />
          <p className="text-xs opacity-70">{imageMatch[1]}</p>
        </div>
      );
    }

    const fileMatch = content.match(fileUrlRegex);
    if (fileMatch) {
      return (
        <a href={fileMatch[2]} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 underline text-sm">
          <Paperclip className="h-3 w-3" />
          {fileMatch[1]}
        </a>
      );
    }

    const parts = content.split(urlRegex);
    if (parts.length > 1) {
      return (
        <div className="space-y-1">
          <p>{content.replace(urlRegex, '')}</p>
          {content.match(urlRegex)?.map((url, i) => (
            <img key={i} src={url} alt="Shared" className="max-w-full rounded-lg max-h-48 object-cover" />
          ))}
        </div>
      );
    }

    return <span>{content}</span>;
  };

  const filteredConversations = conversations.filter(c => c.other_user_name?.toLowerCase().includes(searchQuery.toLowerCase()) || c.task_title.toLowerCase().includes(searchQuery.toLowerCase()));
  const unreadCount = conversations.filter(c => c.unread).length;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Sign in to view messages</h2>
          <Button onClick={() => navigate('/auth')}>Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-0 md:px-4 py-0 md:py-6">
        <div className="flex h-[calc(100vh-4rem)] md:h-[calc(100vh-8rem)] bg-card rounded-none md:rounded-xl border-0 md:border overflow-hidden">
          {/* Conversations List */}
          <div className={`w-full md:w-80 lg:w-96 border-r flex flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b">
              <div className="flex items-center gap-2 mb-4"><h1 className="text-xl font-bold">Messages</h1>{unreadCount > 0 && (<Badge variant="destructive" className="rounded-full px-2 py-0.5 text-xs">{unreadCount}</Badge>)}</div>
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search conversations..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" /></div>
            </div>

            <ScrollArea className="flex-1">
              {loading ? (
                <div className="p-4 space-y-4">{[1, 2, 3].map(i => (<div key={i} className="flex gap-3"><Skeleton className="h-12 w-12 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-full" /></div></div>))}</div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground"><MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" /><p className="font-medium">No conversations yet</p><p className="text-sm mt-1">Start chatting on a gig or product to see messages here</p></div>
              ) : (
                <div className="divide-y">
                  {filteredConversations.map(convo => (
                    <button key={convo.id} onClick={() => setSelectedConversation(convo)} className={`w-full p-4 flex gap-3 hover:bg-muted/50 transition-colors text-left relative ${selectedConversation?.id === convo.id ? 'bg-muted' : ''}`}>
                      {convo.unread && <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary" />}
                      <AvatarWithStatus isOnline={onlineStatus[convo.other_user_id] || false} size="md">
                        <Avatar className="h-12 w-12"><AvatarImage src={convo.other_user_avatar || undefined} /><AvatarFallback className="bg-primary/10 text-primary">{convo.other_user_name?.charAt(0) || 'U'}</AvatarFallback></Avatar>
                      </AvatarWithStatus>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`font-medium truncate ${convo.unread ? 'text-foreground' : 'text-foreground'}`}>{convo.other_user_name}</span>
                          <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(convo.last_message_time), { addSuffix: true })}</span>
                        </div>
                        <p className={`text-sm truncate ${convo.unread ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{convo.last_message}</p>
                        <Badge variant="secondary" className="mt-1 text-xs">{convo.task_title}</Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Chat Area */}
          <div className={`flex-1 flex flex-col ${selectedConversation ? 'flex' : 'hidden md:flex'}`}>
            {selectedConversation ? (
              <>
                <div className="p-4 border-b flex items-center gap-3">
                  <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedConversation(null)}><ArrowLeft className="h-5 w-5" /></Button>
                  <AvatarWithStatus isOnline={onlineStatus[selectedConversation.other_user_id] || false} size="md">
                    <Avatar className="h-10 w-10 cursor-pointer" onClick={() => navigate(`/profile/${selectedConversation.other_user_id}`)}>
                      <AvatarImage src={selectedConversation.other_user_avatar || undefined} /><AvatarFallback className="bg-primary/10 text-primary">{selectedConversation.other_user_name?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                  </AvatarWithStatus>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground truncate cursor-pointer hover:underline" onClick={() => navigate(`/profile/${selectedConversation.other_user_id}`)}>{selectedConversation.other_user_name}</p>
                      {onlineStatus[selectedConversation.other_user_id] && <span className="text-xs text-emerald-600 font-medium">Online</span>}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{selectedConversation.task_title}</p>
                  </div>
                </div>

                <ScrollArea className="flex-1 p-4">
                  {messagesLoading ? (
                    <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground"><MessageCircle className="h-12 w-12 mb-4 opacity-50" /><p>No messages yet</p><p className="text-sm">Start the conversation!</p></div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map(msg => {
                        const isOwn = msg.sender_id === user.id;
                        return (
                          <div key={msg.id} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                            <Avatar className="h-8 w-8 shrink-0"><AvatarImage src={msg.sender?.avatar_url || undefined} /><AvatarFallback className="text-xs">{msg.sender?.full_name?.charAt(0) || 'U'}</AvatarFallback></Avatar>
                            <div className={`max-w-[75%] ${isOwn ? 'text-right' : ''}`}>
                              <div className={`rounded-2xl px-4 py-2 text-sm ${isOwn ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted rounded-tl-sm'}`}>
                                {renderMessageContent(msg.content)}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">{format(new Date(msg.created_at), 'h:mm a')}</p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                <div className="p-4 border-t space-y-2">
                  <form onSubmit={handleSendMessage} className={`flex gap-2 ${shake ? 'animate-shake' : ''}`}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*,.pdf,.doc,.docx,.zip,.txt"
                      onChange={handleFileUpload}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                    </Button>

                    <Input placeholder="Type a message..." value={newMessage} onChange={(e) => { setNewMessage(e.target.value); if (safetyError) setSafetyError(''); }} disabled={sending} className={`flex-1 ${safetyError ? 'border-destructive focus-visible:ring-destructive' : ''}`} autoComplete="off" />
                    <Button type="submit" size="icon" disabled={sending || !newMessage.trim()}>{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
                  </form>
                  {safetyError && (<div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 p-2 rounded-md"><AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" /><span>{safetyError}</span></div>)}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground"><div className="text-center"><MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-30" /><p className="text-lg font-medium">Select a conversation</p><p className="text-sm">Choose from your existing conversations</p></div></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
