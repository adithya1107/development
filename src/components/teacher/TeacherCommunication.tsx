import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MessageSquare, 
  Send,
  Search,
  Users,
  Megaphone,
  Plus,
  Eye,
  Trash2,
  AlertTriangle,
  ArrowLeft,
  CheckCheck,
  UserPlus,
  Globe,
  Wifi,
  WifiOff,
  AlertCircle,
  Loader2,
  Menu,
  MoreVertical,
  Pin,
  Settings
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const TeacherCommunication = ({ teacherData }) => {
  // Courses and Announcements
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [announcements, setAnnouncements] = useState([]);
  
  // Communication Hub states
  const [activeTab, setActiveTab] = useState('chats');
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');
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
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  
  // Refs
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messageChannelRef = useRef(null);
  const typingChannelRef = useRef(null);
  const currentChannelIdRef = useRef(null); // 🔥 KEY FIX: Track current channel reliably
  const { toast } = useToast();

  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    announcement_type: 'academic',
    priority: 'normal',
    course_id: '',
    target_type: 'course'
  });

  // Initialize on mount
  useEffect(() => {
    if (!teacherData?.user_id) {
      console.error('❌ No teacherData or user_id provided');
      setLoading(false);
      return;
    }
    
    console.log('✅ Initializing for teacher:', teacherData.user_id);
    
    const initialize = async () => {
      try {
        await Promise.all([
          fetchCourses(),
          fetchChannels(),
          fetchContacts()
        ]);
        loadLastReadTimestamps();
        await setupRealtimeSubscriptions();
      } catch (error) {
        console.error('❌ Error initializing:', error);
      } finally {
        setLoading(false);
      }
    };
    
    initialize();
    
    return () => {
      console.log('🧹 Cleaning up subscriptions');
      cleanupSubscriptions();
    };
  }, [teacherData?.user_id]);

  // 🔥 KEY FIX: Update ref whenever selectedChannel changes
  useEffect(() => {
    currentChannelIdRef.current = selectedChannel?.id || null;
    console.log('📌 Current channel ref updated:', currentChannelIdRef.current);
  }, [selectedChannel?.id]);

  // Fetch announcements when course changes
  useEffect(() => {
    if (selectedCourse) {
      fetchAnnouncements();
    }
  }, [selectedCourse]);

  // Fetch messages when channel changes
  useEffect(() => {
    if (selectedChannel) {
      fetchMessages(selectedChannel.id);
      markChannelAsRead(selectedChannel.id);
    }
  }, [selectedChannel?.id]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  const cleanupSubscriptions = () => {
    console.log('🧹 Cleaning up all subscriptions');
    if (messageChannelRef.current) {
      supabase.removeChannel(messageChannelRef.current);
      messageChannelRef.current = null;
    }
    if (typingChannelRef.current) {
      supabase.removeChannel(typingChannelRef.current);
      typingChannelRef.current = null;
    }
  };

  const setupRealtimeSubscriptions = async () => {
    console.log('📡 Setting up realtime subscriptions');

    // Messages subscription
    const messageChannelName = `teacher-messages-${teacherData.user_id}-${Date.now()}`;
    messageChannelRef.current = supabase
      .channel(messageChannelName)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      }, (payload) => {
        console.log('📨 New message received:', {
          id: payload.new.id,
          channel_id: payload.new.channel_id,
          current_channel: currentChannelIdRef.current,
          matches: payload.new.channel_id === currentChannelIdRef.current
        });
        
        handleNewMessage(payload.new);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages'
      }, (payload) => {
        // 🔥 Use ref
        if (payload.new.channel_id === currentChannelIdRef.current) {
          console.log('📝 Message updated:', payload.new);
          setMessages(prev =>
            prev.map(msg => msg.id === payload.new.id ? payload.new : msg)
          );
        }
      })
      .subscribe((status) => {
        console.log('📡 Messages subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('connected');
          console.log('✅ Successfully subscribed to messages');
        } else if (status === 'CHANNEL_ERROR') {
          setRealtimeStatus('error');
        }
      });

    // Typing indicators subscription
    const typingChannelName = `teacher-typing-${Date.now()}`;
    typingChannelRef.current = supabase
      .channel(typingChannelName)
      .on('broadcast', { event: 'typing' }, (payload) => {
        handleTypingIndicator(payload);
      })
      .subscribe((status) => {
        console.log('📡 Typing subscription status:', status);
      });

    console.log('✅ Realtime subscriptions active');
  };

  const handleNewMessage = async (newMessageData) => {
    console.log('📨 Processing new message:', newMessageData);
    
    // Refresh channels to update last message
    await fetchChannels();
    
    // 🔥 KEY FIX: Use ref instead of state
    if (currentChannelIdRef.current === newMessageData.channel_id) {
      console.log('✅ Message is for current channel, adding to messages');
      
      // Fetch full message data with sender info
      const { data: fullMessage } = await supabase
        .from('messages')
        .select(`
          *,
          sender:user_profiles!messages_sender_id_fkey(
            first_name,
            last_name,
            user_type
          )
        `)
        .eq('id', newMessageData.id)
        .single();

      if (fullMessage) {
        setMessages(prev => {
          const exists = prev.some(msg => msg.id === fullMessage.id);
          if (exists) {
            console.log('⚠️ Duplicate message detected, replacing');
            return prev.map(msg => msg.id === fullMessage.id ? fullMessage : msg);
          }
          console.log('✅ Adding new message to state');
          return [...prev, fullMessage];
        });
        
        setTimeout(scrollToBottom, 100);
      }
      
      // Mark as read if window has focus
      if (document.hasFocus()) {
        markChannelAsRead(newMessageData.channel_id);
      }
    } else {
      console.log('⏭️ Message is for different channel');
      
      // Show notification if message is from someone else
      if (newMessageData.sender_id !== teacherData.user_id) {
        const channel = channels.find(c => c.id === newMessageData.channel_id);
        if (channel) {
          toast({
            title: getChannelDisplayName(channel),
            description: newMessageData.message_text.substring(0, 50) + '...',
            duration: 3000,
          });
        }
      }
    }
  };

  const handleTypingIndicator = (payload) => {
    const { channel_id, user_id, user_name, is_typing } = payload.payload;
    
    if (user_id === teacherData.user_id) return;
    
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
    
    typingChannelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        channel_id: selectedChannel.id,
        user_id: teacherData.user_id,
        user_name: `${teacherData.first_name} ${teacherData.last_name}`,
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
    const stored = localStorage.getItem(`lastRead_teacher_${teacherData.user_id}`);
    if (stored) {
      setLastReadTimestamps(JSON.parse(stored));
    }
  };

  const markChannelAsRead = (channelId) => {
    const now = new Date().toISOString();
    const updated = { ...lastReadTimestamps, [channelId]: now };
    setLastReadTimestamps(updated);
    localStorage.setItem(`lastRead_teacher_${teacherData.user_id}`, JSON.stringify(updated));
  };

  const getChannelDisplayName = (channel) => {
    if (channel.channel_type === 'direct_message' && channel.other_user) {
      return `${channel.other_user.first_name} ${channel.other_user.last_name}`;
    }
    return channel.channel_name;
  };

  const fetchCourses = async () => {
    try {
      console.log('📋 Fetching courses for teacher:', teacherData.user_id);
      
      const { data, error } = await supabase
        .from('courses')
        .select('id, course_name, course_code')
        .eq('instructor_id', teacherData.user_id)
        .eq('is_active', true);

      if (error) throw error;
      
      console.log('✅ Courses loaded:', data?.length || 0);
      setCourses(data || []);
    } catch (error) {
      console.error('❌ Error fetching courses:', error);
    }
  };

  const fetchAnnouncements = async () => {
    if (!selectedCourse) return;

    try {
      console.log('📋 Fetching announcements for course:', selectedCourse);
      
      const { data, error } = await supabase
        .from('announcements')
        .select(`
          *,
          courses!announcements_course_id_fkey (
            course_name,
            course_code
          )
        `)
        .eq('course_id', selectedCourse)
        .eq('created_by', teacherData.user_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log('✅ Announcements loaded:', data?.length || 0);
      setAnnouncements(data || []);
    } catch (error) {
      console.error('❌ Error fetching announcements:', error);
    }
  };

  const fetchChannels = async () => {
    try {
      console.log('📋 Fetching channels for teacher:', teacherData.user_id);
      
      // Get channels where teacher is a member
      const { data: memberChannels, error: memberError } = await supabase
        .from('channel_members')
        .select('channel_id')
        .eq('user_id', teacherData.user_id);

      if (memberError) throw memberError;

      const channelIds = memberChannels?.map(m => m.channel_id) || [];

      if (channelIds.length === 0) {
        console.log('⚠️ No channels found');
        setChannels([]);
        return;
      }

      // Fetch channel details
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

      // Enrich channels with last message and member count
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

          // For direct messages, get the other user
          let otherUser = null;
          if (channel.channel_type === 'direct_message') {
            const { data: members } = await supabase
              .from('channel_members')
              .select('user_id, user_profiles!inner(*)')
              .eq('channel_id', channel.id)
              .neq('user_id', teacherData.user_id);
            
            if (members && members.length > 0) {
              otherUser = members[0].user_profiles;
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

      // Sort by last message time
      channelsWithDetails.sort((a, b) => 
        new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
      );

      console.log('✅ Channels loaded:', channelsWithDetails.length);
      setChannels(channelsWithDetails);
    } catch (error) {
      console.error('❌ Error fetching channels:', error);
    }
  };

  const fetchMessages = async (channelId) => {
    try {
      console.log('📋 Fetching messages for channel:', channelId);
      
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:user_profiles!messages_sender_id_fkey(
            first_name,
            last_name,
            user_type,
            profile_picture_url
          )
        `)
        .eq('channel_id', channelId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      console.log('✅ Messages loaded:', data?.length || 0);
      setMessages(data || []);
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('❌ Error fetching messages:', error);
    }
  };

  const fetchContacts = async () => {
    try {
      console.log('📋 Fetching contacts for teacher');
      
      // Teachers can contact other teachers, students, and alumni
      const allowedUserTypes = ['teacher', 'student', 'alumni'];
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('college_id', teacherData.college_id)
        .neq('id', teacherData.user_id)
        .in('user_type', allowedUserTypes)
        .eq('is_active', true)
        .order('first_name');

      if (error) throw error;
      
      console.log('✅ Contacts loaded:', data?.length || 0);
      setContacts(data || []);
    } catch (error) {
      console.error('❌ Error fetching contacts:', error);
    }
  };

  const handleChannelSelect = async (channel) => {
    console.log('📌 Selecting channel:', channel.channel_name);
    setSelectedChannel(channel);
    setMessages([]);
    await fetchMessages(channel.id);
    markChannelAsRead(channel.id);
    setShowMobileSidebar(false);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChannel) return;

    const messageText = newMessage.trim();
    const tempId = `temp-${Date.now()}`;
    
    console.log('📤 Sending message:', {
      channel_id: selectedChannel.id,
      text: messageText.substring(0, 30)
    });

    // Optimistic UI update
    const optimisticMessage = {
      id: tempId,
      tempId: tempId,
      channel_id: selectedChannel.id,
      sender_id: teacherData.user_id,
      message_text: messageText,
      message_type: 'text',
      created_at: new Date().toISOString(),
      sender: {
        first_name: teacherData.first_name,
        last_name: teacherData.last_name,
        user_type: 'teacher'
      },
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
          sender_id: teacherData.user_id,
          message_text: messageText,
          message_type: 'text'
        })
        .select(`
          *,
          sender:user_profiles!messages_sender_id_fkey(
            first_name,
            last_name,
            user_type
          )
        `)
        .single();

      if (error) throw error;

      console.log('✅ Message sent successfully:', data.id);

      // Replace optimistic message with real one
      setMessages(prev =>
        prev.map(msg => msg.tempId === tempId ? { ...data, sending: false } : msg)
      );

      await fetchChannels();
    } catch (error) {
      console.error('❌ Error sending message:', error);
      
      // Remove failed message and restore text
      setMessages(prev => prev.filter(msg => msg.tempId !== tempId));
      setNewMessage(messageText);
      
      toast({
        title: 'Failed to send',
        description: 'Check your connection and try again',
        variant: 'destructive'
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const createDirectChannel = async (contactId) => {
    try {
      console.log('💬 Creating direct channel with:', contactId);
      
      // Check if direct channel already exists
      const { data: existingChannels } = await supabase
        .from('channel_members')
        .select('channel_id')
        .eq('user_id', teacherData.user_id);

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
            console.log('✅ Found existing channel');
            setSelectedChannel(channel);
            await fetchMessages(channel.id);
            setShowNewChatDialog(false);
            setContactSearchQuery('');
            setShowMobileSidebar(false);
            return;
          }
        }
      }

      // Create new channel
      const contact = contacts.find(c => c.id === contactId);
      const { data: newChannel, error: channelError } = await supabase
        .from('communication_channels')
        .insert({
          college_id: teacherData.college_id,
          channel_name: `${contact.first_name} ${contact.last_name}`,
          channel_type: 'direct_message',
          is_public: false,
          created_by: teacherData.user_id
        })
        .select()
        .single();

      if (channelError) throw channelError;

      const { error: memberError } = await supabase
        .from('channel_members')
        .insert([
          { channel_id: newChannel.id, user_id: teacherData.user_id, role: 'member' },
          { channel_id: newChannel.id, user_id: contactId, role: 'member' }
        ]);

      if (memberError) throw memberError;

      console.log('✅ Direct channel created');
      
      await fetchChannels();
      setShowNewChatDialog(false);
      setContactSearchQuery('');
      
      toast({
        title: '✓ Success',
        description: 'Conversation started'
      });
    } catch (error) {
      console.error('❌ Error creating channel:', error);
      toast({
        title: 'Error',
        description: 'Failed to start conversation',
        variant: 'destructive'
      });
    }
  };

  const createAnnouncement = async () => {
    if (newAnnouncement.target_type === 'course' && !newAnnouncement.course_id) {
      toast({
        title: 'Error',
        description: 'Please select a course for course-specific announcement',
        variant: 'destructive'
      });
      return;
    }

    if (!newAnnouncement.title.trim() || !newAnnouncement.content.trim()) {
      toast({
        title: 'Error',
        description: 'Title and content are required',
        variant: 'destructive'
      });
      return;
    }

    try {
      console.log('📢 Creating announcement');
      
      const announcementData = {
        title: newAnnouncement.title,
        content: newAnnouncement.content,
        announcement_type: newAnnouncement.announcement_type,
        priority: newAnnouncement.priority,
        college_id: teacherData.college_id,
        created_by: teacherData.user_id,
        is_active: true
      };

      if (newAnnouncement.target_type === 'course') {
        announcementData.course_id = newAnnouncement.course_id;
        announcementData.target_audience = { 
          type: 'course', 
          course_id: newAnnouncement.course_id 
        };
      } else {
        announcementData.course_id = null;
        announcementData.target_audience = { type: 'all_students' };
      }

      const { error } = await supabase
        .from('announcements')
        .insert(announcementData);

      if (error) throw error;

      console.log('✅ Announcement created');

      toast({
        title: '✓ Success',
        description: `${newAnnouncement.target_type === 'course' ? 'Course' : 'General'} announcement created`
      });

      setNewAnnouncement({
        title: '',
        content: '',
        announcement_type: 'academic',
        priority: 'normal',
        course_id: '',
        target_type: 'course'
      });

      if (selectedCourse && newAnnouncement.target_type === 'course') {
        fetchAnnouncements();
      }
    } catch (error) {
      console.error('❌ Error creating announcement:', error);
      toast({
        title: 'Error',
        description: 'Failed to create announcement',
        variant: 'destructive'
      });
    }
  };

  const deleteAnnouncement = async (announcementId) => {
    try {
      console.log('🗑️ Deleting announcement:', announcementId);
      
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', announcementId)
        .eq('created_by', teacherData.user_id);

      if (error) throw error;

      console.log('✅ Announcement deleted');

      toast({
        title: '✓ Success',
        description: 'Announcement deleted'
      });

      fetchAnnouncements();
    } catch (error) {
      console.error('❌ Error deleting announcement:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete announcement',
        variant: 'destructive'
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
      case 'disconnected':
        return <WifiOff className="h-4 w-4 text-gray-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'connecting':
        return <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />;
    }
  };

  const hasUnreadMessages = (channelId) => {
    const lastRead = lastReadTimestamps[channelId];
    const channel = channels.find(c => c.id === channelId);
    if (!channel || !lastRead) return false;
    return new Date(channel.lastMessageTime) > new Date(lastRead);
  };

  const filteredChannels = channels.filter(channel =>
    getChannelDisplayName(channel).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredContacts = contacts.filter(contact =>
    `${contact.first_name} ${contact.last_name}`.toLowerCase().includes(contactSearchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-4" />
          <p className="text-foreground/70">Loading Communication Hub...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="bg-sidebar-background border-b border-border px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Communication Hub</h1>
            <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
              Messages and Announcements
            </p>
          </div>
          
          {/* Connection Status */}
          <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border ${
            realtimeStatus === 'connected' ? 'bg-green-500/10 border-green-500/20' :
            realtimeStatus === 'error' ? 'bg-red-500/10 border-red-500/20' :
            'bg-yellow-500/10 border-yellow-500/20'
          }`}>
            {getConnectionStatusIcon()}
            <span className="text-xs font-medium capitalize hidden sm:inline">
              {realtimeStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden min-h-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          {/* Tab Navigation */}
          <TabsList className="w-full grid grid-cols-2 rounded-none border-b flex-shrink-0">
            <TabsTrigger value="chats" className="text-xs sm:text-sm">
              <MessageSquare className="h-4 w-4 mr-2" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="announcements" className="text-xs sm:text-sm">
              <Megaphone className="h-4 w-4 mr-2" />
              Announcements
            </TabsTrigger>
          </TabsList>

          {/* Chats Tab */}
          <TabsContent value="chats" className="flex-1 m-0 overflow-hidden">
            <div className="h-full flex overflow-hidden">
              {/* Sidebar */}
              <div className={`w-full lg:w-80 bg-sidebar-background border-r border-border flex flex-col ${
                selectedChannel ? 'hidden lg:flex' : 'flex'
              }`}>
                {/* Search and New Chat */}
                <div className="p-3 sm:p-4 border-b border-border flex-shrink-0">
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search conversations..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-input border-border text-foreground text-sm"
                    />
                  </div>
                  <Button 
                    onClick={() => setShowNewChatDialog(true)} 
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 text-xs sm:text-sm"
                    size="sm"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    New Chat
                  </Button>
                </div>

                {/* Channels List */}
                <div className="flex-1 overflow-y-auto space-y-1 p-2 min-h-0">
                  {filteredChannels.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground text-sm">No conversations yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Start a new chat</p>
                    </div>
                  ) : (
                    filteredChannels.map(channel => {
                      const isGroup = channel.channel_type === 'group' || channel.channel_type === 'course';
                      const unread = hasUnreadMessages(channel.id);
                      
                      return (
                        <div
                          key={channel.id}
                          onClick={() => handleChannelSelect(channel)}
                          className={`p-3 rounded-lg cursor-pointer transition-all group ${
                            selectedChannel?.id === channel.id
                              ? 'bg-accent border-l-2 border-primary'
                              : 'hover:bg-accent/50'
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="relative flex-shrink-0">
                              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-foreground text-sm font-semibold border border-border ${
                                isGroup ? 'bg-primary/10' : 'bg-primary/5'
                              }`}>
                                {getChannelDisplayName(channel).substring(0, 2).toUpperCase()}
                              </div>
                              {isGroup && (
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-sidebar-background border-2 border-sidebar-border rounded-full flex items-center justify-center">
                                  <Users className="h-2 w-2 sm:h-3 sm:w-3 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <p className={`text-sm sm:text-base truncate ${unread ? 'font-bold text-foreground' : 'font-semibold text-foreground'}`}>
                                  {getChannelDisplayName(channel)}
                                </p>
                                {channel.lastMessageTime && (
                                  <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                                    {formatTimestamp(channel.lastMessageTime)}
                                  </span>
                                )}
                              </div>
                              <p className={`text-xs sm:text-sm truncate ${unread ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                                {channel.lastMessageSender && isGroup
                                  ? `${channel.lastMessageSender.first_name}: ${channel.lastMessage}`
                                  : channel.lastMessage
                                }
                              </p>
                              {isGroup && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  <Users className="h-3 w-3 inline mr-1" />
                                  {channel.memberCount} members
                                </p>
                              )}
                              {unread && (
                                <Badge variant="default" className="mt-1 h-5 px-2">
                                  New
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Chat Area */}
              {selectedChannel ? (
                <div className="w-full lg:flex-1 flex flex-col bg-background min-h-0">
                  {/* Chat Header */}
                  <div className="bg-sidebar-background border-b border-border px-3 sm:px-6 py-3 sm:py-4 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedChannel(null);
                            setShowMobileSidebar(true);
                          }}
                          className="lg:hidden flex-shrink-0 p-2"
                        >
                          <ArrowLeft className="h-5 w-5" />
                        </Button>
                        
                        <div className="relative flex-shrink-0">
                          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-foreground text-sm font-semibold border border-border ${
                            selectedChannel.channel_type === 'group' || selectedChannel.channel_type === 'course'
                              ? 'bg-primary/10' 
                              : 'bg-primary/5'
                          }`}>
                            {getChannelDisplayName(selectedChannel).substring(0, 2).toUpperCase()}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h2 className="font-semibold text-sm sm:text-base text-foreground truncate">
                            {getChannelDisplayName(selectedChannel)}
                          </h2>
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

                  {/* Messages Area */}
                  <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-3 md:p-6 space-y-3 md:space-y-4 min-h-0">
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
                          const isMe = message.sender_id === teacherData.user_id;
                          const isGroup = selectedChannel.channel_type === 'group' || selectedChannel.channel_type === 'course';
                          const showAvatar = !isMe && (index === 0 || messages[index - 1].sender_id !== message.sender_id);
                          
                          return (
                            <div key={message.id || message.tempId} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                              <div className={`flex items-end space-x-2 max-w-[85%] md:max-w-md ${isMe ? 'flex-row-reverse space-x-reverse' : ''}`}>
                                {!isMe && showAvatar && (
                                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-primary/10 border border-border rounded-full flex items-center justify-center text-foreground text-[10px] sm:text-xs font-semibold flex-shrink-0 mb-1">
                                    {getInitials(message.sender?.first_name, message.sender?.last_name)}
                                  </div>
                                )}
                                {!isMe && !showAvatar && (
                                  <div className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0"></div>
                                )}
                                <div className="max-w-full">
                                  {isGroup && !isMe && showAvatar && (
                                    <p className="text-xs text-muted-foreground mb-1 ml-2">
                                      {message.sender?.first_name} {message.sender?.last_name}
                                    </p>
                                  )}
                                  <div
                                    className={`px-3 md:px-4 py-2 rounded-2xl ${
                                      isMe
                                        ? 'bg-primary text-primary-foreground rounded-br-none'
                                        : 'bg-card border border-border text-foreground rounded-bl-none'
                                    } ${message.sending ? 'opacity-60' : ''}`}
                                  >
                                    <p className="text-xs md:text-sm break-words">{message.message_text}</p>
                                  </div>
                                  <div className={`flex items-center space-x-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <span className="text-xs text-muted-foreground">
                                      {message.sending ? 'Sending...' : formatMessageTime(message.created_at)}
                                    </span>
                                    {isMe && !message.sending && (
                                      <CheckCheck className="h-3 w-3 text-blue-500" />
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
                        className="resize-none bg-input border-border text-foreground min-h-[44px] max-h-[120px] text-sm rounded-lg flex-1"
                        rows={1}
                        disabled={sendingMessage}
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || sendingMessage}
                        className="flex-shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 h-11 w-11 rounded-full p-0"
                      >
                        {sendingMessage ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Send className="h-5 w-5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="hidden lg:flex flex-1 items-center justify-center bg-background">
                  <div className="text-center px-4">
                    <div className="w-20 sm:w-24 h-20 sm:h-24 bg-primary/10 border border-border rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageSquare className="h-10 sm:h-12 w-10 sm:w-12 text-primary" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">Select a conversation</h3>
                    <p className="text-sm md:text-base text-muted-foreground mb-6">
                      Choose from your existing chats or start a new one
                    </p>
                    <Button 
                      onClick={() => setShowNewChatDialog(true)} 
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Start New Chat
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Announcements Tab */}
          <TabsContent value="announcements" className="flex-1 m-0 overflow-hidden p-4 sm:p-6">
            <div className="space-y-4 h-full flex flex-col">
              {/* Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-primary" />
                  <h2 className="text-lg sm:text-xl font-semibold">Announcements</h2>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2 w-full sm:w-auto text-xs sm:text-sm">
                      <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                      New Announcement
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[95vw] sm:w-full max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-base sm:text-lg">Create Announcement</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Announcement Target *</Label>
                        <Select
                          value={newAnnouncement.target_type}
                          onValueChange={(value) => setNewAnnouncement({...newAnnouncement, target_type: value, course_id: ''})}
                        >
                          <SelectTrigger className="text-sm">
                            <SelectValue placeholder="Select target" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="course">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Course Specific
                              </div>
                            </SelectItem>
                            <SelectItem value="general">
                              <div className="flex items-center gap-2">
                                <Globe className="h-4 w-4" />
                                General (All Students)
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {newAnnouncement.target_type === 'course' && (
                        <div className="space-y-2">
                          <Label>Select Course *</Label>
                          <Select
                            value={newAnnouncement.course_id}
                            onValueChange={(value) => setNewAnnouncement({...newAnnouncement, course_id: value})}
                          >
                            <SelectTrigger className="text-sm">
                              <SelectValue placeholder="Select course" />
                            </SelectTrigger>
                            <SelectContent>
                              {courses.map((course) => (
                                <SelectItem key={course.id} value={course.id}>
                                  {course.course_name} ({course.course_code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>Title *</Label>
                        <Input
                          placeholder="Announcement title"
                          value={newAnnouncement.title}
                          onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                          className="text-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Content *</Label>
                        <Textarea
                          placeholder="Announcement content"
                          value={newAnnouncement.content}
                          onChange={(e) => setNewAnnouncement({...newAnnouncement, content: e.target.value})}
                          className="text-sm"
                          rows={6}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Type</Label>
                          <Select
                            value={newAnnouncement.announcement_type}
                            onValueChange={(value) => setNewAnnouncement({...newAnnouncement, announcement_type: value})}
                          >
                            <SelectTrigger className="text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="academic">Academic</SelectItem>
                              <SelectItem value="general">General</SelectItem>
                              <SelectItem value="emergency">Emergency</SelectItem>
                              <SelectItem value="event">Event</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Priority</Label>
                          <Select
                            value={newAnnouncement.priority}
                            onValueChange={(value) => setNewAnnouncement({...newAnnouncement, priority: value})}
                          >
                            <SelectTrigger className="text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <Button onClick={createAnnouncement} className="w-full text-sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Announcement
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Course Filter */}
              <div className="flex-shrink-0">
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                  <SelectTrigger className="w-full sm:w-[300px]">
                    <SelectValue placeholder="Filter by course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.course_name} ({course.course_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Announcements List */}
              <div className="flex-1 overflow-y-auto min-h-0">
                {!selectedCourse ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center py-12">
                      <Megaphone className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-semibold mb-2">Select a Course</h3>
                      <p className="text-muted-foreground text-sm">
                        Choose a course to view and manage its announcements
                      </p>
                    </div>
                  </div>
                ) : announcements.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center py-12">
                      <Megaphone className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                      <p className="text-foreground/70 text-lg mb-2">No announcements yet</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Create your first announcement for this course
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {announcements.map((announcement) => (
                      <Card key={announcement.id} className="overflow-hidden hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge 
                                  variant={
                                    announcement.priority === 'urgent' ? 'destructive' : 
                                    announcement.priority === 'high' ? 'default' : 
                                    'outline'
                                  }
                                  className="text-xs"
                                >
                                  {announcement.priority}
                                </Badge>
                                <Badge variant="secondary" className="text-xs capitalize">
                                  {announcement.announcement_type}
                                </Badge>
                                {announcement.is_active ? (
                                  <Badge variant="default" className="text-xs bg-green-500">
                                    <Eye className="h-3 w-3 mr-1" />
                                    Active
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs">
                                    Inactive
                                  </Badge>
                                )}
                              </div>
                              
                              <div>
                                <h3 className="font-semibold text-base sm:text-lg mb-2">{announcement.title}</h3>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                  {announcement.content}
                                </p>
                              </div>
                              
                              <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(announcement.created_at).toLocaleDateString()} at{' '}
                                  {new Date(announcement.created_at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                                </span>
                                {announcement.courses && (
                                  <span className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {announcement.courses.course_code}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="ghost" className="flex-shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Delete Announcement</DialogTitle>
                                </DialogHeader>
                                <Alert variant="destructive">
                                  <AlertTriangle className="h-4 w-4" />
                                  <AlertDescription>
                                    Are you sure you want to delete "{announcement.title}"? 
                                    This action cannot be undone and students will no longer be able to see it.
                                  </AlertDescription>
                                </Alert>
                                <div className="flex gap-3 justify-end">
                                  <DialogTrigger asChild>
                                    <Button variant="outline">Cancel</Button>
                                  </DialogTrigger>
                                  <Button 
                                    variant="destructive" 
                                    onClick={() => deleteAnnouncement(announcement.id)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* New Chat Dialog */}
      <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
        <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Start New Conversation</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col flex-1 overflow-hidden space-y-4">
            <div className="relative flex-shrink-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                value={contactSearchQuery}
                onChange={(e) => setContactSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
              {filteredContacts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">
                  {contactSearchQuery ? 'No contacts found' : 'No contacts available'}
                </p>
              ) : (
                filteredContacts.map(contact => (
                  <div
                    key={contact.id}
                    className="p-3 hover:bg-accent rounded-lg cursor-pointer transition-all"
                    onClick={() => createDirectChannel(contact.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/10 border border-border rounded-full flex items-center justify-center text-foreground font-semibold flex-shrink-0">
                        {getInitials(contact.first_name, contact.last_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">
                          {contact.first_name} {contact.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {contact.user_type === 'alumni' ? 'Alumni' : contact.user_type}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherCommunication;