-- ============================================================================
-- Migration 03: Admin Management, Recruiter Profiles, Analytics & Job Extensions
-- Placio-Hire: PlacioBridge Student Jobs Platform
-- ============================================================================

-- 1. COMPANIES TABLE
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    logo_url TEXT,
    website TEXT,
    industry TEXT DEFAULT 'Information Technology',
    company_type TEXT DEFAULT 'Product',
    location TEXT DEFAULT 'Pune, Maharashtra',
    description TEXT,
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure all columns exist if the table was created previously with fewer columns
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Seed primary company (PlacioBridge) safely
INSERT INTO public.companies (name, website, industry, company_type, location, description, verified)
SELECT 
    'PlacioBridge Technologies LLP',
    'https://placiobridge.com',
    'Information Technology',
    'Product & Services',
    'Pune, Maharashtra',
    'Premier campus placement and tech recruitment platform connecting ambitious engineering students with high-growth companies.',
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.companies WHERE name = 'PlacioBridge Technologies LLP'
);

-- 2. EXTEND JOBS TABLE
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS posting_date TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS application_opening_date TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS application_closing_date TIMESTAMPTZ;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS application_method TEXT DEFAULT 'both' CHECK (application_method IN ('internal', 'external', 'both'));
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS salary_period TEXT DEFAULT 'Annual' CHECK (salary_period IN ('Annual', 'Monthly', 'Weekly', 'Hourly'));
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS qualification TEXT DEFAULT 'BE / B.Tech / BCA / MCA / M.Tech';
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS eligible_branches TEXT DEFAULT 'Computer Engineering, Information Technology, AI & DS';
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS min_cgpa NUMERIC(4,2) DEFAULT 6.0;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS is_expired BOOLEAN DEFAULT false;

-- Backfill posting dates for existing jobs
UPDATE public.jobs SET posting_date = created_at WHERE posting_date IS NULL;
UPDATE public.jobs SET application_opening_date = created_at WHERE application_opening_date IS NULL;

-- 3. STUDENT PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.student_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    enrollment_number TEXT,
    college_name TEXT,
    degree TEXT DEFAULT 'B.Tech',
    branch TEXT DEFAULT 'Computer Engineering',
    graduation_year INT DEFAULT 2026,
    current_cgpa NUMERIC(4,2) DEFAULT 7.5,
    active_backlogs INT DEFAULT 0,
    profile_visibility TEXT DEFAULT 'public' CHECK (profile_visibility IN ('public', 'recruiters_only', 'private')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. TEACHER PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.teacher_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    department TEXT,
    institution TEXT,
    designation TEXT,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. RECRUITER PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.recruiter_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    company_name TEXT NOT NULL,
    designation TEXT,
    corporate_email TEXT,
    verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. RECRUITER PROFILE VIEWS TABLE (Tracking & Security)
CREATE TABLE IF NOT EXISTS public.recruiter_profile_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recruiter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
    viewed_at TIMESTAMPTZ DEFAULT now()
);

-- 7. SAVED JOBS TABLE
CREATE TABLE IF NOT EXISTS public.saved_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, job_id)
);

-- 8. ADMIN ACTIVITY LOGS TABLE
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    admin_email TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_companies_name ON public.companies(name);
CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON public.jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_is_expired ON public.jobs(is_expired);
CREATE INDEX IF NOT EXISTS idx_jobs_application_deadline ON public.jobs(application_deadline);
CREATE INDEX IF NOT EXISTS idx_student_profiles_user ON public.student_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_student_profiles_degree ON public.student_profiles(degree);
CREATE INDEX IF NOT EXISTS idx_recruiter_views_candidate ON public.recruiter_profile_views(candidate_id);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_user ON public.saved_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_created ON public.admin_activity_logs(created_at DESC);

-- 10. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruiter_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruiter_profile_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- Companies: Public Read, Admin Manage
DROP POLICY IF EXISTS "Public can view companies" ON public.companies;
CREATE POLICY "Public can view companies" ON public.companies
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage companies" ON public.companies;
CREATE POLICY "Admins can manage companies" ON public.companies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE admin_users.user_id = auth.uid() AND admin_users.is_active = true
        )
    );

-- Student Profiles: Owner manage, Recruiters & Admins read if visibility permits
DROP POLICY IF EXISTS "Students can manage own profile" ON public.student_profiles;
CREATE POLICY "Students can manage own profile" ON public.student_profiles
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Recruiters and admins can view candidate profiles" ON public.student_profiles;
CREATE POLICY "Recruiters and admins can view candidate profiles" ON public.student_profiles
    FOR SELECT USING (
        profile_visibility = 'public'
        OR auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE admin_users.user_id = auth.uid() AND admin_users.is_active = true
        )
        OR EXISTS (
            SELECT 1 FROM public.recruiter_profiles
            WHERE recruiter_profiles.user_id = auth.uid() AND recruiter_profiles.verification_status = 'approved'
        )
    );

-- Recruiter Profiles: Own manage, Admins manage all
DROP POLICY IF EXISTS "Recruiters manage own profile" ON public.recruiter_profiles;
CREATE POLICY "Recruiters manage own profile" ON public.recruiter_profiles
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins view all recruiters" ON public.recruiter_profiles;
CREATE POLICY "Admins view all recruiters" ON public.recruiter_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE admin_users.user_id = auth.uid() AND admin_users.is_active = true
        )
    );

-- Saved Jobs: Owner only
DROP POLICY IF EXISTS "Users can manage saved jobs" ON public.saved_jobs;
CREATE POLICY "Users can manage saved jobs" ON public.saved_jobs
    FOR ALL USING (auth.uid() = user_id);

-- Recruiter Profile Views: Recruiters can insert, candidates can see who viewed them, admins can view all
DROP POLICY IF EXISTS "Recruiters log views" ON public.recruiter_profile_views;
CREATE POLICY "Recruiters log views" ON public.recruiter_profile_views
    FOR INSERT WITH CHECK (auth.uid() = recruiter_id);

DROP POLICY IF EXISTS "Candidates and Admins view audit of profile views" ON public.recruiter_profile_views;
CREATE POLICY "Candidates and Admins view audit of profile views" ON public.recruiter_profile_views
    FOR SELECT USING (
        auth.uid() = candidate_id
        OR auth.uid() = recruiter_id
        OR EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE admin_users.user_id = auth.uid() AND admin_users.is_active = true
        )
    );

-- Admin Activity Logs: Strict Admin-Only Access
DROP POLICY IF EXISTS "Admins read activity logs" ON public.admin_activity_logs;
CREATE POLICY "Admins read activity logs" ON public.admin_activity_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE admin_users.user_id = auth.uid() AND admin_users.is_active = true
        )
    );

DROP POLICY IF EXISTS "Admins insert activity logs" ON public.admin_activity_logs;
CREATE POLICY "Admins insert activity logs" ON public.admin_activity_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE admin_users.user_id = auth.uid() AND admin_users.is_active = true
        )
    );

-- 11. AUTOMATED EXPIRED JOBS TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.check_and_mark_expired_jobs()
RETURNS void AS $$
BEGIN
    UPDATE public.jobs
    SET is_expired = true, status = 'expired', updated_at = now()
    WHERE application_deadline IS NOT NULL
      AND application_deadline < CURRENT_DATE
      AND status NOT IN ('expired', 'closed');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
