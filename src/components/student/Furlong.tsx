import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bike, MapPin, Users, Plus, Send, Clock, Navigation, MessageCircle, X,
  Mountain, Dumbbell, BookOpen, Utensils, Gamepad2, Music, Sparkles,
  Loader2, Trash2, AlertTriangle, ExternalLink, Timer, MapPinned, CheckCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RealtimeChannel } from '@supabase/supabase-js';

const Furlong = () => {
  const [currentView, setCurrentView] = useState('discover');
  const [activities, setActivities] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [myAnonymousName, setMyAnonymousName] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const chatEndRef = useRef(null);
  const chatChannelRef = useRef<RealtimeChannel | null>(null);
  const activitiesChannelRef = useRef<RealtimeChannel | null>(null);
  const { toast } = useToast();

  const [newActivity, setNewActivity] = useState({
    activity_type: 'cycling',
    title: '',
    description: '',
    meeting_location: '',
    meeting_lat: null,
    meeting_lng: null,
    scheduled_time: '',
    max_participants: 10,
    notification_radius_km: 5
  });

  const activityTypes = [
    { value: 'cycling', label: 'Cycling', icon: Bike, color: 'bg-blue-500' },
    { value: 'hiking', label: 'Hiking', icon: Mountain, color: 'bg-green-500' },
    { value: 'sports', label: 'Sports', icon: Dumbbell, color: 'bg-red-500' },
    { value: 'study_group', label: 'Study Group', icon: BookOpen, color: 'bg-purple-500' },
    { value: 'food', label: 'Food', icon: Utensils, color: 'bg-orange-500' },
    { value: 'gaming', label: 'Gaming', icon: Gamepad2, color: 'bg-pink-500' },
    { value: 'music', label: 'Music', icon: Music, color: 'bg-yellow-500' },
    { value: 'other', label: 'Other', icon: Sparkles, color: 'bg-gray-500' }
  ];

  useEffect(() => {
    initializeFurlong();
    const interval = setInterval(() => checkAndDeleteExpiredActivities(), 300000);
    return () => {
      clearInterval(interval);
      cleanupSubscriptions();
    };
  }, []);

  useEffect(() => {
    if (studentData && userLocation && locationEnabled) {
      console.log('Loading activities with:', { userLocation, studentData, filterType });
      loadActivities();
      subscribeToActivities();
    }
    return () => {
      if (activitiesChannelRef.current) {
        supabase.removeChannel(activitiesChannelRef.current);
        activitiesChannelRef.current = null;
      }
    };
  }, [studentData, userLocation, filterType, locationEnabled]);

  useEffect(() => {
    if (currentView === 'chat' && selectedActivity) {
      loadChatMessages();
      subscribeToChat();
      return () => {
        if (chatChannelRef.current) {
          supabase.removeChannel(chatChannelRef.current);
          chatChannelRef.current = null;
        }
      };
    }
  }, [currentView, selectedActivity]);

  const cleanupSubscriptions = () => {
    if (chatChannelRef.current) {
      supabase.removeChannel(chatChannelRef.current);
      chatChannelRef.current = null;
    }
    if (activitiesChannelRef.current) {
      supabase.removeChannel(activitiesChannelRef.current);
      activitiesChannelRef.current = null;
    }
  };

  const subscribeToActivities = () => {
    if (!studentData?.college_id) return;

    activitiesChannelRef.current = supabase
      .channel('furlong-activities-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'furlong_activities',
        filter: `college_id=eq.${studentData.college_id}`
      }, (payload) => {
        console.log('New activity created:', payload.new);
        handleActivityInsert(payload.new);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'furlong_activities',
        filter: `college_id=eq.${studentData.college_id}`
      }, (payload) => {
        console.log('Activity updated:', payload.new);
        handleActivityUpdate(payload.new);
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'furlong_activities',
        filter: `college_id=eq.${studentData.college_id}`
      }, (payload) => {
        console.log('Activity deleted:', payload.old);
        handleActivityDelete(payload.old);
      })
      .subscribe((status) => {
        console.log('Activities subscription status:', status);
      });
  };

  const handleActivityInsert = async (newActivity) => {
    // Check if activity is within range
    if (userLocation && newActivity.meeting_lat && newActivity.meeting_lng) {
      const distance = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        newActivity.meeting_lat,
        newActivity.meeting_lng
      );
      
      if (distance <= 10) { // 10km radius
        await loadActivities(); // Reload to get complete data with distance
        
        // Show notification if not creator
        if (newActivity.creator_id !== studentData?.id) {
          toast({
            title: 'New Activity Nearby!',
            description: `${newActivity.title} - ${distance.toFixed(1)}km away`,
            duration: 5000,
          });
        }
      }
    }
  };

  const handleActivityUpdate = (updatedActivity) => {
    setActivities(prev => 
      prev.map(activity => 
        activity.id === updatedActivity.id 
          ? { ...activity, ...updatedActivity }
          : activity
      )
    );

    // Update selected activity if it's the one being updated
    if (selectedActivity?.id === updatedActivity.id) {
      setSelectedActivity(prev => ({ ...prev, ...updatedActivity }));
    }
  };

  const handleActivityDelete = (deletedActivity) => {
    setActivities(prev => prev.filter(activity => activity.id !== deletedActivity.id));
    
    // If viewing deleted activity, return to discover
    if (selectedActivity?.id === deletedActivity.id) {
      setSelectedActivity(null);
      setMyAnonymousName(null);
      setChatMessages([]);
      setCurrentView('discover');
      toast({
        title: 'Activity Ended',
        description: 'This activity has been deleted',
        variant: 'destructive',
      });
    }
  };

  const subscribeToChat = () => {
    if (!selectedActivity) return;

    chatChannelRef.current = supabase
      .channel(`furlong_chat_${selectedActivity.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'furlong_chat_messages',
        filter: `activity_id=eq.${selectedActivity.id}`
      }, (payload) => {
        console.log('New message:', payload.new);
        setChatMessages(prev => {
          // Avoid duplicates
          if (prev.some(msg => msg.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
        scrollToBottom();
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'furlong_chat_messages',
        filter: `activity_id=eq.${selectedActivity.id}`
      }, (payload) => {
        console.log('Message updated:', payload.new);
        setChatMessages(prev =>
          prev.map(msg => msg.id === payload.new.id ? payload.new : msg)
        );
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'furlong_chat_messages',
        filter: `activity_id=eq.${selectedActivity.id}`
      }, (payload) => {
        console.log('Message deleted:', payload.old);
        setChatMessages(prev => prev.filter(msg => msg.id !== payload.old.id));
      })
      .subscribe((status) => {
        console.log('Chat subscription status:', status);
      });
  };

  const initializeFurlong = async () => {
    setLoading(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) {
        toast({ title: 'Authentication Required', description: 'Please log in to use Furlong', variant: 'destructive' });
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (profileError) throw profileError;
      setStudentData(profile);
      
      const { data: locationData } = await supabase
        .from('furlong_user_locations')
        .select('*')
        .eq('user_id', profile.id)
        .single();
      
      if (locationData) {
        setUserLocation({ lat: parseFloat(locationData.latitude), lng: parseFloat(locationData.longitude) });
        setLocationEnabled(true);
        console.log('Restored saved location:', locationData);
      }
    } catch (error) {
      console.error('Error initializing:', error);
      toast({ title: 'Error', description: 'Failed to initialize Furlong', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: 'Not Supported', description: 'Your browser does not support geolocation', variant: 'destructive' });
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location = { lat: position.coords.latitude, lng: position.coords.longitude };
        console.log('Location obtained:', location);
        setUserLocation(location);
        setLocationEnabled(true);
        
        if (studentData?.id) await updateUserLocation(studentData.id, location.lat, location.lng);
        
        toast({ title: 'Location Enabled', description: 'You can now discover nearby activities' });
        setLocationLoading(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setLocationLoading(false);
        let errorMessage = 'Please allow location access';
        if (error.code === 1) errorMessage = 'Location access denied. Please enable it in your browser settings.';
        else if (error.code === 2) errorMessage = 'Location unavailable. Please check your device settings.';
        else if (error.code === 3) errorMessage = 'Location request timed out. Please try again.';
        toast({ title: 'Location Access Failed', description: errorMessage, variant: 'destructive' });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const updateUserLocation = async (userId, lat, lng) => {
    try {
      const { error } = await supabase
        .from('furlong_user_locations')
        .upsert({ user_id: userId, latitude: lat, longitude: lng, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
      if (error) throw error;
      console.log('Location updated in database');
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  const loadActivities = async () => {
    if (!userLocation || !studentData) {
      console.log('Missing requirements:', { userLocation, studentData });
      return;
    }

    try {
      setLoading(true);
      console.log('Calling RPC with:', { user_lat: userLocation.lat, user_lon: userLocation.lng, radius_km: 10 });

      const { data: nearbyActivities, error } = await supabase
        .rpc('get_nearby_activities', { user_lat: userLocation.lat, user_lon: userLocation.lng, radius_km: 10 });

      if (error) {
        console.error('RPC Error:', error);
        throw error;
      }

      console.log('Activities retrieved:', nearbyActivities);
      let filtered = nearbyActivities || [];
      if (filterType !== 'all') filtered = filtered.filter(a => a.activity_type === filterType);
      filtered = filtered.filter(a => a.college_id === studentData.college_id);

      console.log('Filtered activities:', filtered);
      setActivities(filtered);
    } catch (error) {
      console.error('Error loading activities:', error);
      toast({ title: 'Error Loading Activities', description: error.message || 'Failed to load activities', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const checkAndDeleteExpiredActivities = async () => {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: expiredActivities, error: fetchError } = await supabase
        .from('furlong_activities')
        .select('id')
        .lt('created_at', twentyFourHoursAgo);

      if (fetchError) throw fetchError;
      if (expiredActivities && expiredActivities.length > 0) {
        const expiredIds = expiredActivities.map(a => a.id);
        await supabase.from('furlong_chat_messages').delete().in('activity_id', expiredIds);
        await supabase.from('furlong_participants').delete().in('activity_id', expiredIds);
        await supabase.from('furlong_activities').delete().in('id', expiredIds);
        console.log(`Deleted ${expiredActivities.length} expired activities`);
      }
    } catch (error) {
      console.error('Error in auto-delete:', error);
    }
  };

  const loadChatMessages = async () => {
    if (!selectedActivity) return;
    try {
      const { data: messages, error } = await supabase
        .from('furlong_chat_messages')
        .select('*')
        .eq('activity_id', selectedActivity.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setChatMessages(messages || []);
      scrollToBottom();
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleCreateActivity = async () => {
    if (!newActivity.title || !newActivity.meeting_location) {
      toast({ title: 'Missing Information', description: 'Please fill in title and meeting location', variant: 'destructive' });
      return;
    }
    if (!userLocation) {
      toast({ title: 'Location Required', description: 'Please enable location services', variant: 'destructive' });
      return;
    }

    try {
      setLoading(true);
      const meetingLat = newActivity.meeting_lat || userLocation.lat;
      const meetingLng = newActivity.meeting_lng || userLocation.lng;

      const { data: activityData, error: activityError } = await supabase
        .from('furlong_activities')
        .insert({
          creator_id: studentData.id,
          college_id: studentData.college_id,
          activity_type: newActivity.activity_type,
          title: newActivity.title,
          description: newActivity.description,
          meeting_location: newActivity.meeting_location,
          meeting_lat: meetingLat,
          meeting_lng: meetingLng,
          scheduled_time: newActivity.scheduled_time || null,
          max_participants: newActivity.max_participants,
          notification_radius_km: newActivity.notification_radius_km,
          status: 'open',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (activityError) throw activityError;

      const anonymousName = generateAnonymousName();
      const { error: participantError } = await supabase
        .from('furlong_participants')
        .insert({ activity_id: activityData.id, user_id: studentData.id, anonymous_name: anonymousName, status: 'joined' });
      if (participantError) throw participantError;

      await sendNearbyNotifications(activityData);
      toast({ title: 'Success!', description: 'Activity created and nearby users notified' });

      setNewActivity({
        activity_type: 'cycling', title: '', description: '', meeting_location: '',
        meeting_lat: null, meeting_lng: null, scheduled_time: '', max_participants: 10, notification_radius_km: 5
      });
      setCurrentView('discover');
      // Activity will be added via real-time subscription
    } catch (error) {
      console.error('Error creating activity:', error);
      toast({ title: 'Error', description: error.message || 'Failed to create activity', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const sendNearbyNotifications = async (activity) => {
    try {
      const { data: nearbyUsers, error } = await supabase
        .from('furlong_user_locations')
        .select('user_id, latitude, longitude');
      if (error) throw error;

      const notificationsToSend = [];
      for (const user of nearbyUsers || []) {
        if (user.user_id === studentData.id) continue;
        const distance = calculateDistance(activity.meeting_lat, activity.meeting_lng, user.latitude, user.longitude);
        if (distance <= activity.notification_radius_km) {
          notificationsToSend.push({
            recipient_id: user.user_id,
            college_id: studentData.college_id,
            title: `New ${activity.activity_type.replace('_', ' ')} activity nearby!`,
            content: `${activity.title} - ${distance.toFixed(1)}km away`,
            notification_type: 'furlong_activity',
            action_url: `/student/furlong?activity=${activity.id}`,
            priority: 'normal'
          });
        }
      }

      if (notificationsToSend.length > 0) {
        const { error: notifError } = await supabase.from('notifications').insert(notificationsToSend);
        if (notifError) throw notifError;
        console.log(`Sent ${notificationsToSend.length} notifications`);
      }
    } catch (error) {
      console.error('Error sending notifications:', error);
    }
  };

  const handleJoinActivity = async (activity) => {
    try {
      setLoading(true);
      const { data: existing, error: checkError } = await supabase
        .from('furlong_participants')
        .select('anonymous_name')
        .eq('activity_id', activity.id)
        .eq('user_id', studentData.id)
        .eq('status', 'joined')
        .maybeSingle();
      if (checkError) throw checkError;

      let anonymousName;
      if (!existing) {
        anonymousName = generateAnonymousName();
        const { error: insertError } = await supabase
          .from('furlong_participants')
          .insert({ activity_id: activity.id, user_id: studentData.id, anonymous_name: anonymousName, status: 'joined' });
        if (insertError) throw insertError;

        const { error: updateError } = await supabase
          .from('furlong_activities')
          .update({ current_participants: activity.current_participants + 1 })
          .eq('id', activity.id);
        if (updateError) console.error('Error updating count:', updateError);
      } else {
        anonymousName = existing.anonymous_name;
      }

      setMyAnonymousName(anonymousName);
      setSelectedActivity(activity);
      setCurrentView('chat');
    } catch (error) {
      console.error('Error joining activity:', error);
      toast({ title: 'Error', description: 'Failed to join activity', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !myAnonymousName) return;
    
    const messageText = messageInput.trim();
    setMessageInput(''); // Clear input immediately for better UX

    try {
      const { error } = await supabase
        .from('furlong_chat_messages')
        .insert({
          activity_id: selectedActivity.id,
          sender_id: studentData.id,
          anonymous_name: myAnonymousName,
          message_text: messageText,
          message_type: 'text'
        });
      if (error) throw error;
      // Message will be added via real-time subscription
    } catch (error) {
      console.error('Error sending message:', error);
      setMessageInput(messageText); // Restore message on error
      toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' });
    }
  };

  const handleShareLocation = async () => {
    if (!navigator.geolocation || !myAnonymousName) {
      toast({ title: 'Location Unavailable', description: 'Cannot access location', variant: 'destructive' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { error } = await supabase
            .from('furlong_chat_messages')
            .insert({
              activity_id: selectedActivity.id,
              sender_id: studentData.id,
              anonymous_name: myAnonymousName,
              message_text: 'Shared location',
              message_type: 'location',
              location_lat: position.coords.latitude,
              location_lng: position.coords.longitude
            });
          if (error) throw error;
          toast({ title: 'Location Shared', description: 'Your location has been shared with the group' });
        } catch (error) {
          console.error('Error sharing location:', error);
        }
      },
      () => toast({ title: 'Error', description: 'Could not get location', variant: 'destructive' })
    );
  };

  const handleDeleteActivity = async () => {
    if (!selectedActivity) return;
    try {
      setLoading(true);
      await supabase.from('furlong_chat_messages').delete().eq('activity_id', selectedActivity.id);
      await supabase.from('furlong_participants').delete().eq('activity_id', selectedActivity.id);
      await supabase.from('furlong_activities').delete().eq('id', selectedActivity.id);
      toast({ title: 'Deleted', description: 'Activity deleted successfully' });
      setShowDeleteConfirm(false);
      // UI will update via real-time subscription
    } catch (error) {
      console.error('Error deleting:', error);
      toast({ title: 'Error', description: 'Failed to delete activity', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleGetDirections = () => {
    if (!selectedActivity?.meeting_lat || !selectedActivity?.meeting_lng) return;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedActivity.meeting_lat},${selectedActivity.meeting_lng}`, '_blank');
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const generateAnonymousName = () => {
    const adjectives = ['Swift', 'Bold', 'Quick', 'Brave', 'Cool', 'Smart', 'Wild', 'Fast', 'Keen', 'Wise'];
    const nouns = ['Rider', 'Cyclist', 'Biker', 'Explorer', 'Adventurer', 'Traveler', 'Wanderer', 'Seeker', 'Pioneer', 'Voyager'];
    return `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}_${Math.floor(Math.random() * 100)}`;
  };

  const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const formatScheduledTime = (date) => {
    if (!date) return 'Not scheduled';
    const scheduled = new Date(date);
    const now = new Date();
    const diffMs = scheduled - now;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 0) return 'Started';
    if (diffMins < 60) return `in ${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `in ${diffHours}h`;
    return scheduled.toLocaleDateString();
  };

  const getTimeRemaining = (createdAt) => {
    if (!createdAt) return 'Unknown';
    const created = new Date(createdAt);
    const expiry = new Date(created.getTime() + 24 * 60 * 60 * 1000);
    const diff = expiry - new Date();
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m left`;
  };

  const scrollToBottom = () => {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const getActivityIcon = (type) => activityTypes.find(a => a.value === type)?.icon || Sparkles;
  const getActivityColor = (type) => activityTypes.find(a => a.value === type)?.color || 'bg-gray-500';
  const isCreator = selectedActivity?.creator_id === studentData?.id;

  // Render functions continue from original (discover, create, chat views)
  // Due to length, I'm including the complete render logic inline...

  const renderDiscover = () => (
    <div className="space-y-4">
      {!locationEnabled && (
        <Alert className="border-blue-500 bg-blue-50">
          <MapPinned className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Enable location to discover nearby activities</span>
            <Button size="sm" onClick={requestLocation} disabled={locationLoading}>
              {locationLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enable Location'}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Discover Activities</h2>
          <p className="text-sm text-muted-foreground">Join nearby activities or create your own</p>
        </div>
        <Button onClick={() => setCurrentView('create')} disabled={!locationEnabled} className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
          <Plus className="w-4 h-4 mr-2" />Create
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button variant={filterType === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilterType('all')}>All</Button>
        {activityTypes.map((type) => {
          const Icon = type.icon;
          return (
            <Button key={type.value} variant={filterType === type.value ? 'default' : 'outline'} size="sm" onClick={() => setFilterType(type.value)}>
              <Icon className="w-4 h-4 mr-1" />{type.label}
            </Button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : activities.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activities.map((activity) => {
            const Icon = getActivityIcon(activity.activity_type);
            const colorClass = getActivityColor(activity.activity_type);
            const isFull = activity.current_participants >= activity.max_participants;
            return (
              <Card key={activity.id} className="border-l-4 hover:shadow-lg transition-all cursor-pointer" onClick={() => !isFull && handleJoinActivity(activity)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="secondary" className="text-xs">{activity.distance?.toFixed(1) || 0}km</Badge>
                      <Badge variant="outline" className="text-xs">{getTimeRemaining(activity.created_at)}</Badge>
                    </div>
                  </div>
                  <CardTitle className="text-lg mt-2">{activity.title}</CardTitle>
                  <CardDescription className="line-clamp-2">{activity.description || 'No description'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 mr-1" />{activity.meeting_location}
                  </div>
                  {activity.scheduled_time && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="w-4 h-4 mr-1" />{formatScheduledTime(activity.scheduled_time)}
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center text-sm">
                      <Users className="w-4 h-4 mr-1" />{activity.current_participants || 1}/{activity.max_participants}
                    </div>
                    <Button size="sm" disabled={isFull || loading}>{isFull ? 'Full' : 'Join'}</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bike className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No activities nearby</h3>
            <p className="text-sm text-muted-foreground mb-4">{locationEnabled ? 'Be the first to create one!' : 'Enable location to see activities'}</p>
            {locationEnabled ? (
              <Button onClick={() => setCurrentView('create')}><Plus className="w-4 h-4 mr-2" />Create Activity</Button>
            ) : (
              <Button onClick={requestLocation}><MapPin className="w-4 h-4 mr-2" />Enable Location</Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderCreate = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Create Activity</h2>
          <p className="text-sm text-muted-foreground">Invite nearby students</p>
        </div>
        <Button variant="outline" onClick={() => setCurrentView('discover')}><X className="w-4 h-4 mr-2" />Cancel</Button>
      </div>

      <Alert>
        <Timer className="h-4 w-4" />
        <AlertDescription>Activities automatically expire after 24 hours. Nearby students will be notified.</AlertDescription>
      </Alert>

      <Card>
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Activity Type</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {activityTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = newActivity.activity_type === type.value;
                return (
                  <button key={type.value} type="button" onClick={() => setNewActivity({ ...newActivity, activity_type: type.value })}
                    className={`p-4 rounded-lg border-2 transition ${isSelected ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}>
                    <Icon className={`w-6 h-6 mx-auto mb-2 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                    <p className="text-xs font-medium">{type.label}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Title *</label>
            <Input placeholder="e.g., Evening Cycle Ride" value={newActivity.title} onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea placeholder="Details about the activity..." value={newActivity.description} onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })} rows={3} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Meeting Location *</label>
            <Input placeholder="e.g., Main Gate" value={newActivity.meeting_location} onChange={(e) => setNewActivity({ ...newActivity, meeting_location: e.target.value })} />
            <Button variant="outline" size="sm" className="w-full" type="button" onClick={() => {
              if (userLocation) {
                setNewActivity({ ...newActivity, meeting_lat: userLocation.lat, meeting_lng: userLocation.lng, meeting_location: `Current Location (${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)})` });
                toast({ title: 'Location Set', description: 'Using current location' });
              }
            }}>
              <Navigation className="w-4 h-4 mr-2" />Use Current Location
            </Button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Scheduled Time (Optional)</label>
            <Input type="datetime-local" value={newActivity.scheduled_time} onChange={(e) => setNewActivity({ ...newActivity, scheduled_time: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Max Participants</label>
              <Input type="number" min="2" max="50" value={newActivity.max_participants} onChange={(e) => setNewActivity({ ...newActivity, max_participants: parseInt(e.target.value) || 2 })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Radius (km)</label>
              <Input type="number" min="1" max="20" step="0.5" value={newActivity.notification_radius_km} onChange={(e) => setNewActivity({ ...newActivity, notification_radius_km: parseFloat(e.target.value) || 1 })} />
            </div>
          </div>

          <Button onClick={handleCreateActivity} className="w-full" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}Create Activity
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const renderChat = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { 
            if (chatChannelRef.current) {
              supabase.removeChannel(chatChannelRef.current);
              chatChannelRef.current = null;
            }
            setSelectedActivity(null); 
            setMyAnonymousName(null); 
            setChatMessages([]); 
            setCurrentView('discover'); 
          }}>
            <X className="w-4 h-4 mr-2" />Leave
          </Button>
          {isCreator && <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}><Trash2 className="w-4 h-4 mr-2" />Delete</Button>}
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">{selectedActivity?.title}</p>
          <p className="text-xs text-muted-foreground">You are {myAnonymousName}</p>
        </div>
      </div>

      {showDeleteConfirm && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Delete this activity? This cannot be undone.</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
              <Button size="sm" variant="destructive" onClick={handleDeleteActivity}>Delete</Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg"><MessageCircle className="w-5 h-5 mr-2" />Anonymous Chat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-96 overflow-y-auto space-y-3 p-4 bg-muted/20 rounded-lg">
              {chatMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full"><p className="text-sm text-muted-foreground">No messages yet</p></div>
              ) : (
                chatMessages.map((msg) => {
                  const isMe = msg.sender_id === studentData?.id;
                  return (
                    <div key={msg.id} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${isMe ? 'text-blue-500' : 'text-primary'}`}>{isMe ? 'You' : msg.anonymous_name}</span>
                        <span className="text-xs text-muted-foreground">{formatTimeAgo(msg.created_at)}</span>
                      </div>
                      {msg.message_type === 'location' ? (
                        <div className="bg-card p-3 rounded-lg border inline-block">
                          <div className="flex items-center gap-2 text-sm mb-1"><MapPin className="w-4 h-4" /><span>Shared location</span></div>
                          <a href={`https://www.google.com/maps?q=${msg.location_lat},${msg.location_lng}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                            View on Maps <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      ) : (
                        <p className={`text-sm p-3 rounded-lg inline-block max-w-[80%] ${isMe ? 'bg-blue-500/10' : 'bg-card border'}`}>{msg.message_text}</p>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={handleShareLocation}><Navigation className="w-4 h-4" /></Button>
              <Input placeholder="Type a message..." value={messageInput} onChange={(e) => setMessageInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} />
              <Button onClick={handleSendMessage} disabled={!messageInput.trim()}><Send className="w-4 h-4" /></Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-lg">Details</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm"><MapPin className="w-4 h-4" />{selectedActivity?.meeting_location}</div>
              {selectedActivity?.scheduled_time && <div className="flex items-center gap-2 text-sm"><Clock className="w-4 h-4" />{formatScheduledTime(selectedActivity.scheduled_time)}</div>}
              <div className="flex items-center gap-2 text-sm"><Timer className="w-4 h-4" />{getTimeRemaining(selectedActivity?.created_at)}</div>
              <Button variant="outline" className="w-full" onClick={handleGetDirections}><Navigation className="w-4 h-4 mr-2" />Get Directions</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-lg">Map</CardTitle></CardHeader>
            <CardContent>
              <div className="bg-muted/30 rounded-lg h-48 flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">{selectedActivity?.meeting_lat && selectedActivity?.meeting_lng ? `${selectedActivity.meeting_lat.toFixed(4)}, ${selectedActivity.meeting_lng.toFixed(4)}` : 'Location not available'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">Furlong</h1>
            <p className="text-sm text-muted-foreground">Connect with nearby students</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline"><Users className="w-3 h-3 mr-1" />{activities.length}</Badge>
            {locationEnabled ? (
              <Badge variant="outline" className="bg-green-500/10"><MapPin className="w-3 h-3 mr-1" />Location On</Badge>
            ) : (
              <Button size="sm" variant="outline" onClick={requestLocation}><MapPin className="w-3 h-3 mr-1" />Enable</Button>
            )}
          </div>
        </div>

        {currentView === 'discover' && renderDiscover()}
        {currentView === 'create' && renderCreate()}
        {currentView === 'chat' && renderChat()}
      </div>
    </div>
  );
};

export default Furlong;