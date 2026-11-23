-- ==============================================================================
-- TECHHIRE / HIRE-PLACIO PRODUCTION SUPABASE DATABASE SCHEMA
-- Complies fully with specifications 5.1 through 23
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Helper Functions
CREATE OR REPLACE FUNCTION public.is_admin(uid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE user_id = uid AND is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. PROFILES TABLE (Candidate profile)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    profile_photo_path TEXT,
    date_of_birth DATE,
    gender TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'India',
    pincode TEXT,
    linkedin_url TEXT,
    github_url TEXT,
    portfolio_url TEXT,
    leetcode_url TEXT,
    hackerrank_url TEXT,
    bio TEXT,
    profile_completion INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 4. EDUCATION TABLE
CREATE TABLE IF NOT EXISTS public.education (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    education_level TEXT NOT NULL,
    degree TEXT,
    branch TEXT,
    specialization TEXT,
    institution TEXT NOT NULL,
    university TEXT,
    start_year INT,
    end_year INT,
    percentage NUMERIC(5,2),
    cgpa NUMERIC(4,2),
    is_current BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_education_user_id ON public.education(user_id);

-- 5. EXPERIENCE TABLE
CREATE TABLE IF NOT EXISTS public.experience (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    job_title TEXT NOT NULL,
    employment_type TEXT,
    location TEXT,
    start_date DATE,
    end_date DATE,
    is_current BOOLEAN DEFAULT FALSE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_experience_user_id ON public.experience(user_id);

-- 6. SKILLS & CANDIDATE SKILLS
CREATE TABLE IF NOT EXISTS public.skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.candidate_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
    proficiency TEXT CHECK (proficiency IN ('Beginner', 'Intermediate', 'Advanced', 'Expert')),
    years_of_experience NUMERIC(4,1) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_candidate_skills_user ON public.candidate_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_candidate_skills_skill ON public.candidate_skills(skill_id);

-- 7. PROJECTS TABLE
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_name TEXT NOT NULL,
    description TEXT,
    technologies TEXT,
    role TEXT,
    start_date DATE,
    end_date DATE,
    github_url TEXT,
    live_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);

-- 8. CERTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    certificate_name TEXT NOT NULL,
    issuer TEXT NOT NULL,
    issue_date DATE,
    expiry_date DATE,
    credential_id TEXT,
    credential_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_certifications_user_id ON public.certifications(user_id);

-- 9. CAREER PREFERENCES TABLE
CREATE TABLE IF NOT EXISTS public.candidate_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    desired_roles TEXT,
    job_types TEXT,
    preferred_locations TEXT,
    work_modes TEXT,
    minimum_salary NUMERIC,
    minimum_stipend NUMERIC,
    preferred_industries TEXT,
    willing_to_relocate BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_candidate_pref_user ON public.candidate_preferences(user_id);

-- 10. ADMIN USERS TABLE (Maximum 3 Active Admins)
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger to enforce maximum 3 active admins
CREATE OR REPLACE FUNCTION public.check_max_three_admins()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_active = TRUE THEN
        IF (SELECT COUNT(*) FROM public.admin_users WHERE is_active = TRUE AND email != NEW.email AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)) >= 3 THEN
            RAISE EXCEPTION 'Security Policy Violation: Maximum 3 active administrator accounts are permitted.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_max_three_admins ON public.admin_users;
CREATE TRIGGER trg_enforce_max_three_admins
    BEFORE INSERT OR UPDATE ON public.admin_users
    FOR EACH ROW
    EXECUTE FUNCTION public.check_max_three_admins();

-- 11. JOBS TABLE
CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    company_name TEXT NOT NULL,
    company_logo_path TEXT,
    description TEXT NOT NULL,
    responsibilities TEXT,
    requirements TEXT,
    job_type TEXT NOT NULL,
    work_mode TEXT NOT NULL,
    location TEXT NOT NULL,
    experience_required TEXT,
    salary_min NUMERIC,
    salary_max NUMERIC,
    stipend NUMERIC,
    industry TEXT,
    company_type TEXT,
    application_deadline DATE,
    openings INT DEFAULT 1,
    external_application_url TEXT,
    internal_application_enabled BOOLEAN DEFAULT TRUE,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'unpublished', 'closed', 'expired')),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_location ON public.jobs(location);
CREATE INDEX IF NOT EXISTS idx_jobs_work_mode ON public.jobs(work_mode);
CREATE INDEX IF NOT EXISTS idx_jobs_job_type ON public.jobs(job_type);

