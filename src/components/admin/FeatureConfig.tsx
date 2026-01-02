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
import { GripVertical, Plus, Edit, Trash2, Eye, EyeOff, Users, BookOpen, Calendar, DollarSign, Building, Shield, FileText, Settings, Activity, Home, MessageSquare, Bell, BarChart, ClipboardList, Briefcase, Award, Search, Save, X, Sparkles, Layers, Filter, CheckCircle, RefreshCw, AlertCircle, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const ICON_OPTIONS = [
  { value: 'Users', label: 'Users', icon: Users },
  { value: 'BookOpen', label: 'Book', icon: BookOpen },
  { value: 'Calendar', label: 'Calendar', icon: Calendar },
  { value: 'DollarSign', label: 'Dollar', icon: DollarSign },
  { value: 'Building', label: 'Building', icon: Building },
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
  { value: 'Award', label: 'Award', icon: Award }
];

const USER_TYPES = [
  { value: 'student', label: 'Student', color: 'bg-blue-500' },
  { value: 'faculty', label: 'Faculty', color: 'bg-green-500' },
  { value: 'parent', label: 'Parent', color: 'bg-purple-500' },
  { value: 'alumni', label: 'Alumni', color: 'bg-orange-500' }
];

const FEATURE_CATEGORIES = [
  { value: 'academic', label: 'Academic', color: 'bg-blue-500' },
  { value: 'communication', label: 'Communication', color: 'bg-green-500' },
  { value: 'administrative', label: 'Administrative', color: 'bg-orange-500' },
  { value: 'alumni', label: 'Alumni', color: 'bg-purple-500' },
  { value: 'facilities', label: 'Facilities', color: 'bg-pink-500' }
];

const FeatureConfig = ({ userProfile }) => {
  const [availableFeatures, setAvailableFeatures] = useState([]);
  const [userTypeConfigs, setUserTypeConfigs] = useState({ student: [], faculty: [], admin: [], parent: [], alumni: [] });
  const [selectedUserType, setSelectedUserType] = useState('student');
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [isAddFeatureOpen, setIsAddFeatureOpen] = useState(false);
  const [isEditFeatureOpen, setIsEditFeatureOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newFeature, setNewFeature] = useState({
    feature_key: '',
    feature_name: '',
    description: '',
    icon_name: 'Users',
    category: 'academic',
    default_enabled: true,
    requires_permissions: false,
    applicable_user_types: ['student'] // NEW: Default to student
  });

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

  const handleAddNewFeature = async () => {
    if (!newFeature.feature_key || !newFeature.feature_name) {
      toast({ title: "Validation Error", description: "Feature key and name are required.", variant: "destructive" });
      return;
    }
    if (!newFeature.applicable_user_types || newFeature.applicable_user_types.length === 0) {
      toast({ title: "Validation Error", description: "Select at least one user type.", variant: "destructive" });
      return;
    }
    try {
      const { data, error } = await supabase.from('feature_definitions').insert([{ ...newFeature, is_system_feature: false }]).select().single();
      if (error) throw error;
      setAvailableFeatures([data, ...availableFeatures]);
      setNewFeature({ feature_key: '', feature_name: '', description: '', icon_name: 'Users', category: 'academic', default_enabled: true, requires_permissions: false, applicable_user_types: ['student'] });
      setIsAddFeatureOpen(false);
      toast({ title: "Success", description: "Feature created successfully. You can now assign it to user types." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to create. " + (error.message || ''), variant: "destructive" });
    }
  };

  const handleUpdateFeature = async () => {
    if (!selectedFeature.applicable_user_types || selectedFeature.applicable_user_types.length === 0) {
      toast({ title: "Validation Error", description: "Select at least one user type.", variant: "destructive" });
      return;
    }
    try {
      await supabase.from('feature_definitions').update({ feature_name: selectedFeature.feature_name, description: selectedFeature.description, icon_name: selectedFeature.icon_name, category: selectedFeature.category, default_enabled: selectedFeature.default_enabled, requires_permissions: selectedFeature.requires_permissions, applicable_user_types: selectedFeature.applicable_user_types, updated_at: new Date().toISOString() }).eq('id', selectedFeature.id);
      setAvailableFeatures(availableFeatures.map(f => f.id === selectedFeature.id ? selectedFeature : f));
      setIsEditFeatureOpen(false);
      setSelectedFeature(null);
      toast({ title: "Success", description: "Feature updated successfully." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update. " + (error.message || ''), variant: "destructive" });
    }
  };

  const handleDeleteFeature = async (featureId, isSystemFeature) => {
    if (isSystemFeature) { toast({ title: "Cannot Delete", description: "System features cannot be deleted.", variant: "destructive" }); return; }
    if (!confirm('Are you sure? This will remove the feature from all configurations.')) return;
    try {
      await supabase.from('feature_configurations').delete().eq('feature_id', featureId);
      await supabase.from('feature_definitions').delete().eq('id', featureId).eq('is_system_feature', false);
      setAvailableFeatures(availableFeatures.filter(f => f.id !== featureId));
      Object.keys(userTypeConfigs).forEach(userType => { userTypeConfigs[userType] = userTypeConfigs[userType].filter(f => f.id !== featureId); });
      setUserTypeConfigs({ ...userTypeConfigs });
      toast({ title: "Success", description: "Feature deleted successfully." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete. " + (error.message || ''), variant: "destructive" });
    }
  };

  // NEW: Filter features based on applicable user types
  const filteredFeatures = availableFeatures.filter(f => {
    const matchesSearch = f.feature_name.toLowerCase().includes(searchTerm.toLowerCase()) || f.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || f.category === filterCategory;
    const matchesUserType = !f.applicable_user_types || f.applicable_user_types.length === 0 || f.applicable_user_types.includes(selectedUserType);
    return matchesSearch && matchesCategory && matchesUserType;
  });

  const currentFeatures = getCurrentFeatures();
  const unassignedFeatures = filteredFeatures.filter(f => !currentFeatures.find(cf => cf.id === f.id));

  // NEW: Toggle user type selection
  const toggleUserType = (userType, isNewFeature = true) => {
    if (isNewFeature) {
      const current = newFeature.applicable_user_types || [];
      const updated = current.includes(userType)
        ? current.filter(t => t !== userType)
        : [...current, userType];
      setNewFeature({ ...newFeature, applicable_user_types: updated });
    } else {
      const current = selectedFeature.applicable_user_types || [];
      const updated = current.includes(userType)
        ? current.filter(t => t !== userType)
        : [...current, userType];
      setSelectedFeature({ ...selectedFeature, applicable_user_types: updated });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto"></div>
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
            <div className="p-2 rounded-lg">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold">Feature Configuration Manager</h1>
          </div>
          <p className="text-muted-foreground">Drag and drop features to customize the interface for each user type</p>
          <div className="mt-2 flex items-center space-x-2 text-sm">
            <Info className="w-4 h-4" />
            <span>Only features applicable to {selectedUserType}s are shown</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {hasChanges && (
            <Badge variant="outline" className="animate-pulse">
              Unsaved Changes
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={loadAllData} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleSaveChanges} disabled={!hasChanges || isSaving}>
            {isSaving ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Saving...</> : <><Save className="w-4 h-4 mr-2" />Save Changes</>}
          </Button>
        </div>
      </div>

      <Card className="border-white/10 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
            <Label className="text-lg font-semibold">Configure For:</Label>
            <div className="flex flex-wrap gap-2">
              {USER_TYPES.map((type) => (
                <Button key={type.value} variant={selectedUserType === type.value ? "default" : "outline"} onClick={() => { if (hasChanges && !confirm('You have unsaved changes. Switch anyway?')) return; setSelectedUserType(type.value); setHasChanges(false); }} className={selectedUserType === type.value ? `${type.color} text-white` : ''}>
                  {type.label}
                  <Badge className="ml-2" variant="secondary">{userTypeConfigs[type.value]?.length || 0}</Badge>
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
              <Badge variant="outline">{unassignedFeatures.length}</Badge>
            </div>
            <CardDescription>Click to add to configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger><Filter className="w-4 h-4 mr-2" /><SelectValue placeholder="Filter" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {FEATURE_CATEGORIES.map((cat) => <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {unassignedFeatures.map((feature) => {
                const Icon = getIconComponent(feature.icon_name);
                const category = FEATURE_CATEGORIES.find(c => c.value === feature.category);
                return (
                  <div key={feature.id} className="p-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-all cursor-pointer group" onClick={() => handleAddFromAvailable(feature)}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="p-2 rounded-lg"><Icon className="w-4 h-4" /></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <p className="font-medium text-sm">{feature.feature_name}</p>
                            {feature.requires_permissions && <Shield className="w-3 h-3" title="Requires Permissions" />}
                            {feature.is_system_feature && <Badge variant="outline" className="text-xs">System</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{feature.description || 'No description'}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            <Badge className={`text-xs ${category?.color} text-white`}>{category?.label}</Badge>
                            {feature.applicable_user_types && feature.applicable_user_types.length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {feature.applicable_user_types.length} type{feature.applicable_user_types.length > 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
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
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50 text-green-400" />
                  <p className="font-medium">All applicable features assigned!</p>
                  <p className="text-sm mt-1">Create new features or switch user type</p>
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
              <Badge variant="outline">{currentFeatures.length}</Badge>
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
                  const category = FEATURE_CATEGORIES.find(c => c.value === feature.category);
                  
                  return (
                    <div
                      key={configFeature.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, configFeature, index)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={() => setDragOverIndex(null)}
                      onDrop={(e) => handleDrop(e, index)}
                      className={`p-4 rounded-lg border border-white/10 bg-white/5 transition-all duration-200 cursor-move hover:bg-white/10 hover:border-purple-400/30 hover:shadow-lg ${
                        dragOverIndex === index ? 'scale-105' : ''
                      } ${!configFeature.is_enabled ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-center space-x-4">
                        <GripVertical className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        <div className="p-2 rounded-lg">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <p className="font-medium">{feature.feature_name}</p>
                            {feature.requires_permissions && (
                              <Shield className="w-4 h-4" />
                            )}
                            <Badge className={`text-xs ${category?.color} text-white`}>
                              {category?.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            #{index + 1}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleFeature(configFeature.id)}
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                />
              </div>
              <div>
                <Label>Feature Key</Label>
                <Input
                  value={selectedFeature.feature_key}
                  disabled={selectedFeature.is_system_feature}
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
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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
                />
              </div>
            </div>
            <DialogFooter>
              {!selectedFeature.is_system_feature && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleDeleteFeature(selectedFeature.id, selectedFeature.is_system_feature);
                    setIsEditFeatureOpen(false);
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              )}
              <div className="flex-1"></div>
              <Button variant="outline" onClick={() => setIsEditFeatureOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateFeature}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default FeatureConfig;