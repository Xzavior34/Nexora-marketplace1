import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Send, Loader2, MessageCircle, AlertTriangle, Paperclip, Image as ImageIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { checkMessageSafety } from '@/lib/safety';

interface Message {
  id: string;
  task_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface TaskChatProps {
  taskId: string;
  posterId: string;
  participantId: string;
  applicationId?: string | null;
}

export function TaskChat({ taskId, posterId, participantId, applicationId = null }: TaskChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [safetyError, setSafetyError] = useState('');
  const [shake, setShake] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canChat = user && (user.id === posterId || user.id === participantId);

  const fetchMessages = useCallback(async () => {
    if (!taskId) return;
    
    let query = supabase
      .from('messages')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    query = applicationId
      ? query.eq('application_id', applicationId)
      : query.is('application_id', null);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    const senderIds = [...new Set(data.map(m => m.sender_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', senderIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    
    setMessages(data.map(m => ({
      ...m,
      sender: profileMap.get(m.sender_id) || null,
    })));
    setLoading(false);
  }, [taskId, applicationId]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  useEffect(() => {
    if (!taskId) return;
    const channel = supabase
      .channel(`messages-${taskId}-${applicationId || 'assigned'}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: applicationId ? `application_id=eq.${applicationId}` : `task_id=eq.${taskId}`,
      }, async (payload) => {
        const newMsg = payload.new as Message;
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('id', newMsg.sender_id)
          .single();
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, { ...newMsg, sender: profile }];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [taskId, applicationId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error('File too large. Max 10MB.');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      
      const { data, error } = await supabase.storage
        .from('chat-attachments')
        .upload(path, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(data.path);

      const fileUrl = urlData.publicUrl;
      const isImage = file.type.startsWith('image/');
      
      // Send as a message with the file URL
      const content = isImage 
        ? `📷 [Image: ${file.name}]\n${fileUrl}`
        : `📎 [File: ${file.name}]\n${fileUrl}`;

      await supabase.from('messages').insert({
        task_id: taskId,
        application_id: applicationId,
        sender_id: user.id,
        content,
      });

      toast.success('File sent!');
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !canChat) return;

    const safetyResult = checkMessageSafety(newMessage.trim());
    if (!safetyResult.safe) {
      if (safetyError) { setShake(true); setTimeout(() => setShake(false), 500); }
      setSafetyError(safetyResult.message);
      setTimeout(() => setSafetyError(''), 5000);
      return;
    }

    setSafetyError('');
    const messageContent = newMessage.trim();
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const optimisticMsg: Message = {
      id: tempId,
      task_id: taskId,
      sender_id: user.id,
      content: messageContent,
      created_at: new Date().toISOString(),
      sender: {
        full_name: (user.user_metadata as any)?.full_name || 'You',
        avatar_url: (user.user_metadata as any)?.avatar_url || null,
      },
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setNewMessage('');
    setSending(true);

    const { data: inserted, error } = await supabase.from('messages').insert({
      task_id: taskId,
      application_id: applicationId,
      sender_id: user.id,
      content: messageContent,
    }).select().single();

    if (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setNewMessage(messageContent);
    } else {
      // Replace temp with real (realtime sub also dedupes by id)
      setMessages(prev => {
        if (prev.some(m => m.id === inserted.id)) {
          return prev.filter(m => m.id !== tempId);
        }
        return prev.map(m => m.id === tempId ? { ...inserted, sender: optimisticMsg.sender } as Message : m);
      });

      const recipientId = user.id === posterId ? participantId : posterId;
      if (recipientId) {
        supabase.functions.invoke('send-push-notification', {
          body: { userId: recipientId, title: 'New Message', body: 'You have a new message about your gig', data: { taskId, applicationId } },
        }).catch(console.error);

        const [senderResult, taskResult] = await Promise.all([
          supabase.from('profiles').select('full_name').eq('id', user.id).single(),
          supabase.from('tasks').select('title').eq('id', taskId).single(),
        ]);

        if (taskResult.data?.title) {
          // The edge function looks up the recipient's email server-side
          supabase.functions.invoke('send-message-email', {
            body: {
              recipientId,
              senderName: senderResult.data?.full_name || 'Someone',
              messagePreview: messageContent,
              taskTitle: taskResult.data.title,
              taskId,
            },
          }).catch(console.error);
        }
      }
    }
    setSending(false);
  };

  // Parse message content for file/image attachments
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

    // Check for inline images in regular messages
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

  if (!canChat) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Chat
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea ref={scrollRef} className="h-64 px-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <MessageCircle className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No messages yet</p>
              <p className="text-xs">Start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-3 py-4">
              {messages.map((msg) => {
                const isOwn = msg.sender_id === user?.id;
                return (
                  <div key={msg.id} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={msg.sender?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">{msg.sender?.full_name?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className={`max-w-[70%] ${isOwn ? 'text-right' : ''}`}>
                      <div className={`rounded-2xl px-3 py-2 text-sm ${isOwn ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted rounded-tl-sm'}`}>
                        {renderMessageContent(msg.content)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{format(new Date(msg.created_at), 'h:mm a')}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        
        <div className="p-4 border-t space-y-2">
          <form onSubmit={handleSend} className={`flex gap-2 ${shake ? 'animate-shake' : ''}`}>
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
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => { setNewMessage(e.target.value); if (safetyError) setSafetyError(''); }}
              disabled={sending}
              className={`flex-1 ${safetyError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
            />
            <Button type="submit" size="icon" disabled={!newMessage.trim() || sending}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
          {safetyError && (
            <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 p-2 rounded-md">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{safetyError}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}