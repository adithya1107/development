
import { supabase } from '@/integrations/supabase/client';
import {
  Users, BookOpen, Calendar, DollarSign, Building, Shield, FileText,
  Settings, Activity, Home, MessageSquare, Bell, BarChart, ClipboardList,
  Briefcase, Award, GraduationCap, Clock, Heart, HelpCircle, Mail,
  TrendingUp, CreditCard, User, Sun, Sparkles, Bot
} from 'lucide-react';

// Icon mapping
const ICON_MAP = {
  Users, BookOpen, Calendar, DollarSign, Building, Shield, FileText,
  Settings, Activity, Home, MessageSquare, Bell, BarChart, ClipboardList,
  Briefcase, Award, GraduationCap, Clock, Heart, HelpCircle, Mail,
  TrendingUp, CreditCard, User, Sun, Sparkles, Bot
};

export interface FeatureConfig {
  id: string;
  feature_key: string;
  feature_name: string;
  feature_route?: string;
  icon_name: string;
  description?: string;
  category: string;
  is_enabled: boolean;
  display_order: number;
  requires_permissions: boolean;
  custom_settings?: any;
}

export interface SidebarItem {
  id: string;
  label: string;
  icon: any;
  route?: string;
  enabled: boolean;
  order: number;
}

/**
 * Fetches feature configurations for a specific user type and college
 */
export async function loadUserFeatures(
  collegeId: string,
  userType: 'student' | 'faculty' | 'admin' | 'parent' | 'alumni'
): Promise<FeatureConfig[]> {
  try {
    // Get feature configurations for this user type
    const { data: configs, error: configError } = await supabase
      .from('feature_configurations')
      .select(`
        id,
        feature_id,
        is_enabled,
        display_order,
        custom_settings,
        feature_definitions (
          id,
          feature_key,
          feature_name,
          description,
          icon_name,
          category,
          requires_permissions
        )
      `)
      .eq('college_id', collegeId)
      .contains('target_user_types', [userType])
      .order('display_order', { ascending: true });

    if (configError) {
      console.error('Error loading feature configs:', configError);
      return [];
    }

    if (!configs || configs.length === 0) {
      console.warn(`No feature configurations found for ${userType} in college ${collegeId}`);
      return [];
    }

    // Transform the data
    const features: FeatureConfig[] = configs
      .filter(config => config.feature_definitions) // Ensure feature definition exists
      .map(config => ({
        id: config.feature_id,
        feature_key: config.feature_definitions.feature_key,
        feature_name: config.feature_definitions.feature_name,
        icon_name: config.feature_definitions.icon_name,
        description: config.feature_definitions.description,
        category: config.feature_definitions.category,
        is_enabled: config.is_enabled,
        display_order: config.display_order,
        requires_permissions: config.feature_definitions.requires_permissions,
        custom_settings: config.custom_settings || {}
      }))
      .filter(feature => feature.is_enabled); // Only return enabled features

    return features;
  } catch (error) {
    console.error('Error in loadUserFeatures:', error);
    return [];
  }
}

/**
 * Converts feature configurations to sidebar items
 */
export function featuresToSidebarItems(features: FeatureConfig[]): SidebarItem[] {
  return features.map(feature => ({
    id: feature.feature_key,
    label: feature.feature_name,
    icon: ICON_MAP[feature.icon_name] || Activity,
    route: feature.custom_settings?.route || `/${feature.feature_key}`,
    enabled: feature.is_enabled,
    order: feature.display_order
  }));
}

/**
 * Checks if a user has access to a specific feature
 */
export async function hasFeatureAccess(
  collegeId: string,
  userType: string,
  featureKey: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('feature_configurations')
      .select(`
        is_enabled,
        feature_definitions!inner (
          feature_key
        )
      `)
      .eq('college_id', collegeId)
      .contains('target_user_types', [userType])
      .eq('feature_definitions.feature_key', featureKey)
      .single();

    if (error || !data) {
      return false;
    }

    return data.is_enabled;
  } catch (error) {
    console.error('Error checking feature access:', error);
    return false;
  }
}

/**
 * Gets the default/fallback features for a user type if no configuration exists
 */
export function getDefaultFeatures(
  userType: 'student' | 'faculty' | 'admin' | 'parent' | 'alumni'
): SidebarItem[] {
  const defaultFeatures = {
    student: [
      { id: 'dashboard', label: 'Dashboard', icon: GraduationCap, enabled: true, order: 0 },
      { id: 'schedule', label: 'Schedule', icon: Clock, enabled: true, order: 1 },
      { id: 'attendance', label: 'Attendance', icon: Calendar, enabled: true, order: 2 },
      { id: 'courses', label: 'Courses', icon: BookOpen, enabled: true, order: 3 },
    ],
    faculty: [
      { id: 'dashboard', label: 'Dashboard', icon: GraduationCap, enabled: true, order: 0 },
      { id: 'schedule', label: 'Schedule', icon: Calendar, enabled: true, order: 1 },
      { id: 'courses', label: 'Courses', icon: BookOpen, enabled: true, order: 2 },
    ],
    admin: [
      { id: 'dashboard', label: 'Dashboard', icon: Activity, enabled: true, order: 0 },
      { id: 'users', label: 'User Management', icon: Users, enabled: true, order: 1 },
    ],
    parent: [
      { id: 'dashboard', label: 'Dashboard', icon: User, enabled: true, order: 0 },
      { id: 'academic', label: 'Academic Progress', icon: TrendingUp, enabled: true, order: 1 },
    ],
    alumni: [
      { id: 'dashboard', label: 'Dashboard', icon: Home, enabled: true, order: 0 },
      { id: 'events', label: 'Events', icon: Calendar, enabled: true, order: 1 },
    ]
  };

  return defaultFeatures[userType] || [];
}

/**
 * Hook to use in React components for loading features
 */
export async function useLoadFeatures(collegeId: string, userType: string) {
  const [features, setFeatures] = useState<FeatureConfig[]>([]);
  const [sidebarItems, setSidebarItems] = useState<SidebarItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadFeatures = async () => {
      setIsLoading(true);
      try {
        const loadedFeatures = await loadUserFeatures(collegeId, userType);
        
        if (loadedFeatures.length === 0) {
          // Use default features if none configured
          const defaultItems = getDefaultFeatures(userType);
          setSidebarItems(defaultItems);
        } else {
          setFeatures(loadedFeatures);
          const items = featuresToSidebarItems(loadedFeatures);
          setSidebarItems(items);
        }
      } catch (error) {
        console.error('Error loading features:', error);
        // Fall back to defaults on error
        const defaultItems = getDefaultFeatures(userType);
        setSidebarItems(defaultItems);
      } finally {
        setIsLoading(false);
      }
    };

    if (collegeId && userType) {
      loadFeatures();
    }
  }, [collegeId, userType]);

  return { features, sidebarItems, isLoading };
}