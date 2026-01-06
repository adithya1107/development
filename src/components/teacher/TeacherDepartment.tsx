import React, { useState, useRef, useEffect } from "react";
import { 
  CalendarDays, Clock, User, Paperclip, Send, Image as ImageIcon, 
  Pin, Loader2, Building2, Search, ArrowLeft, Wifi, WifiOff, 
  AlertCircle, CheckCheck, X, Download, ExternalLink 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import EventCreationForm from "./EventCreationForm";
import {
  getUserDepartments,
  getDepartmentChannels,
  getChannelMessages,
  sendMessage,
  uploadDepartmentFile,
  togglePinMessage,
  getDepartmentEvents,
  createDepartmentEvent,
  subscribeToMessages,
  type DepartmentMessage,
  type DepartmentEvent,
  type Department,
  type DepartmentChannel,
} from "@/services/departmentService";
import { supabase } from '@/integrations/supabase/client';


interface TeacherDepartmentProps {
  teacherData: any;
  userTags?: any[];
  isHOD?: boolean;
}

const TeacherDepartment = ({ 
  teacherData, 
  userTags, 
  isHOD = false 
}: TeacherDepartmentProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(true);
  
  const [departments, setDepartments] = useState<Department[]>([]);
  const [department, setDepartment] = useState<Department | null>(null);
  const [channels, setChannels] = useState<DepartmentChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<DepartmentChannel | null>(null);
  const [messages, setMessages] = useState<DepartmentMessage[]>([]);
  const [events, setEvents] = useState<DepartmentEvent[]>([]);
  const [userRole, setUserRole] = useState<'hod' | 'admin' | 'member' | null>(null);

  const [newMessage, setNewMessage] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('connecting');
  const [showMobileCalendar, setShowMobileCalendar] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const userId = teacherData?.id || teacherData?.user_id;

  useEffect(() => {
    const userId = teacherData?.id || teacherData?.user_id;
    if (userId) {
      loadAllDepartments(userId);
    }
  }, [teacherData?.id, teacherData?.user_id]);

  useEffect(() => {
    if (department) {
      loadDepartmentData(department.id);
      checkUserRole(department.id);
    }
  }, [department?.id]);

  useEffect(() => {
    if (!selectedChannel) return;

    console.log('📡 Setting up realtime subscription for channel:', selectedChannel.id);

    const subscription = subscribeToMessages(selectedChannel.id, (newMsg) => {
      console.log('📨 Real-time message received:', newMsg);
      
      setMessages((prev) => {
        const exists = prev.some(msg => msg.id === newMsg.id);
        if (exists) {
          console.log('⚠️ Duplicate message detected, replacing');
          return prev.map(msg => msg.id === newMsg.id ? newMsg : msg);
        }
        console.log('✅ Adding new message to state');
        return [...prev, newMsg];
      });
      
      setTimeout(scrollToBottom, 100);
    });

    setRealtimeStatus('connected');
    console.log('✅ Realtime subscription active');

    return () => {
      console.log('🧹 Cleaning up subscription');
      subscription.unsubscribe();
      setRealtimeStatus('disconnected');
    };
  }, [selectedChannel?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadAllDepartments = async (userId: string) => {
    try {
      setLoading(true);
      console.log('📋 Loading all departments for user:', userId);
      
      const depts = await getUserDepartments(userId);
      console.log('✅ Departments found:', depts.length);
      
      if (depts.length === 0) {
        console.log('⚠️ No departments found for user');
        toast({
          title: "No Department",
          description: "You are not assigned to any department yet.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      setDepartments(depts);
      setDepartment(depts[0]);
    } catch (error) {
      console.error("❌ Error loading departments:", error);
      toast({
        title: "Error",
        description: "Failed to load departments",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const checkUserRole = async (departmentId: string) => {
    if (!userId) return;

    try {
      // First check if user is HOD (stored directly in departments table)
      const { data: deptData } = await supabase
        .from('departments')
        .select('hod_id')
        .eq('id', departmentId)
        .single();

      if (deptData?.hod_id === userId) {
        setUserRole('hod');
        console.log('✅ User is HOD of this department');
        return;
      }

      // Then check for admin/member tags with context
      const { data: roleData, error } = await supabase
        .from('user_tag_assignments')
        .select(`
          user_tags!inner (
            tag_name
          )
        `)
        .eq('user_id', userId)
        .eq('context_type', 'department')
        .eq('context_id', departmentId)
        .eq('is_active', true)
        .single();

      if (error) {
        console.log('No role tag found, setting as member');
        setUserRole('member');
        return;
      }

      if (roleData.user_tags.tag_name === 'department_admin') {
        setUserRole('admin');
        console.log('✅ User is Admin of this department');
      } else if (roleData.user_tags.tag_name === 'department_member') {
        setUserRole('member');
        console.log('✅ User is Member of this department');
      } else {
        setUserRole('member');
      }
    } catch (error) {
      console.log('Error checking user role:', error);
      setUserRole('member');
    }
  };

  const loadDepartmentData = async (departmentId: string) => {
    try {
      setLoading(true);
      console.log('📋 Loading data for department:', departmentId);

      const channelList = await getDepartmentChannels(departmentId);
      console.log('✅ Channels found:', channelList.length);
      setChannels(channelList);
      
      if (channelList.length > 0) {
        setSelectedChannel(channelList[0]);
        const msgs = await getChannelMessages(channelList[0].id);
        console.log('✅ Messages found:', msgs.length);
        setMessages(msgs);
      }

      const eventList = await getDepartmentEvents(departmentId);
      console.log('✅ Events found:', eventList.length);
      setEvents(eventList);
    } catch (error) {
      console.error("❌ Error loading department data:", error);
      toast({
        title: "Error",
        description: "Failed to load department data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDepartmentChange = (departmentId: string) => {
    const selectedDept = departments.find(d => d.id === departmentId);
    if (selectedDept) {
      setDepartment(selectedDept);
      setMessages([]);
      setEvents([]);
      setSelectedChannel(null);
    }
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  };

  const filteredEvents = selectedDate
    ? events.filter((event) => {
        const eventDate = new Date(event.start_datetime);
        return eventDate.toDateString() === selectedDate.toDateString();
      })
    : [];

  const filteredMessages = messages.filter(msg =>
    msg.message_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    msg.sender?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    msg.sender?.last_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSend = async () => {
    if (!newMessage.trim() && !attachedFile) return;
    if (!selectedChannel) return;
    if (!userId) return;

    const messageText = newMessage.trim();
    const tempId = `temp-${Date.now()}`;

    // Optimistic UI update
    const optimisticMessage: DepartmentMessage = {
      id: tempId,
      channel_id: selectedChannel.id,
      sender_id: userId,
      message_text: messageText || (attachedFile ? `Shared ${attachedFile.name}` : ''),
      message_type: 'text',
      file_url: null,
      file_name: null,
      file_size: null,
      is_pinned: false,
      created_at: new Date().toISOString(),
      sender: {
        id: userId,
        first_name: teacherData?.first_name || 'You',
        last_name: teacherData?.last_name || '',
        profile_picture_url: teacherData?.profile_picture_url || null
      },
      sending: true
    } as any;

    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage("");
    const fileToUpload = attachedFile;
    setAttachedFile(null);
    setSending(true);
    setTimeout(scrollToBottom, 50);

    try {
      console.log('📤 Sending message:', { 
        channelId: selectedChannel.id, 
        userId, 
        message: messageText, 
        hasFile: !!fileToUpload 
      });
      
      let fileUrl: string | undefined;
      let finalFileName: string | undefined;
      let finalFileSize: number | undefined;

      if (fileToUpload) {
        console.log('📎 Uploading file:', fileToUpload.name);
        const uploadResult = await uploadDepartmentFile(fileToUpload, selectedChannel.id, userId);
        
        if (!uploadResult) {
          throw new Error('File upload failed');
        }

        fileUrl = uploadResult.url;
        finalFileName = fileToUpload.name;
        finalFileSize = fileToUpload.size;
        console.log('✅ File uploaded successfully');
      }

      let messageType = 'text';
      if (fileToUpload) {
        if (fileToUpload.type.startsWith('image/')) {
          messageType = 'image';
        } else if (fileToUpload.type.startsWith('video/')) {
          messageType = 'video';
        } else if (fileToUpload.type === 'application/pdf' || 
                   fileToUpload.type.includes('document') || 
                   fileToUpload.type.includes('spreadsheet')) {
          messageType = 'document';
        } else {
          messageType = 'file';
        }
      }

      const msg = await sendMessage(
        selectedChannel.id,
        userId,
        messageText || (fileToUpload ? `Shared ${fileToUpload.name}` : ''),
        messageType,
        fileUrl,
        finalFileName,
        finalFileSize
      );

      console.log('✅ Message sent successfully:', msg);

      if (msg) {
        // Replace optimistic message with real one
        setMessages(prev =>
          prev.map(m => m.id === tempId ? { ...msg, sending: false } : m)
        );
        
        toast({
          title: "✓ Success",
          description: fileToUpload ? "File uploaded and message sent" : "Message sent",
        });
      } else {
        throw new Error('No response from server');
      }
    } catch (error) {
      console.error("❌ Error sending message:", error);
      
      // Remove failed message and restore text
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setNewMessage(messageText);
      if (fileToUpload) setAttachedFile(fileToUpload);
      
      toast({
        title: "Failed to send",
        description: "Check your connection and try again",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Maximum file size is 50MB",
          variant: "destructive",
        });
        return;
      }
      setAttachedFile(file);
    }
  };

  const handleTogglePin = async (messageId: string, isPinned: boolean) => {
    if (!userRole || userRole === 'member') {
      toast({
        title: "Permission Denied",
        description: "Only HOD or Admin can pin/unpin messages",
        variant: "destructive",
      });
      return;
    }

    if (!userId) return;

    const success = await togglePinMessage(messageId, userId, !isPinned);
    if (success) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, is_pinned: !isPinned } : msg
        )
      );
      
      toast({
        title: "✓ Success",
        description: isPinned ? "Message unpinned" : "Message pinned",
      });
    }
  };

  const handleCreateEvent = async (eventData: any) => {
    if (!userRole || userRole === 'member') {
      toast({
        title: "Permission Denied",
        description: "Only HOD or Admin can create events",
        variant: "destructive",
      });
      setIsModalOpen(false);
      return;
    }

    if (!department || !userId) return;

    console.log('📅 Creating event with data:', eventData);

    try {
      const startDateTime = eventData.date && eventData.startTime
        ? new Date(`${eventData.date.toDateString()} ${eventData.startTime}`).toISOString()
        : eventData.date ? new Date(eventData.date).toISOString() : new Date().toISOString();

      const endDateTime = eventData.date && eventData.endTime
        ? new Date(`${eventData.date.toDateString()} ${eventData.endTime}`).toISOString()
        : eventData.date ? new Date(eventData.date).toISOString() : new Date().toISOString();

      const newEvent = await createDepartmentEvent(department.id, {
        event_title: eventData.title,
        event_description: eventData.description,
        event_type: eventData.type ? eventData.type.toLowerCase() : 'other',
        start_datetime: startDateTime,
        end_datetime: endDateTime,
        location: eventData.location || null,
        is_all_day: !eventData.startTime && !eventData.endTime,
        created_by: userId,
      });

      console.log('✅ Event created:', newEvent);

      if (newEvent) {
        setEvents((prev) => [...prev, newEvent]);
        setIsModalOpen(false);
        toast({
          title: "✓ Success",
          description: "Event created successfully",
        });
      } else {
        throw new Error('No response from server');
      }
    } catch (error) {
      console.error("❌ Error creating event:", error);
      toast({
        title: "Error",
        description: "Failed to create event",
        variant: "destructive",
      });
    }
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

  const formatMessageTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  // Permission variables
  const canCreateEvents = userRole === 'hod' || userRole === 'admin';
  const canPinMessages = userRole === 'hod' || userRole === 'admin';

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-4" />
          <p className="text-foreground/70">Loading department...</p>
        </div>
      </div>
    );
  }

  if (!department) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-semibold mb-2">No Department Assigned</p>
          <p className="text-muted-foreground">You are not assigned to any department yet.</p>
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
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              {department.department_name}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Department Communication & Events
            </p>
          </div>
          <div className="flex items-center gap-2">
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

            {/* Role Badge */}
            {userRole && (
              <Badge variant="outline" className={
                userRole === 'hod'
                  ? 'bg-purple-100 text-purple-700 border-purple-300' 
                  : userRole === 'admin'
                  ? 'bg-blue-100 text-blue-700 border-blue-300'
                  : 'bg-gray-100 text-gray-700 border-gray-300'
              }>
                {userRole === 'hod' ? '👑 HOD' : userRole === 'admin' ? '⚡ Admin' : '👤 Member'}
              </Badge>
            )}

            {/* Department Selector */}
            {departments.length > 1 && (
              <Select value={department?.id} onValueChange={handleDepartmentChange}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: dept.department_color }}
                        />
                        <span>{dept.department_name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Messages Area */}
        <div className="flex-1 flex flex-col min-h-0 bg-background">
          {/* Chat Header */}
          <div className="bg-sidebar-background border-b border-border px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-foreground">
                  {selectedChannel?.channel_name || "Communication"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Real-time department-wide conversations
                </p>
              </div>
              
              {/* Search */}
              <div className="relative w-64 hidden md:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-input border-border text-foreground"
                />
              </div>
            </div>
          </div>

          {/* Pinned Messages */}
          {messages.some((m) => m.is_pinned) && (
            <div className="bg-accent/50 border-b border-border px-6 py-3 flex-shrink-0">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Pin className="h-4 w-4 text-blue-500" />
                Pinned Messages
              </h4>
              <div className="space-y-1">
                {messages
                  .filter((m) => m.is_pinned)
                  .map((m) => (
                    <div 
                      key={m.id} 
                      className="text-sm bg-card p-2 rounded flex justify-between items-center"
                    >
                      <span className="flex-1">
                        <strong>
                          {m.sender ? `${m.sender.first_name} ${m.sender.last_name}` : "Unknown"}:
                        </strong>{" "}
                        {m.message_text}
                        {m.file_name && (
                          <span className="text-xs text-blue-500 ml-1">
                            📎 {m.file_name}
                          </span>
                        )}
                      </span>
                      {canPinMessages && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleTogglePin(m.id, m.is_pinned)}
                          title="Unpin Message"
                        >
                          <Pin className="w-4 h-4 text-blue-500" />
                        </Button>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0"
          >
            {filteredMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-foreground/70">
                    {searchQuery ? 'No matching messages' : 'No messages yet'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? 'Try a different search term' : 'Start the conversation!'}
                  </p>
                </div>
              </div>
            ) : (
              <>
                {filteredMessages.map((msg, index) => {
                  const isMe = msg.sender_id === userId;
                  const showAvatar = index === 0 || 
                    filteredMessages[index - 1].sender_id !== msg.sender_id;
                  
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex items-end space-x-2 max-w-[70%] ${
                        isMe ? 'flex-row-reverse space-x-reverse' : ''
                      }`}>
                        {!isMe && showAvatar && (
                          <div className="w-8 h-8 bg-primary/10 border border-border rounded-full flex items-center justify-center text-foreground text-xs font-semibold flex-shrink-0 mb-1">
                            {getInitials(msg.sender?.first_name, msg.sender?.last_name)}
                          </div>
                        )}
                        {!isMe && !showAvatar && (
                          <div className="w-8 h-8 flex-shrink-0"></div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          {!isMe && showAvatar && (
                            <p className="text-xs text-muted-foreground mb-1 ml-2">
                              {msg.sender ? 
                                `${msg.sender.first_name} ${msg.sender.last_name}` : 
                                "Unknown"
                              }
                            </p>
                          )}
                          
                          <div className={`px-4 py-2 rounded-2xl ${
                            isMe
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-card border border-border text-foreground'
                          } ${(msg as any).sending ? 'opacity-60' : ''}`}>
                            <p className="text-sm break-words">{msg.message_text}</p>

                            {/* Display images inline */}
                            {msg.message_type === 'image' && msg.file_url && (
                              <img 
                                src={msg.file_url} 
                                alt={msg.file_name || 'Shared image'} 
                                className="mt-2 rounded-lg max-w-full max-h-64 object-cover cursor-pointer"
                                onClick={() => window.open(msg.file_url!, '_blank')}
                              />
                            )}

                            {/* File attachments */}
                            {msg.file_name && msg.file_url && msg.message_type !== 'image' && (
                              <a 
                                href={msg.file_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-blue-500 mt-2 flex items-center gap-1 hover:underline"
                              >
                                <Paperclip className="h-3 w-3" />
                                {msg.file_name}
                                {msg.file_size && 
                                  ` (${(msg.file_size / 1024 / 1024).toFixed(2)} MB)`
                                }
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                          
                          <div className={`flex items-center space-x-1 mt-1 ${
                            isMe ? 'justify-end' : 'justify-start'
                          }`}>
                            <span className="text-xs text-muted-foreground">
                              {(msg as any).sending ? 
                                'Sending...' : 
                                formatMessageTime(msg.created_at)
                              }
                            </span>
                            {isMe && !(msg as any).sending && (
                              <CheckCheck className="h-3 w-3 text-blue-500" />
                            )}
                            
                            {/* Pin button */}
                            {canPinMessages && (
                              <button
                                onClick={() => handleTogglePin(msg.id, msg.is_pinned)}
                                className="opacity-0 group-hover:opacity-100 transition ml-2 text-muted-foreground hover:text-blue-500"
                                title={msg.is_pinned ? "Unpin message" : "Pin message"}
                              >
                                <Pin className={`w-4 h-4 ${
                                  msg.is_pinned ? "text-blue-500" : ""
                                }`} />
                              </button>
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

          {/* Message Input */}
          <div className="bg-sidebar-background border-t border-border px-6 py-4 flex-shrink-0">
            {attachedFile && (
              <div className="mb-2 flex items-center gap-2 text-sm bg-accent px-3 py-2 rounded-lg">
                <Paperclip className="h-4 w-4" />
                <span className="flex-1 truncate">{attachedFile.name}</span>
                <span className="text-xs text-muted-foreground">
                  {(attachedFile.size / 1024 / 1024).toFixed(2)} MB
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setAttachedFile(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            <div className="flex items-end gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />

              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleAttachClick}
                disabled={sending}
              >
                <Paperclip className="w-4 h-4" />
              </Button>

              <Textarea
                ref={textareaRef}
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                className="resize-none bg-input border-border text-foreground min-h-[44px] max-h-[120px] rounded-lg flex-1"
                rows={1}
                disabled={sending}
              />
              
              <Button 
                onClick={handleSend} 
                disabled={sending || (!newMessage.trim() && !attachedFile)}
                className="flex-shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 h-11 w-11 rounded-full p-0"
              >
                {sending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Calendar & Events Sidebar */}
        <div className="w-96 min-w-[384px] max-w-[420px] border-l border-border bg-sidebar-background flex-shrink-0 overflow-y-auto hidden lg:flex flex-col">
          <div className="p-6 space-y-4 flex-1">
            {/* Calendar Card */}
            <Card>
              <CardHeader className="flex flex-row justify-between items-center pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CalendarDays className="h-5 w-5" /> Calendar
                </CardTitle>
                {canCreateEvents && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setIsModalOpen(true)}
                    title="Create Event"
                  >
                    + Event
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  modifiers={{
                    hasEvent: (date) =>
                      events.some((e) => {
                        const eventDate = new Date(e.start_datetime);
                        return eventDate.toDateString() === date.toDateString();
                      }),
                  }}
                  modifiersClassNames={{
                    hasEvent:
                      "relative after:content-['\u2022'] after:text-blue-400 after:text-lg after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2",
                  }}
                />
              </CardContent>
            </Card>

            {/* Events Card */}
            <Card className="flex-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5" /> Event Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedDate ? (
                  <p className="text-sm text-muted-foreground">
                    Select a date to view events
                  </p>
                ) : filteredEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No events on this date
                  </p>
                ) : (
                  <div className="space-y-4">
                    {filteredEvents.map((event) => (
                      <div 
                        key={event.id} 
                        className="border-b border-border pb-3 last:border-0"
                      >
                        <h4 className="font-semibold text-sm mb-1">
                          {event.event_title}
                        </h4>
                        <p className="text-xs text-muted-foreground mb-2">
                          {event.event_description}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(event.start_datetime).toLocaleTimeString([], { 
                            hour: "2-digit", 
                            minute: "2-digit" 
                          })}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <User className="h-3 w-3" />
                          {event.creator ? 
                            `${event.creator.first_name} ${event.creator.last_name}` : 
                            "Unknown"
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Event Creation Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Department Event</DialogTitle>
          </DialogHeader>
          <EventCreationForm
            onSave={handleCreateEvent}
            onCancel={() => setIsModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherDepartment;