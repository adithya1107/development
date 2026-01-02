import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  MessageSquare, Send, Search, Users, UserPlus, Paperclip, Image,
  Smile, MoreVertical, Phone, Video, Archive, Star, Check, CheckCheck,
  Clock, X, Settings, Bell, BellOff, Download, Edit2, Trash2, ArrowLeft, Menu
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RealtimeChannel } from '@supabase/supabase-js';

const CommunicationHub = ({ studentData, initialChannelId }) => {
  const [activeTab, setActiveTab] = useState('chats');
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [channels, setChannels] = useState([]);
  const [messages, setMessages] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMobileSidebar, setShowMobileSidebar] = useState(true);
  const [lastReadTimestamps, setLastReadTimestamps] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messageChannelRef = useRef<RealtimeChannel | null>(null);
  const typingChannelRef = useRef<RealtimeChannel | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (studentData?.user_id) {
      fetchChannels();
      fetchContacts();
      loadLastReadTimestamps();
      setupRealtimeSubscriptions();
      
      return () => {
        cleanupSubscriptions();
      };
    }
  }, [studentData?.user_id]);

  useEffect(() => {
    if (initialChannelId && channels.length > 0) {
      const channel = channels.find(c => c.id === initialChannelId);
      if (channel) {
        handleChannelSelect(channel);
      }
    }
  }, [initialChannelId, channels]);

  useEffect(() => {
    if (selectedChannel) {
      markChannelAsRead(selectedChannel.id);
    }
  }, [messages, selectedChannel]);

  const setupRealtimeSubscriptions = () => {
    // Subscribe to all message changes
    messageChannelRef.current = supabase
      .channel('messages-all')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          handleNewMessage(payload.new);
        }
      )
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          handleMessageUpdate(payload.new);
        }
      )
      .on('postgres_changes', 
        { event: 'DELETE', schema: 'public', table: 'messages' },
        (payload) => {
          handleMessageDelete(payload.old);
        }
      )
      .subscribe((status) => {
        console.log('Message subscription status:', status);
      });

    // Subscribe to typing indicators
    typingChannelRef.current = supabase
      .channel('typing-indicators-global')
      .on('broadcast', { event: 'typing' }, (payload) => {
        handleTypingIndicator(payload);
      })
      .subscribe((status) => {
        console.log('Typing subscription status:', status);
      });
  };

  const cleanupSubscriptions = () => {
    if (messageChannelRef.current) {
      supabase.removeChannel(messageChannelRef.current);
      messageChannelRef.current = null;
    }
    if (typingChannelRef.current) {
      supabase.removeChannel(typingChannelRef.current);
      typingChannelRef.current = null;
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleNewMessage = async (newMessageData) => {
    // Fetch complete message data with sender info
    const { data: completeMessage } = await supabase
      .from('messages')
      .select(`
        *,
        sender:user_profiles!messages_sender_id_fkey(
          first_name,
          last_name,
          user_type,
          profile_picture_url
        ),
        reactions:message_reactions(*)
      `)
      .eq('id', newMessageData.id)
      .single();

    if (!completeMessage) return;

    // Update channels list to reflect new message
    await fetchChannels();
    
    // If message is in current channel, add it to messages
    if (selectedChannel && newMessageData.channel_id === selectedChannel.id) {
      setMessages(prev => {
        // Avoid duplicates
        if (prev.some(m => m.id === completeMessage.id)) return prev;
        return [...prev, completeMessage];
      });
      
      // Mark as read if user is viewing the channel and window has focus
      if (document.hasFocus()) {
        markChannelAsRead(selectedChannel.id);
      }
      
      setTimeout(scrollToBottom, 100);
    } else {
      // Show notification for new message in other channels
      const channel = channels.find(c => c.id === newMessageData.channel_id);
      if (channel && newMessageData.sender_id !== studentData.user_id) {
        toast({
          title: channel.channel_name,
          description: newMessageData.message_text.substring(0, 50) + '...',
          duration: 3000,
        });
      }
    }
  };

  const handleMessageUpdate = (updatedMessageData) => {
    if (selectedChannel && updatedMessageData.channel_id === selectedChannel.id) {
      setMessages(prev => 
        prev.map(msg => msg.id === updatedMessageData.id ? { ...msg, ...updatedMessageData } : msg)
      );
    }
  };

  const handleMessageDelete = (deletedMessageData) => {
    if (selectedChannel && deletedMessageData.channel_id === selectedChannel.id) {
      setMessages(prev => prev.filter(msg => msg.id !== deletedMessageData.id));
    }
    fetchChannels(); // Update channel list
  };

  const handleTypingIndicator = (payload) => {
    const { channel_id, user_id, user_name, is_typing } = payload.payload;
    
    if (user_id === studentData.user_id) return;
    
    setTypingUsers(prev => {
      const newState = { ...prev };
      if (!newState[channel_id]) {
        newState[channel_id] = {};
      }
      
      if (is_typing) {
        newState[channel_id][user_id] = user_name;
        
        // Auto-clear after 5 seconds
        setTimeout(() => {
          setTypingUsers(current => {
            const updated = { ...current };
            if (updated[channel_id]?.[user_id]) {
              delete updated[channel_id][user_id];
            }
            return updated;
          });
        }, 5000);
      } else {
        delete newState[channel_id][user_id];
      }
      
      return newState;
    });
  };

  const sendTypingIndicator = (isTyping) => {
    if (!selectedChannel || !typingChannelRef.current) return;
    
    typingChannelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        channel_id: selectedChannel.id,
        user_id: studentData.user_id,
        user_name: `${studentData.first_name} ${studentData.last_name}`,
        is_typing: isTyping
      }
    });
  };

  const handleTyping = () => {
    sendTypingIndicator(true);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingIndicator(false);
    }, 3000);
  };

  const loadLastReadTimestamps = () => {
    const stored = localStorage.getItem(`lastRead_${studentData.user_id}`);
    if (stored) {
      setLastReadTimestamps(JSON.parse(stored));
    }
  };

  const markChannelAsRead = (channelId) => {
    const now = new Date().toISOString();
    const updated = { ...lastReadTimestamps, [channelId]: now };
    setLastReadTimestamps(updated);
    localStorage.setItem(`lastRead_${studentData.user_id}`, JSON.stringify(updated));
  };

  const getUnreadCount = (channel) => {
    const lastRead = lastReadTimestamps[channel.id];
    if (!lastRead) return channel.unreadCount || 0;
    
    const unreadMessages = messages.filter(
      msg => msg.channel_id === channel.id && 
             msg.sender_id !== studentData.user_id && 
             new Date(msg.created_at) > new Date(lastRead)
    );
    
    return unreadMessages.length;
  };

  const fetchChannels = async () => {
    try {
      const { data: memberChannels, error: memberError } = await supabase
        .from('channel_members')
        .select('channel_id')
        .eq('user_id', studentData.user_id);

      if (memberError) throw memberError;

      const channelIds = memberChannels?.map(m => m.channel_id) || [];

      if (channelIds.length === 0) {
        setChannels([]);
        setLoading(false);
        return;
      }

      const { data: channelData, error: channelError } = await supabase
        .from('communication_channels')
        .select(`
          *,
          created_by_user:user_profiles!communication_channels_created_by_fkey(
            first_name,
            last_name,
            user_type
          )
        `)
        .in('id', channelIds);

      if (channelError) throw channelError;

      const channelsWithMessages = await Promise.all(
        (channelData || []).map(async (channel) => {
          const { data: lastMessage } = await supabase
            .from('messages')
            .select(`
              *,
              sender:user_profiles!messages_sender_id_fkey(first_name, last_name)
            `)
            .eq('channel_id', channel.id)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          const { count } = await supabase
            .from('channel_members')
            .select('*', { count: 'exact', head: true })
            .eq('channel_id', channel.id);

          return {
            ...channel,
            lastMessage: lastMessage?.message_text || 'No messages yet',
            lastMessageTime: lastMessage?.created_at || channel.created_at,
            lastMessageSender: lastMessage?.sender,
            memberCount: count || 0,
            unreadCount: 0
          };
        })
      );

      channelsWithMessages.sort((a, b) => 
        new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
      );

      setChannels(channelsWithMessages);
    } catch (error) {
      console.error('Error fetching channels:', error);
      toast({
        title: 'Error',
        description: 'Failed to load conversations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (channelId) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:user_profiles!messages_sender_id_fkey(
            first_name,
            last_name,
            user_type,
            profile_picture_url
          ),
          reactions:message_reactions(*)
        `)
        .eq('channel_id', channelId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(data || []);
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load messages',
        variant: 'destructive',
      });
    }
  };

  const fetchContacts = async () => {
    try {
      const allowedUserTypes = ['teacher', 'alumni', 'student'];
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('college_id', studentData.college_id)
        .neq('id', studentData.user_id)
        .in('user_type', allowedUserTypes)
        .eq('is_active', true)
        .order('first_name');

      if (error) throw error;

      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const handleChannelSelect = async (channel) => {
    setSelectedChannel(channel);
    setMessages([]);
    await fetchMessages(channel.id);
    markChannelAsRead(channel.id);
    setActiveTab('chats');
    setShowMobileSidebar(false);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChannel) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    sendTypingIndicator(false);

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          channel_id: selectedChannel.id,
          sender_id: studentData.user_id,
          message_text: messageText,
          message_type: 'text'
        });

      if (error) throw error;

      // Message will be added via real-time subscription
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageText);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    }
  };

  const createDirectChannel = async (contactId) => {
    try {
      const { data: existingChannels } = await supabase
        .from('channel_members')
        .select('channel_id')
        .eq('user_id', studentData.user_id);

      const myChannelIds = existingChannels?.map(c => c.channel_id) || [];

      if (myChannelIds.length > 0) {
        const { data: theirChannels } = await supabase
          .from('channel_members')
          .select('channel_id, communication_channels!inner(channel_type)')
          .eq('user_id', contactId)
          .in('channel_id', myChannelIds);

        const existingDirect = theirChannels?.find(
          c => c.communication_channels.channel_type === 'direct_message'
        );

        if (existingDirect) {
          const channel = channels.find(c => c.id === existingDirect.channel_id);
          if (channel) {
            setSelectedChannel(channel);
            await fetchMessages(channel.id);
            setShowNewChatDialog(false);
            setContactSearchQuery('');
            setActiveTab('chats');
            setShowMobileSidebar(false);
            return;
          }
        }
      }

      const contact = contacts.find(c => c.id === contactId);
      const { data: newChannel, error: channelError } = await supabase
        .from('communication_channels')
        .insert({
          college_id: studentData.college_id,
          channel_name: `${contact.first_name} ${contact.last_name}`,
          channel_type: 'direct_message',
          is_public: false,
          created_by: studentData.user_id
        })
        .select()
        .single();

      if (channelError) throw channelError;

      const { error: memberError } = await supabase
        .from('channel_members')
        .insert([
          { channel_id: newChannel.id, user_id: studentData.user_id, role: 'member' },
          { channel_id: newChannel.id, user_id: contactId, role: 'member' }
        ]);

      if (memberError) throw memberError;

      await fetchChannels();
      setShowNewChatDialog(false);
      setContactSearchQuery('');
      
      toast({
        title: 'Success',
        description: 'Conversation started',
      });
    } catch (error) {
      console.error('Error creating channel:', error);
      toast({
        title: 'Error',
        description: 'Failed to start conversation',
        variant: 'destructive',
      });
    }
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const formatMessageTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const filteredChannels = channels.filter(channel =>
    channel.channel_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredContacts = contacts.filter(contact =>
    `${contact.first_name} ${contact.last_name}`.toLowerCase().includes(contactSearchQuery.toLowerCase())
  );

  const getTypingText = () => {
    if (!selectedChannel || !typingUsers[selectedChannel.id]) return null;
    
    const typing = Object.values(typingUsers[selectedChannel.id]);
    if (typing.length === 0) return null;
    
    if (typing.length === 1) return `${typing[0]} is typing...`;
    if (typing.length === 2) return `${typing[0]} and ${typing[1]} are typing...`;
    return `${typing.length} people are typing...`;
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-6 h-6 sm:w-10 sm:h-10 md:w-16 md:h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-foreground/70">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className={`bg-sidebar-background border-b border-border px-4 sm:px-6 py-3 sm:py-4 ${
        selectedChannel ? 'hidden lg:block' : 'block'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Messages</h1>
            <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Stay connected with your campus community</p>
          </div>
          <div className="flex items-center space-x-2">
            <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs sm:text-sm">
                  <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">New Chat</span>
                  <span className="sm:hidden">New</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md bg-popover border-border">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Start a New Conversation</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Search contacts..."
                    value={contactSearchQuery}
                    onChange={(e) => setContactSearchQuery(e.target.value)}
                    className="w-full bg-input border-border text-foreground"
                  />
                  <div className="max-h-80 overflow-y-auto space-y-2">
                    {filteredContacts.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No contacts found</p>
                    ) : (
                      filteredContacts.map(contact => (
                        <div
                          key={contact.id}
                          className="flex items-center justify-between p-3 hover:bg-accent rounded-sm cursor-pointer transition-colors"
                          onClick={() => createDirectChannel(contact.id)}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-primary/10 border border-border rounded-sm flex items-center justify-center text-foreground font-semibold">
                              {getInitials(contact.first_name, contact.last_name)}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">
                                {contact.first_name} {contact.last_name}
                              </p>
                              <p className="text-xs text-muted-foreground capitalize">{contact.user_type}</p>
                            </div>
                          </div>
                          <Button size="sm" variant="ghost">
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className={`w-full lg:w-80 bg-sidebar-background border-r border-sidebar-border flex flex-col ${
          selectedChannel ? 'hidden lg:flex' : 'flex'
        }`}>
          <div className="p-3 sm:p-4 border-b border-sidebar-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-input border-border text-foreground text-sm"
              />
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2 mx-3 mt-2 bg-muted">
              <TabsTrigger value="chats" className="data-[state=active]:bg-accent text-xs sm:text-sm">Chats</TabsTrigger>
              <TabsTrigger value="contacts" className="data-[state=active]:bg-accent text-xs sm:text-sm">Contacts</TabsTrigger>
            </TabsList>

            <TabsContent value="chats" className="flex-1 overflow-y-auto mt-2 m-0">
              <div className="space-y-1 p-2">
                {filteredChannels.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">No conversations yet</p>
                    <Button
                      size="sm"
                      variant="link"
                      onClick={() => setShowNewChatDialog(true)}
                      className="mt-2 text-foreground/70"
                    >
                      Start a new chat
                    </Button>
                  </div>
                ) : (
                  filteredChannels.map(channel => {
                    const isGroup = channel.channel_type === 'group' || channel.channel_type === 'course';
                    
                    return (
                      <div
                        key={channel.id}
                        onClick={() => handleChannelSelect(channel)}
                        className={`p-3 rounded-sm cursor-pointer transition-all ${
                          selectedChannel?.id === channel.id
                            ? 'bg-accent border-l-2 border-primary'
                            : 'hover:bg-accent/50'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="relative flex-shrink-0">
                            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-sm flex items-center justify-center text-foreground font-semibold border border-border ${
                              isGroup 
                                ? 'bg-primary/10' 
                                : 'bg-primary/5'
                            }`}>
                              {channel.channel_name.substring(0, 2).toUpperCase()}
                            </div>
                            {isGroup && (
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-sidebar-background border-2 border-sidebar-border rounded-sm flex items-center justify-center">
                                <Users className="h-2 w-2 sm:h-3 sm:w-3 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-semibold text-sm sm:text-base text-foreground truncate">{channel.channel_name}</p>
                              {channel.lastMessageTime && (
                                <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                                  {formatTimestamp(channel.lastMessageTime)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between">
                              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                                {channel.lastMessageSender && isGroup
                                  ? `${channel.lastMessageSender.first_name}: ${channel.lastMessage}`
                                  : channel.lastMessage
                                }
                              </p>
                              {channel.unreadCount > 0 && (
                                <Badge className="ml-2 bg-primary text-primary-foreground text-xs flex-shrink-0">{channel.unreadCount}</Badge>
                              )}
                            </div>
                            {isGroup && (
                              <p className="text-xs text-muted-foreground mt-1">{channel.memberCount} members</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </TabsContent>

            <TabsContent value="contacts" className="flex-1 overflow-y-auto mt-2 m-0">
              <div className="space-y-1 p-2">
                {filteredContacts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No contacts found</p>
                ) : (
                  filteredContacts.map(contact => (
                    <div
                      key={contact.id}
                      className="p-3 hover:bg-accent/50 rounded-sm cursor-pointer transition-all"
                      onClick={() => createDirectChannel(contact.id)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary/10 border border-border rounded-sm flex items-center justify-center text-foreground font-semibold">
                          {getInitials(contact.first_name, contact.last_name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm sm:text-base text-foreground truncate">
                            {contact.first_name} {contact.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">{contact.user_type}</p>
                        </div>
                        <Button size="sm" variant="ghost">
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Chat Area */}
        {selectedChannel ? (
          <div className={`w-full lg:flex-1 flex flex-col bg-background fixed lg:relative top-16 lg:top-0 inset-x-0 bottom-0 lg:inset-auto z-50 lg:z-10 ${
            selectedChannel ? 'flex' : 'hidden lg:flex'
          }`}>
            {/* Chat Header */}
            <div className="bg-sidebar-background border-b border-border px-3 sm:px-6 py-3 sm:py-4 flex-shrink-0 relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedChannel(null)}
                    className="lg:hidden flex-shrink-0 p-2"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  
                  <div className="relative flex-shrink-0">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-sm flex items-center justify-center text-foreground font-semibold border border-border ${
                      selectedChannel.channel_type === 'group' || selectedChannel.channel_type === 'course'
                        ? 'bg-primary/10' 
                        : 'bg-primary/5'
                    }`}>
                      {selectedChannel.channel_name.substring(0, 2).toUpperCase()}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-sm sm:text-base text-foreground truncate">{selectedChannel.channel_name}</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground capitalize truncate">
                      {selectedChannel.channel_type === 'group' || selectedChannel.channel_type === 'course'
                        ? `${selectedChannel.memberCount} members`
                        : selectedChannel.channel_type.replace('_', ' ')
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-3 md:p-6 space-y-3 md:space-y-4 min-h-0"
            >
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageSquare className="h-12 md:h-16 w-12 md:w-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-foreground/70 text-sm md:text-base">No messages yet</p>
                    <p className="text-xs md:text-sm text-muted-foreground">Start the conversation!</p>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message, index) => {
                    const isMe = message.sender_id === studentData.user_id;
                    const isGroup = selectedChannel.channel_type === 'group' || selectedChannel.channel_type === 'course';
                    const showAvatar = !isMe && (index === 0 || messages[index - 1].sender_id !== message.sender_id);
                    
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`flex items-end space-x-2 max-w-[85%] md:max-w-md ${isMe ? 'flex-row-reverse space-x-reverse' : ''}`}>
                          {!isMe && showAvatar && (
                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-primary/10 border border-border rounded-sm flex items-center justify-center text-foreground text-[10px] sm:text-xs font-semibold flex-shrink-0 mb-1">
                              {getInitials(message.sender.first_name, message.sender.last_name)}
                            </div>
                          )}
                          {!isMe && !showAvatar && (
                            <div className="w-7 h-7 md:w-8 md:h-8 flex-shrink-0"></div>
                          )}
                          <div className="max-w-full">
                            {isGroup && !isMe && showAvatar && (
                              <p className="text-xs text-muted-foreground mb-1 ml-2">
                                {message.sender.first_name} {message.sender.last_name}
                              </p>
                            )}
                            <div
                              className={`px-3 md:px-4 py-2 ${
                                isMe
                                  ? 'bg-primary text-primary-foreground rounded-sm rounded-br-none'
                                  : 'bg-card border border-border text-foreground rounded-sm rounded-bl-none'
                              }`}
                            >
                              <p className="text-xs md:text-sm break-words">{message.message_text}</p>
                            </div>
                            <div className={`flex items-center space-x-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                              <span className="text-xs text-muted-foreground">
                                {formatMessageTime(message.created_at)}
                              </span>
                              {isMe && (
                                <CheckCheck className="h-3 w-3 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Typing Indicator */}
            {getTypingText() && (
              <div className="px-4 md:px-6 py-2 bg-sidebar-background/50 flex-shrink-0">
                <p className="text-xs md:text-sm text-muted-foreground italic">{getTypingText()}</p>
              </div>
            )}

            {/* Message Input */}
            <div className="bg-sidebar-background border-t border-border px-3 md:px-6 py-3 md:py-4 flex-shrink-0">
              <div className="flex items-end space-x-2">
                <div className="flex-1 relative">
                  <Textarea
                    ref={textareaRef}
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      handleTyping();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="resize-none pr-10 bg-input border-border text-foreground min-h-[40px] max-h-[120px] text-sm"
                    rows={1}
                  />
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="flex-shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 h-9 w-9 sm:h-10 sm:w-10 p-0"
                  size="sm"
                >
                  <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className={`${
            showMobileSidebar ? 'hidden' : 'flex'
          } md:flex flex-1 items-center justify-center bg-background overflow-hidden`}>
            <div className="text-center px-4">
              <div className="w-20 sm:w-24 h-20 sm:h-24 bg-primary/10 border border-border rounded-sm flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-10 sm:h-12 w-10 sm:w-12 text-foreground" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">Select a conversation</h3>
              <p className="text-sm md:text-base text-muted-foreground mb-6">Choose from your existing chats or start a new one</p>
              <Button onClick={() => setShowNewChatDialog(true)} className="bg-primary text-primary-foreground hover:bg-primary/90" size="sm">
                <MessageSquare className="h-4 w-4 mr-2" />
                Start New Chat
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunicationHub;