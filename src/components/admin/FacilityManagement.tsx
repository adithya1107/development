
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Building, Plus, Edit, MapPin, Users, Calendar, Search, Wrench, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Facility {
  id: string;
  facility_name: string;
  facility_type: string;
  capacity: number;
  location: string;
  amenities: any;
  is_available: boolean;
  maintenance_schedule: any;
  created_at: string;
}

interface UserProfile {
  id: string;
  college_id: string;
  user_type: string;
}

const FacilityManagement = ({ userProfile }: { userProfile: UserProfile }) => {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [facilityForm, setFacilityForm] = useState({
    facility_name: '',
    facility_type: '',
    capacity: 0,
    location: '',
    amenities: {},
    is_available: true
  });

  useEffect(() => {
    loadFacilities();
  }, [userProfile]);

  const loadFacilities = async () => {
    try {
      if (!userProfile?.college_id) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('facilities')
        .select('*')
        .eq('college_id', userProfile.college_id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading facilities:', error);
        toast({
          title: "Error",
          description: "Failed to load facilities.",
          variant: "destructive",
        });
        setFacilities([]);
      } else {
        setFacilities(data || []);
      }
    } catch (error) {
      console.error('Error loading facilities:', error);
      toast({
        title: "Error",
        description: "Failed to load facilities.",
        variant: "destructive",
      });
      setFacilities([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddFacility = async () => {
    if (!facilityForm.facility_name || !facilityForm.facility_type) {
      toast({
        title: "Validation Error",
        description: "Please fill in facility name and type.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('facilities')
        .insert([{
          ...facilityForm,
          college_id: userProfile.college_id
        }])
        .select()
        .single();

      if (error) {
        console.error('Error adding facility:', error);
        toast({
          title: "Error",
          description: "Failed to add facility.",
          variant: "destructive",
        });
      } else {
        setFacilities([data, ...facilities]);
        setIsAddDialogOpen(false);
        setFacilityForm({
          facility_name: '',
          facility_type: '',
          capacity: 0,
          location: '',
          amenities: {},
          is_available: true
        });

        toast({
          title: "Success",
          description: "Facility added successfully.",
        });
      }
    } catch (error) {
      console.error('Error adding facility:', error);
      toast({
        title: "Error",
        description: "Failed to add facility.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredFacilities = facilities.filter(facility => {
    const matchesSearch = 
      facility.facility_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      facility.location?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'all' || facility.facility_type === filterType;

    return matchesSearch && matchesType;
  });

  const getFacilityTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      'classroom': 'bg-blue-100 text-blue-800',
      'lab': 'bg-green-100 text-green-800',
      'auditorium': 'bg-purple-100 text-purple-800',
      'library': 'bg-orange-100 text-orange-800',
      'sports': 'bg-red-100 text-red-800',
      'cafeteria': 'bg-yellow-100 text-yellow-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading facilities...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Building className="w-5 h-5 mr-2" />
                <span>Facility & Logistics Management</span>
              </CardTitle>
              <CardDescription className='mt-2'>
                Manage campus facilities, room bookings, and maintenance schedules.
              </CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-60">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Facility
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Facility</DialogTitle>
                  <DialogDescription>
                    Register a new facility or room in the campus.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="col-span-2">
                    <Label htmlFor="facility_name">Facility Name *</Label>
                    <Input
                      id="facility_name"
                      value={facilityForm.facility_name}
                      onChange={(e) => setFacilityForm({...facilityForm, facility_name: e.target.value})}
                      placeholder="e.g., Main Auditorium"
                    />
                  </div>
                  <div>
                    <Label htmlFor="facility_type">Facility Type *</Label>
                    <Select value={facilityForm.facility_type} onValueChange={(value) => setFacilityForm({...facilityForm, facility_type: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="classroom">Classroom</SelectItem>
                        <SelectItem value="lab">Laboratory</SelectItem>
                        <SelectItem value="auditorium">Auditorium</SelectItem>
                        <SelectItem value="library">Library</SelectItem>
                        <SelectItem value="sports">Sports Facility</SelectItem>
                        <SelectItem value="cafeteria">Cafeteria</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="capacity">Capacity</Label>
                    <Input
                      id="capacity"
                      type="number"
                      value={facilityForm.capacity}
                      onChange={(e) => setFacilityForm({...facilityForm, capacity: parseInt(e.target.value) || 0})}
                      placeholder="Maximum occupancy"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={facilityForm.location}
                      onChange={(e) => setFacilityForm({...facilityForm, location: e.target.value})}
                      placeholder="Building, Floor, Room details"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isSubmitting}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddFacility} disabled={isSubmitting}>
                    {isSubmitting ? 'Adding...' : 'Add Facility'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search facilities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="classroom">Classroom</SelectItem>
                <SelectItem value="lab">Laboratory</SelectItem>
                <SelectItem value="auditorium">Auditorium</SelectItem>
                <SelectItem value="library">Library</SelectItem>
                <SelectItem value="sports">Sports</SelectItem>
                <SelectItem value="cafeteria">Cafeteria</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Facilities Table */}
          {filteredFacilities.length > 0 ? (
            <div className="rounded-md border max-h-[350px] sm:max-h-[450px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Facility</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFacilities.map((facility) => (
                    <TableRow key={facility.id}>
                      <TableCell>
                        <div className="font-medium">{facility.facility_name}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getFacilityTypeColor(facility.facility_type)}>
                          {facility.facility_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          <span className="text-sm">{facility.location || 'Not specified'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Users className="w-3 h-3 text-gray-400" />
                          <span>{facility.capacity || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={facility.is_available ? "default" : "secondary"}>
                          {facility.is_available ? "Available" : "Maintenance"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button size="sm" variant="outline">
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Calendar className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Wrench className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">No Facilities Found</h3>
              <p>No facilities found matching your criteria. Add your first facility to get started.</p>
              <Button 
                className="mt-4" 
                onClick={() => setIsAddDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Facility
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FacilityManagement;
