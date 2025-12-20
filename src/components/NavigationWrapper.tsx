import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface NavigationWrapperProps {
  children: React.ReactNode;
}

const USER_ROUTE_MAP = {
  'student': '/student',
  'faculty': '/teacher',
  'admin': '/admin',
  'parent': '/parent',
  'alumni': '/alumni'
} as const;

const NavigationWrapper = ({ children }: NavigationWrapperProps) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const handleSession = async (session: any) => {
      if (!mounted) return;

      // No session - redirect to login if needed
      if (!session) {
        sessionStorage.removeItem('colcord_user');
        localStorage.removeItem('colcord_user');
        
        if (window.location.pathname !== '/') {
          navigate('/', { replace: true });
        }
        setIsLoading(false);
        return;
      }

      // Has session - get profile
      try {
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('user_type, id, first_name, last_name, email, college_id, user_code')
          .eq('id', session.user.id)
          .single();

        if (error || !profile) {
          console.error('Profile fetch error:', error);
          await supabase.auth.signOut();
          return;
        }

        // Save to session
        sessionStorage.setItem('colcord_user', JSON.stringify({
          user_id: profile.id,
          user_type: profile.user_type,
          first_name: profile.first_name,
          last_name: profile.last_name,
          college_id: profile.college_id,
          user_code: profile.user_code,
          email: profile.email
        }));

        // Check if password reset needed
        const { data: onboarding } = await supabase
          .from('user_onboarding')
          .select('password_reset_required')
          .eq('user_id', session.user.id)
          .single();

        const targetRoute = USER_ROUTE_MAP[profile.user_type as keyof typeof USER_ROUTE_MAP];
        const currentPath = window.location.pathname;

        // Only redirect from login page
        if (currentPath === '/') {
          if (onboarding?.password_reset_required) {
            navigate('/first-login', { replace: true });
          } else if (targetRoute) {
            navigate(targetRoute, { replace: true });
          }
        } else if (currentPath === '/first-login' && !onboarding?.password_reset_required && targetRoute) {
          navigate(targetRoute, { replace: true });
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error:', err);
        await supabase.auth.signOut();
      }
    };

    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event);
      
      if (event === 'SIGNED_OUT') {
        sessionStorage.removeItem('colcord_user');
        localStorage.removeItem('colcord_user');
        navigate('/', { replace: true });
        setIsLoading(false);
      } else if (event === 'SIGNED_IN') {
        handleSession(session);
      } else if (event === 'TOKEN_REFRESHED') {
        // Just update session data, don't redirect
        if (session) {
          supabase
            .from('user_profiles')
            .select('user_type, id, first_name, last_name, email, college_id, user_code')
            .eq('id', session.user.id)
            .single()
            .then(({ data: profile }) => {
              if (profile) {
                sessionStorage.setItem('colcord_user', JSON.stringify({
                  user_id: profile.id,
                  user_type: profile.user_type,
                  first_name: profile.first_name,
                  last_name: profile.last_name,
                  college_id: profile.college_id,
                  user_code: profile.user_code,
                  email: profile.email
                }));
              }
            });
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // Empty deps - runs once

  // Show loader while checking auth (but not on login page)
  if (isLoading && window.location.pathname !== '/') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default NavigationWrapper;