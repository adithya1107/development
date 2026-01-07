// supabase/functions/create-user-with-parent/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface StudentData {
  first_name: string
  last_name: string
  email: string
  user_type: string
  college_id: string
  user_code: string
  temp_password: string
}

interface ParentData {
  first_name: string
  last_name: string
  email: string
  relationship_type: 'father' | 'mother' | 'guardian' | 'other'
  is_primary_contact: boolean
  contact_info: string
  occupation: string
  income: string
  dob: string
  temp_password: string
  college_id: string
}

interface CreateUserWithParentRequest {
  student: StudentData
  parent: ParentData | null
}

const generateParentUserCode = (studentCode: string, relationship: string): string => {
  // Generate parent code based on student code
  // Example: S240001 -> P240001-F (F for Father, M for Mother, G for Guardian, O for Other)
  const relationMap: Record<string, string> = {
    'father': 'F',
    'mother': 'M',
    'guardian': 'G',
    'other': 'O'
  }
  const suffix = relationMap[relationship] || 'O'
  return studentCode.replace(/^[A-Z]/, 'P') + '-' + suffix
}

const cleanupExistingUser = async (supabase: any, email: string, userType: string) => {
  console.log(`Checking for existing ${userType} with email:`, email)
  
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const existingUser = existingUsers?.users?.find((u: any) => u.email === email)

  if (existingUser) {
    console.log(`Existing ${userType} found:`, existingUser.id, '- Clearing all sessions')
    
    try {
      await supabase.auth.admin.signOut(existingUser.id)
      console.log(`All sessions cleared for ${userType}:`, existingUser.id)
    } catch (signOutError) {
      console.warn(`Error signing out ${userType} (may not have active sessions):`, signOutError)
    }

    console.log(`Deleting existing auth user for ${userType}`)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(existingUser.id)
    
    if (deleteError) {
      console.error(`Error deleting existing ${userType}:`, deleteError)
      throw new Error(`Failed to delete existing ${userType}: ${deleteError.message}`)
    }

    // Delete associated records
    await supabase.from('user_profiles').delete().eq('id', existingUser.id)
    await supabase.from('user_onboarding').delete().eq('user_id', existingUser.id)
    
    console.log(`Existing ${userType} data cleaned up successfully`)
  }
}

