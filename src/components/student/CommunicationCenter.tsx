import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Clock, X, Settings, Bell, BellOff, Download, Edit2, Trash2, ArrowLeft, Menu,
  WifiOff, Wifi, AlertCircle, Loader2
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
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [realtimeStatus, setRealtimeStatus] = useState('connecting');
  const [sendingMessage, setSendingMessage] = useState(false);
  
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const messageChannelRef = useRef(null);
  const typingChannelRef = useRef(null);
  const presenceChannelRef = useRef(null);
  const currentChannelIdRef = useRef(null); // 🔥 KEY FIX: Track current channel reliably
  const { toast } = useToast();

  // Helper function to get proper channel display name
  const getChannelDisplayName = (channel, currentUserId) => {
    if (channel.channel_type === 'direct_message' && channel.other_user) {
      return `${channel.other_user.first_name} ${channel.other_user.last_name}`;
    }
    return channel.channel_name;
  };

  // Initialize chat on mount
  useEffect(() => {
    if (!studentData?.user_id) {
      console.error('❌ No studentData or user_id provided');
      return;
    }
    
    console.log('✅ Initializing chat for user:', studentData.user_id);
    
    let isSubscribed = true;
    
    const initializeChat = async () => {
      try {
        await fetchChannels();
        await fetchContacts();
        loadLastReadTimestamps();
        
        if (isSubscribed) {
          await setupRealtimeSubscriptions();
        }
      } catch (error) {
        console.error('❌ Error initializing chat:', error);
      }
    };
    
    initializeChat();
    
    return () => {
      isSubscribed = false;
      console.log('🧹 Cleaning up subscriptions');
      cleanupSubscriptions();
    };
  }, [studentData?.user_id]);

  // Handle initial channel selection
  useEffect(() => {
    if (initialChannelId && channels.length > 0) {
      const channel = channels.find(c => c.id === initialChannelId);
      if (channel) {
        console.log('📌 Auto-selecting channel:', channel.channel_name);
        handleChannelSelect(channel);
      }
    }
  }, [initialChannelId, channels]);

  // 🔥 KEY FIX: Update ref whenever selectedChannel changes
  useEffect(() => {
    currentChannelIdRef.current = selectedChannel?.id || null;
    console.log('📌 Current channel ref updated:', currentChannelIdRef.current);
  }, [selectedChannel?.id]);

  // Mark messages as read when viewing
  useEffect(() => {
    if (selectedChannel && messages.length > 0) {
      markChannelAsRead(selectedChannel.id);
    }
  }, [messages.length, selectedChannel?.id]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Network: Online');
      setRealtimeStatus('reconnecting');
      setupRealtimeSubscriptions();
      toast({
        title: 'Back Online',
        description: 'Reconnecting to chat...',
      });
    };

    const handleOffline = () => {
      console.log('🌐 Network: Offline');
      setRealtimeStatus('offline');
      toast({
        title: 'You\'re Offline',
        description: 'Messages will be sent when connection is restored',
        variant: 'destructive',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const setupRealtimeSubscriptions = async () => {
    try {
      console.log('🔌 Setting up realtime subscriptions...');
      
      // Clean up existing subscriptions
      await cleanupSubscriptions();

      // Check authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('❌ No authenticated session');
        setRealtimeStatus('error');
        toast({
          title: 'Authentication Error',
          description: 'Please log in again',
          variant: 'destructive',
        });
        return;
      }

      console.log('✅ Session authenticated:', session.user.id);

      // ============================================
      // MESSAGE CHANNEL - Listen to ALL messages
      // ============================================
      const messageChannelName = `global-messages-${Date.now()}`;
      console.log('📡 Creating message subscription:', messageChannelName);
      
      messageChannelRef.current = supabase
        .channel(messageChannelName)
        .on(
          'postgres_changes',
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages'
          },
          (payload) => {
            console.log('📨 NEW MESSAGE INSERT:', {
              id: payload.new.id,
              channel_id: payload.new.channel_id,
              sender_id: payload.new.sender_id,
              text: payload.new.message_text?.substring(0, 50),
              timestamp: new Date().toISOString()
            });
            handleNewMessage(payload);
          }
        )
        .on(
          'postgres_changes',
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'messages'
          },
          (payload) => {
            console.log('📝 Message UPDATE:', payload.new.id);
            handleMessageUpdate(payload);
          }
        )
        .subscribe(async (status, err) => {
          console.log(`📡 Message subscription status: ${status}`, err);
          
          if (status === 'SUBSCRIBED') {
            setRealtimeStatus('connected');
            console.log('✅ ✅ ✅ Successfully subscribed to messages!');
            toast({
              title: '✓ Connected',
              description: 'Real-time chat is active',
              duration: 2000,
            });
          } else if (status === 'CHANNEL_ERROR') {
            setRealtimeStatus('error');
            console.error('❌ Channel error:', err);
            toast({
              title: 'Connection Error',
              description: 'Failed to connect. Retrying...',
              variant: 'destructive',
            });
            scheduleReconnect();
          } else if (status === 'CLOSED') {
            setRealtimeStatus('disconnected');
            console.log('⚠️ Channel closed, will reconnect');
            scheduleReconnect();
          }
        });

      // ============================================
      // TYPING CHANNEL - Broadcast typing indicators
      // ============================================
      const typingChannelName = `typing-${studentData.college_id}`;
      console.log('⌨️ Creating typing channel:', typingChannelName);
      
      typingChannelRef.current = supabase
        .channel(typingChannelName)
        .on('broadcast', { event: 'typing' }, (payload) => {
          console.log('⌨️ Typing indicator received:', payload.payload);
          handleTypingIndicator(payload);
        })
        .subscribe((status) => {
          console.log(`⌨️ Typing subscription: ${status}`);
        });

      // ============================================
      // PRESENCE CHANNEL - Track online users
      // ============================================
      const presenceChannelName = `presence-${studentData.college_id}`;
      console.log('👥 Creating presence channel:', presenceChannelName);
      
      presenceChannelRef.current = supabase
        .channel(presenceChannelName)
        .on('presence', { event: 'sync' }, () => {
          const state = presenceChannelRef.current?.presenceState();
          if (state) {
            const online = new Set(Object.keys(state));
            setOnlineUsers(online);
            console.log('👥 Online users synced:', online.size);
          }
        })
        .on('presence', { event: 'join' }, ({ key }) => {
          console.log('👤 User joined:', key);
          setOnlineUsers(prev => new Set([...prev, key]));
        })
        .on('presence', { event: 'leave' }, ({ key }) => {
          console.log('👤 User left:', key);
          setOnlineUsers(prev => {
            const updated = new Set(prev);
            updated.delete(key);
            return updated;
          });
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await presenceChannelRef.current?.track({
              user_id: studentData.user_id,
              online_at: new Date().toISOString(),
            });
            console.log('✅ Presence tracked');
          }
        });

      console.log('✅ All subscriptions created successfully');

    } catch (error) {
      console.error('❌ Error setting up subscriptions:', error);
      setRealtimeStatus('error');
      toast({
        title: 'Setup Error',
        description: error.message,
        variant: 'destructive',
      });
      scheduleReconnect();
    }
  };

  const cleanupSubscriptions = async () => {
    console.log('🧹 Cleaning up subscriptions');
    
    const channels = [messageChannelRef, typingChannelRef, presenceChannelRef];
    
    for (const channelRef of channels) {
      if (channelRef.current) {
        try {
          await supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        } catch (error) {
          console.warn('⚠️ Error removing channel:', error);
        }
      }
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
  };

  const scheduleReconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    console.log('⏱️ Scheduling reconnect in 3 seconds');
    
    reconnectTimeoutRef.current = setTimeout(() => {
      console.log('🔄 Attempting to reconnect...');
      setRealtimeStatus('reconnecting');
      setupRealtimeSubscriptions();
    }, 3000);
  };

  const handleNewMessage = async (payload) => {
    const newMessageData = payload.new;
    
    console.log('📨 Processing new message:', {
      id: newMessageData.id,
      channel: newMessageData.channel_id,
      sender: newMessageData.sender_id,
      current_user: studentData.user_id,
      current_channel: currentChannelIdRef.current, // 🔥 Using ref instead of state
      text: newMessageData.message_text?.substring(0, 30)
    });

    // Fetch complete message with sender info
    try {
      const { data: completeMessage, error } = await supabase
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

      if (error) {
        console.error('❌ Error fetching complete message:', error);
        return;
      }

      if (!completeMessage) {
        console.error('❌ Complete message is null');
        return;
      }

      console.log('✅ Complete message fetched:', {
        id: completeMessage.id,
        sender: `${completeMessage.sender.first_name} ${completeMessage.sender.last_name}`,
        sender_id: completeMessage.sender_id,
        current_user: studentData.user_id,
        is_mine: completeMessage.sender_id === studentData.user_id,
        viewing_channel: currentChannelIdRef.current,
        message_channel: newMessageData.channel_id,
        is_for_current_channel: currentChannelIdRef.current === newMessageData.channel_id
      });

      // Update channels list to reflect new message
      await fetchChannels();
      
      // 🔥 KEY FIX: Use ref to check if message is for current channel
      if (currentChannelIdRef.current === newMessageData.channel_id) {
        console.log('✅ Message is for currently viewed channel, adding to messages');
        
        setMessages(prev => {
          // Check for duplicates by ID
          const exists = prev.some(m => m.id === completeMessage.id);
          
          if (exists) {
            console.log('⚠️ Duplicate detected, replacing');
            return prev.map(m => 
              m.id === completeMessage.id ? completeMessage : m
            );
          }
          
          console.log('✅ Adding new message to state');
          const updated = [...prev, completeMessage];
          console.log('📊 Total messages now:', updated.length);
          return updated;
        });
        
        // Mark as read if viewing and focused
        if (document.hasFocus() && newMessageData.sender_id !== studentData.user_id) {
          setTimeout(() => markChannelAsRead(newMessageData.channel_id), 100);
        }
        
        // Scroll to bottom
        setTimeout(scrollToBottom, 150);
      } else {
        // Show notification for messages in other channels (but not our own messages)
        if (newMessageData.sender_id !== studentData.user_id) {
          console.log('🔔 Message in different channel, showing notification');
          
          toast({
            title: `${completeMessage.sender.first_name} ${completeMessage.sender.last_name}`,
            description: completeMessage.message_text.substring(0, 50) + '...',
            duration: 4000,
          });
        }
      }
    } catch (error) {
      console.error('❌ Error in handleNewMessage:', error);
    }
  };

  const handleMessageUpdate = async (payload) => {
    const updatedMessage = payload.new;
    
    console.log('📝 Processing message update:', updatedMessage.id);
    
    // 🔥 Use ref here too for consistency
    if (currentChannelIdRef.current === updatedMessage.channel_id) {
      const { data } = await supabase
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
        .eq('id', updatedMessage.id)
        .single();

      if (data) {
        setMessages(prev => 
          prev.map(msg => msg.id === data.id ? data : msg)
        );
        console.log('✅ Message updated in state');
      }
    }
  };

  const handleTypingIndicator = (payload) => {
    const { channel_id, user_id, user_name, is_typing } = payload.payload;
    
    if (user_id === studentData.user_id) return;
    
    console.log('⌨️ Typing indicator:', { channel_id, user_name, is_typing });
    
    setTypingUsers(prev => {
      const newState = { ...prev };
      if (!newState[channel_id]) {
        newState[channel_id] = {};
      }
      
      if (is_typing) {
        newState[channel_id][user_id] = user_name;
        
        // Auto-clear typing indicator after 5 seconds
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
    
    try {
      console.log('⌨️ Sending typing indicator:', isTyping);
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
    } catch (error) {
      console.warn('⚠️ Error sending typing indicator:', error);
    }
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
    try {
      const stored = localStorage.getItem(`lastRead_${studentData.user_id}`);
      if (stored) {
        setLastReadTimestamps(JSON.parse(stored));
        console.log('✅ Loaded last read timestamps');
      }
    } catch (error) {
      console.warn('⚠️ Error loading last read timestamps:', error);
    }
  };

  const markChannelAsRead = (channelId) => {
    try {
      const now = new Date().toISOString();
      const updated = { ...lastReadTimestamps, [channelId]: now };
      setLastReadTimestamps(updated);
      localStorage.setItem(`lastRead_${studentData.user_id}`, JSON.stringify(updated));
    } catch (error) {
      console.warn('⚠️ Error marking channel as read:', error);
    }
  };

  const getUnreadCount = (channel) => {
    const lastRead = lastReadTimestamps[channel.id];
    if (!lastRead || !channel.lastMessageTime) return 0;
    
    return new Date(channel.lastMessageTime) > new Date(lastRead) ? 1 : 0;
  };

  const fetchChannels = async () => {
    try {
      console.log('📋 Fetching channels...');
      
      const { data: memberChannels, error: memberError } = await supabase
        .from('channel_members')
        .select('channel_id')
        .eq('user_id', studentData.user_id);

      if (memberError) throw memberError;

      const channelIds = memberChannels?.map(m => m.channel_id) || [];

      console.log(`✅ Found ${channelIds.length} channels for user`);

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

      const channelsWithDetails = await Promise.all(
        (channelData || []).map(async (channel) => {
          // Get last message
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

          // Get member count
          const { count } = await supabase
            .from('channel_members')
            .select('*', { count: 'exact', head: true })
            .eq('channel_id', channel.id);

          // For DM channels, get the other user's info
          let otherUser = null;
          if (channel.channel_type === 'direct_message') {
            const { data: otherUserData } = await supabase
              .from('channel_members')
              .select('user_id, user_profiles!inner(*)')
              .eq('channel_id', channel.id)
              .neq('user_id', studentData.user_id)
              .limit(1)
              .single();

            if (otherUserData?.user_profiles) {
              otherUser = otherUserData.user_profiles;
            }
          }

          return {
            ...channel,
            lastMessage: lastMessage?.message_text || 'No messages yet',
            lastMessageTime: lastMessage?.created_at || channel.created_at,
            lastMessageSender: lastMessage?.sender,
            memberCount: count || 0,
            other_user: otherUser
          };
        })
      );

      channelsWithDetails.sort((a, b) => 
        new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
      );

      setChannels(channelsWithDetails);
      console.log('✅ Channels loaded with details');
    } catch (error) {
      console.error('❌ Error fetching channels:', error);
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
      console.log('💬 Fetching messages for channel:', channelId);
      
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
      console.log(`✅ Loaded ${data?.length || 0} messages`);
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('❌ Error fetching messages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load messages',
        variant: 'destructive',
      });
    }
  };

  const fetchContacts = async () => {
    try {
      console.log('👥 Fetching contacts...');
      
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
      console.log(`✅ Loaded ${data?.length || 0} contacts`);
    } catch (error) {
      console.error('❌ Error fetching contacts:', error);
    }
  };

  const handleChannelSelect = async (channel) => {
    console.log('📂 Channel selected:', getChannelDisplayName(channel, studentData.user_id));
    
    setSelectedChannel(channel);
    setMessages([]);
    await fetchMessages(channel.id);
    markChannelAsRead(channel.id);
    setActiveTab('chats');
    setShowMobileSidebar(false);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChannel || sendingMessage) {
      console.warn('⚠️ Cannot send message - validation failed');
      return;
    }

    const messageText = newMessage.trim();
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    
    console.log('📤 Sending message:', {
      tempId,
      channel: selectedChannel.id,
      text: messageText.substring(0, 30)
    });
    
    // Optimistic UI update
    const optimisticMessage = {
      id: tempId,
      tempId: tempId,
      channel_id: selectedChannel.id,
      sender_id: studentData.user_id,
      message_text: messageText,
      message_type: 'text',
      created_at: new Date().toISOString(),
      is_deleted: false,
      sender: {
        first_name: studentData.first_name,
        last_name: studentData.last_name,
        user_type: studentData.user_type,
        profile_picture_url: studentData.profile_picture_url
      },
      reactions: [],
      sending: true
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');
    sendTypingIndicator(false);
    setSendingMessage(true);
    setTimeout(scrollToBottom, 50);

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          channel_id: selectedChannel.id,
          sender_id: studentData.user_id,
          message_text: messageText,
          message_type: 'text'
        })
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
        .single();

      if (error) throw error;

      // Replace optimistic message with real one
      setMessages(prev => 
        prev.map(msg => 
          msg.tempId === tempId 
            ? { ...data, sending: false }
            : msg
        )
      );

      console.log('✅ Message sent successfully:', data.id);
      
      // Update channel list
      fetchChannels();
      
    } catch (error) {
      console.error('❌ Error sending message:', error);
      
      // Remove failed message and restore text
      setMessages(prev => prev.filter(msg => msg.tempId !== tempId));
      setNewMessage(messageText);
      
      toast({
        title: 'Failed to send',
        description: error.message || 'Check your connection and try again',
        variant: 'destructive',
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const createDirectChannel = async (contactId) => {
    try {
      console.log('💬 Creating direct channel with contact:', contactId);
      
      // Check for existing direct channel
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
          console.log('✅ Found existing direct channel');
          // Refresh channels to get latest data
          await fetchChannels();
          const channel = channels.find(c => c.id === existingDirect.channel_id);
          if (channel) {
            await handleChannelSelect(channel);
            setShowNewChatDialog(false);
            setContactSearchQuery('');
            return;
          }
        }
      }

      // Create new channel
      const contact = contacts.find(c => c.id === contactId);
      
      console.log('➕ Creating new direct channel with:', contact.first_name);
      
      // For DM, use contact's name (we'll show proper name based on viewer)
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
      
      // Re-setup subscriptions to catch messages in new channel
      console.log('🔄 Re-setting up subscriptions for new channel');
      await setupRealtimeSubscriptions();
      
      setShowNewChatDialog(false);
      setContactSearchQuery('');
      
      console.log('✅ Direct channel created successfully');
      
      toast({
        title: 'Success',
        description: 'Conversation started',
      });
    } catch (error) {
      console.error('❌ Error creating channel:', error);
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

  const isUserOnline = (userId) => {
    return onlineUsers.has(userId);
  };

  const filteredChannels = channels.filter(channel =>
    getChannelDisplayName(channel, studentData.user_id).toLowerCase().includes(searchQuery.toLowerCase())
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

  const getConnectionStatusIcon = () => {
    switch (realtimeStatus) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'offline':
        return <WifiOff className="h-4 w-4 text-red-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'reconnecting':
      case 'connecting':
        return <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />;
      default:
        return <WifiOff className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-4" />
          <p className="text-foreground/70">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full max-h-screen flex flex-col bg-background overflow-hidden">
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
            {/* Connection Status */}
            <div className={`flex items-center space-x-2 mr-2 px-3 py-1.5 rounded-lg border ${
              realtimeStatus === 'connected' ? 'bg-green-500/10 border-green-500/20' :
              realtimeStatus === 'error' || realtimeStatus === 'offline' ? 'bg-red-500/10 border-red-500/20' :
              'bg-yellow-500/10 border-yellow-500/20'
            }`}>
              {getConnectionStatusIcon()}
              <span className="text-xs font-medium capitalize hidden sm:inline">
                {realtimeStatus}
              </span>
            </div>
            
            <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <MessageSquare className="h-4 w-4 mr-2" />
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
                          className="flex items-center justify-between p-3 hover:bg-accent rounded-lg cursor-pointer transition-colors"
                          onClick={() => createDirectChannel(contact.id)}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="relative">
                              <div className="w-10 h-10 bg-primary/10 border border-border rounded-full flex items-center justify-center text-foreground font-semibold">
                                {getInitials(contact.first_name, contact.last_name)}
                              </div>
                              {isUserOnline(contact.id) && (
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                              )}
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
          <div className="p-4 border-b border-sidebar-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-input border-border text-foreground"
              />
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2 mx-3 mt-2 bg-muted">
              <TabsTrigger value="chats" className="data-[state=active]:bg-accent">Chats</TabsTrigger>
              <TabsTrigger value="contacts" className="data-[state=active]:bg-accent">Contacts</TabsTrigger>
            </TabsList>

            <TabsContent value="chats" className="flex-1 overflow-y-auto mt-2 m-0">
              <div className="space-y-1 p-2">
                {filteredChannels.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No conversations yet</p>
                    <Button
                      size="sm"
                      variant="link"
                      onClick={() => setShowNewChatDialog(true)}
                      className="mt-2"
                    >
                      Start a new chat
                    </Button>
                  </div>
                ) : (
                  filteredChannels.map(channel => {
                    const unreadCount = getUnreadCount(channel);
                    const displayName = getChannelDisplayName(channel, studentData.user_id);
                    
                    return (
                      <div
                        key={channel.id}
                        onClick={() => handleChannelSelect(channel)}
                        className={`p-3 rounded-lg cursor-pointer transition-all ${
                          selectedChannel?.id === channel.id
                            ? 'bg-accent border-l-4 border-primary'
                            : 'hover:bg-accent/50'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="relative flex-shrink-0">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center text-foreground font-semibold border-2 border-border bg-primary/10">
                              {displayName.substring(0, 2).toUpperCase()}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className={`font-semibold text-foreground truncate ${unreadCount > 0 ? 'font-bold' : ''}`}>
                                {displayName}
                              </p>
                              {channel.lastMessageTime && (
                                <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                                  {formatTimestamp(channel.lastMessageTime)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between">
                              <p className={`text-sm text-muted-foreground truncate ${unreadCount > 0 ? 'font-semibold' : ''}`}>
                                {channel.lastMessage}
                              </p>
                              {unreadCount > 0 && (
                                <Badge className="ml-2 bg-primary text-primary-foreground text-xs flex-shrink-0">
                                  {unreadCount}
                                </Badge>
                              )}
                            </div>
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
                      className="p-3 hover:bg-accent/50 rounded-lg cursor-pointer transition-all"
                      onClick={() => createDirectChannel(contact.id)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <div className="w-10 h-10 bg-primary/10 border border-border rounded-full flex items-center justify-center text-foreground font-semibold">
                            {getInitials(contact.first_name, contact.last_name)}
                          </div>
                          {isUserOnline(contact.id) && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
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
          <div className="w-full lg:flex-1 flex flex-col bg-background min-h-0">
            {/* Chat Header */}
            <div className="bg-sidebar-background border-b border-border px-6 py-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1 min-w-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedChannel(null)}
                    className="lg:hidden"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-foreground font-semibold border-2 border-border bg-primary/10">
                      {getChannelDisplayName(selectedChannel, studentData.user_id).substring(0, 2).toUpperCase()}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-foreground truncate">
                      {getChannelDisplayName(selectedChannel, studentData.user_id)}
                    </h2>
                    <p className="text-sm text-muted-foreground capitalize truncate">
                      {selectedChannel.channel_type.replace('_', ' ')}
                      {selectedChannel.memberCount > 0 && ` • ${selectedChannel.memberCount} members`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0"
            >
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-foreground/70">No messages yet</p>
                    <p className="text-sm text-muted-foreground">Start the conversation!</p>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message, index) => {
                    const isMe = message.sender_id === studentData.user_id;
                    const showAvatar = !isMe && (index === 0 || messages[index - 1].sender_id !== message.sender_id);
                    
                    return (
                      <div
                        key={message.id || message.tempId}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`flex items-end space-x-2 max-w-md ${isMe ? 'flex-row-reverse space-x-reverse' : ''}`}>
                          {!isMe && showAvatar && (
                            <div className="w-8 h-8 bg-primary/10 border border-border rounded-full flex items-center justify-center text-foreground text-xs font-semibold flex-shrink-0 mb-1">
                              {getInitials(message.sender.first_name, message.sender.last_name)}
                            </div>
                          )}
                          {!isMe && !showAvatar && (
                            <div className="w-8 h-8 flex-shrink-0"></div>
                          )}
                          <div>
                            {!isMe && showAvatar && (
                              <p className="text-xs text-muted-foreground mb-1 ml-2">
                                {message.sender.first_name} {message.sender.last_name}
                              </p>
                            )}
                            <div
                              className={`px-4 py-2 rounded-2xl ${
                                isMe
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-card border border-border text-foreground'
                              } ${message.sending ? 'opacity-60' : ''}`}
                            >
                              <p className="text-sm break-words">{message.message_text}</p>
                            </div>
                            <div className={`flex items-center space-x-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                              <span className="text-xs text-muted-foreground">
                                {message.sending ? 'Sending...' : formatMessageTime(message.created_at)}
                              </span>
                              {isMe && !message.sending && (
                                <CheckCheck className="h-3 w-3 text-blue-500" />
                              )}
                              {isMe && message.sending && (
                                <Clock className="h-3 w-3 text-muted-foreground animate-pulse" />
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
              <div className="px-6 py-2 bg-sidebar-background/50 flex-shrink-0">
                <p className="text-sm text-muted-foreground italic">{getTypingText()}</p>
              </div>
            )}

            {/* Message Input */}
            <div className="bg-sidebar-background border-t border-border px-6 py-4 flex-shrink-0">
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
                    className="resize-none bg-input border-border text-foreground min-h-[44px] max-h-[120px] rounded-lg"
                    rows={1}
                    disabled={sendingMessage || realtimeStatus === 'offline'}
                  />
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sendingMessage || realtimeStatus === 'offline'}
                  className="flex-shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 h-11 w-11 rounded-full p-0"
                >
                  {sendingMessage ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </div>
              {realtimeStatus === 'offline' && (
                <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                  <WifiOff className="h-3 w-3" />
                  You're offline. Messages will be sent when connection is restored.
                </p>
              )}
              {realtimeStatus === 'connecting' && (
                <p className="text-xs text-yellow-600 mt-2 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Connecting to chat...
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-background">
            <div className="text-center">
              <MessageSquare className="h-24 w-24 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">Select a conversation</h3>
              <p className="text-muted-foreground mb-6">Choose from your existing chats or start a new one</p>
              <Button onClick={() => setShowNewChatDialog(true)} className="bg-primary text-primary-foreground">
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