-- 12. JOB SKILLS
CREATE TABLE IF NOT EXISTS public.job_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
    is_required BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(job_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_job_skills_job ON public.job_skills(job_id);

-- 13. JOB EDUCATION REQUIREMENTS
CREATE TABLE IF NOT EXISTS public.job_education_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    education_level TEXT,
    degree TEXT,
    branch TEXT,
    specialization TEXT,
    minimum_cgpa NUMERIC(4,2),
    minimum_percentage NUMERIC(5,2),
    graduation_year_from INT,
    graduation_year_to INT,
    is_mandatory BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_edu_job ON public.job_education_requirements(job_id);

-- 14. APPLICATIONS TABLE (Duplicate Application Prevention via UNIQUE)
CREATE TABLE IF NOT EXISTS public.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    match_score NUMERIC(5,2) DEFAULT 0,
    match_status TEXT DEFAULT 'good_match' CHECK (match_status IN ('best_match', 'good_match', 'partial_match', 'low_match')),
    eligibility_status TEXT DEFAULT 'eligible' CHECK (eligibility_status IN ('eligible', 'not_eligible')),
    application_status TEXT DEFAULT 'submitted' CHECK (application_status IN ('submitted', 'under_review', 'shortlisted', 'interview', 'selected', 'rejected', 'withdrawn')),
    cover_note TEXT,
    applied_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_candidate_job_application UNIQUE(candidate_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_applications_candidate ON public.applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_applications_job ON public.applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(application_status);

-- 15. APPLICATION STATUS HISTORY
CREATE TABLE IF NOT EXISTS public.application_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_status_history ON public.application_status_history(application_id);

-- 16. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    related_job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
    related_application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read);

-- 17. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action, created_at);

-- 18. CONTACT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    company_or_organization TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'read', 'replied', 'archived')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_created ON public.contact_messages(created_at);

-- 19. AUTOMATIC UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND column_name = 'updated_at'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_set_updated_at ON public.%I', t);
        EXECUTE format('CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t);
    END LOOP;
END $$;

-- 20. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experience ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_education_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can read own profile or admin can read" ON public.profiles;
CREATE POLICY "Users can read own profile or admin can read" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- Education Policies
DROP POLICY IF EXISTS "Users can manage own education" ON public.education;
CREATE POLICY "Users can manage own education" ON public.education
    FOR ALL USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- Experience Policies
DROP POLICY IF EXISTS "Users can manage own experience" ON public.experience;
CREATE POLICY "Users can manage own experience" ON public.experience
    FOR ALL USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- Skills Policies
DROP POLICY IF EXISTS "Skills are readable by all authenticated users" ON public.skills;
CREATE POLICY "Skills are readable by all authenticated users" ON public.skills
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage skills" ON public.skills;
CREATE POLICY "Admins can manage skills" ON public.skills
    FOR ALL USING (public.is_admin(auth.uid()));

-- Candidate Skills Policies
DROP POLICY IF EXISTS "Users can manage own candidate skills" ON public.candidate_skills;
CREATE POLICY "Users can manage own candidate skills" ON public.candidate_skills
    FOR ALL USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- Projects Policies
DROP POLICY IF EXISTS "Users can manage own projects" ON public.projects;
CREATE POLICY "Users can manage own projects" ON public.projects
    FOR ALL USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- Certifications Policies
DROP POLICY IF EXISTS "Users can manage own certifications" ON public.certifications;
CREATE POLICY "Users can manage own certifications" ON public.certifications
    FOR ALL USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- Preferences Policies
DROP POLICY IF EXISTS "Users can manage own preferences" ON public.candidate_preferences;
CREATE POLICY "Users can manage own preferences" ON public.candidate_preferences
    FOR ALL USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- Jobs Policies
DROP POLICY IF EXISTS "Published jobs are viewable by everyone" ON public.jobs;
CREATE POLICY "Published jobs are viewable by everyone" ON public.jobs
    FOR SELECT USING (status = 'published' OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage jobs" ON public.jobs;
CREATE POLICY "Admins can manage jobs" ON public.jobs
    FOR ALL USING (public.is_admin(auth.uid()));

-- Job Skills Policies
DROP POLICY IF EXISTS "Job skills are viewable by everyone" ON public.job_skills;
CREATE POLICY "Job skills are viewable by everyone" ON public.job_skills
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage job skills" ON public.job_skills;
CREATE POLICY "Admins can manage job skills" ON public.job_skills
    FOR ALL USING (public.is_admin(auth.uid()));

-- Job Education Requirements Policies
DROP POLICY IF EXISTS "Job edu reqs are viewable by everyone" ON public.job_education_requirements;
CREATE POLICY "Job edu reqs are viewable by everyone" ON public.job_education_requirements
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage job edu reqs" ON public.job_education_requirements;
CREATE POLICY "Admins can manage job edu reqs" ON public.job_education_requirements
    FOR ALL USING (public.is_admin(auth.uid()));

-- Applications Policies
DROP POLICY IF EXISTS "Candidates can read own applications or admin can read" ON public.applications;
CREATE POLICY "Candidates can read own applications or admin can read" ON public.applications
    FOR SELECT USING (auth.uid() = candidate_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Candidates can create own applications" ON public.applications;
CREATE POLICY "Candidates can create own applications" ON public.applications
    FOR INSERT WITH CHECK (auth.uid() = candidate_id);

DROP POLICY IF EXISTS "Admins can update applications" ON public.applications;
CREATE POLICY "Admins can update applications" ON public.applications
    FOR UPDATE USING (public.is_admin(auth.uid()));

-- Application Status History Policies
DROP POLICY IF EXISTS "View application history" ON public.application_status_history;
CREATE POLICY "View application history" ON public.application_status_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.applications a
            WHERE a.id = application_id AND (a.candidate_id = auth.uid() OR public.is_admin(auth.uid()))
        )
    );

DROP POLICY IF EXISTS "Admins can insert status history" ON public.application_status_history;
CREATE POLICY "Admins can insert status history" ON public.application_status_history
    FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

-- Notifications Policies
DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
CREATE POLICY "Users can read own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Audit Logs Policies (Admins only)
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
    FOR SELECT USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.audit_logs;
CREATE POLICY "Admins can insert audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

-- Contact Messages Policies
DROP POLICY IF EXISTS "Anyone can submit contact message" ON public.contact_messages;
CREATE POLICY "Anyone can submit contact message" ON public.contact_messages
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view contact messages" ON public.contact_messages;
CREATE POLICY "Admins can view contact messages" ON public.contact_messages
    FOR SELECT USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update contact messages" ON public.contact_messages;
CREATE POLICY "Admins can update contact messages" ON public.contact_messages
    FOR UPDATE USING (public.is_admin(auth.uid()));

-- Admin Users Policies
DROP POLICY IF EXISTS "Admins can view admin users" ON public.admin_users;
CREATE POLICY "Admins can view admin users" ON public.admin_users
    FOR SELECT USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update admin users" ON public.admin_users;
CREATE POLICY "Admins can update admin users" ON public.admin_users
    FOR ALL USING (public.is_admin(auth.uid()));

-- 21. STORAGE BUCKETS INITIALIZATION
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('profile-photos', 'profile-photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('resumes', 'resumes', false, 10485760, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
    ('company-logos', 'company-logos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'])
ON CONFLICT (id) DO UPDATE 
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage Policies
DROP POLICY IF EXISTS "Candidate profile photos are publicly viewable" ON storage.objects;
CREATE POLICY "Candidate profile photos are publicly viewable" ON storage.objects
    FOR SELECT USING (bucket_id = 'profile-photos');

DROP POLICY IF EXISTS "Users can upload their own profile photo" ON storage.objects;
CREATE POLICY "Users can upload their own profile photo" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'profile-photos' AND 
        (auth.uid())::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Users can update their own profile photo" ON storage.objects;
CREATE POLICY "Users can update their own profile photo" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'profile-photos' AND 
        (auth.uid())::text = (storage.foldername(name))[1]
    );

