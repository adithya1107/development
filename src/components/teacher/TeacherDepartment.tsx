import React, { useState, useRef, useEffect } from "react";
import { CalendarDays, Clock, User, Paperclip, Send, Image as ImageIcon, Pin, Loader2, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import EventCreationForm from "./EventCreationForm";
import { useDepartmentPermissions } from "@/hooks/useDepartmentPermissions";
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

  const [newMessage, setNewMessage] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Get user permissions for the current department
  const userId = teacherData?.id || teacherData?.user_id;
  const permissions = useDepartmentPermissions(department?.id, userId);

  useEffect(() => {
    const userId = teacherData?.id || teacherData?.user_id;
    if (userId) {
      loadAllDepartments(userId);
    }
  }, [teacherData?.id, teacherData?.user_id]);

  useEffect(() => {
    if (department) {
      loadDepartmentData(department.id);
    }
  }, [department?.id]);

  useEffect(() => {
    if (!selectedChannel) return;

    const subscription = subscribeToMessages(selectedChannel.id, (newMsg) => {
      console.log('Real-time message received:', newMsg);
      // Prevent duplicate messages by checking if message already exists
      setMessages((prev) => {
        const exists = prev.some(msg => msg.id === newMsg.id);
        if (exists) {
          console.log('Message already exists, skipping duplicate');
          return prev;
        }
        return [...prev, newMsg];
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [selectedChannel?.id]);

  const loadAllDepartments = async (userId: string) => {
    try {
      setLoading(true);
      console.log('Loading all departments for user:', userId);
      
      const depts = await getUserDepartments(userId);
      console.log('Departments found:', depts);
      
      if (depts.length === 0) {
        console.log('No departments found for user');
        toast({
          title: "No Department",
          description: "You are not assigned to any department yet.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      setDepartments(depts);
      // Auto-select first department
      setDepartment(depts[0]);
    } catch (error) {
      console.error("Error loading departments:", error);
      toast({
        title: "Error",
        description: "Failed to load departments",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const loadDepartmentData = async (departmentId: string) => {
    try {
      setLoading(true);
      console.log('Loading data for department:', departmentId);

      const channelList = await getDepartmentChannels(departmentId);
      console.log('Channels found:', channelList.length);
      setChannels(channelList);
      
      if (channelList.length > 0) {
        setSelectedChannel(channelList[0]);
        const msgs = await getChannelMessages(channelList[0].id);
        console.log('Messages found:', msgs.length);
        setMessages(msgs);
      }

      const eventList = await getDepartmentEvents(departmentId);
      console.log('Events found:', eventList.length);
      setEvents(eventList);
    } catch (error) {
      console.error("Error loading department data:", error);
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

  const filteredEvents = selectedDate
    ? events.filter((event) => {
        const eventDate = new Date(event.start_datetime);
        return eventDate.toDateString() === selectedDate.toDateString();
      })
    : [];

  const handleSend = async () => {
    if (!newMessage.trim() && !attachedFile) return;
    if (!selectedChannel) return;

    const userId = teacherData?.id || teacherData?.user_id;
    if (!userId) return;

    try {
      setSending(true);
      console.log('Sending message:', { channelId: selectedChannel.id, userId, message: newMessage.trim(), hasFile: !!attachedFile });
      
      let fileUrl: string | undefined;
      let finalFileName: string | undefined;
      let finalFileSize: number | undefined;

      // If there's an attached file, upload it first
      if (attachedFile) {
        console.log('Uploading file:', attachedFile.name);
        const uploadResult = await uploadDepartmentFile(attachedFile, selectedChannel.id, userId);
        
        if (!uploadResult) {
          toast({
            title: "Error",
            description: "Failed to upload file",
            variant: "destructive",
          });
          setSending(false);
          return;
        }

        fileUrl = uploadResult.url;
        finalFileName = attachedFile.name;
        finalFileSize = attachedFile.size;
        console.log('File uploaded successfully:', uploadResult.url);
      }

      // Determine message type based on file
      let messageType = 'text';
      if (attachedFile) {
        if (attachedFile.type.startsWith('image/')) {
          messageType = 'image';
        } else if (attachedFile.type.startsWith('video/')) {
          messageType = 'video';
        } else if (attachedFile.type === 'application/pdf' || attachedFile.type.includes('document') || attachedFile.type.includes('spreadsheet')) {
          messageType = 'document';
        } else {
          messageType = 'file';
        }
      }

      const msg = await sendMessage(
        selectedChannel.id,
        userId,
        newMessage.trim() || (attachedFile ? `Shared ${attachedFile.name}` : ''),
        messageType,
        fileUrl,
        finalFileName,
        finalFileSize
      );

      console.log('Message sent, response:', msg);

      if (msg) {
        // Immediately add the message to the UI
        setMessages((prev) => [...prev, msg]);
        setNewMessage("");
        setAttachedFile(null);
        
        toast({
          title: "Success",
          description: attachedFile ? "File uploaded and message sent" : "Message sent successfully",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to send message - no response from server",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
      setAttachedFile(file);
    }
  };

  const handleTogglePin = async (messageId: string, isPinned: boolean) => {
    // Check permissions
    if (isPinned && !permissions.canUnpinMessages) {
      toast({
        title: "Permission Denied",
        description: "Only HOD or Admin can unpin messages",
        variant: "destructive",
      });
      return;
    }

    if (!isPinned && !permissions.canPinMessages) {
      toast({
        title: "Permission Denied",
        description: "Only HOD or Admin can pin messages",
        variant: "destructive",
      });
      return;
    }

    const userId = teacherData?.id || teacherData?.user_id;
    if (!userId) return;

    const success = await togglePinMessage(messageId, userId, !isPinned);
    if (success) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, is_pinned: !isPinned } : msg
        )
      );
      
      toast({
        title: "Success",
        description: isPinned ? "Message unpinned" : "Message pinned",
      });
    }
  };

  const handleCreateEvent = async (eventData: any) => {
    // Check permissions
    if (!permissions.canCreateEvents) {
      toast({
        title: "Permission Denied",
        description: "Only HOD or Admin can create events",
        variant: "destructive",
      });
      setIsModalOpen(false);
      return;
    }

    if (!department) return;

    const userId = teacherData?.id || teacherData?.user_id;
    if (!userId) return;

    console.log('Creating event with data:', eventData);

    try {
      // Combine date and time into datetime strings
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
        is_all_day: !eventData.startTime && !eventData.endTime, // If no times specified, make it all-day
        created_by: userId,
      });

      console.log('Event created:', newEvent);

      if (newEvent) {
        setEvents((prev) => [...prev, newEvent]);
        setIsModalOpen(false);
        toast({
          title: "Success",
          description: "Event created successfully",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to create event - no response from server",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating event:", error);
      toast({
        title: "Error",
        description: "Failed to create event",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[85vh]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!department) {
    return (
      <div className="flex items-center justify-center h-[85vh]">
        <p className="text-muted-foreground">You are not assigned to any department.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Department Selector - Only show if multiple departments */}
      {departments.length > 1 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">Department:</span>
              <Select value={department?.id} onValueChange={handleDepartmentChange}>
                <SelectTrigger className="w-[280px]">
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
                        <span className="text-xs text-muted-foreground">({dept.department_code})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="flex flex-col lg:flex-row gap-6">
      <div className="w-full lg:w-3/5 h-[85vh] flex flex-col">
        <Card className="flex flex-col h-full">
          <CardHeader>
            <CardTitle className="flex flex-col">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">
                  {department.department_name} - {selectedChannel?.channel_name || "Communication"}
                </span>
                {/* Role Badge */}
                {permissions.role && (
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                    permissions.isHOD 
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' 
                      : permissions.isAdmin 
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                  }`}>
                    {permissions.isHOD ? '👑 HOD' : permissions.isAdmin ? '⚡ Admin' : '👤 Member'}
                  </span>
                )}
              </div>
              <span className="text-sm text-muted-foreground">
                Real-time message feed showing department-wide conversations.
              </span>
            </CardTitle>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col overflow-hidden">
            {messages.some((m) => m.is_pinned) && (
              <div className="border-b border-muted mb-2 pb-2">
                <h4 className="text-sm font-semibold mb-1"> Pinned Messages</h4>
                {messages
                  .filter((m) => m.is_pinned)
                  .map((m) => (
                    <div key={m.id} className="text-sm bg-muted p-2 rounded mb-1 flex justify-between items-center">
                      <span>
                        <strong>{m.sender ? `${m.sender.first_name} ${m.sender.last_name}` : "Unknown"}:</strong> {m.message_text}
                        {m.file_name && (
                          <span className="text-xs text-blue-500 ml-1">
                             {m.file_name}
                          </span>
                        )}
                      </span>
                      {/* Only HOD/Admin can unpin messages */}
                      {permissions.canUnpinMessages && (
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
            )}

            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {messages.map((msg) => (
                <div key={msg.id} className="flex flex-col group">
                  <div className="flex items-start gap-2">
                    <div className="bg-muted p-2 rounded-lg max-w-[80%]">
                      <p className="text-sm">
                        <strong>{msg.sender ? `${msg.sender.first_name} ${msg.sender.last_name}` : "Unknown"}</strong>: {msg.message_text}
                      </p>

                      {/* Display images inline */}
                      {msg.message_type === 'image' && msg.file_url && (
                        <img 
                          src={msg.file_url} 
                          alt={msg.file_name || 'Shared image'} 
                          className="mt-2 rounded-lg max-w-full max-h-64 object-cover cursor-pointer"
                          onClick={() => window.open(msg.file_url, '_blank')}
                        />
                      )}

                      {/* Display file attachments as download links */}
                      {msg.file_name && msg.file_url && msg.message_type !== 'image' && (
                        <a 
                          href={msg.file_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 mt-1 block hover:underline flex items-center gap-1"
                        >
                          📎 {msg.file_name}
                          {msg.file_size && ` (${(msg.file_size / 1024 / 1024).toFixed(2)} MB)`}
                        </a>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>

                    {/* Only show pin button to HOD/Admin */}
                    {(permissions.canPinMessages || permissions.canUnpinMessages) && (
                      <button
                        onClick={() => handleTogglePin(msg.id, msg.is_pinned)}
                        className="opacity-0 group-hover:opacity-100 transition ml-2 text-muted-foreground hover:text-blue-500"
                        title={msg.is_pinned ? "Unpin message" : "Pin message"}
                      >
                        <Pin className={`w-4 h-4 ${msg.is_pinned ? "text-blue-500" : ""}`} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />

              <Button variant="ghost" size="icon" onClick={handleAttachClick}>
                <Paperclip className="w-4 h-4" />
              </Button>

              <Input
                placeholder={
                  attachedFile ? `Attached: ${attachedFile.name}` : "Type a message..."
                }
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1"
                disabled={sending}
              />
              <Button onClick={handleSend} disabled={sending}>
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="w-full lg:w-2/5 h-[85vh] flex flex-col gap-4">
        <Card className="flex-1">
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" /> Mini Calendar
            </CardTitle>
            {/* Only HOD/Admin can create events */}
            {permissions.canCreateEvents && (
              <Button 
                variant="ghost" 
                className="bg-white text-black hover:bg-transparent hover:text-white px-2 py-2 text-md h-8" 
                onClick={() => setIsModalOpen(true)}
                title="Create Event"
              >
                +
              </Button>
            )}
          </CardHeader>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Event</DialogTitle>
              </DialogHeader>
              <EventCreationForm
                onSave={handleCreateEvent}
                onCancel={() => setIsModalOpen(false)}
              />
            </DialogContent>
          </Dialog>
          <CardContent className="flex justify-center h-full">
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

        <Card className="flex-1 overflow-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" /> Event Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedDate ? (
              <p className="text-sm text-muted-foreground">
                Select a date to view events.
              </p>
            ) : filteredEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No events on this date.
              </p>
            ) : (
              <div className="space-y-4">
                {filteredEvents.map((event) => (
                  <div key={event.id} className="border-b pb-2">
                    <h4 className="font-semibold">{event.event_title}</h4>
                    <p className="text-sm text-muted-foreground mb-1">
                      {event.event_description}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(event.start_datetime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      <User className="h-3 w-3 ml-3" />
                      {event.creator ? `${event.creator.first_name} ${event.creator.last_name}` : "Unknown"}
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
  );
};

export default TeacherDepartment;
