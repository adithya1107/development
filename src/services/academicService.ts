import { supabase } from '@/integrations/supabase/client';

/**
 * Academic Service
 * Handles course grades, CGPA calculations, and related academic operations
 */

/**
 * Recalculate course grade for a specific student
 * POST /api/courses/:courseId/students/:studentId/recalculate-grade
 */
export async function recalculateCourseGrade(courseId: string, studentId: string) {
  const { data, error } = await supabase.rpc('calculate_course_marks', {
    p_student_id: studentId,
    p_course_id: courseId
  });
  
  if (error) throw error;
  return data;
}

/**
 * Recalculate CGPA for a specific student
 * POST /api/students/:studentId/recalculate-cgpa
 */
export async function recalculateCGPA(studentId: string, collegeId: string) {
  const { error } = await supabase.rpc('update_student_cgpa', {
    p_student_id: studentId,
    p_college_id: collegeId
  });
  
  if (error) throw error;
  return { success: true };
}
