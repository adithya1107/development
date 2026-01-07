import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { GripVertical, Plus, Edit, Trash2, Eye, EyeOff, Users, BookOpen, Calendar, DollarSign, Building, Shield, FileText, Settings, Activity, Home, MessageSquare, Bell, BarChart, ClipboardList, Briefcase, Award, Search, Save, X, Sparkles, Layers, Filter, CheckCircle, RefreshCw, AlertCircle, Info, Clock, GraduationCap, TrendingUp, ShoppingBag, Sun, Mail, HelpCircle, Building2, PlusCircle, Heart, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const ICON_OPTIONS = [
  { value: 'Users', label: 'Users', icon: Users },
  { value: 'BookOpen', label: 'Book', icon: BookOpen },
  { value: 'Calendar', label: 'Calendar', icon: Calendar },
  { value: 'DollarSign', label: 'Dollar', icon: DollarSign },
  { value: 'Building', label: 'Building', icon: Building },
  { value: 'Building2Icon', label: 'Building 2', icon: Building2 },
  { value: 'Shield', label: 'Shield', icon: Shield },
  { value: 'FileText', label: 'File', icon: FileText },
  { value: 'Settings', label: 'Settings', icon: Settings },
  { value: 'Activity', label: 'Activity', icon: Activity },
  { value: 'Home', label: 'Home', icon: Home },
  { value: 'MessageSquare', label: 'Message', icon: MessageSquare },
  { value: 'Bell', label: 'Bell', icon: Bell },
  { value: 'BarChart', label: 'Chart', icon: BarChart },
  { value: 'ClipboardList', label: 'Clipboard', icon: ClipboardList },
  { value: 'Briefcase', label: 'Briefcase', icon: Briefcase },
  { value: 'Award', label: 'Award', icon: Award },
  { value: 'Clock', label: 'Clock', icon: Clock },
  { value: 'GraduationCap', label: 'Graduation Cap', icon: GraduationCap },
  { value: 'TrendingUp', label: 'Trending Up', icon: TrendingUp },
  { value: 'ShoppingBag', label: 'Shopping Bag', icon: ShoppingBag },
  { value: 'Sun', label: 'Sun', icon: Sun },
  { value: 'Mail', label: 'Mail', icon: Mail },
  { value: 'HelpCircle', label: 'Help Circle', icon: HelpCircle },
  { value: 'PlusCircle', label: 'Plus Circle', icon: PlusCircle },
  { value: 'Heart', label: 'Heart', icon: Heart },
  { value: 'CreditCard', label: 'Credit Card', icon: CreditCard },
  { value: 'Sparkle', label: 'Sparkle', icon: Sparkles }
];

const USER_TYPES = [
  { value: 'student', label: 'Student' },
  { value: 'faculty', label: 'Faculty' },
  { value: 'parent', label: 'Parent' },
  { value: 'alumni', label: 'Alumni' }
];

// Hardcoded features specific to each user type based on portal files
const USER_TYPE_FEATURES = {
  student: [
    'dashboard',
    'schedule',
    'attendance',
    'courses',
    'quizzes',
    'gradebook',
    'cgpa',
    'events',
    'department',
    'placements',
    'clubs',
    'marketplace',
    'furlong',
    'communication',
    'announcements',
    'hostel',
    'support'
  ],
  faculty: [
    'dashboard',
    'schedule',
    'courses',
    'gradebook',
    'cgpa',
    'extra-classes',
    'events',
    'performance',
    'communication',
    'parent-interaction',
    'absence',
    'recognition',
    'department',
    'clubs',
    'support'
  ],
  parent: [
    'dashboard',
    'academic',
    'attendance',
    'payments',
    'communication',
    'events'
  ],
  alumni: [
    'dashboard',
    'events',
    'networking',
    'contributions',
    'communication',
    'documents',
    'support'
  ]
};

const FeatureConfig = ({ userProfile }) => {
  const [availableFeatures, setAvailableFeatures] = useState([]);
  const [userTypeConfigs, setUserTypeConfigs] = useState({ student: [], faculty: [], admin: [], parent: [], alumni: [] });
  const [selectedUserType, setSelectedUserType] = useState('student');
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditFeatureOpen, setIsEditFeatureOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { loadAllData(); }, [userProfile]);

  const loadAllData = async () => {
    try {
      setIsLoading(true);
      await Promise.all([loadFeatureDefinitions(), loadFeatureConfigurations()]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({ title: "Error", description: "Failed to load feature configuration.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const loadFeatureDefinitions = async () => {
    const { data, error } = await supabase.from('feature_definitions').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    setAvailableFeatures(data || []);
  };

  const loadFeatureConfigurations = async () => {
    const { data, error } = await supabase.from('feature_configurations').select('*').eq('college_id', userProfile.college_id).order('display_order', { ascending: true });
    if (error) throw error;
    const organizedConfigs = { student: [], faculty: [], admin: [], parent: [], alumni: [] };
    (data || []).forEach(config => {
      config.target_user_types?.forEach(userType => {
        if (organizedConfigs[userType]) {
          organizedConfigs[userType].push({ id: config.feature_id, display_order: config.display_order, is_enabled: config.is_enabled, config_id: config.id, custom_settings: config.custom_settings });
        }
      });
    });
    Object.keys(organizedConfigs).forEach(userType => { organizedConfigs[userType].sort((a, b) => a.display_order - b.display_order); });
    setUserTypeConfigs(organizedConfigs);
  };

  const getCurrentFeatures = () => userTypeConfigs[selectedUserType] || [];
  const setCurrentFeatures = (features) => { setHasChanges(true); setUserTypeConfigs({ ...userTypeConfigs, [selectedUserType]: features }); };
  const getFeatureDetails = (featureId) => availableFeatures.find(f => f.id === featureId);
  const getIconComponent = (iconName) => { const icon = ICON_OPTIONS.find(i => i.value === iconName); return icon ? icon.icon : Users; };

  const handleDragStart = (e, item, index) => { setDraggedItem({ item, index }); e.dataTransfer.effectAllowed = 'move'; e.currentTarget.style.opacity = '0.5'; };
  const handleDragEnd = (e) => { e.currentTarget.style.opacity = '1'; setDraggedItem(null); setDragOverIndex(null); };
  const handleDragOver = (e, index) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverIndex(index); };
  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (!draggedItem) return;
    const currentFeatures = getCurrentFeatures();
    const newFeatures = [...currentFeatures];
    const [removed] = newFeatures.splice(draggedItem.index, 1);
    newFeatures.splice(dropIndex, 0, removed);
    setCurrentFeatures(newFeatures.map((f, i) => ({ ...f, display_order: i })));
    setDragOverIndex(null);
  };

  const handleAddFromAvailable = (feature) => {
    const currentFeatures = getCurrentFeatures();
    if (!currentFeatures.find(f => f.id === feature.id)) {
      setCurrentFeatures([...currentFeatures, { id: feature.id, display_order: currentFeatures.length, is_enabled: feature.default_enabled, custom_settings: {} }]);
    }
  };

  const handleRemoveFeature = (featureId) => {
    const filtered = getCurrentFeatures().filter(f => f.id !== featureId);
    setCurrentFeatures(filtered.map((f, i) => ({ ...f, display_order: i })));
  };

  const handleToggleFeature = (featureId) => { setCurrentFeatures(getCurrentFeatures().map(f => f.id === featureId ? { ...f, is_enabled: !f.is_enabled } : f)); };

  const handleSaveChanges = async () => {
    try {
      setIsSaving(true);
      const currentFeatures = getCurrentFeatures();
      await supabase.from('feature_configurations').delete().eq('college_id', userProfile.college_id).contains('target_user_types', [selectedUserType]);
      if (currentFeatures.length > 0) {
        const configurationsToInsert = currentFeatures.map(cf => ({ college_id: userProfile.college_id, feature_id: cf.id, is_enabled: cf.is_enabled, display_order: cf.display_order, target_user_types: [selectedUserType], custom_settings: cf.custom_settings || {}, updated_by: userProfile.id }));
        await supabase.from('feature_configurations').insert(configurationsToInsert);
      }
      setHasChanges(false);
      toast({ title: "Success", description: `Configuration saved for ${selectedUserType}. Changes will be reflected for all ${selectedUserType}s.` });
      await loadFeatureConfigurations();
    } catch (error) {
      console.error('Error saving:', error);
      toast({ title: "Error", description: "Failed to save. " + (error.message || ''), variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateFeature = async () => {
    try {
      await supabase.from('feature_definitions').update({ feature_name: selectedFeature.feature_name, description: selectedFeature.description, icon_name: selectedFeature.icon_name, updated_at: new Date().toISOString() }).eq('id', selectedFeature.id);
      setAvailableFeatures(availableFeatures.map(f => f.id === selectedFeature.id ? selectedFeature : f));
      setIsEditFeatureOpen(false);
      setSelectedFeature(null);
      toast({ title: "Success", description: "Feature updated successfully." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update. " + (error.message || ''), variant: "destructive" });
    }
  };

  // Filter features based on user type's allowed features
  const getFilteredFeaturesForUserType = () => {
    const allowedFeatureKeys = USER_TYPE_FEATURES[selectedUserType] || [];
    return availableFeatures.filter(f => {
      const matchesSearch = f.feature_name.toLowerCase().includes(searchTerm.toLowerCase()) || f.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesUserType = allowedFeatureKeys.includes(f.feature_key);
      return matchesSearch && matchesUserType;
    });
  };

  const filteredFeatures = getFilteredFeaturesForUserType();
  const currentFeatures = getCurrentFeatures();
  const unassignedFeatures = filteredFeatures.filter(f => !currentFeatures.find(cf => cf.id === f.id));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading feature configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 rounded-lg bg-white/5">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold">Feature Configuration Manager</h1>
          </div>
          <p className="text-muted-foreground">Drag and drop features to customize the interface for each user type</p>
        </div>
        
        <div className="flex items-center space-x-3">
          {hasChanges && (
            <Badge variant="outline" className="animate-pulse border-white/30">
              Unsaved Changes
            </Badge>
          )}
          <Button onClick={handleSaveChanges} disabled={!hasChanges || isSaving} className="bg-white text-black hover:bg-white/90">
            {isSaving ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>Saving...</> : <><Save className="w-4 h-4 mr-2" />Save Changes</>}
          </Button>
        </div>
      </div>

      <Card className="border-white/10 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
            <Label className="text-lg font-semibold">Configure For:</Label>
            <div className="flex flex-wrap gap-2">
              {USER_TYPES.map((type) => (
                <Button 
                  key={type.value} 
                  variant={selectedUserType === type.value ? "default" : "outline"} 
                  onClick={() => { 
                    if (hasChanges && !confirm('You have unsaved changes. Switch anyway?')) return; 
                    setSelectedUserType(type.value); 
                    setHasChanges(false); 
                  }} 
                  className={selectedUserType === type.value ? 'bg-white text-black hover:bg-white/90' : 'border-white/20 hover:bg-white/5'}
                >
                  {type.label}
                  <Badge className="ml-2 bg-black/10 text-black border-0" variant="secondary">{userTypeConfigs[type.value]?.length || 0}</Badge>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 border-white/10 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5" />
                <span>Available for {USER_TYPES.find(t => t.value === selectedUserType)?.label}</span>
              </CardTitle>
              <Badge variant="outline" className="border-white/30">{unassignedFeatures.length}</Badge>
            </div>
            <CardDescription>Click to add to configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-white/5 border-white/10" />
              </div>
            </div>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {unassignedFeatures.map((feature) => {
                const Icon = getIconComponent(feature.icon_name);
                return (
                  <div key={feature.id} className="p-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-all cursor-pointer group" onClick={() => handleAddFromAvailable(feature)}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="p-2 rounded-lg bg-white/5">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <p className="font-medium text-sm">{feature.feature_name}</p>
                            {feature.requires_permissions && <Shield className="w-3 h-3" title="Requires Permissions" />}
                            {feature.is_system_feature && <Badge variant="outline" className="text-xs border-white/30">System</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{feature.description || 'No description'}</p>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity ml-2" onClick={(e) => { e.stopPropagation(); setSelectedFeature({ ...feature }); setIsEditFeatureOpen(true); }}>
                        <Edit className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {unassignedFeatures.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">All applicable features assigned!</p>
                  <p className="text-sm mt-1">All features for this user type are configured</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Configured Features */}
        <Card className="lg:col-span-2 border-white/10 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Layers className="w-5 h-5" />
                <span>{USER_TYPES.find(t => t.value === selectedUserType)?.label} Features</span>
              </CardTitle>
              <Badge variant="outline" className="border-white/30">{currentFeatures.length}</Badge>
            </div>
            <CardDescription>
              Drag to reorder • Toggle to enable/disable • Click × to remove
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {currentFeatures.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-white/10 rounded-lg">
                  <Layers className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-lg font-medium mb-2">No features configured</p>
                  <p className="text-sm text-muted-foreground">
                    Click on features from the left panel to add them to the {selectedUserType} portal
                  </p>
                </div>
              ) : (
                currentFeatures.map((configFeature, index) => {
                  const feature = getFeatureDetails(configFeature.id);
                  if (!feature) return null;
                  const Icon = getIconComponent(feature.icon_name);
                  
                  return (
                    <div
                      key={configFeature.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, configFeature, index)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={() => setDragOverIndex(null)}
                      onDrop={(e) => handleDrop(e, index)}
                      className={`p-4 rounded-lg border border-white/10 bg-white/5 transition-all duration-200 cursor-move hover:bg-white/10 hover:border-white/30 hover:shadow-lg ${
                        dragOverIndex === index ? 'scale-105' : ''
                      } ${!configFeature.is_enabled ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-center space-x-4">
                        <GripVertical className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        <div className="p-2 rounded-lg bg-white/5">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <p className="font-medium">{feature.feature_name}</p>
                            {feature.requires_permissions && (
                              <Shield className="w-4 h-4" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs border-white/30">
                            #{index + 1}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleFeature(configFeature.id)}
                            className="hover:bg-white/5"
                          >
                            {configFeature.is_enabled ? (
                              <Eye className="w-4 h-4" />
                            ) : (
                              <EyeOff className="w-4 h-4 text-muted-foreground" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveFeature(configFeature.id)}
                            className="hover:bg-white/5"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Feature Dialog */}
      {selectedFeature && (
        <Dialog open={isEditFeatureOpen} onOpenChange={setIsEditFeatureOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-background border-white/10">
            <DialogHeader>
              <DialogTitle>Edit Feature</DialogTitle>
              <DialogDescription>Modify feature properties</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="col-span-2">
                <Label>Feature Name</Label>
                <Input
                  value={selectedFeature.feature_name}
                  onChange={(e) =>
                    setSelectedFeature({ ...selectedFeature, feature_name: e.target.value })
                  }
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div>
                <Label>Feature Key</Label>
                <Input
                  value={selectedFeature.feature_key}
                  disabled={selectedFeature.is_system_feature}
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div>
                <Label>Icon</Label>
                <Select
                  value={selectedFeature.icon_name}
                  onValueChange={(v) =>
                    setSelectedFeature({ ...selectedFeature, icon_name: v })
                  }
                >
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-white/10">
                    {ICON_OPTIONS.map((icon) => {
                      const Icon = icon.icon;
                      return (
                        <SelectItem key={icon.value} value={icon.value}>
                          <div className="flex items-center space-x-2">
                            <Icon className="w-4 h-4" />
                            <span>{icon.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={selectedFeature.description}
                  onChange={(e) =>
                    setSelectedFeature({ ...selectedFeature, description: e.target.value })
                  }
                  rows={3}
                  className="bg-white/5 border-white/10"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditFeatureOpen(false)} className="border-white/20">
                Cancel
              </Button>
              <Button onClick={handleUpdateFeature} className="bg-white text-black hover:bg-white/90">Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default FeatureConfig;