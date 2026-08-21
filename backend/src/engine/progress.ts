import { supabase } from '../services/supabase';

// Map letter grades to points
const gradePoints: Record<string, number> = {
  'A': 4.0,
  'A-': 3.7,
  'B+': 3.3,
  'B': 3.0,
  'B-': 2.7,
  'C+': 2.3,
  'C': 2.0,
  'C-': 1.7,
  'D+': 1.3,
  'D': 1.0,
  'F': 0.0,
};

export const runAcademicProgressEngine = async () => {
  console.log('Running Academic Progress Engine...');

  // 1. Fetch all active semesters
  const { data: semesters, error: semError } = await supabase
    .from('semesters')
    .select('id, grading_closes_at, is_active')
    .eq('is_active', true);

  if (semError) throw semError;

  let totalProcessed = 0;

  for (const semester of semesters) {
    // 2. Fetch all enrollments for courses in this semester that have grades
    // We need to calculate GPA for every student who was enrolled this semester.
    const { data: enrollments, error: enrollError } = await supabase
      .from('enrollments')
      .select(`
        student_id,
        status,
        course_offerings (
          semester_id
        ),
        grades (
          final_grade,
          locked
        )
      `)
      .eq('course_offerings.semester_id', semester.id);

    if (enrollError) throw enrollError;

    // Group by student
    const studentGrades = new Map<string, any[]>();
    for (const enr of enrollments) {
      if (enr.course_offerings && enr.grades) {
        if (!studentGrades.has(enr.student_id)) {
          studentGrades.set(enr.student_id, []);
        }
        studentGrades.get(enr.student_id)?.push(enr.grades);
      }
    }

    // 3. Compute GPA per student
    for (const [studentId, grades] of studentGrades.entries()) {
      let semesterPoints = 0;
      let semesterCredits = 0; // assuming each course is 3 credits for this mock

      for (const grade of grades) {
        if (grade.final_grade && gradePoints[grade.final_grade] !== undefined) {
          semesterPoints += (gradePoints[grade.final_grade] * 3);
          semesterCredits += 3;
        }
      }

      const semesterGPA = semesterCredits > 0 ? (semesterPoints / semesterCredits) : 0;
      
      // Calculate standing (placeholder logic: > 2.0 = Good Standing)
      const standing = semesterGPA >= 2.0 ? 'Good Standing' : 'Academic Probation';

      // 4. Upsert academic progress
      await supabase
        .from('academic_progress')
        .upsert({
          student_id: studentId,
          semester_id: semester.id,
          semester_gpa: semesterGPA.toFixed(2),
          // for cumulative we would need to fetch all history, omitting for MVP
          cumulative_gpa: semesterGPA.toFixed(2), 
          credits_attempted: semesterCredits,
          credits_earned: semesterCredits,
          standing: standing,
          computed_at: new Date().toISOString()
        }, { onConflict: 'student_id, semester_id' });

      totalProcessed++;
    }

    // 5. If semester grading window is closed, lock all grades
    const now = new Date();
    const closesAt = new Date(semester.grading_closes_at);
    
    if (now > closesAt) {
      // Lock grades for all enrollments in this semester
      // Note: Supabase JS doesn't easily support deeply nested updates without RPC,
      // so we can use a simpler approach or an RPC call.
      // For this MVP, we rely on the RLS policy which already prevents updates after grading_closes_at.
      console.log(`Semester ${semester.id} grading window closed.`);
    }
  }

  console.log(`Academic Progress Engine complete. Processed ${totalProcessed} records.`);
  return { processed: totalProcessed };
};