-- Resumes Storage Policies (Private, only owner and admin)
DROP POLICY IF EXISTS "Users and admins can access resume" ON storage.objects;
CREATE POLICY "Users and admins can access resume" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'resumes' AND 
        ((auth.uid())::text = (storage.foldername(name))[1] OR public.is_admin(auth.uid()))
    );

DROP POLICY IF EXISTS "Users can upload their own resume" ON storage.objects;
CREATE POLICY "Users can upload their own resume" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'resumes' AND 
        (auth.uid())::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Users can update their own resume" ON storage.objects;
CREATE POLICY "Users can update their own resume" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'resumes' AND 
        (auth.uid())::text = (storage.foldername(name))[1]
    );

-- Company Logos Storage Policies (Public view, Admin upload)
DROP POLICY IF EXISTS "Company logos are publicly viewable" ON storage.objects;
CREATE POLICY "Company logos are publicly viewable" ON storage.objects
    FOR SELECT USING (bucket_id = 'company-logos');

DROP POLICY IF EXISTS "Admins can upload company logos" ON storage.objects;
CREATE POLICY "Admins can upload company logos" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'company-logos' AND public.is_admin(auth.uid())
    );

DROP POLICY IF EXISTS "Admins can update company logos" ON storage.objects;
CREATE POLICY "Admins can update company logos" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'company-logos' AND public.is_admin(auth.uid())
    );

-- 22. DEFAULT SEED DATA
-- Default Authorized Admins (Max 3)
INSERT INTO public.admin_users (email, name, is_active)
VALUES 
    ('sahilshaikhcse@gmail.com', 'Sahil Shaikh', true),
    ('admin@placiobridge.com', 'System Admin', true),
    ('ceo@placiobridge.com', 'Executive Office', true)
ON CONFLICT (email) DO UPDATE 
SET name = EXCLUDED.name, is_active = EXCLUDED.is_active;

-- Default Common Skills
INSERT INTO public.skills (name, category)
VALUES
    ('JavaScript', 'Frontend'),
    ('TypeScript', 'Frontend'),
    ('React', 'Frontend'),
    ('Next.js', 'Frontend'),
    ('Node.js', 'Backend'),
    ('Express', 'Backend'),
    ('Python', 'Backend'),
    ('Django', 'Backend'),
    ('Java', 'Backend'),
    ('Spring Boot', 'Backend'),
    ('PostgreSQL', 'Database'),
    ('MongoDB', 'Database'),
    ('MySQL', 'Database'),
    ('Git & GitHub', 'DevOps'),
    ('Docker', 'DevOps'),
    ('AWS', 'Cloud'),
    ('HTML/CSS', 'Frontend'),
    ('Tailwind CSS', 'Frontend'),
    ('REST APIs', 'Backend'),
    ('Data Structures & Algorithms', 'Core CS')
ON CONFLICT (name) DO NOTHING;
