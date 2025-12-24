import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

interface CollegeData {
  id: string;
  code: string;
  name: string;
  logo: string;
  primary_color: string;
  secondary_color: string;
}

const MultiStepLogin = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [collegeCode, setCollegeCode] = useState('');
  const [userCode, setUserCode] = useState('');
  const [password, setPassword] = useState('');
  const [collegeData, setCollegeData] = useState<CollegeData | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Signup form data
  const [signupData, setSignupData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    userType: 'student' as 'student' | 'faculty' | 'parent' | 'alumni' | 'super_admin' | 'staff',
    customUserCode: '',
    generatePassword: '',
    confirmPassword: ''
  });

  // Set up auth state listener
  useEffect(() => {
    let mounted = true;

    // Check for existing session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session && mounted) {
        // User is already logged in, redirect them
        console.log('Existing session found, redirecting...');
        await handleAuthenticatedUser(session.user);
      }
    };

    checkSession();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('Login page - Auth event:', event);
        
        // If user just signed in, handle redirect
        if (session?.user && event === 'SIGNED_IN') {
          await handleAuthenticatedUser(session.user);
        }
        
        // If user signed out, reset form and stay on login page
        if (event === 'SIGNED_OUT') {
          console.log('User signed out, resetting form');
          resetForm();
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleAuthenticatedUser = async (user: User) => {
    try {
      // Get user profile data from user_profiles table
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error || !profile) {
        console.error('Error fetching user profile:', error);
        toast({
          title: 'Profile Error',
          description: 'Could not load user profile. Please contact support.',
          variant: 'destructive',
        });
        return;
      }

      // Store user data in sessionStorage
      const userData = {
        user_id: profile.id,
        user_type: profile.user_type,
        first_name: profile.first_name,
        last_name: profile.last_name,
        college_id: profile.college_id,
        user_code: profile.user_code,
        email: profile.email
      };

      sessionStorage.setItem('colcord_user', JSON.stringify(userData));

      // Check onboarding status
      const { data: onboarding } = await supabase
        .from('user_onboarding')
        .select('password_reset_required')
        .eq('user_id', user.id)
        .maybeSingle();

      // If password reset is required, go to first-login
      if (onboarding?.password_reset_required) {
        console.log('Password reset required, redirecting to first-login');
        navigate('/first-login', { replace: true });
        return;
      }

      // Otherwise, redirect to appropriate dashboard
      const userRoutes = {
        'student': '/student',
        'faculty': '/teacher',
        'admin': '/admin',
        'super_admin': '/admin',
        'parent': '/parent',
        'alumni': '/alumni'
      };

      const route = userRoutes[profile.user_type as keyof typeof userRoutes] || '/student';
      console.log('Redirecting to:', route);
      navigate(route, { replace: true });
    } catch (error) {
      console.error('Error handling authenticated user:', error);
      toast({
        title: 'Error',
        description: 'An error occurred during login. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleCollegeCodeSubmit = async () => {
    if (!collegeCode) {
      toast({
        title: 'College Code Required',
        description: 'Please enter your college code',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.rpc('get_college_by_code', { college_code: collegeCode });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({
          title: 'Invalid College Code',
          description: 'No college found with this code',
          variant: 'destructive',
        });
        return;
      }

      setCollegeData(data[0] as CollegeData);
      setStep(2);
    } catch (error) {
      console.error('College code validation error:', error);
      toast({
        title: 'College Code Error',
        description: 'Failed to validate college code. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserCodeSubmit = async () => {
    if (!userCode) {
      toast({
        title: 'User Code Required',
        description: 'Please enter your user code',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Get user email using the new secure function
      const { data, error } = await supabase.rpc('get_user_email', {
        college_code: collegeData?.code || '',
        user_code: userCode
      });

      if (error) throw error;

      const userResult = data?.[0];

      if (!userResult?.email) {
        toast({
          title: 'Invalid User Code',
          description: 'This user code does not exist in this college',
          variant: 'destructive',
        });
        return;
      }

      setUserEmail(userResult.email);
      setStep(3);
    } catch (error) {
      console.error('User code validation error:', error);
      toast({
        title: 'User Code Error',
        description: 'Failed to validate user code. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!password) {
      toast({
        title: 'Password Required',
        description: 'Please enter your password',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Sign in with email and password
      const { data, error } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: password,
      });

      if (error) {
        console.error('Login error:', error);
        toast({
          title: 'Login Failed',
          description: error.message || 'Invalid credentials. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      if (data.user) {
        console.log('Login successful');
        // handleAuthenticatedUser will be called by the auth state change listener
        toast({
          title: 'Login Successful',
          description: 'Welcome back!',
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: 'Login Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async () => {
    // Validate all fields
    if (!signupData.firstName || !signupData.lastName || !signupData.email) {
      toast({
        title: 'Required Fields',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    if (!signupData.customUserCode) {
      toast({
        title: 'User Code Required',
        description: 'Please enter a user code',
        variant: 'destructive',
      });
      return;
    }

    if (signupData.generatePassword !== signupData.confirmPassword) {
      toast({
        title: 'Password Mismatch',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    if (signupData.generatePassword.length < 6) {
      toast({
        title: 'Weak Password',
        description: 'Password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Check if user code already exists
      const { data: existingUser } = await supabase
        .from('user_profiles')
        .select('user_code')
        .eq('user_code', signupData.customUserCode)
        .eq('college_id', collegeData?.id)
        .maybeSingle();

      if (existingUser) {
        toast({
          title: 'User Code Taken',
          description: 'This user code is already in use. Please choose another.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.generatePassword,
        options: {
          data: {
            first_name: signupData.firstName,
            last_name: signupData.lastName,
          }
        }
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

      // Create user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: authData.user.id,
          first_name: signupData.firstName,
          last_name: signupData.lastName,
          email: signupData.email,
          user_type: signupData.userType,
          user_code: signupData.customUserCode,
          college_id: collegeData?.id,
        });

      if (profileError) throw profileError;

      // Create onboarding record
      const { error: onboardingError } = await supabase
        .from('user_onboarding')
        .insert({
          user_id: authData.user.id,
          password_reset_required: false,
          first_login_completed: true,
          onboarding_completed: true,
        });

      if (onboardingError) throw onboardingError;

      toast({
        title: 'Account Created',
        description: 'Your account has been created successfully!',
      });

      // The auth state listener will handle the redirect
    } catch (error: any) {
      console.error('Signup error:', error);
      toast({
        title: 'Signup Failed',
        description: error.message || 'Failed to create account. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setCollegeCode('');
    setUserCode('');
    setPassword('');
    setCollegeData(null);
    setUserEmail('');
    setSignupData({
      firstName: '',
      lastName: '',
      email: '',
      userType: 'student',
      customUserCode: '',
      generatePassword: '',
      confirmPassword: ''
    });
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    resetForm();
  };

  const handleSkipLogin = (role: 'admin' | 'teacher' | 'student') => {
    // Create mock user data for development/testing
    const mockUserData = {
      user_id: `mock-${role}-id`,
      user_type: role === 'teacher' ? 'faculty' : role,
      first_name: role === 'admin' ? 'Admin' : role === 'teacher' ? 'Teacher' : 'Student',
      last_name: 'User',
      college_id: 'mock-college-id',
      user_code: `${role.toUpperCase()}001`,
      email: `${role}@example.com`
    };

    // Store mock user data in sessionStorage
    sessionStorage.setItem('colcord_user', JSON.stringify(mockUserData));

    // Navigate to appropriate dashboard
    const routes = {
      'admin': '/admin',
      'teacher': '/teacher',
      'student': '/student',
      'parent': '/parent',
      'alumni': '/alumni'
    };

    navigate(routes[role]);
    
    toast({
      title: 'Development Mode',
      description: `Logged in as ${role} for testing purposes`,
    });
  };

  return (
    <div className="h-screen overflow-hidden bg-background flex items-center justify-center px-3 sm:px-4 md:px-6">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
      
      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-6 md:px-0">
        {/* Hero Section - Compact for mobile */}
<div className="text-center mb-4 sm:mb-6 animate-fade-in-up min-h-[140px] flex flex-col justify-center overflow-visible">
  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2 sm:mb-3 whitespace-nowrap px-2">
    {collegeData ? collegeData.name : 'ColCord'}
  </h1>

  <div className="mt-3 sm:mt-4 h-[24px] flex items-center justify-center space-x-2">
    {step > 1 && (
      <>
        <div className="h-0.5 w-6 sm:w-8 bg-primary"></div>
        <span className="text-[10px] sm:text-xs text-muted-foreground font-medium whitespace-nowrap">
          STEP {step - 1} OF 2
        </span>
        <div className="h-0.5 w-6 sm:w-8 bg-white-10"></div>
      </>
    )}
  </div>
</div>




        <Card className="border-border bg-card backdrop-blur-sm shadow-lg overflow-hidden w-full">
          <div className="h-[88px] flex items-center justify-center border-b border-border">
            <h3 className="text-xl text-center text-card-foreground font-semibold px-4">
              {!isSignUp ? (
                <>
                  {step === 1 && 'College Access'}
                  {step === 2 && 'User Verification'}
                  {step === 3 && 'Secure Login'}
                </>
              ) : (
                <>
                  {step === 1 && 'Select College'}
                  {step === 2 && 'Create Account'}
                </>
              )}
            </h3>
          </div>

          <div className="h-[240px] px-6 pt-6 pb-4 flex flex-col">

            {!isSignUp && step === 1 && (
              <div className="flex flex-col h-full">
                <div className="flex flex-col gap-2 mb-4">
                  <Label htmlFor="collegeCode" className="text-base font-medium text-foreground h-[24px] flex items-center">
                    College Code
                  </Label>
                  <Input
                    id="collegeCode"
                    placeholder="Enter your college code"
                    type="text"
                    value={collegeCode}
                    onChange={(e) => setCollegeCode(e.target.value.toUpperCase())}
                    autoFocus
                    onKeyPress={(e) => e.key === 'Enter' && handleCollegeCodeSubmit()}
                    className="bg-input border-border text-foreground placeholder:text-muted-foreground focus-ring h-11 text-base w-full"
                  />
                </div>
                <Button 
                  onClick={handleCollegeCodeSubmit} 
                  disabled={isLoading}
                  className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-all duration-300 hover-scale focus-ring text-base mb-2"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                      <span>Validating...</span>
                    </div>
                  ) : 'Continue'}
                </Button>
                <div className="h-10 w-full" />
              </div>
            )}

            {!isSignUp && step === 2 && (
              <div className="flex flex-col h-full">
                <div className="flex flex-col gap-2 mb-4">
                  <Label htmlFor="userCode" className="text-base font-medium text-foreground h-[24px] flex items-center">
                    User Code
                  </Label>
                  <Input
                    id="userCode"
                    placeholder="Enter your user code"
                    type="text"
                    value={userCode}
                    onChange={(e) => setUserCode(e.target.value)}
                    autoFocus
                    onKeyPress={(e) => e.key === 'Enter' && handleUserCodeSubmit()}
                    className="bg-input border-border text-foreground placeholder:text-muted-foreground focus-ring h-11 text-base w-full"
                  />
                </div>
                <Button 
                  onClick={handleUserCodeSubmit} 
                  disabled={isLoading}
                  className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-all duration-300 hover-scale focus-ring text-base"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                      <span>Validating...</span>
                    </div>
                  ) : 'Continue'}
                </Button>
                <Button 
                  onClick={() => setStep(1)} 
                  variant="ghost"
                  className="w-full text-base h-10"
                >
                  Back
                </Button>
              </div>
            )}

            {!isSignUp && step === 3 && (
              <div className="flex flex-col h-full">
                <div className="flex flex-col gap-2 mb-4">
                  <Label htmlFor="password" className="text-base font-medium text-foreground h-[24px] flex items-center">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      placeholder="Enter your password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoFocus
                      onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                      className="bg-input border-border text-foreground placeholder:text-muted-foreground focus-ring h-11 text-base w-full pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                          <line x1="1" y1="1" x2="23" y2="23"></line>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <Button 
                  onClick={handleLogin} 
                  disabled={isLoading}
                  className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-all duration-300 hover-scale focus-ring text-base"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                      <span>Logging in...</span>
                    </div>
                  ) : 'Access Portal'}
                </Button>
                <Button 
                  onClick={() => setStep(2)} 
                  variant="ghost"
                  className="w-full text-base h-10"
                >
                  Back
                </Button>
              </div>
            )}
          </div>
          
          {/* Footer section with fixed height */}
          <div className="h-[72px] px-6 flex items-center justify-center border-t border-border">
            <div className="text-center">
              <a 
                href="https://colcord.co.in/contact" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300 underline-offset-4 hover:underline focus-ring rounded-sm inline-block"
              >
                Need assistance? Contact support
              </a>
            </div>
          </div>
        </Card>

        {/* Footer */}
        <div className="text-center mt-3 sm:mt-4 md:mt-6 px-2">
          <p className="text-[10px] sm:text-xs md:text-sm text-white-40">
            Powered by ColCord • Secure • Reliable • Indian
          </p>
        </div>
      </div>
    </div>
  );
};

export default MultiStepLogin;