-- 1. Custom Types
CREATE TYPE public.user_role AS ENUM ('student', 'lecturer', 'registrar_admin', 'public_applicant');

-- 2. Schema Definition

-- Users (mirrors auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.user_role NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Function to get the current user's role securely
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- Departments
CREATE TABLE public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE
);

-- Programs
CREATE TABLE public.programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE NOT NULL,
    total_credits_required INTEGER NOT NULL,
    duration_semesters INTEGER NOT NULL
);

-- Semesters
CREATE TABLE public.semesters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    start_date DATE NOT NULL,
    end_date DATE GENERATED ALWAYS AS (start_date + interval '4 months') STORED,
    grading_opens_at TIMESTAMPTZ NOT NULL,
    grading_closes_at TIMESTAMPTZ GENERATED ALWAYS AS ((start_date + interval '4 months')::timestamp with time zone) STORED,
    is_active BOOLEAN DEFAULT false NOT NULL
);

-- Students
CREATE TABLE public.students (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    admission_no TEXT UNIQUE NOT NULL,
    program_id UUID REFERENCES public.programs(id) ON DELETE RESTRICT NOT NULL,
    cohort TEXT NOT NULL,
    status TEXT NOT NULL -- e.g., active, suspended, graduated
);

-- Course Offerings
CREATE TABLE public.course_offerings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id TEXT NOT NULL, 
    semester_id UUID REFERENCES public.semesters(id) ON DELETE CASCADE NOT NULL,
    lecturer_id UUID REFERENCES public.users(id) ON DELETE RESTRICT NOT NULL,
    capacity INTEGER NOT NULL
);

-- Enrollments
CREATE TABLE public.enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(user_id) ON DELETE CASCADE NOT NULL,
    course_offering_id UUID REFERENCES public.course_offerings(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL, -- e.g., enrolled, dropped
    UNIQUE(student_id, course_offering_id)
);

-- Grades
CREATE TABLE public.grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID REFERENCES public.enrollments(id) ON DELETE CASCADE UNIQUE NOT NULL,
    ca_score NUMERIC(5,2),
    exam_score NUMERIC(5,2),
    final_grade TEXT,
    entered_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    locked BOOLEAN DEFAULT false NOT NULL,
    entered_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Academic Progress
CREATE TABLE public.academic_progress (
    student_id UUID REFERENCES public.students(user_id) ON DELETE CASCADE NOT NULL,
    semester_id UUID REFERENCES public.semesters(id) ON DELETE CASCADE NOT NULL,
    semester_gpa NUMERIC(3,2),
    cumulative_gpa NUMERIC(3,2),
    credits_earned INTEGER,
    credits_attempted INTEGER,
    standing TEXT,
    computed_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY (student_id, semester_id)
);

-- Fee Accounts
CREATE TABLE public.fee_accounts (
    student_id UUID REFERENCES public.students(user_id) ON DELETE CASCADE NOT NULL,
    semester_id UUID REFERENCES public.semesters(id) ON DELETE RESTRICT NOT NULL,
    invoiced_amount NUMERIC(10,2) DEFAULT 0 NOT NULL,
    paid_amount NUMERIC(10,2) DEFAULT 0 NOT NULL,
    balance NUMERIC(10,2) GENERATED ALWAYS AS (invoiced_amount - paid_amount) STORED,
    PRIMARY KEY (student_id, semester_id)
);

-- Payments
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fee_account_id_student UUID NOT NULL,
    fee_account_id_semester UUID NOT NULL,
    FOREIGN KEY (fee_account_id_student, fee_account_id_semester) REFERENCES public.fee_accounts(student_id, semester_id) ON DELETE RESTRICT,
    mpesa_ref TEXT UNIQUE NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    status TEXT NOT NULL,
    received_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Admissions Apps
CREATE TABLE public.admissions_apps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    applicant_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    program_id UUID REFERENCES public.programs(id) ON DELETE RESTRICT NOT NULL,
    status TEXT NOT NULL,
    submitted_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    applicant_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- Documents
CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    signed_url_expires_at TIMESTAMPTZ
);

-- Audit Log
CREATE TABLE public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT now() NOT NULL
);