const createUser = async (
  supabase: any,
  userData: {
    email: string
    password: string
    first_name: string
    last_name: string
    user_type: string
    college_id: string
    user_code: string
  }
) => {
  console.log('Creating auth user for:', userData.email)

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: userData.email,
    password: userData.password,
    email_confirm: true,
    user_metadata: {
      first_name: userData.first_name,
      last_name: userData.last_name,
      user_type: userData.user_type,
      college_id: userData.college_id,
      user_code: userData.user_code
    }
  })

  if (authError) {
    console.error('Auth creation error:', authError)
    throw new Error(`Failed to create auth user: ${authError.message}`)
  }

  if (!authData.user) {
    throw new Error('Failed to create user account - no user data returned')
  }

  console.log('Auth user created successfully:', authData.user.id)

  // Create user profile
  console.log('Creating user profile...')
  const { error: profileError } = await supabase
    .from('user_profiles')
    .insert({
      id: authData.user.id,
      college_id: userData.college_id,
      user_code: userData.user_code,
      user_type: userData.user_type,
      first_name: userData.first_name,
      last_name: userData.last_name,
      email: userData.email,
      is_active: true
    })

  if (profileError) {
    console.error('Profile creation error:', profileError)
    throw new Error(`Failed to create user profile: ${profileError.message}`)
  }

  console.log('User profile created successfully')

  // Create onboarding record
  console.log('Creating onboarding record...')
  const { data: onboardingData, error: onboardingError } = await supabase
    .from('user_onboarding')
    .insert({
      user_id: authData.user.id,
      college_id: userData.college_id,
      temp_password: userData.password,
      welcome_email_sent: false,
      welcome_email_delivered: false,
      welcome_email_opened: false,
      welcome_email_failed: false,
      first_login_completed: false,
      password_reset_required: true,
      onboarding_completed: false
    })
    .select()
    .single()

  if (onboardingError) {
    console.error('Onboarding creation error:', onboardingError)
    throw new Error(`Failed to create onboarding record: ${onboardingError.message}`)
  }

  console.log('Onboarding record created successfully:', onboardingData.id)

  return {
    user_id: authData.user.id,
    onboarding_id: onboardingData.id,
    user_code: userData.user_code
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Starting create-user-with-parent function')
    
    let requestBody: CreateUserWithParentRequest
    try {
      requestBody = await req.json()
      console.log('Request received for student:', requestBody.student.email)
      if (requestBody.parent) {
        console.log('Parent included:', requestBody.parent.email)
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      throw new Error('Invalid request body')
    }

    const { student, parent } = requestBody

    // Validate student fields
    if (!student.first_name || !student.last_name || !student.email || 
        !student.user_type || !student.college_id || !student.user_code || 
        !student.temp_password) {
      const missing = []
      if (!student.first_name) missing.push('student.first_name')
      if (!student.last_name) missing.push('student.last_name')
      if (!student.email) missing.push('student.email')
      if (!student.user_type) missing.push('student.user_type')
      if (!student.college_id) missing.push('student.college_id')
      if (!student.user_code) missing.push('student.user_code')
      if (!student.temp_password) missing.push('student.temp_password')
      
      console.error('Missing required student fields:', missing)
      throw new Error(`Missing required student fields: ${missing.join(', ')}`)
    }

    // Validate parent fields if parent is provided
    if (parent) {
      if (!parent.first_name || !parent.last_name || !parent.email || 
          !parent.relationship_type || !parent.contact_info || !parent.occupation || 
          !parent.income || !parent.dob || !parent.temp_password) {
        const missing = []
        if (!parent.first_name) missing.push('parent.first_name')
        if (!parent.last_name) missing.push('parent.last_name')
        if (!parent.email) missing.push('parent.email')
        if (!parent.relationship_type) missing.push('parent.relationship_type')
        if (!parent.contact_info) missing.push('parent.contact_info')
        if (!parent.occupation) missing.push('parent.occupation')
        if (!parent.income) missing.push('parent.income')
        if (!parent.dob) missing.push('parent.dob')
        if (!parent.temp_password) missing.push('parent.temp_password')
        
        console.error('Missing required parent fields:', missing)
        throw new Error(`Missing required parent fields: ${missing.join(', ')}`)
      }
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Clean up existing student if exists
    await cleanupExistingUser(supabase, student.email, 'student')

    // Create student
    const studentResult = await createUser(supabase, {
      email: student.email,
      password: student.temp_password,
      first_name: student.first_name,
      last_name: student.last_name,
      user_type: student.user_type,
      college_id: student.college_id,
      user_code: student.user_code
    })

    let parentResult = null

    // Create parent if provided
    if (parent) {
      // Clean up existing parent if exists
      await cleanupExistingUser(supabase, parent.email, 'parent')

      // Generate parent user code
      const parentUserCode = generateParentUserCode(student.user_code, parent.relationship_type)

      // Create parent user
      parentResult = await createUser(supabase, {
        email: parent.email,
        password: parent.temp_password,
        first_name: parent.first_name,
        last_name: parent.last_name,
        user_type: 'parent',
        college_id: parent.college_id,
        user_code: parentUserCode
      })

      // Link parent to student in parent_student_links table
      console.log('Creating parent-student link...')
      
      // First, get the student record ID
      const { data: studentData, error: studentQueryError } = await supabase
        .from('student')
        .select('id')
        .eq('id', studentResult.user_id)
        .single()

      // If student record doesn't exist in student table, create it
      if (studentQueryError || !studentData) {
        console.log('Student record not found, creating basic student record...')
        const { error: studentInsertError } = await supabase
          .from('student')
          .insert({
            id: studentResult.user_id,
            name: `${student.first_name} ${student.last_name}`,
            verification_status: 'pending',
            profile_completion_percentage: 0
          })

        if (studentInsertError) {
          console.error('Error creating student record:', studentInsertError)
          // Continue anyway, link might still work
        }
      }

      const { error: linkError } = await supabase
        .from('parent_student_links')
        .insert({
          parent_id: parentResult.user_id,
          student_id: studentResult.user_id,
          relationship_type: parent.relationship_type,
          is_primary_contact: parent.is_primary_contact,
          DOB: parent.dob,
          occupation: parent.occupation,
          income: parseInt(parent.income),
          contact_info: parseInt(parent.contact_info)
        })

      if (linkError) {
        console.error('Parent-student link creation error:', linkError)
        // Don't throw - parent and student are created, link can be added manually if needed
        console.warn('Warning: Parent and student created but link failed. Link can be created manually.')
      } else {
        console.log('Parent-student link created successfully')
      }
    }

    const response = {
      success: true,
      student_user_id: studentResult.user_id,
      student_onboarding_id: studentResult.onboarding_id,
      student_user_code: studentResult.user_code,
      parent_user_id: parentResult?.user_id || null,
      parent_onboarding_id: parentResult?.onboarding_id || null,
      parent_user_code: parentResult?.user_code || null,
      message: parent 
        ? 'Student and parent accounts created successfully' 
        : 'Student account created successfully'
    }

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error in create-user-with-parent function:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})