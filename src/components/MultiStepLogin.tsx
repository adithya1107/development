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
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  
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
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
  async (event, session) => {
    setSession(session);
    setUser(session?.user ?? null);
    
    // If user is authenticated, fetch their profile and redirect
    if (session?.user && event === 'SIGNED_IN') {
      await handleAuthenticatedUser(session.user);
    }
  }
);

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
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

      // Store user data for legacy compatibility
      const userData = {
        user_id: profile.id,
        user_type: profile.user_type,
        first_name: profile.first_name,
        last_name: profile.last_name,
        college_id: profile.college_id,
        user_code: profile.user_code,
        email: profile.email
      };

      localStorage.setItem('colcord_user', JSON.stringify(userData));

      // Redirect based on user type
      const userRoutes = {
        'student': '/student',
        'faculty': '/teacher',
        'teacher': '/teacher',
        'admin': '/admin',
        'super_admin': '/admin',
        'parent': '/parent',
        'alumni': '/alumni'
      };

      const route = userRoutes[profile.user_type as keyof typeof userRoutes] || '/student';
      navigate(route);
    } catch (error) {
      console.error('Error handling authenticated user:', error);
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

    if (!userEmail) {
      toast({
        title: 'Error',
        description: 'User email not found. Please start over.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Use Supabase auth with email and password
      const { data, error } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: password
      });

      if (error) {
        console.error('Login error:', error);
        
        // Handle specific auth errors
        if (error.message.includes('Invalid login credentials')) {
          toast({
            title: 'Login Failed',
            description: 'Invalid password. Please check your credentials.',
            variant: 'destructive',
          });
        } else if (error.message.includes('Email not confirmed')) {
          toast({
            title: 'Email Not Confirmed',
            description: 'Please check your email and confirm your account.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Login Error',
            description: error.message || 'An error occurred during login.',
            variant: 'destructive',
          });
        }
        return;
      }

      if (data.user) {
        toast({
          title: 'Login Successful',
          description: 'Welcome back! Redirecting to your dashboard...',
        });
        // Auth state change will handle the redirect
      }
    } catch (error) {
      console.error('Unexpected login error:', error);
      toast({
        title: 'Login Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupSubmit = async () => {
    // Validation
    if (!signupData.firstName || !signupData.lastName || !signupData.email) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    if (!signupData.customUserCode) {
      toast({
        title: 'User Code Required',
        description: 'Please enter your preferred user code',
        variant: 'destructive',
      });
      return;
    }

    if (!signupData.generatePassword || signupData.generatePassword.length < 6) {
      toast({
        title: 'Password Too Short',
        description: 'Password must be at least 6 characters long',
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

    if (!collegeData) {
      toast({
        title: 'College Not Selected',
        description: 'Please go back and select a college',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Check if user code already exists
      const { data: existingUser, error: checkError } = await supabase.rpc('get_user_email', {
        college_code: collegeData.code,
        user_code: signupData.customUserCode
      });

      if (checkError) throw checkError;

      if (existingUser && existingUser[0]?.user_exists) {
        toast({
          title: 'User Code Taken',
          description: 'This user code is already in use. Please choose another.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Create the user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.generatePassword,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            college_id: collegeData.id,
            user_code: signupData.customUserCode,
            user_type: signupData.userType,
            first_name: signupData.firstName,
            last_name: signupData.lastName
          }
        }
      });

      if (authError) {
        console.error('Signup auth error:', authError);
        
        if (authError.message.includes('User already registered')) {
          toast({
            title: 'Email Already Registered',
            description: 'This email is already registered. Please use the login option.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Signup Error',
            description: authError.message || 'An error occurred during signup.',
            variant: 'destructive',
          });
        }
        return;
      }

      if (authData.user) {
        toast({
          title: 'Signup Successful!',
          description: 'Please check your email to confirm your account, then you can login.',
        });
        
        // Reset form and switch to login mode
        setIsSignUp(false);
        setStep(1);
        setSignupData({
          firstName: '',
          lastName: '',
          email: '',
          userType: 'student',
          customUserCode: '',
          generatePassword: '',
          confirmPassword: ''
        });
        setCollegeCode('');
        setUserCode('');
        setPassword('');
        setCollegeData(null);
        setUserEmail('');
      }
    } catch (error) {
      console.error('Unexpected signup error:', error);
      toast({
        title: 'Signup Error',
        description: 'An unexpected error occurred. Please try again.',
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

    // Store mock user data
    localStorage.setItem('colcord_user', JSON.stringify(mockUserData));

    // Navigate to appropriate dashboard
    const routes = {
      'admin': '/admin',
      'teacher': '/teacher',
      'student': '/student'
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
      
      <div className="elative z-10 w-full max-w-md mx-auto px-4 sm:px-6 md:px-0">
        {/* Hero Section - Compact for mobile */}
        <div className="text-center mb-4 sm:mb-6 animate-fade-in-up">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2 sm:mb-3 break-words px-2">
            {collegeData ? collegeData.name : 'ColCord'}
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground px-2">
            Built for India. Global Standards.
          </p>
          {step > 1 && (
            <div className="mt-3 sm:mt-4 flex items-center justify-center space-x-2">
              <div className="h-0.5 w-6 sm:w-8 bg-primary"></div>
              <span className="text-[10px] sm:text-xs text-muted-foreground font-medium whitespace-nowrap">
                STEP {step} OF 3
              </span>
              <div className="h-0.5 w-6 sm:w-8 bg-white-10"></div>
            </div>
          )}
        </div>

        <Card className="border-border bg-card backdrop-blur-sm shadow-lg overflow-hidden">
          <CardHeader className="pb-3 sm:pb-4 pt-4 sm:pt-5">
            <CardTitle className="text-lg sm:text-xl md:text-2xl text-center text-card-foreground font-semibold">
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
            </CardTitle>
          </CardHeader>
          

          <CardContent className="px-4 sm:px-6 md:px-8 pb-4 sm:pb-6">

            {!isSignUp && step === 1 && (
              <div className="space-y-4 sm:space-y-5 animate-fade-in">
                <div className="space-y-2">
                  <Label htmlFor="collegeCode" className="text-sm sm:text-base font-medium text-foreground">
                    College Code
                  </Label>
                  <Input
                    id="collegeCode"
                    placeholder="Enter your college code"
                    type="text"
                    value={collegeCode}
                    onChange={(e) => setCollegeCode(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleCollegeCodeSubmit()}
                    className="bg-input border-border text-foreground placeholder:text-muted-foreground focus-ring h-10 sm:h-11 text-sm sm:text-base w-full"
                  />
                </div>
                <Button 
                  onClick={handleCollegeCodeSubmit} 
                  disabled={isLoading}
                  className="w-full h-11 sm:h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-all duration-300 hover-scale focus-ring text-sm sm:text-base"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                      <span>Validating...</span>
                    </div>
                  ) : 'Continue'}
                </Button>
              </div>
            )}

            {!isSignUp && step === 2 && (
              <div className="space-y-4 sm:space-y-5 animate-fade-in">
                <div className="space-y-2">
                  <Label htmlFor="userCode" className="text-sm sm:text-base font-medium text-foreground">
                    User Code
                  </Label>
                  <Input
                    id="userCode"
                    placeholder="Enter your user code"
                    type="text"
                    value={userCode}
                    onChange={(e) => setUserCode(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleUserCodeSubmit()}
                    className="bg-input border-border text-foreground placeholder:text-muted-foreground focus-ring h-10 sm:h-11 text-sm sm:text-base w-full"
                  />
                </div>
                <Button 
                  onClick={handleUserCodeSubmit} 
                  disabled={isLoading}
                  className="w-full h-11 sm:h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-all duration-300 hover-scale focus-ring text-sm sm:text-base"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                      <span>Validating...</span>
                    </div>
                  ) : 'Continue'}
                </Button>
              </div>
            )}

            {!isSignUp && step === 3 && (
              <div className="space-y-4 sm:space-y-5 animate-fade-in">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm sm:text-base font-medium text-foreground">
                    Password
                  </Label>
                  <Input
                    id="password"
                    placeholder="Enter your password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                    className="bg-input border-border text-foreground placeholder:text-muted-foreground focus-ring h-10 sm:h-11 text-sm sm:text-base w-full"
                  />
                </div>
                <Button 
                  onClick={handleLogin} 
                  disabled={isLoading}
                  className="w-full h-11 sm:h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-all duration-300 hover-scale focus-ring text-sm sm:text-base"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                      <span>Logging in...</span>
                    </div>
                  ) : 'Access Portal'}
                </Button>
              </div>
            )}

            {/* Signup Flow */}
            {/* {isSignUp && step === 1 && (
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-2">
                  <Label htmlFor="signupCollegeCode" className="text-sm font-medium text-foreground">
                    College Code
                  </Label>
                  <Input
                    id="signupCollegeCode"
                    placeholder="Enter your college code"
                    type="text"
                    value={collegeCode}
                    onChange={(e) => setCollegeCode(e.target.value)}
                    className="bg-input border-border text-foreground placeholder:text-muted-foreground focus-ring"
                  />
                </div>
                <Button 
                  onClick={handleCollegeCodeSubmit} 
                  disabled={isLoading}
                  className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-all duration-300 hover-scale focus-ring"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                      <span>Validating...</span>
                    </div>
                  ) : 'Continue'}
                </Button>
              </div>
            )}

            {isSignUp && step === 2 && (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm font-medium text-foreground">
                      First Name
                    </Label>
                    <Input
                      id="firstName"
                      placeholder="First name"
                      type="text"
                      value={signupData.firstName}
                      onChange={(e) => setSignupData({...signupData, firstName: e.target.value})}
                      className="bg-input border-border text-foreground placeholder:text-muted-foreground focus-ring"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm font-medium text-foreground">
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      placeholder="Last name"
                      type="text"
                      value={signupData.lastName}
                      onChange={(e) => setSignupData({...signupData, lastName: e.target.value})}
                      className="bg-input border-border text-foreground placeholder:text-muted-foreground focus-ring"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-foreground">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    placeholder="your.email@example.com"
                    type="email"
                    value={signupData.email}
                    onChange={(e) => setSignupData({...signupData, email: e.target.value})}
                    className="bg-input border-border text-foreground placeholder:text-muted-foreground focus-ring"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="userType" className="text-sm font-medium text-foreground">
                    User Type
                  </Label>
                  <Select value={signupData.userType} onValueChange={(value: any) => setSignupData({...signupData, userType: value})}>
                    <SelectTrigger className="bg-input border-border text-foreground focus-ring">
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="faculty">Faculty</SelectItem>
                      <SelectItem value="parent">Parent</SelectItem>
                      <SelectItem value="alumni">Alumni</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customUserCode" className="text-sm font-medium text-foreground">
                    Custom User Code
                  </Label>
                  <Input
                    id="customUserCode"
                    placeholder="Choose your user code (e.g., JOHN2024)"
                    type="text"
                    value={signupData.customUserCode}
                    onChange={(e) => setSignupData({...signupData, customUserCode: e.target.value.toUpperCase()})}
                    className="bg-input border-border text-foreground placeholder:text-muted-foreground focus-ring"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="generatePassword" className="text-sm font-medium text-foreground">
                      Password
                    </Label>
                    <Input
                      id="generatePassword"
                      placeholder="Password"
                      type="password"
                      value={signupData.generatePassword}
                      onChange={(e) => setSignupData({...signupData, generatePassword: e.target.value})}
                      className="bg-input border-border text-foreground placeholder:text-muted-foreground focus-ring"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                      Confirm Password
                    </Label>
                    <Input
                      id="confirmPassword"
                      placeholder="Confirm password"
                      type="password"
                      value={signupData.confirmPassword}
                      onChange={(e) => setSignupData({...signupData, confirmPassword: e.target.value})}
                      className="bg-input border-border text-foreground placeholder:text-muted-foreground focus-ring"
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleSignupSubmit} 
                  disabled={isLoading}
                  className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-all duration-300 hover-scale focus-ring"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                      <span>Creating Account...</span>
                    </div>
                  ) : 'Create Account'}
                </Button>
              </div>
            )} */}
          </CardContent>
          
          {/* Footer section with fixed height */}
          <div className="px-4 sm:px-5 md:px-6 pb-4 sm:pb-5 md:pb-6 space-y-3 sm:space-y-4 flex-shrink-0">
            {/* Skip Login Buttons for Development */}
            {/* <div className="space-y-3">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-3">Development Mode - Skip Login</p>
                <div className="flex gap-2 justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSkipLogin('admin')}
                    className="text-xs"
                  >
                    Skip as Admin
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSkipLogin('teacher')}
                    className="text-xs"
                  >
                    Skip as Teacher
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSkipLogin('student')}
                    className="text-xs"
                  >
                    Skip as Student
                  </Button>
                </div>
              </div>
              
              <div className="text-center">
                <Button
                  variant="ghost"
                  onClick={toggleMode}
                  className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                >
                  {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign up"}
                </Button>
              </div>
            </div>
             */}
            <div className="text-center">
              <a 
                href="https://colcord.co.in/contact" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs sm:text-sm md:text-base text-muted-foreground hover:text-foreground transition-colors duration-300 underline-offset-4 hover:underline focus-ring rounded-sm inline-block"
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