-- 3. Indexes for FKs and Filters
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_programs_department_id ON public.programs(department_id);
CREATE INDEX idx_students_program_id ON public.students(program_id);
CREATE INDEX idx_students_status ON public.students(status);
CREATE INDEX idx_students_admission_no ON public.students(admission_no);
CREATE INDEX idx_course_offerings_semester_id ON public.course_offerings(semester_id);
CREATE INDEX idx_course_offerings_lecturer_id ON public.course_offerings(lecturer_id);
CREATE INDEX idx_enrollments_student_id ON public.enrollments(student_id);
CREATE INDEX idx_enrollments_course_offering_id ON public.enrollments(course_offering_id);
CREATE INDEX idx_enrollments_status ON public.enrollments(status);
CREATE INDEX idx_grades_entered_by ON public.grades(entered_by);
CREATE INDEX idx_academic_progress_semester_id ON public.academic_progress(semester_id);
CREATE INDEX idx_fee_accounts_semester_id ON public.fee_accounts(semester_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_admissions_apps_program_id ON public.admissions_apps(program_id);
CREATE INDEX idx_admissions_apps_status ON public.admissions_apps(status);
CREATE INDEX idx_documents_owner_id ON public.documents(owner_id);
CREATE INDEX idx_audit_log_actor_id ON public.audit_log(actor_id);
CREATE INDEX idx_audit_log_table_name_record_id ON public.audit_log(table_name, record_id);


-- 4. Row Level Security (RLS) setup
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admissions_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;


-- 5. RLS Policies

-- Public / General read access for marketing
CREATE POLICY "Public can read departments" ON public.departments FOR SELECT USING (true);
CREATE POLICY "Public can read programs" ON public.programs FOR SELECT USING (true);
CREATE POLICY "Public can read active semesters" ON public.semesters FOR SELECT USING (is_active = true);

-- Users Table
CREATE POLICY "Users can read own row" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Registrar can read all users" ON public.users FOR SELECT USING (public.get_my_role() = 'registrar_admin');
CREATE POLICY "Registrar can insert users" ON public.users FOR INSERT WITH CHECK (public.get_my_role() = 'registrar_admin');
CREATE POLICY "Registrar can update users" ON public.users FOR UPDATE USING (public.get_my_role() = 'registrar_admin');

-- Students Table
CREATE POLICY "Students can read own student record" ON public.students FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Registrar can manage students" ON public.students FOR ALL USING (public.get_my_role() = 'registrar_admin');

-- Course Offerings
CREATE POLICY "Lecturers can read own offerings" ON public.course_offerings FOR SELECT USING (auth.uid() = lecturer_id);
CREATE POLICY "Students can read all offerings" ON public.course_offerings FOR SELECT USING (public.get_my_role() = 'student');
CREATE POLICY "Registrar can manage offerings" ON public.course_offerings FOR ALL USING (public.get_my_role() = 'registrar_admin');

-- Enrollments
CREATE POLICY "Students can read own enrollments" ON public.enrollments FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Lecturers can read roster for own courses" ON public.enrollments FOR SELECT USING (
    course_offering_id IN (SELECT id FROM public.course_offerings WHERE lecturer_id = auth.uid())
);
CREATE POLICY "Registrar can manage enrollments" ON public.enrollments FOR ALL USING (public.get_my_role() = 'registrar_admin');

-- Grades
CREATE POLICY "Students can read own grades" ON public.grades FOR SELECT USING (
    enrollment_id IN (SELECT id FROM public.enrollments WHERE student_id = auth.uid())
);
CREATE POLICY "Lecturers can read grades for their courses" ON public.grades FOR SELECT USING (
    enrollment_id IN (
        SELECT e.id FROM public.enrollments e 
        JOIN public.course_offerings co ON e.course_offering_id = co.id 
        WHERE co.lecturer_id = auth.uid()
    )
);
CREATE POLICY "Lecturers can insert/update grades in window" ON public.grades FOR ALL USING (
    -- Check that they are the lecturer of the course
    enrollment_id IN (
        SELECT e.id FROM public.enrollments e 
        JOIN public.course_offerings co ON e.course_offering_id = co.id 
        WHERE co.lecturer_id = auth.uid()
    )
    -- Check grading window
    AND EXISTS (
        SELECT 1 FROM public.enrollments e
        JOIN public.course_offerings co ON e.course_offering_id = co.id
        JOIN public.semesters s ON co.semester_id = s.id
        WHERE e.id = grades.enrollment_id
        AND now() >= s.grading_opens_at 
        AND now() <= s.grading_closes_at
    )
    -- Cannot edit if locked
    AND locked = false
);
CREATE POLICY "Registrar can manage grades" ON public.grades FOR ALL USING (public.get_my_role() = 'registrar_admin');

-- Academic Progress
CREATE POLICY "Students can read own progress" ON public.academic_progress FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Registrar can manage progress" ON public.academic_progress FOR ALL USING (public.get_my_role() = 'registrar_admin');

-- Fee Accounts
CREATE POLICY "Students can read own fees" ON public.fee_accounts FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Registrar can manage fees" ON public.fee_accounts FOR ALL USING (public.get_my_role() = 'registrar_admin');

-- Payments
CREATE POLICY "Students can read own payments" ON public.payments FOR SELECT USING (
    fee_account_id_student = auth.uid()
);
CREATE POLICY "Registrar can manage payments" ON public.payments FOR ALL USING (public.get_my_role() = 'registrar_admin');

-- Admissions Apps
CREATE POLICY "Applicants can read own apps" ON public.admissions_apps FOR SELECT USING (applicant_user_id = auth.uid());
CREATE POLICY "Applicants can insert apps" ON public.admissions_apps FOR INSERT WITH CHECK (
    applicant_user_id = auth.uid() OR applicant_user_id IS NULL
);
CREATE POLICY "Registrar can manage apps" ON public.admissions_apps FOR ALL USING (public.get_my_role() = 'registrar_admin');

-- Documents
CREATE POLICY "Users can read own documents" ON public.documents FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Registrar can manage documents" ON public.documents FOR ALL USING (public.get_my_role() = 'registrar_admin');

-- Audit Log
-- Only registrar can read audit log. Inserts are typically handled by triggers, but we can allow registrar inserts (or edge function inserts).
CREATE POLICY "Registrar can manage audit log" ON public.audit_log FOR ALL USING (public.get_my_role() = 'registrar_admin');

-- 6. Triggers
-- Enforce audit logging for Registrar modifications to grades
CREATE OR REPLACE FUNCTION public.audit_grade_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only log if the actor is registrar_admin and they are making changes
    IF public.get_my_role() = 'registrar_admin' THEN
        INSERT INTO public.audit_log (actor_id, action, table_name, record_id)
        VALUES (auth.uid(), TG_OP, 'grades', COALESCE(NEW.id, OLD.id));
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER audit_grades_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.grades
FOR EACH ROW EXECUTE FUNCTION public.audit_grade_changes();
