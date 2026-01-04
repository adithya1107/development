
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UserPermissions {
  // Dashboard & Profile
  view_personal_dashboard: boolean;
  view_college_branding: boolean;
  
  // Academic
  view_submit_assignments: boolean;
  review_assignments: boolean;
  view_grades: boolean;
  assign_grades: boolean;
  view_child_grades: boolean;
  mark_attendance: boolean;
  view_attendance: boolean;
  view_child_attendance: boolean;
  upload_materials: boolean;
  
  // Communication
  join_forums: boolean;
  
  // Financial
  view_fees: boolean;
  review_fees: boolean;
  view_child_fees: boolean;
  make_payments: boolean;
  make_child_payments: boolean;
  
  // Services
  request_certificates: boolean;
  apply_hostel: boolean;
  facility_requests: boolean;
  support_tickets: boolean;
  
  // Alumni specific
  alumni_contributions: boolean;
  alumni_events: boolean;
}

const DEFAULT_PERMISSIONS: UserPermissions = {
  view_personal_dashboard: false,
  view_college_branding: false,
  view_submit_assignments: false,
  review_assignments: false,
  view_grades: false,
  assign_grades: false,
  view_child_grades: false,
  mark_attendance: false,
  view_attendance: false,
  view_child_attendance: false,
  upload_materials: false,
  join_forums: false,
  view_fees: false,
  review_fees: false,
  view_child_fees: false,
  make_payments: false,
  make_child_payments: false,
  request_certificates: false,
  apply_hostel: false,
  facility_requests: false,
  support_tickets: false,
  alumni_contributions: false,
  alumni_events: false,
};

// Permission sets for different user types
const PERMISSION_SETS = {
  student: {
    view_personal_dashboard: true,
    view_college_branding: true,
    view_submit_assignments: true,
    view_grades: true,
    view_attendance: true,
    join_forums: true,
    view_fees: true,
    make_payments: true,
    request_certificates: true,
    apply_hostel: true,
    facility_requests: true,
    support_tickets: true,
    view_clubs: true,
  },
  teacher: {
    view_personal_dashboard: true,
    view_college_branding: true,
    view_submit_assignments: true,
    review_assignments: true,
    view_grades: true,
    assign_grades: true,
    mark_attendance: true,
    view_attendance: true,
    upload_materials: true,
    join_forums: true,
    view_fees: true,
    review_fees: true,
    request_certificates: true,
    facility_requests: true,
    support_tickets: true,
    manage_clubs: true,
  },
  parent: {
    view_personal_dashboard: true,
    view_college_branding: true,
    view_child_grades: true,
    view_child_attendance: true,
    view_child_fees: true,
    make_child_payments: true,
    support_tickets: true,
  },
  alumni: {
    view_personal_dashboard: true,
    view_college_branding: true,
    join_forums: true,
    request_certificates: true,
    alumni_contributions: true,
    alumni_events: true,
    support_tickets: true,
  },
};

export const usePermissions = () => {
  const [permissions, setPermissions] = useState<UserPermissions>(DEFAULT_PERMISSIONS);
  const [userType, setUserType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserPermissions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // Get user profile to determine user type
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('user_type')
          .eq('id', user.id)
          .single();

        if (!profile) {
          setLoading(false);
          return;
        }

        const userTypeKey = profile.user_type === 'faculty' ? 'teacher' : profile.user_type;
        setUserType(profile.user_type);

        // Get permissions for user type
        const userPermissions = PERMISSION_SETS[userTypeKey as keyof typeof PERMISSION_SETS];
        if (userPermissions) {
          setPermissions({ ...DEFAULT_PERMISSIONS, ...userPermissions });
        }
      } catch (error) {
        console.error('Error loading user permissions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserPermissions();
  }, []);

  return { permissions, userType, loading };
};
