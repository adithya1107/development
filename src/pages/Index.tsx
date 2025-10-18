
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import MultiStepLogin from '@/components/MultiStepLogin';
import { Button } from '@/components/ui/button';
import { setupMockData, setupMockAdmin, setupMockParent, clearMockData } from '@/utils/mockData';

// Default college configuration
const DEFAULT_COLLEGE_CONFIG = {
  code: "COLCORD",
  name: "College Coordination System",
  logo: "🎓",
  primary_color: "#2563eb",
  secondary_color: "#1d4ed8"
};

const Index = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // Check if user is already authenticated with Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);

        if (session?.user) {
          // User is authenticated, they'll be redirected by NavigationWrapper
          // based on their profile data
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <MultiStepLogin />
  );
};

export default Index;
