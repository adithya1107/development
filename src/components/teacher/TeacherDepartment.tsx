/**
 * TeacherDepartment Component
 * 
 * Department-based communication platform with tag-based role management:
 * 
 * Tag Assignments with Context:
 * - hod: Stored directly in departments.hod_id (not a tag)
 * - department_admin: For faculty admins with context_type='department' and context_id=[department_id]
 * - department_member: For faculty members with context_type='department' and context_id=[department_id]
 * - class_representative: For student CRs with context_type='department' and context_id=[department_id]
 * 
 * All role assignments use generic tags with context to scope them to specific departments.
 */

import React, { useState, useRef, useEffect } from "react";
import { 
  CalendarDays, Clock, User, Paperclip, Send, Image as ImageIcon, 
  Pin, Loader2, Building2, Search, ArrowLeft, Wifi, WifiOff, 
  AlertCircle, CheckCheck, X, Download, ExternalLink, Users, UserPlus,
  UserMinus, Shield, Crown
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import EventCreationForm from "./EventCreationForm";

interface DepartmentMessage {
  id: string;
  channel_id: string;
  sender_id: string;
  message_text: string;
  message_type: string;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  is_pinned: boolean;
  created_at: string;
  sender?: {
    id: string;
    first_name: string;
    last_name: string;
    profile_picture_url: string | null;
  };
}

interface DepartmentEvent {
  id: string;
  department_id: string;
  event_title: string;
  event_description: string;
  event_type: string;
  start_datetime: string;
  end_datetime: string;
  location: string | null;
  is_all_day: boolean;
  created_by: string;
  created_at: string;
  creator?: {
    first_name: string;
    last_name: string;
  };
}

interface Department {
  id: string;
  department_name: string;
  department_code: string;
  department_color: string;
  college_id: string;
  is_active: boolean;
}

interface DepartmentChannel {
  id: string;
  department_id: string;
  channel_name: string;
  channel_description: string | null;
  is_active: boolean;
  created_at: string;
}


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

  // Member management states
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [departmentMembers, setDepartmentMembers] = useState<any[]>([]);
  const [classRepresentatives, setClassRepresentatives] = useState<any[]>([]);
  const [availableFaculty, setAvailableFaculty] = useState<any[]>([]);
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);
  const [memberSearchTerm, setMemberSearchTerm] = useState("");
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [activeTab, setActiveTab] = useState<'faculty' | 'students'>('faculty');

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
  const selectedChannelIdRef = useRef<string | null>(null);
  const messageSubscriptionRef = useRef<any>(null);

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
    selectedChannelIdRef.current = selectedChannel?.id || null;
    console.log('📌 Selected channel ref updated:', selectedChannelIdRef.current);
  }, [selectedChannel?.id]);

  useEffect(() => {
    if (!selectedChannel) return;

    console.log('📡 Setting up realtime subscription for channel:', selectedChannel.id);
    
    // Clean up any existing subscription first
    const cleanup = () => {
      if (messageSubscriptionRef.current) {
        console.log('🧹 Cleaning up old subscription');
        supabase.removeChannel(messageSubscriptionRef.current);
        messageSubscriptionRef.current = null;
      }
    };
    
    cleanup();

    // Create new subscription with unique channel name
    const channelName = `department-messages-${selectedChannel.id}-${Date.now()}`;
    const subscription = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'department_messages' // 🔥 CORRECT TABLE NAME
      }, async (payload) => {
        console.log('📨 Real-time message INSERT received:', {
          id: payload.new.id,
          channel_id: payload.new.channel_id,
          current_channel: selectedChannelIdRef.current,
          matches: payload.new.channel_id === selectedChannelIdRef.current
        });
        
        // 🔥 KEY FIX: Use ref instead of state to check channel match
        if (payload.new.channel_id === selectedChannelIdRef.current) {
          console.log('✅ Message is for current channel, fetching full data');
          
          // Fetch full message data with sender info
          const { data: fullMessage } = await supabase
            .from('department_messages')
            .select(`
              *,
              sender:user_profiles!department_messages_sender_id_fkey(
                id,
                first_name,
                last_name,
                profile_picture_url
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (fullMessage) {
            setMessages((prev) => {
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
        } else {
          console.log('⏭️ Message is for different channel, ignoring');
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'department_messages'
      }, (payload) => {
        if (payload.new.channel_id === selectedChannelIdRef.current) {
          console.log('📝 Message updated:', payload.new.id);
          setMessages(prev =>
            prev.map(msg => msg.id === payload.new.id ? { ...msg, ...payload.new } : msg)
          );
        }
      })
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('connected');
          console.log('✅ Successfully subscribed to department messages');
        } else if (status === 'CHANNEL_ERROR') {
          setRealtimeStatus('error');
          console.error('❌ Channel subscription error');
        } else if (status === 'TIMED_OUT') {
          setRealtimeStatus('disconnected');
          console.warn('⏱️ Subscription timed out');
        }
      });

    messageSubscriptionRef.current = subscription;
    setRealtimeStatus('connecting');
    console.log('✅ Realtime subscription active');

    return () => {
      console.log('🧹 Cleaning up subscription on unmount/channel change');
      cleanup();
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
      
      // Method 1: Check if user is HOD of any department (via tag system)
      const { data: hodTag } = await supabase
        .from('user_tags')
        .select('id')
        .eq('tag_name', 'hod')
        .single();

      let hodDepartments: Department[] = [];
      if (hodTag) {
        const { data: hodAssignments } = await supabase
          .from('user_tag_assignments')
          .select('context_id')
          .eq('tag_id', hodTag.id)
          .eq('context_type', 'department')
          .eq('user_id', userId)
          .eq('is_active', true);

        if (hodAssignments && hodAssignments.length > 0) {
          const deptIds = hodAssignments.map(a => a.context_id);
          const { data: depts } = await supabase
            .from('departments')
            .select('*')
            .in('id', deptIds)
            .eq('is_active', true);
          
          if (depts) {
            hodDepartments = depts;
            console.log('✅ Found HOD departments:', hodDepartments.length);
          }
        }
      }

      // Method 2: Check if user is department_member or department_admin
      const { data: memberTag } = await supabase
        .from('user_tags')
        .select('id')
        .eq('tag_name', 'department_member')
        .single();

      const { data: adminTag } = await supabase
        .from('user_tags')
        .select('id')
        .eq('tag_name', 'department_admin')
        .single();

      let memberDepartments: Department[] = [];
      const tagIds = [memberTag?.id, adminTag?.id].filter(Boolean);
      
      if (tagIds.length > 0) {
        const { data: memberAssignments } = await supabase
          .from('user_tag_assignments')
          .select('context_id')
          .in('tag_id', tagIds)
          .eq('context_type', 'department')
          .eq('user_id', userId)
          .eq('is_active', true);

        if (memberAssignments && memberAssignments.length > 0) {
          const deptIds = memberAssignments.map(a => a.context_id);
          const { data: depts } = await supabase
            .from('departments')
            .select('*')
            .in('id', deptIds)
            .eq('is_active', true);
          
          if (depts) {
            memberDepartments = depts;
            console.log('✅ Found member/admin departments:', memberDepartments.length);
          }
        }
      }

      // Combine and deduplicate departments
      const allDepartmentIds = new Set([
        ...hodDepartments.map(d => d.id),
        ...memberDepartments.map(d => d.id)
      ]);

      const allDepartments = [...hodDepartments, ...memberDepartments].filter((dept, index, self) => 
        index === self.findIndex(d => d.id === dept.id)
      );

      console.log('✅ Total unique departments found:', allDepartments.length);
      
      if (allDepartments.length === 0) {
        console.log('⚠️ No departments found for user');
        toast({
          title: "No Department",
          description: "You are not assigned to any department yet. Please contact your administrator.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      setDepartments(allDepartments);
      setDepartment(allDepartments[0]);
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
      // First check if user is HOD
      const { data: deptData } = await supabase
        .from('departments')
        .select('hod_id')
        .eq('id', departmentId)
        .single();

      // Get HOD from tag assignments
      const { data: hodTag } = await supabase
        .from('user_tags')
        .select('id')
        .eq('tag_name', 'hod')
        .single();

      if (hodTag) {
        const { data: hodAssignment } = await supabase
          .from('user_tag_assignments')
          .select('user_id')
          .eq('tag_id', hodTag.id)
          .eq('context_type', 'department')
          .eq('context_id', departmentId)
          .eq('is_active', true)
          .maybeSingle();

        if (hodAssignment && hodAssignment.user_id === userId) {
          setUserRole('hod');
          console.log('✅ User is HOD of this department');
          return;
        }
      }

      // Check for admin role
      const { data: adminTag } = await supabase
        .from('user_tags')
        .select('id')
        .eq('tag_name', 'department_admin')
        .single();

      if (adminTag) {
        const { data: adminAssignment } = await supabase
          .from('user_tag_assignments')
          .select('user_id')
          .eq('tag_id', adminTag.id)
          .eq('context_type', 'department')
          .eq('context_id', departmentId)
          .eq('user_id', userId)
          .eq('is_active', true)
          .maybeSingle();

        if (adminAssignment) {
          setUserRole('admin');
          console.log('✅ User is Admin of this department');
          return;
        }
      }

      // Default to member
      setUserRole('member');
      console.log('✅ User is Member of this department');
    } catch (error) {
      console.log('Error checking user role:', error);
      setUserRole('member');
    }
  };

  const loadDepartmentData = async (departmentId: string) => {
    try {
      setLoading(true);
      console.log('📋 Loading data for department:', departmentId);

      // Fetch channels directly
      console.log('🔍 Fetching channels from department_channels table...');
      const { data: channelList, error: channelError } = await supabase
        .from('department_channels')
        .select('*')
        .eq('department_id', departmentId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (channelError) {
        console.error('❌ Error fetching channels:', channelError);
        throw channelError;
      }

      console.log('✅ Channels query result:', {
        count: channelList?.length || 0,
        channels: channelList
      });
      
      setChannels(channelList || []);
      
      if (channelList && channelList.length > 0) {
        console.log('📌 Setting selected channel to:', channelList[0]);
        setSelectedChannel(channelList[0]);
        
        // Fetch messages directly
        console.log('🔍 Fetching messages for channel:', channelList[0].id);
        const { data: msgs, error: msgError } = await supabase
          .from('department_messages')
          .select(`
            *,
            sender:user_profiles!department_messages_sender_id_fkey(
              id,
              first_name,
              last_name,
              profile_picture_url
            )
          `)
          .eq('channel_id', channelList[0].id)
          .order('created_at', { ascending: true });

        if (msgError) {
          console.error('❌ Error fetching messages:', msgError);
          throw msgError;
        }

        console.log('✅ Messages found:', msgs?.length || 0);
        setMessages(msgs || []);
      } else {
        console.warn('⚠️ No channels found for this department');
        console.log('🔧 Creating default "General" channel...');
        
        // Auto-create a default channel
        const { data: newChannel, error: createError } = await supabase
          .from('department_channels')
          .insert({
            department_id: departmentId,
            channel_name: 'General',
            channel_description: 'General department discussion',
            is_active: true,
            created_by: userId
          })
          .select()
          .single();

        if (createError) {
          console.error('❌ Error creating default channel:', createError);
          toast({
            title: "No Channels",
            description: "No communication channels found. Please contact administrator.",
            variant: "destructive",
          });
        } else {
          console.log('✅ Default channel created:', newChannel);
          setChannels([newChannel]);
          setSelectedChannel(newChannel);
          setMessages([]);
          
          toast({
            title: "Channel Created",
            description: "General channel created for department communication",
          });
        }
      }

      // Fetch events directly
      console.log('🔍 Fetching events...');
      const { data: eventList, error: eventError } = await supabase
        .from('department_events')
        .select(`
          *,
          creator:user_profiles!department_events_created_by_fkey(
            first_name,
            last_name
          )
        `)
        .eq('department_id', departmentId)
        .order('start_datetime', { ascending: true });

      if (eventError) {
        console.error('❌ Error fetching events:', eventError);
        throw eventError;
      }

      console.log('✅ Events found:', eventList?.length || 0);
      setEvents(eventList || []);
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

  const loadDepartmentMembers = async () => {
    if (!department) return;

    setLoadingMembers(true);
    try {
      console.log('👥 Loading department members for:', department.id);

      // Get department_member tag
      const { data: memberTag } = await supabase
        .from('user_tags')
        .select('id')
        .eq('tag_name', 'department_member')
        .single();

      if (!memberTag) {
        console.error('department_member tag not found');
        setDepartmentMembers([]);
      } else {
        // Fetch all faculty members in this department
        const { data: members, error: membersError } = await supabase
          .from('user_tag_assignments')
          .select(`
            id,
            user_id,
            assigned_at,
            user_profiles!user_tag_assignments_user_id_fkey (
              id,
              first_name,
              last_name,
              email,
              user_code,
              user_type
            )
          `)
          .eq('tag_id', memberTag.id)
          .eq('context_type', 'department')
          .eq('context_id', department.id)
          .eq('is_active', true);

        if (membersError) throw membersError;
        setDepartmentMembers(members || []);

        // Get available faculty (not yet members)
        const { data: allFaculty, error: facultyError } = await supabase
          .from('user_profiles')
          .select('id, first_name, last_name, email, user_code')
          .eq('college_id', teacherData.college_id)
          .eq('user_type', 'faculty')
          .eq('is_active', true);

        if (facultyError) throw facultyError;

        const memberIds = members?.map(m => m.user_profiles.id) || [];
        setAvailableFaculty(allFaculty?.filter(f => !memberIds.includes(f.id)) || []);
      }

      // Get class_representative tag
      const { data: crTag } = await supabase
        .from('user_tags')
        .select('id')
        .eq('tag_name', 'class_representative')
        .single();

      if (!crTag) {
        console.error('class_representative tag not found');
        setClassRepresentatives([]);
      } else {
        // Fetch all class representatives in this department
        const { data: crs, error: crsError } = await supabase
          .from('user_tag_assignments')
          .select(`
            id,
            user_id,
            assigned_at,
            user_profiles!user_tag_assignments_user_id_fkey (
              id,
              first_name,
              last_name,
              email,
              user_code,
              user_type
            )
          `)
          .eq('tag_id', crTag.id)
          .eq('context_type', 'department')
          .eq('context_id', department.id)
          .eq('is_active', true);

        if (crsError) throw crsError;
        setClassRepresentatives(crs || []);

        // Get available students (not yet CRs)
        const { data: allStudents, error: studentsError } = await supabase
          .from('user_profiles')
          .select('id, first_name, last_name, email, user_code')
          .eq('college_id', teacherData.college_id)
          .eq('user_type', 'student')
          .eq('is_active', true);

        if (studentsError) throw studentsError;

        const crIds = crs?.map(cr => cr.user_profiles.id) || [];
        setAvailableStudents(allStudents?.filter(s => !crIds.includes(s.id)) || []);
      }

      console.log('✅ Members loaded:', {
        faculty: departmentMembers.length,
        crs: classRepresentatives.length
      });
    } catch (error) {
      console.error('❌ Error loading members:', error);
      toast({
        title: "Error",
        description: "Failed to load department members",
        variant: "destructive",
      });
    } finally {
      setLoadingMembers(false);
    }
  };

  const addDepartmentMember = async (facultyId: string) => {
    if (!department) return;

    try {
      const { data: memberTag } = await supabase
        .from('user_tags')
        .select('id')
        .eq('tag_name', 'department_member')
        .single();

      if (!memberTag) {
        toast({
          title: "Error",
          description: "department_member tag not found",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('user_tag_assignments')
        .insert({
          user_id: facultyId,
          tag_id: memberTag.id,
          context_type: 'department',
          context_id: department.id,
          assigned_by: userId
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Faculty member added to department",
      });

      await loadDepartmentMembers();
    } catch (error) {
      console.error('Error adding member:', error);
      toast({
        title: "Error",
        description: "Failed to add member",
        variant: "destructive",
      });
    }
  };

  const removeDepartmentMember = async (assignmentId: string, memberName: string) => {
    try {
      const { error } = await supabase
        .from('user_tag_assignments')
        .update({ is_active: false })
        .eq('id', assignmentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${memberName} removed from department`,
      });

      await loadDepartmentMembers();
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: "Error",
        description: "Failed to remove member",
        variant: "destructive",
      });
    }
  };

  const addClassRepresentative = async (studentId: string) => {
    if (!department) return;

    try {
      const { data: crTag } = await supabase
        .from('user_tags')
        .select('id')
        .eq('tag_name', 'class_representative')
        .single();

      if (!crTag) {
        toast({
          title: "Error",
          description: "class_representative tag not found",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('user_tag_assignments')
        .insert({
          user_id: studentId,
          tag_id: crTag.id,
          context_type: 'department',
          context_id: department.id,
          assigned_by: userId
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Class representative added to department",
      });

      await loadDepartmentMembers();
    } catch (error) {
      console.error('Error adding CR:', error);
      toast({
        title: "Error",
        description: "Failed to add class representative",
        variant: "destructive",
      });
    }
  };

  const removeClassRepresentative = async (assignmentId: string, crName: string) => {
    try {
      const { error } = await supabase
        .from('user_tag_assignments')
        .update({ is_active: false })
        .eq('id', assignmentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${crName} removed as class representative`,
      });

      await loadDepartmentMembers();
    } catch (error) {
      console.error('Error removing CR:', error);
      toast({
        title: "Error",
        description: "Failed to remove class representative",
        variant: "destructive",
      });
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

  const filteredAvailableFaculty = availableFaculty.filter(faculty =>
    `${faculty.first_name} ${faculty.last_name}`.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
    faculty.user_code.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
    faculty.email.toLowerCase().includes(memberSearchTerm.toLowerCase())
  );

  const filteredAvailableStudents = availableStudents.filter(student =>
    `${student.first_name} ${student.last_name}`.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
    student.user_code.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(memberSearchTerm.toLowerCase())
  );

  const handleSend = async () => {
    console.log('🔵 handleSend called', {
      newMessage: newMessage,
      newMessageTrim: newMessage.trim(),
      attachedFile: !!attachedFile,
      selectedChannel: !!selectedChannel,
      userId: userId
    });

    if (!newMessage.trim() && !attachedFile) {
      console.log('❌ No message or file to send');
      return;
    }
    if (!selectedChannel) {
      console.log('❌ No channel selected');
      return;
    }
    if (!userId) {
      console.log('❌ No userId');
      return;
    }

    const messageText = newMessage.trim();
    const tempId = `temp-${Date.now()}`;

    console.log('📤 Sending message:', {
      channel_id: selectedChannel.id,
      text: messageText.substring(0, 30),
      hasFile: !!attachedFile
    });

    // Optimistic UI update
    const optimisticMessage = {
      id: tempId,
      tempId: tempId,
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
    };

    setMessages(prev => [...prev, optimisticMessage as any]);
    setNewMessage("");
    const fileToUpload = attachedFile;
    setAttachedFile(null);
    setSending(true);
    setTimeout(scrollToBottom, 50);

    try {
      let fileUrl: string | undefined;
      let finalFileName: string | undefined;
      let finalFileSize: number | undefined;

      // Handle file upload if present
      if (fileToUpload) {
        console.log('📎 Uploading file:', fileToUpload.name);
        
        // Upload to Supabase Storage
        const fileExt = fileToUpload.name.split('.').pop();
        const filePath = `department-files/${selectedChannel.id}/${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('department-files')
          .upload(filePath, fileToUpload);

        if (uploadError) {
          console.error('File upload error:', uploadError);
          throw new Error('File upload failed');
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('department-files')
          .getPublicUrl(filePath);

        fileUrl = urlData.publicUrl;
        finalFileName = fileToUpload.name;
        finalFileSize = fileToUpload.size;
        console.log('✅ File uploaded successfully:', fileUrl);
      }

      // Determine message type
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

      // Insert message into database
      const { data: msg, error: msgError } = await supabase
        .from('department_messages')
        .insert({
          channel_id: selectedChannel.id,
          sender_id: userId,
          message_text: messageText || (fileToUpload ? `Shared ${fileToUpload.name}` : ''),
          message_type: messageType,
          file_url: fileUrl || null,
          file_name: finalFileName || null,
          file_size: finalFileSize || null,
          is_pinned: false
        })
        .select(`
          *,
          sender:user_profiles!department_messages_sender_id_fkey(
            id,
            first_name,
            last_name,
            profile_picture_url
          )
        `)
        .single();

      if (msgError) throw msgError;

      console.log('✅ Message sent successfully:', msg.id);

      if (msg) {
        // Replace optimistic message with real one
        setMessages(prev =>
          prev.map(m => (m as any).tempId === tempId ? { ...msg, sending: false } : m)
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
      setMessages(prev => prev.filter(m => (m as any).tempId !== tempId));
      setNewMessage(messageText);
      if (fileToUpload) setAttachedFile(fileToUpload);
      
      toast({
        title: "Failed to send",
        description: error instanceof Error ? error.message : "Check your connection and try again",
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

    try {
      const { error } = await supabase
        .from('department_channel_messages')
        .update({ 
          is_pinned: !isPinned,
          pinned_by: !isPinned ? userId : null,
          pinned_at: !isPinned ? new Date().toISOString() : null
        })
        .eq('id', messageId);

      if (error) throw error;

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, is_pinned: !isPinned } : msg
        )
      );
      
      toast({
        title: "✓ Success",
        description: isPinned ? "Message unpinned" : "Message pinned",
      });
    } catch (error) {
      console.error('Error toggling pin:', error);
      toast({
        title: "Error",
        description: "Failed to update message",
        variant: "destructive",
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

      const { data: newEvent, error } = await supabase
        .from('department_events')
        .insert({
          department_id: department.id,
          event_title: eventData.title,
          event_description: eventData.description,
          event_type: eventData.type ? eventData.type.toLowerCase() : 'other',
          start_datetime: startDateTime,
          end_datetime: endDateTime,
          location: eventData.location || null,
          is_all_day: !eventData.startTime && !eventData.endTime,
          created_by: userId,
        })
        .select(`
          *,
          creator:user_profiles!department_events_created_by_fkey(
            first_name,
            last_name
          )
        `)
        .single();

      if (error) throw error;

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

  const canManageMembers = userRole === 'hod' || userRole === 'admin';
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

            {/* Manage Members Button */}
            {canManageMembers && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowMembersDialog(true);
                  loadDepartmentMembers();
                }}
              >
                <Users className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Members</span>
              </Button>
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

                            {msg.message_type === 'image' && msg.file_url && (
                              <img 
                                src={msg.file_url} 
                                alt={msg.file_name || 'Shared image'} 
                                className="mt-2 rounded-lg max-w-full max-h-64 object-cover cursor-pointer"
                                onClick={() => window.open(msg.file_url!, '_blank')}
                              />
                            )}

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
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className="resize-none bg-input border-border text-foreground min-h-[44px] max-h-[120px] rounded-lg flex-1"
                rows={1}
                disabled={sending}
              />
              
              <Button 
                onClick={() => {
                  console.log('🔴 Send button clicked!');
                  handleSend();
                }} 
                disabled={sending || (!newMessage.trim() && !attachedFile)}
                className="flex-shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 h-11 w-11 rounded-full p-0"
                title="Send message"
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

      {/* Members Management Dialog */}
      <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Manage Department Members
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Add or remove faculty members and class representatives for {department?.department_name}
            </p>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'faculty' | 'students')} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="faculty">
                Faculty Members ({departmentMembers.length})
              </TabsTrigger>
              <TabsTrigger value="students">
                Class Representatives ({classRepresentatives.length})
              </TabsTrigger>
            </TabsList>

            {/* Faculty Tab */}
            <TabsContent value="faculty" className="flex-1 overflow-hidden flex flex-col mt-4">
              {loadingMembers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-4">
                  {/* Current Members */}
                  <div>
                    <h3 className="font-semibold mb-2">Current Faculty Members</h3>
                    {departmentMembers.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4">
                        No faculty members assigned yet
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {departmentMembers.map((member) => (
                          <Card key={member.id} className="p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">
                                  {member.user_profiles.first_name} {member.user_profiles.last_name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {member.user_profiles.user_code} • {member.user_profiles.email}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => removeDepartmentMember(
                                  member.id,
                                  `${member.user_profiles.first_name} ${member.user_profiles.last_name}`
                                )}
                              >
                                <UserMinus className="h-4 w-4" />
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Available Faculty */}
                  <div>
                    <h3 className="font-semibold mb-2">Add Faculty Members</h3>
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search faculty..."
                        value={memberSearchTerm}
                        onChange={(e) => setMemberSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {filteredAvailableFaculty.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4">
                        {memberSearchTerm ? 'No matching faculty found' : 'All faculty are already members'}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {filteredAvailableFaculty.map((faculty) => (
                          <Card key={faculty.id} className="p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">
                                  {faculty.first_name} {faculty.last_name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {faculty.user_code} • {faculty.email}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => addDepartmentMember(faculty.id)}
                              >
                                <UserPlus className="h-4 w-4 mr-1" />
                                Add
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Students Tab */}
            <TabsContent value="students" className="flex-1 overflow-hidden flex flex-col mt-4">
              {loadingMembers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-4">
                  {/* Current CRs */}
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Crown className="h-4 w-4 text-yellow-500" />
                      Current Class Representatives
                    </h3>
                    {classRepresentatives.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4">
                        No class representatives assigned yet
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {classRepresentatives.map((cr) => (
                          <Card key={cr.id} className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Crown className="h-4 w-4 text-yellow-500" />
                                <div>
                                  <p className="font-medium text-sm">
                                    {cr.user_profiles.first_name} {cr.user_profiles.last_name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {cr.user_profiles.user_code} • {cr.user_profiles.email}
                                  </p>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => removeClassRepresentative(
                                  cr.id,
                                  `${cr.user_profiles.first_name} ${cr.user_profiles.last_name}`
                                )}
                              >
                                <UserMinus className="h-4 w-4" />
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Available Students */}
                  <div>
                    <h3 className="font-semibold mb-2">Add Class Representatives</h3>
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search students..."
                        value={memberSearchTerm}
                        onChange={(e) => setMemberSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {filteredAvailableStudents.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4">
                        {memberSearchTerm ? 'No matching students found' : 'All students are already CRs'}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {filteredAvailableStudents.map((student) => (
                          <Card key={student.id} className="p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">
                                  {student.first_name} {student.last_name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {student.user_code} • {student.email}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => addClassRepresentative(student.id)}
                              >
                                <Crown className="h-4 w-4 mr-1" />
                                Add
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={() => setShowMembersDialog(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherDepartment;