import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Building,
  Bed,
  Wrench,
  Plus,
  MapPin,
  Users,
  IndianRupee,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface HostelFacilityProps {
  studentData: any;
}

const HostelFacility: React.FC<HostelFacilityProps> = ({ studentData }) => {
  const [hostelRooms, setHostelRooms] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [facilityRequests, setFacilityRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('hostels');

  // Format currency in INR
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Get badge color based on status
  const getStatusColor = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status?.toLowerCase()) {
      case 'allocated':
      case 'approved':
      case 'available':
      case 'resolved':
        return 'default';
      case 'submitted':
      case 'pending':
      case 'in_progress':
        return 'secondary';
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Check if student has applied for a specific room
  const hasAppliedForRoom = (roomId: string) => {
    return applications.some(app =>
      app.room_id === roomId &&
      ['pending', 'approved', 'allocated'].includes(app.status)
    );
  };

  // Check if student has applied for any room in a block
  const hasAppliedForBlock = (blockName: string) => {
    return applications.some(app =>
      app.hostel_rooms?.block_name === blockName &&
      ['pending', 'approved', 'allocated'].includes(app.status)
    );
  };

  // Get available rooms in a block that student hasn't applied for
  const getAvailableRoomsInBlock = (rooms: any[]) => {
    return rooms.filter(room =>
      room.current_occupancy < room.capacity &&
      !hasAppliedForRoom(room.id)
    );
  };

  // Fetch all data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    // Fetch hostel rooms
    const { data: hostelRoomsData } = await supabase
      .from('hostel_rooms')
      .select('*')
      .eq('is_available', true)
      .order('block_name', { ascending: true });
    setHostelRooms(hostelRoomsData || []);

    // Fetch applications
    const { data: applicationsData } = await supabase
      .from('hostel_applications')
      .select(`
        *,
        hostel_rooms (room_number, block_name, room_type, monthly_fee)
      `)
      .eq('student_id', studentData.user_id)
      .order('application_date', { ascending: false });
    setApplications(applicationsData || []);

    // Fetch facilities
    const { data: facilitiesData } = await supabase
      .from('facilities')
      .select('*')
      .eq('is_available', true)
      .order('facility_name', { ascending: true });
    setFacilities(facilitiesData || []);

    // Fetch facility requests
    const { data: requestsData } = await supabase
      .from('facility_requests')
      .select(`
        *,
        facilities (facility_name, facility_type, location)
      `)
      .eq('student_id', studentData.user_id)
      .order('submitted_at', { ascending: false });
    setFacilityRequests(requestsData || []);

    setLoading(false);
  };

  const applyForHostel = async (roomId: string, preferredRoomType: string, comments: string, blockName: string) => {
    const { data: newApplication } = await supabase
      .from('hostel_applications')
      .insert({
        student_id: studentData.user_id,
        room_id: roomId === 'no-preference' ? null : roomId,
        preferred_room_type: preferredRoomType,
        comments: comments,
        status: 'pending'
      })
      .select(`
        *,
        hostel_rooms (room_number, block_name, room_type, monthly_fee)
      `)
      .single();

    if (newApplication) {
      setApplications([newApplication, ...applications]);
      setActiveTab('applications');
    }
  };

  const submitFacilityRequest = async (
    facilityId: string,
    requestType: string,
    title: string,
    description: string,
    priority: string
  ) => {
    const { data: newRequest } = await supabase
      .from('facility_requests')
      .insert({
        student_id: studentData.user_id,
        facility_id: facilityId === 'general' ? null : facilityId,
        request_type: requestType,
        title: title,
        description: description,
        priority: priority,
        status: 'submitted'
      })
      .select(`
        *,
        facilities (facility_name, facility_type, location)
      `)
      .single();

    if (newRequest) {
      setFacilityRequests([newRequest, ...facilityRequests]);
    }
  };

  // Group hostel rooms by block
  const hostelBlocks = hostelRooms.reduce((blocks, room) => {
    if (!blocks[room.block_name]) {
      blocks[room.block_name] = [];
    }
    blocks[room.block_name].push(room);
    return blocks;
  }, {} as Record<string, any[]>);

  const currentAllocation = applications.find(app => app.status === 'allocated');
  const pendingApplications = applications.filter(app => ['pending', 'approved'].includes(app.status));

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-3 sm:px-4 md:px-6 w-full max-w-full">
      <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-3">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold">Hostel & Facilities</h2>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="px-2 sm:px-3 py-1 text-xs sm:text-sm whitespace-nowrap">
            {Object.keys(hostelBlocks).length} Hostel Blocks
          </Badge>
          {pendingApplications.length > 0 && (
            <Badge variant="secondary" className="px-2 sm:px-3 py-1 text-xs sm:text-sm whitespace-nowrap">
              {pendingApplications.length} Pending
            </Badge>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="w-full px-0">
          <TabsList className="grid w-full grid-cols-3 h-auto gap-0">
            <TabsTrigger
              value="hostels"
              className="flex flex-row items-center justify-center gap-1 xs:gap-1.5 text-xs xs:text-sm sm:text-base px-1 xs:px-2 sm:px-3 py-2.5 transition-all duration-200"
            >
              <Building className="h-4 w-4 xs:h-4 xs:w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span className="whitespace-nowrap">Hostels</span>
            </TabsTrigger>

            <TabsTrigger
              value="applications"
              className="flex flex-row items-center justify-center gap-0.5 xs:gap-1 text-[11px] xs:text-sm sm:text-base px-0.5 xs:px-2 sm:px-3 py-2.5 transition-all duration-200"
            >
              <Bed className="h-3.5 w-3.5 xs:h-4 xs:w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span className="whitespace-nowrap">Applications</span>
              {applications.length > 0 && (
                <Badge variant="secondary" className="ml-0.5 xs:ml-1 text-[8px] xs:text-[10px] px-1 xs:px-1.5 py-0">
                  {applications.length}
                </Badge>
              )}
            </TabsTrigger>

            <TabsTrigger
              value="facilities"
              className="flex flex-row items-center justify-center gap-1 xs:gap-1.5 text-xs xs:text-sm sm:text-base px-1 xs:px-2 sm:px-3 py-2.5 transition-all duration-200"
            >
              <Wrench className="h-4 w-4 xs:h-4 xs:w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span className="whitespace-nowrap">Facilities</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="hostels" className="space-y-4 sm:space-y-6">
          {pendingApplications.length > 0 && (
            <Card className="border-l-4 border-l-blue-500 w-full">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm break-words">
                    <span className="font-medium">Tip:</span> You can apply to multiple hostels to increase your chances!
                    You currently have {pendingApplications.length} pending application{pendingApplications.length > 1 ? 's' : ''}.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {Object.entries(hostelBlocks).map(([blockName, rooms]) => {
              const availableRooms = getAvailableRoomsInBlock(rooms);
              const hasBlockApplication = hasAppliedForBlock(blockName);

              return (
                <Card key={blockName} className={`border-l-4 ${hasBlockApplication ? 'border-l-green-500 ' : 'border-l-blue-500'}`}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{blockName}</CardTitle>
                      <div className="flex flex-col gap-1">
                        <Badge variant='default'>Active</Badge>
                        {hasBlockApplication && (
                          <Badge variant='outline' className="text-xs">
                            Applied
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">Hostel Block</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center text-sm text-gray-600">
                        <Building className="h-4 w-4 mr-2" />
                        {rooms.length} Total Rooms
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          Types: {[...new Set(rooms.map(r => r.room_type))].join(', ')}
                        </span>
                      </div>

                      <div className="flex justify-start text-sm">
                        <span className='mr-[4px]'>Available for You:</span>
                        <span className={availableRooms.length > 0 ? 'text-green-600 font-medium' : 'text-red-500'}>
                          {availableRooms.length}
                        </span>
                      </div>

                      {hasBlockApplication && (
                        <div className="text-xs text-green-600 font-medium">
                          ✓ Application submitted to this block
                        </div>
                      )}

                      <HostelApplicationDialog
                        onApply={(roomId, preferredRoomType, comments) =>
                          applyForHostel(roomId, preferredRoomType, comments, blockName)
                        }
                        rooms={availableRooms}
                        blockName={blockName}
                        hasBlockApplication={hasBlockApplication}
                        hasAllocation={!!currentAllocation}
                        availableRoomsCount={availableRooms.length}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="applications" className="space-y-6">
          {currentAllocation && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Current Hostel Allocation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="font-semibold">
                      {currentAllocation.hostel_rooms?.block_name} - Room {currentAllocation.hostel_rooms?.room_number}
                    </p>
                    <p className="text-sm capitalize">
                      {currentAllocation.hostel_rooms?.room_type} Room
                    </p>
                    <p className="text-xs mt-1">
                      Allocated: {new Date(currentAllocation.allocated_at || currentAllocation.application_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>My Hostel Applications</CardTitle>
              <p className="text-sm text-gray-600">
                You can apply to multiple hostels to increase your chances of getting accommodation.
              </p>
            </CardHeader>
            <CardContent>
              {applications.length === 0 ? (
                <div className="text-center py-8">
                  <Bed className="h-12 w-12 mx-auto mb-4" />
                  <p>No hostel applications submitted yet</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Apply to multiple hostels to maximize your chances!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {applications.map((application: any) => (
                    <Card key={application.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-medium">Application #{application.id.slice(-8)}</p>
                            <p className="text-sm font-semibold">
                              {application.hostel_rooms ?
                                `${application.hostel_rooms.block_name} - Room ${application.hostel_rooms.room_number}` :
                                'No specific room requested'
                              }
                            </p>
                            <p className="text-sm">
                              Applied: {new Date(application.application_date).toLocaleDateString()}
                            </p>
                            <p className="text-sm capitalize">
                              Preferred Room: {application.preferred_room_type}
                            </p>
                            {application.comments && (
                              <p className="text-sm italic mt-1">"{application.comments}"</p>
                            )}
                          </div>
                          <Badge variant={getStatusColor(application.status)} className="mb-2">
                            {application.status.toUpperCase()}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="facilities" className="space-y-4 sm:space-y-6">
          <div className="flex justify-end">
            <FacilityRequestDialog onSubmit={submitFacilityRequest} facilities={facilities} />
          </div>

          <Card className="w-full">
            <CardHeader className="p-4 sm:p-5 md:p-6">
              <CardTitle className="text-base sm:text-lg">My Facility Requests</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 md:p-6">
              {facilityRequests.length === 0 ? (
                <div className="text-center py-6 sm:py-8">
                  <Wrench className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                  <p className="text-sm sm:text-base">No facility requests submitted yet</p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {facilityRequests.map((request: any) => (
                    <Card key={request.id} className="border w-full">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm sm:text-base break-words">{request.title}</h4>
                            <p className="text-xs sm:text-sm capitalize text-gray-600">
                              {request.request_type} Request
                            </p>
                            {request.facilities && (
                              <p className="text-xs sm:text-sm text-gray-600 break-words">
                                Facility: {request.facilities.facility_name}
                              </p>
                            )}
                          </div>
                          <div className="text-left sm:text-right flex-shrink-0">
                            <Badge variant={getStatusColor(request.status)} className="text-xs">
                              {request.status}
                            </Badge>
                            <p className="text-[10px] sm:text-xs text-gray-600 mt-1">
                              {new Date(request.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                        </div>

                        <p className="text-xs sm:text-sm mb-3 break-words">{request.description}</p>

                        <Badge variant="outline" className="capitalize text-xs">
                          {request.priority} Priority
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="w-full">
            <CardHeader className="p-4 sm:p-5 md:p-6">
              <CardTitle className="text-base sm:text-lg">Campus Facilities</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 md:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {facilities.map((facility: any) => (
                  <Card key={facility.id} className="border hover:shadow-md transition-shadow w-full">
                    <CardContent className="p-3 sm:p-4">
                      <h4 className="font-semibold text-sm sm:text-base mb-2 break-words">{facility.facility_name}</h4>
                      <div className="space-y-1 text-xs sm:text-sm">
                        <div className="flex items-center gap-2">
                          <Building className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="capitalize truncate">{facility.facility_type}</span>
                        </div>
                        {facility.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                            <span className="truncate">{facility.location}</span>
                          </div>
                        )}
                        {facility.capacity && (
                          <div className="flex items-center gap-2">
                            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                            <span>Capacity: {facility.capacity}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 pt-3 border-t">
                        <Badge variant={facility.is_available ? 'default' : 'destructive'} className="text-xs">
                          {facility.is_available ? 'Available' : 'Unavailable'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Enhanced Hostel Application Dialog Component
const HostelApplicationDialog: React.FC<{
  onApply: (roomId: string, preferredRoomType: string, comments: string) => void;
  rooms: any[];
  blockName: string;
  hasBlockApplication: boolean;
  hasAllocation: boolean;
  availableRoomsCount: number;
}> = ({ onApply, rooms, blockName, hasBlockApplication, hasAllocation, availableRoomsCount }) => {
  const [selectedRoom, setSelectedRoom] = useState('');
  const [preferredRoomType, setPreferredRoomType] = useState('shared');
  const [comments, setComments] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = () => {
    onApply(selectedRoom, preferredRoomType, comments);
    setSelectedRoom('');
    setPreferredRoomType('shared');
    setComments('');
    setIsOpen(false);
  };

  const isDisabled = availableRoomsCount === 0;

  const getButtonText = () => {
    if (availableRoomsCount === 0) return 'No Available Rooms';
    if (hasAllocation && hasBlockApplication) return 'Already Applied';
    if (hasBlockApplication) return 'Applied to Block';
    if (hasAllocation) return 'Apply for Room Change';
    return 'Apply to This Block';
  };

  const getDialogTitle = () => {
    if (hasAllocation) return `Room Change Application - ${blockName}`;
    return `Hostel Application - ${blockName}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          disabled={isDisabled}
          className="w-full mt-4 text-xs sm:text-sm"
          variant={hasBlockApplication ? "outline" : "default"}
        >
          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
          {getButtonText()}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg break-words">{getDialogTitle()}</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {hasAllocation ?
              `Submit an application for room change in ${blockName}.` :
              `Submit your application for hostel accommodation in ${blockName}. You can apply to multiple hostels.`
            }
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-xs sm:text-sm font-medium">Preferred Room in {blockName} (Optional)</label>
            <Select value={selectedRoom} onValueChange={setSelectedRoom}>
              <SelectTrigger className="text-xs sm:text-sm">
                <SelectValue placeholder="Select a room or leave blank" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no-preference" className="text-xs sm:text-sm">No preference - Any room</SelectItem>
                {rooms.map((room) => (
                  <SelectItem key={room.id} value={room.id} className="text-xs sm:text-sm">
                    Room {room.room_number} ({room.room_type}) - {room.capacity - room.current_occupancy} spots
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs sm:text-sm font-medium">Preferred Room Type</label>
            <Select value={preferredRoomType} onValueChange={setPreferredRoomType}>
              <SelectTrigger className="text-xs sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single" className="text-xs sm:text-sm">Single Room</SelectItem>
                <SelectItem value="shared" className="text-xs sm:text-sm">Shared Room</SelectItem>
                <SelectItem value="suite" className="text-xs sm:text-sm">Suite</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs sm:text-sm font-medium">Additional Comments</label>
            <Textarea
              placeholder={`Any special requirements for ${blockName}...`}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
              className="text-xs sm:text-sm"
            />
          </div>

          <div className="text-xs sm:text-sm text-gray-600 bg-blue-50 p-3 rounded">
            <p><strong>💡 Pro Tip:</strong> Applying to multiple hostels increases your chances!</p>
          </div>

          <Button onClick={handleSubmit} className="w-full text-xs sm:text-sm">
            Submit Application
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Facility Request Dialog Component (unchanged)
const FacilityRequestDialog: React.FC<{
  onSubmit: (facilityId: string, requestType: string, title: string, description: string, priority: string) => void;
  facilities: any[];
}> = ({ onSubmit, facilities }) => {
  const [facilityId, setFacilityId] = useState('');
  const [requestType, setRequestType] = useState('maintenance');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('normal');
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = () => {
    if (!title.trim() || !description.trim()) return;

    onSubmit(facilityId, requestType, title, description, priority);
    setFacilityId('');
    setRequestType('maintenance');
    setTitle('');
    setDescription('');
    setPriority('normal');
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="text-xs sm:text-sm">
          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
          New Request
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">Submit Facility Request</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Submit a request for facility maintenance, booking, or other issues.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-xs sm:text-sm font-medium">Facility (Optional)</label>
            <Select value={facilityId} onValueChange={setFacilityId}>
              <SelectTrigger className="text-xs sm:text-sm">
                <SelectValue placeholder="Select facility or leave blank" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general" className="text-xs sm:text-sm">General Request</SelectItem>
                {facilities.map((facility) => (
                  <SelectItem key={facility.id} value={facility.id} className="text-xs sm:text-sm">
                    {facility.facility_name} ({facility.facility_type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs sm:text-sm font-medium">Request Type</label>
            <Select value={requestType} onValueChange={setRequestType}>
              <SelectTrigger className="text-xs sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="maintenance" className="text-xs sm:text-sm">Maintenance</SelectItem>
                <SelectItem value="booking" className="text-xs sm:text-sm">Room/Facility Booking</SelectItem>
                <SelectItem value="complaint" className="text-xs sm:text-sm">Complaint</SelectItem>
                <SelectItem value="suggestion" className="text-xs sm:text-sm">Suggestion</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs sm:text-sm font-medium">Title</label>
            <Input
              placeholder="Brief title for your request..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xs sm:text-sm"
            />
          </div>

          <div>
            <label className="text-xs sm:text-sm font-medium">Description</label>
            <Textarea
              placeholder="Detailed description of your request..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="text-xs sm:text-sm"
            />
          </div>

          <div>
            <label className="text-xs sm:text-sm font-medium">Priority</label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="text-xs sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low" className="text-xs sm:text-sm">Low</SelectItem>
                <SelectItem value="normal" className="text-xs sm:text-sm">Normal</SelectItem>
                <SelectItem value="high" className="text-xs sm:text-sm">High</SelectItem>
                <SelectItem value="urgent" className="text-xs sm:text-sm">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || !description.trim()}
            className="w-full text-xs sm:text-sm"
          >
            Submit Request
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HostelFacility;