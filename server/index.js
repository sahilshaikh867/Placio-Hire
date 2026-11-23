import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import dotenv from 'dotenv';
import { supabase } from './supabaseClient.js';
import { query } from './db.js';
import { calculateJobMatch } from './matchingEngine.js';
import { emailService } from './emailService.js';
import { captchaService } from './captchaService.js';
import { teamService } from './teamService.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 8080;

// Security: Disable express fingerprinting & configure defensive HTTP headers
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Security: Controlled Origin Whitelisting for CORS
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:3000',
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  'https://placiobridge.com'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Cross-Origin Request Blocked by Placio-Hire Security Policy.'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Security: Bounded payload size limits against DoS attacks
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Memory-safe sliding window rate limiting helper
function createRateLimiter({ windowMs, maxRequests, message }) {
  const tracker = new Map();

  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of tracker.entries()) {
      if (now > record.resetTime) {
        tracker.delete(key);
      }
    }
  }, 120000).unref();

  return (req, res, next) => {
    const clientKey = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    const record = tracker.get(clientKey);
    if (!record || now > record.resetTime) {
      tracker.set(clientKey, { count: 1, resetTime: now + windowMs });
      return next();
    }

    record.count += 1;
    if (record.count > maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
      res.setHeader('Retry-After', retryAfterSeconds);
      return res.status(429).json({
        error: message || `Too many requests. Please retry in ${retryAfterSeconds} seconds.`
      });
    }

    next();
  };
}

const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  message: 'Too many login attempts. Please wait 15 minutes before trying again.'
});

const registerRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  message: 'Registration rate limit exceeded. Please try again later.'
});

const contactRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  message: 'Contact inquiry rate limit exceeded. Please wait a few minutes before submitting another inquiry.'
});

const otpIpRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  message: 'Too many OTP requests from this network. Please wait a few minutes.'
});

// In-memory rate limiting and OTP cooldowns
const otpCooldowns = new Map();
const otpAttempts = new Map();

// Helper: Calculate Candidate Profile Completion
function calculateProfileCompletion(profile, education = [], experience = [], skills = [], projects = [], certs = [], preferences = {}) {
  let score = 0;
  // Personal Info (20%)
  if (profile.full_name && profile.email && profile.phone) score += 20;
  else if (profile.full_name && profile.email) score += 10;

  // Education (15%)
  if (education.length > 0) score += 15;

  // Experience (15%)
  if (experience.length > 0) score += 15;

  // Skills (15%)
  if (skills.length > 0) score += 15;

  // Projects (15%)
  if (projects.length > 0) score += 15;

  // Certifications (5%)
  if (certs.length > 0) score += 5;

  // Resume (10%)
  if (profile.profile_photo_path || profile.resume_path) score += 10;

  // Career Preferences (5%)
  if (preferences && (preferences.desired_roles || preferences.job_types)) score += 5;

  return Math.min(100, Math.max(0, score));
}

// Helper: Log Admin Audit
async function createAuditLog(adminUserId, action, entityType, entityId, oldData = null, newData = null) {
  try {
    await query(
      `INSERT INTO public.audit_logs (admin_user_id, action, entity_type, entity_id, old_data, new_data)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [adminUserId || null, action, entityType, String(entityId || ''), oldData ? JSON.stringify(oldData) : null, newData ? JSON.stringify(newData) : null]
    );
  } catch (err) {
    console.error('[AUDIT LOG ERROR]', err.message);
  }
}

// -----------------------------------------------------------------------------
// AUTHENTICATION & AUTHORIZATION MIDDLEWARE
// -----------------------------------------------------------------------------
async function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      req.user = null;
      return next();
    }

    // Check if user is an authorized admin in database
    const adminCheck = await query(
      `SELECT * FROM public.admin_users WHERE (user_id = $1 OR email = $2) AND is_active = TRUE`,
      [user.id, user.email]
    );

    const isAdmin = adminCheck.rows.length > 0;
    const role = isAdmin ? 'admin' : 'candidate';

    // If admin has no user_id bound yet, bind it
    if (isAdmin && !adminCheck.rows[0].user_id) {
      await query(
        `UPDATE public.admin_users SET user_id = $1 WHERE email = $2`,
        [user.id, user.email]
      );
    }

    // Fetch candidate profile
    const profileRes = await query(
      `SELECT * FROM public.profiles WHERE user_id = $1`,
      [user.id]
    );

    req.user = {
      id: user.id,
      email: user.email,
      role,
      profile: profileRes.rows[0] || null
    };

    next();
  } catch (err) {
    console.error('[AUTH MIDDLEWARE ERROR]', err.message);
    req.user = null;
    next();
  }
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Active administrator authorization required.' });
  }
  next();
}

app.use(authenticateUser);

// Multer in-memory storage for Supabase Storage uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// -----------------------------------------------------------------------------
// 1. CANDIDATE & GENERAL AUTHENTICATION
// -----------------------------------------------------------------------------

// Candidate / General OTP Request
app.post('/api/auth/request-otp', otpIpRateLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email address is required.' });
  }

  // Rate Limiting & Cooldown (60 seconds)
  const now = Date.now();
  const lastRequest = otpCooldowns.get(email) || 0;
  if (now - lastRequest < 60000) {
    const remaining = Math.ceil((60000 - (now - lastRequest)) / 1000);
    return res.status(429).json({ error: `Please wait ${remaining} seconds before requesting a new OTP.` });
  }

  try {
    // Generate single-use Supabase magic link / OTP
    const linkRes = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email.trim().toLowerCase()
    });

    if (linkRes.error) {
      return res.status(400).json({ error: linkRes.error.message });
    }

    otpCooldowns.set(email, now);
    const otpCode = linkRes.data?.properties?.email_otp || '';

    // Send OTP via emailService
    await emailService.sendOtp({ email, otp: otpCode, role: 'candidate' });

    res.json({
      ok: true,
      message: 'Single-use OTP sent to your email address.',
      cooldownSeconds: 60,
      devOtp: process.env.NODE_ENV !== 'production' ? otpCode : undefined
    });
  } catch (err) {
    console.error('[OTP REQUEST ERROR]', err);
    res.status(500).json({ error: 'Failed to process OTP request.' });
  }
});

// Candidate / General OTP Verify
app.post('/api/auth/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP code are required.' });
  }

  try {
    const verifyRes = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: otp.trim(),
      type: 'email'
    });

    if (verifyRes.error || !verifyRes.data?.session) {
      return res.status(400).json({ error: verifyRes.error?.message || 'Invalid or expired OTP code.' });
    }

    const { user, session } = verifyRes.data;

    // Check admin status
    const adminCheck = await query(
      `SELECT * FROM public.admin_users WHERE (user_id = $1 OR email = $2) AND is_active = TRUE`,
      [user.id, user.email]
    );
    const role = adminCheck.rows.length > 0 ? 'admin' : 'candidate';

    // Ensure profile row exists
    let profileRes = await query(`SELECT * FROM public.profiles WHERE user_id = $1`, [user.id]);
    if (profileRes.rows.length === 0) {
      const ins = await query(
        `INSERT INTO public.profiles (user_id, email, full_name, profile_completion)
         VALUES ($1, $2, $3, 20)
         RETURNING *`,
        [user.id, user.email, user.user_metadata?.full_name || user.email.split('@')[0]]
      );
      profileRes = ins;
    }

    res.json({
      ok: true,
      token: session.access_token,
      user: {
        id: user.id,
        email: user.email,
        name: profileRes.rows[0].full_name,
        role,
        completionPercentage: profileRes.rows[0].profile_completion || 20
      }
    });
  } catch (err) {
    console.error('[OTP VERIFY ERROR]', err);
    res.status(500).json({ error: 'Verification failed.' });
  }
});

// Candidate Password Registration
app.post('/api/auth/register', registerRateLimiter, async (req, res) => {
  const { name, email, password } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Full name, email, and password are required.' });
  }

  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { full_name: name }
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Insert profile
    const prof = await query(
      `INSERT INTO public.profiles (user_id, email, full_name, profile_completion)
       VALUES ($1, $2, $3, 20)
       ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name
       RETURNING *`,
      [data.user.id, email.trim().toLowerCase(), name.trim()]
    );

    // Sign in to create a real session token
    const signInRes = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password
    });

    res.json({
      ok: true,
      token: signInRes.data?.session?.access_token || null,
      user: {
        id: data.user.id,
        email: data.user.email,
        name,
        role: 'candidate',
        completionPercentage: 20
      }
    });
  } catch (err) {
    console.error('[REGISTER ERROR]', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// Candidate Password Login
app.post('/api/auth/login', loginRateLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const signInRes = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password
    });

    if (signInRes.error || !signInRes.data?.session) {
      return res.status(401).json({ error: signInRes.error?.message || 'Invalid email or password.' });
    }

    const { user, session } = signInRes.data;

    const adminCheck = await query(
      `SELECT * FROM public.admin_users WHERE (user_id = $1 OR email = $2) AND is_active = TRUE`,
      [user.id, user.email]
    );
    const role = adminCheck.rows.length > 0 ? 'admin' : 'candidate';

    const prof = await query(`SELECT * FROM public.profiles WHERE user_id = $1`, [user.id]);

    res.json({
      ok: true,
      token: session.access_token,
      user: {
        id: user.id,
        email: user.email,
        name: prof.rows[0]?.full_name || user.email.split('@')[0],
        role,
        completionPercentage: prof.rows[0]?.profile_completion || 20
      }
    });
  } catch (err) {
    console.error('[LOGIN ERROR]', err);
    res.status(500).json({ error: 'Authentication failed.' });
  }
});

// -----------------------------------------------------------------------------
// 2. ADMIN AUTHENTICATION & AUTHORIZATION (Max 3 Admins, Database-Backed)
// -----------------------------------------------------------------------------

// Admin Request OTP
app.post('/api/admin/auth/request-otp', otpIpRateLimiter, async (req, res) => {
  const { email, captchaToken } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid admin email is required.' });
  }

  // CAPTCHA verification
  const captchaResult = await captchaService.verifyToken(captchaToken, req.ip);
  if (!captchaResult.success) {
    return res.status(400).json({ error: 'Security verification failed. Please complete the CAPTCHA.' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Strict check against admin_users table (maximum 3 active admins)
  const adminCheck = await query(
    `SELECT * FROM public.admin_users WHERE email = $1 AND is_active = TRUE`,
    [normalizedEmail]
  );

  if (adminCheck.rows.length === 0) {
    return res.status(403).json({
      error: 'Unauthorized: This email is not provisioned as an active administrator.'
    });
  }

  // Rate Limiting & Cooldown
  const now = Date.now();
  const lastRequest = otpCooldowns.get(normalizedEmail) || 0;
  if (now - lastRequest < 60000) {
    const remaining = Math.ceil((60000 - (now - lastRequest)) / 1000);
    return res.status(429).json({ error: `Please wait ${remaining} seconds before requesting a new admin OTP.` });
  }

  try {
    let linkRes = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: normalizedEmail
    });

    if (linkRes.error) {
      // If user not found in auth.users, create them first
      if (linkRes.error.message?.toLowerCase().includes('not found') || linkRes.error.status === 404) {
        await supabase.auth.admin.createUser({
          email: normalizedEmail,
          email_confirm: true,
          user_metadata: { role: 'admin' }
        });
        linkRes = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: normalizedEmail
        });
      }
      if (linkRes.error) {
        return res.status(400).json({ error: linkRes.error.message });
      }
    }

    otpCooldowns.set(normalizedEmail, now);
    const otpCode = linkRes.data?.properties?.email_otp || '';

    // Send OTP via emailService
    await emailService.sendOtp({ email: normalizedEmail, otp: otpCode, role: 'admin' });

    res.json({
      ok: true,
      message: 'Admin verification code has been dispatched to your authorized inbox.',
      cooldownSeconds: 60
    });
  } catch (err) {
    console.error('[ADMIN OTP ERROR]', err);
    res.status(500).json({ error: 'Failed to process admin OTP request.' });
  }
});

// Admin Verify OTP
app.post('/api/admin/auth/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: 'Admin email and OTP are required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Re-verify database authorization
  const adminCheck = await query(
    `SELECT * FROM public.admin_users WHERE email = $1 AND is_active = TRUE`,
    [normalizedEmail]
  );

  if (adminCheck.rows.length === 0) {
    return res.status(403).json({ error: 'Access denied: Account is not an authorized administrator.' });
  }

  try {
    const verifyRes = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: otp.trim(),
      type: 'email'
    });

    if (verifyRes.error || !verifyRes.data?.session) {
      return res.status(400).json({ error: verifyRes.error?.message || 'Invalid or expired administrator OTP code.' });
    }

    const { user, session } = verifyRes.data;

    // Bind user_id in admin_users if empty
    await query(
      `UPDATE public.admin_users SET user_id = $1 WHERE email = $2`,
      [user.id, normalizedEmail]
    );

    // Create Audit Log for Admin Login
    await createAuditLog(user.id, 'admin_login', 'auth', user.id, null, { email: normalizedEmail, timestamp: new Date().toISOString() });

    res.json({
      ok: true,
      token: session.access_token,
      user: {
        id: user.id,
        email: user.email,
        name: adminCheck.rows[0].name,
        role: 'admin'
      }
    });
  } catch (err) {
    console.error('[ADMIN VERIFY ERROR]', err);
    res.status(500).json({ error: 'Administrator authentication failed.' });
  }
});

// -----------------------------------------------------------------------------
// 3. CANDIDATE PROFILE & SECTION MANAGEMENT (CRUD)
// -----------------------------------------------------------------------------

// Get Profile & All Associated Records
app.get('/api/me', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const [profRes, eduRes, expRes, skillsRes, projRes, certRes, prefRes] = await Promise.all([
      query(`SELECT * FROM public.profiles WHERE user_id = $1`, [userId]),
      query(`SELECT * FROM public.education WHERE user_id = $1 ORDER BY start_year DESC NULLS LAST`, [userId]),
      query(`SELECT * FROM public.experience WHERE user_id = $1 ORDER BY start_date DESC NULLS LAST`, [userId]),
      query(`
        SELECT cs.*, s.name as skill_name, s.category 
        FROM public.candidate_skills cs
        JOIN public.skills s ON cs.skill_id = s.id
        WHERE cs.user_id = $1
      `, [userId]),
      query(`SELECT * FROM public.projects WHERE user_id = $1 ORDER BY start_date DESC NULLS LAST`, [userId]),
      query(`SELECT * FROM public.certifications WHERE user_id = $1 ORDER BY issue_date DESC NULLS LAST`, [userId]),
      query(`SELECT * FROM public.candidate_preferences WHERE user_id = $1`, [userId])
    ]);

    const profile = profRes.rows[0] || {};
    const education = eduRes.rows;
    const experience = expRes.rows;
    const skills = skillsRes.rows;
    const projects = projRes.rows;
    const certifications = certRes.rows;
    const preferences = prefRes.rows[0] || {};

    const completion = calculateProfileCompletion(profile, education, experience, skills, projects, certifications, preferences);

    if (profile.profile_completion !== completion) {
      await query(`UPDATE public.profiles SET profile_completion = $1 WHERE user_id = $2`, [completion, userId]);
      profile.profile_completion = completion;
    }

    res.json({
      id: userId,
      email: req.user.email,
      role: req.user.role,
      name: profile.full_name || req.user.email.split('@')[0],
      phone: profile.phone,
      bio: profile.bio,
      dob: profile.date_of_birth,
      gender: profile.gender,
      address: profile.address,
      city: profile.city,
      state: profile.state,
      country: profile.country,
      pincode: profile.pincode,
      linkedin: profile.linkedin_url,
      github: profile.github_url,
      portfolio: profile.portfolio_url,
      leetcode: profile.leetcode_url,
      hackerrank: profile.hackerrank_url,
      profilePhoto: profile.profile_photo_path,
      resume: profile.profile_photo_path ? null : null,
      completionPercentage: completion,
      education,
      experience,
      skills,
      projects,
      certifications,
      preferences
    });
  } catch (err) {
    console.error('[GET /api/me ERROR]', err);
    res.status(500).json({ error: 'Failed to load candidate profile.' });
  }
});

// Update Candidate Profile Personal Details
app.put('/api/me', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const b = req.body;

    const updated = await query(`
      INSERT INTO public.profiles (
        user_id, email, full_name, phone, bio, date_of_birth, gender,
        address, city, state, country, pincode,
        linkedin_url, github_url, portfolio_url, leetcode_url, hackerrank_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (user_id) DO UPDATE SET
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
        bio = COALESCE(EXCLUDED.bio, public.profiles.bio),
        date_of_birth = COALESCE(EXCLUDED.date_of_birth, public.profiles.date_of_birth),
        gender = COALESCE(EXCLUDED.gender, public.profiles.gender),
        address = COALESCE(EXCLUDED.address, public.profiles.address),
        city = COALESCE(EXCLUDED.city, public.profiles.city),
        state = COALESCE(EXCLUDED.state, public.profiles.state),
        country = COALESCE(EXCLUDED.country, public.profiles.country),
        pincode = COALESCE(EXCLUDED.pincode, public.profiles.pincode),
        linkedin_url = COALESCE(EXCLUDED.linkedin_url, public.profiles.linkedin_url),
        github_url = COALESCE(EXCLUDED.github_url, public.profiles.github_url),
        portfolio_url = COALESCE(EXCLUDED.portfolio_url, public.profiles.portfolio_url),
        leetcode_url = COALESCE(EXCLUDED.leetcode_url, public.profiles.leetcode_url),
        hackerrank_url = COALESCE(EXCLUDED.hackerrank_url, public.profiles.hackerrank_url)
      RETURNING *;
    `, [
      userId,
      req.user.email,
      b.name || b.full_name || req.user.email.split('@')[0],
      b.phone || null,
      b.bio || null,
      b.dob || b.date_of_birth || null,
      b.gender || null,
      b.address || null,
      b.city || null,
      b.state || null,
      b.country || 'India',
      b.pincode || null,
      b.linkedin || b.linkedin_url || null,
      b.github || b.github_url || null,
      b.portfolio || b.portfolio_url || null,
      b.leetcode || b.leetcode_url || null,
      b.hackerrank || b.hackerrank_url || null
    ]);

    res.json({ ok: true, profile: updated.rows[0] });
  } catch (err) {
    console.error('[PUT /api/me ERROR]', err);
    res.status(500).json({ error: 'Failed to update personal details.' });
  }
});

// Education CRUD
app.get('/api/candidate/education', requireAuth, async (req, res) => {
  const result = await query(
    `SELECT * FROM public.education WHERE user_id = $1 ORDER BY start_year DESC NULLS LAST`,
    [req.user.id]
  );
  res.json(result.rows);
});

app.post('/api/candidate/education', requireAuth, async (req, res) => {
  const { degree, institution, university, field_branch, start_year, end_year, score, score_type, is_current } = req.body;
  if (!degree || !institution) {
    return res.status(400).json({ error: 'Degree and institution are required.' });
  }

  const isCgpa = (score_type || '').toUpperCase() === 'CGPA';
  const cgpa = isCgpa ? parseFloat(score) || null : null;
  const percentage = !isCgpa ? parseFloat(score) || null : null;

  const result = await query(`
    INSERT INTO public.education (
      user_id, education_level, degree, branch, specialization, institution, university,
      start_year, end_year, cgpa, percentage, is_current
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *;
  `, [
    req.user.id,
    degree,
    degree,
    field_branch || 'General',
    field_branch || 'General',
    institution,
    university || institution,
    start_year || null,
    end_year || null,
    cgpa,
    percentage,
    Boolean(is_current)
  ]);

  res.json({ ok: true, item: result.rows[0] });
});

app.delete('/api/candidate/education/:id', requireAuth, async (req, res) => {
  await query(`DELETE FROM public.education WHERE id = $1 AND user_id = $2`, [req.params.id, req.user.id]);
  res.json({ ok: true });
});

// Experience CRUD
app.get('/api/candidate/experience', requireAuth, async (req, res) => {
  const result = await query(
    `SELECT * FROM public.experience WHERE user_id = $1 ORDER BY start_date DESC NULLS LAST`,
    [req.user.id]
  );
  res.json(result.rows);
});

app.post('/api/candidate/experience', requireAuth, async (req, res) => {
  const { company, title, employment_type, location, start_date, end_date, currently_working, description } = req.body;
  if (!company || !title) {
    return res.status(400).json({ error: 'Company and title are required.' });
  }

  const result = await query(`
    INSERT INTO public.experience (
      user_id, company_name, job_title, employment_type, location,
      start_date, end_date, is_current, description
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *;
  `, [
    req.user.id,
    company,
    title,
    employment_type || 'Full Time',
    location || 'Pune',
    start_date || null,
    end_date || null,
    Boolean(currently_working),
    description || ''
  ]);

  res.json({ ok: true, item: result.rows[0] });
});

app.delete('/api/candidate/experience/:id', requireAuth, async (req, res) => {
  await query(`DELETE FROM public.experience WHERE id = $1 AND user_id = $2`, [req.params.id, req.user.id]);
  res.json({ ok: true });
});

// Skills CRUD
app.get('/api/candidate/skills', requireAuth, async (req, res) => {
  const result = await query(`
    SELECT cs.*, s.name as skill_name, s.category 
    FROM public.candidate_skills cs
    JOIN public.skills s ON cs.skill_id = s.id
    WHERE cs.user_id = $1
  `, [req.user.id]);
  res.json(result.rows);
});

app.post('/api/candidate/skills', requireAuth, async (req, res) => {
  const { skill_name, category, proficiency, years_of_experience } = req.body;
  if (!skill_name) {
    return res.status(400).json({ error: 'Skill name is required.' });
  }

  // Find or insert into master skills table
  let skillRes = await query(`SELECT id FROM public.skills WHERE name ILIKE $1`, [skill_name.trim()]);
  let skillId;
  if (skillRes.rows.length === 0) {
    const ins = await query(`INSERT INTO public.skills (name, category) VALUES ($1, $2) RETURNING id`, [
      skill_name.trim(),
      category || 'Technical'
    ]);
    skillId = ins.rows[0].id;
  } else {
    skillId = skillRes.rows[0].id;
  }

  const validProficiency = ['Beginner', 'Intermediate', 'Advanced', 'Expert'].includes(proficiency)
    ? proficiency
    : 'Intermediate';

  const result = await query(`
    INSERT INTO public.candidate_skills (user_id, skill_id, proficiency, years_of_experience)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (user_id, skill_id) DO UPDATE SET
      proficiency = EXCLUDED.proficiency,
      years_of_experience = EXCLUDED.years_of_experience
    RETURNING *;
  `, [req.user.id, skillId, validProficiency, parseFloat(years_of_experience) || 1]);

  res.json({ ok: true, item: { ...result.rows[0], skill_name } });
});

app.delete('/api/candidate/skills/:id', requireAuth, async (req, res) => {
  await query(`DELETE FROM public.candidate_skills WHERE id = $1 AND user_id = $2`, [req.params.id, req.user.id]);
  res.json({ ok: true });
});

// Projects CRUD
app.get('/api/candidate/projects', requireAuth, async (req, res) => {
  const result = await query(`SELECT * FROM public.projects WHERE user_id = $1 ORDER BY start_date DESC NULLS LAST`, [req.user.id]);
  res.json(result.rows);
});

app.post('/api/candidate/projects', requireAuth, async (req, res) => {
  const { title, description, technologies, role, start_date, end_date, github_url, live_url } = req.body;
  if (!title) return res.status(400).json({ error: 'Project title is required.' });

  const result = await query(`
    INSERT INTO public.projects (
      user_id, project_name, description, technologies, role,
      start_date, end_date, github_url, live_url
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *;
  `, [
    req.user.id,
    title,
    description || '',
    technologies || '',
    role || 'Developer',
    start_date || null,
    end_date || null,
    github_url || null,
    live_url || null
  ]);

  res.json({ ok: true, item: result.rows[0] });
});

app.delete('/api/candidate/projects/:id', requireAuth, async (req, res) => {
  await query(`DELETE FROM public.projects WHERE id = $1 AND user_id = $2`, [req.params.id, req.user.id]);
  res.json({ ok: true });
});

// Certifications CRUD
app.get('/api/candidate/certifications', requireAuth, async (req, res) => {
  const result = await query(`SELECT * FROM public.certifications WHERE user_id = $1 ORDER BY issue_date DESC NULLS LAST`, [req.user.id]);
  res.json(result.rows);
});

app.post('/api/candidate/certifications', requireAuth, async (req, res) => {
  const { name, issuer, issue_date, expiry_date, credential_url, credential_id } = req.body;
  if (!name || !issuer) return res.status(400).json({ error: 'Certificate name and issuer are required.' });

  const result = await query(`
    INSERT INTO public.certifications (
      user_id, certificate_name, issuer, issue_date, expiry_date, credential_id, credential_url
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *;
  `, [
    req.user.id,
    name,
    issuer,
    issue_date || null,
    expiry_date || null,
    credential_id || null,
    credential_url || null
  ]);

  res.json({ ok: true, item: result.rows[0] });
});

app.delete('/api/candidate/certifications/:id', requireAuth, async (req, res) => {
  await query(`DELETE FROM public.certifications WHERE id = $1 AND user_id = $2`, [req.params.id, req.user.id]);
  res.json({ ok: true });
});

// Preferences CRUD
app.get('/api/candidate/preferences', requireAuth, async (req, res) => {
  const result = await query(`SELECT * FROM public.candidate_preferences WHERE user_id = $1`, [req.user.id]);
  res.json(result.rows[0] || {});
});

app.put('/api/candidate/preferences', requireAuth, async (req, res) => {
  const { preferred_roles, preferred_job_types, workplace_preference, preferred_locations, willing_to_relocate, expected_salary, expected_stipend, preferred_industries } = req.body;

  const result = await query(`
    INSERT INTO public.candidate_preferences (
      user_id, desired_roles, job_types, work_modes, preferred_locations,
      willing_to_relocate, minimum_salary, minimum_stipend, preferred_industries
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (user_id) DO UPDATE SET
      desired_roles = EXCLUDED.desired_roles,
      job_types = EXCLUDED.job_types,
      work_modes = EXCLUDED.work_modes,
      preferred_locations = EXCLUDED.preferred_locations,
      willing_to_relocate = EXCLUDED.willing_to_relocate,
      minimum_salary = EXCLUDED.minimum_salary,
      minimum_stipend = EXCLUDED.minimum_stipend,
      preferred_industries = EXCLUDED.preferred_industries
    RETURNING *;
  `, [
    req.user.id,
    preferred_roles || null,
    preferred_job_types || null,
    workplace_preference || null,
    preferred_locations || null,
    willing_to_relocate !== 'No' && willing_to_relocate !== false,
    parseFloat(expected_salary) || 0,
    parseFloat(expected_stipend) || 0,
    preferred_industries || null
  ]);

  res.json({ ok: true, preferences: result.rows[0] });
});

// -----------------------------------------------------------------------------
// 4. STORAGE (Profile Photos & Private Resumes)
// -----------------------------------------------------------------------------

const ALLOWED_PHOTO_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp']);
const ALLOWED_PHOTO_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_RESUME_EXTS = new Set(['pdf', 'doc', 'docx']);
const ALLOWED_RESUME_MIMES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);

// Profile Photo Upload (Public Bucket: profile-photos)
app.post('/api/candidate/photo', requireAuth, upload.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No photo uploaded.' });

  const rawExt = path.extname(req.file.originalname || '').toLowerCase().replace('.', '');
  if (!ALLOWED_PHOTO_EXTS.has(rawExt) || !ALLOWED_PHOTO_MIMES.has(req.file.mimetype)) {
    return res.status(400).json({ error: 'Invalid photo format. Permitted file types: JPG, PNG, WEBP.' });
  }

  const safeExt = rawExt === 'jpeg' ? 'jpg' : rawExt;
  const filePath = `${req.user.id}/profile.${safeExt}`;

  try {
    const { data, error } = await supabase.storage
      .from('profile-photos')
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true
      });

    if (error) {
      console.error('[PHOTO UPLOAD STORAGE ERROR]', error);
      return res.status(500).json({ error: 'Failed to upload photo to storage.' });
    }

    const { data: publicUrlData } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    await query(`UPDATE public.profiles SET profile_photo_path = $1 WHERE user_id = $2`, [publicUrl, req.user.id]);

    res.json({ ok: true, url: publicUrl, filename: filePath });
  } catch (err) {
    console.error('[PHOTO UPLOAD ERROR]', err);
    res.status(500).json({ error: 'Failed to upload photo.' });
  }
});

// Resume Upload (Private Bucket: resumes)
app.post('/api/candidate/resume', requireAuth, upload.single('resume'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No resume file provided.' });

  const rawExt = path.extname(req.file.originalname || '').toLowerCase().replace('.', '');
  if (!ALLOWED_RESUME_EXTS.has(rawExt) || !ALLOWED_RESUME_MIMES.has(req.file.mimetype)) {
    return res.status(400).json({ error: 'Invalid resume format. Permitted file types: PDF, DOC, DOCX.' });
  }

  const filePath = `${req.user.id}/resume.${rawExt}`;

  try {
    const { data, error } = await supabase.storage
      .from('resumes')
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true
      });

    if (error) {
      console.error('[RESUME UPLOAD STORAGE ERROR]', error);
      return res.status(500).json({ error: 'Failed to upload resume to storage.' });
    }

    // Resumes are private; store path and generate signed URL
    const { data: signedData } = await supabase.storage
      .from('resumes')
      .createSignedUrl(filePath, 3600);

    res.json({
      ok: true,
      filename: filePath,
      signedUrl: signedData?.signedUrl || null,
      message: 'Resume securely uploaded to private cloud storage.'
    });
  } catch (err) {
    console.error('[RESUME UPLOAD ERROR]', err);
    res.status(500).json({ error: 'Failed to upload resume.' });
  }
});

// Candidate / Admin Private Resume Access via Signed URL
app.get('/api/candidate/resume-url', requireAuth, async (req, res) => {
  const targetUserId = req.query.userId || req.user.id;

  // Only self or admin can access resumes
  if (targetUserId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized to view this resume.' });
  }

  try {
    // List files in user's folder
    const { data: files, error } = await supabase.storage.from('resumes').list(targetUserId);
    if (error || !files || files.length === 0) {
      return res.status(404).json({ error: 'No resume found for candidate.' });
    }

    const resumeFile = files[0].name;
    const { data: signedData, error: signErr } = await supabase.storage
      .from('resumes')
      .createSignedUrl(`${targetUserId}/${resumeFile}`, 3600);

    if (signErr) {
      console.error('[RESUME SIGN ERROR]', signErr);
      return res.status(500).json({ error: 'Failed to generate signed URL.' });
    }

    res.json({ ok: true, signedUrl: signedData.signedUrl });
  } catch (err) {
    console.error('[RESUME SIGNED URL ERROR]', err);
    res.status(500).json({ error: 'Failed to generate signed URL.' });
  }
});

// -----------------------------------------------------------------------------
// 5. JOBS, MATCHING ENGINE & APPLICATION FLOW
// -----------------------------------------------------------------------------

// Public Job Search
app.get('/api/jobs', async (req, res) => {
  const { search, type, workplace, location } = req.query;

  let sql = `
    SELECT j.*, 
      COALESCE(
        (SELECT json_agg(json_build_object('id', s.id, 'name', s.name, 'is_required', js.is_required))
         FROM public.job_skills js JOIN public.skills s ON js.skill_id = s.id WHERE js.job_id = j.id), '[]'::json
      ) as skills_list,
      COALESCE(
        (SELECT json_agg(row_to_json(jer.*))
         FROM public.job_education_requirements jer WHERE jer.job_id = j.id), '[]'::json
      ) as education_reqs
    FROM public.jobs j
    WHERE j.status = 'published'
  `;
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    sql += ` AND (j.title ILIKE $${params.length} OR j.company_name ILIKE $${params.length} OR j.description ILIKE $${params.length})`;
  }
  if (type) {
    params.push(type);
    sql += ` AND j.job_type = $${params.length}`;
  }
  if (workplace) {
    params.push(workplace);
    sql += ` AND j.work_mode = $${params.length}`;
  }
  if (location) {
    params.push(`%${location}%`);
    sql += ` AND j.location ILIKE $${params.length}`;
  }

  sql += ` ORDER BY j.created_at DESC`;

  try {
    const result = await query(sql, params);
    const jobs = result.rows.map(r => ({
      id: r.id,
      title: r.title,
      company: r.company_name,
      logo: r.company_logo_path,
      location: r.location,
      type: r.job_type,
      workplace: r.work_mode,
      salary: r.salary_min && r.salary_max ? `₹${r.salary_min}–${r.salary_max} LPA` : (r.stipend ? `₹${r.stipend}/month` : 'Competitive'),
      salary_min: r.salary_min,
      salary_max: r.salary_max,
      salary_period: r.salary_period || 'Annual',
      stipend: r.stipend,
      experience: r.experience_required,
      skills: (r.skills_list || []).map(s => s.name).join(', '),
      jd: r.description,
      responsibilities: r.responsibilities,
      requirements: r.requirements,
      openings: r.openings,
      created_at: r.created_at,
      posting_date: r.posting_date || r.created_at,
      application_opening_date: r.application_opening_date || r.created_at,
      application_deadline: r.application_deadline,
      application_method: r.application_method || 'both',
      external_application_url: r.external_application_url || null,
      internal_application_enabled: r.internal_application_enabled !== false,
      qualification: r.qualification || '',
      eligible_branches: r.eligible_branches || '',
      min_cgpa: r.min_cgpa || null,
      status: r.status,
      is_expired: Boolean(r.is_expired || (r.application_deadline && new Date(r.application_deadline) < new Date())),
      published: r.status === 'published' ? 1 : 0
    }));

    res.json(jobs);
  } catch (err) {
    console.error('[GET /api/jobs ERROR]', err);
    res.status(500).json({ error: 'Failed to retrieve jobs.' });
  }
});

// Single Job Details
app.get('/api/jobs/:id', async (req, res) => {
  try {
    const jobRes = await query(`
      SELECT j.*, 
        COALESCE(
          (SELECT json_agg(json_build_object('id', s.id, 'name', s.name, 'is_required', js.is_required))
           FROM public.job_skills js JOIN public.skills s ON js.skill_id = s.id WHERE js.job_id = j.id), '[]'::json
        ) as skills_list,
        COALESCE(
          (SELECT json_agg(row_to_json(jer.*))
           FROM public.job_education_requirements jer WHERE jer.job_id = j.id), '[]'::json
        ) as education_reqs
      FROM public.jobs j
      WHERE j.id = $1
    `, [req.params.id]);

    if (jobRes.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    const r = jobRes.rows[0];
    const eduReq = r.education_reqs?.[0] || {};

    res.json({
      id: r.id,
      title: r.title,
      company: r.company_name,
      logo: r.company_logo_path,
      location: r.location,
      type: r.job_type,
      workplace: r.work_mode,
      salary: r.salary_min && r.salary_max ? `₹${r.salary_min}–${r.salary_max} LPA` : (r.stipend ? `₹${r.stipend}/month` : 'Competitive'),
      salary_min: r.salary_min,
      salary_max: r.salary_max,
      salary_period: r.salary_period || 'Annual',
      stipend: r.stipend,
      experience: r.experience_required,
      skills: (r.skills_list || []).map(s => s.name).join(', '),
      jd: r.description,
      responsibilities: r.responsibilities,
      requirements: r.requirements,
      openings: r.openings,
      created_at: r.created_at,
      posting_date: r.posting_date || r.created_at,
      application_opening_date: r.application_opening_date || r.created_at,
      application_deadline: r.application_deadline,
      application_method: r.application_method || 'both',
      external_application_url: r.external_application_url || null,
      internal_application_enabled: r.internal_application_enabled !== false,
      qualification: r.qualification || eduReq.degree || '',
      eligible_branches: r.eligible_branches || eduReq.branch || '',
      min_cgpa: r.min_cgpa || eduReq.minimum_cgpa || null,
      status: r.status,
      is_expired: Boolean(r.is_expired || (r.application_deadline && new Date(r.application_deadline) < new Date())),
      published: r.status === 'published' ? 1 : 0,
      edu_degree: eduReq.degree || '',
      edu_branches: eduReq.branch || '',
      edu_min_cgpa: eduReq.minimum_cgpa || '',
      edu_grad_years: eduReq.graduation_year_from ? `${eduReq.graduation_year_from}–${eduReq.graduation_year_to}` : '',
      edu_eligibility_mandatory: eduReq.is_mandatory ? 1 : 0
    });
  } catch (err) {
    console.error('[GET /api/jobs/:id ERROR]', err);
    res.status(500).json({ error: 'Failed to retrieve job details.' });
  }
});

// Job Match Evaluation Engine
app.get('/api/jobs/:id/match', requireAuth, async (req, res) => {
  try {
    const jobId = req.params.id;
    const userId = req.user.id;

    // Load Job with Requirements
    const [jobRes, eduReqRes, skillReqRes] = await Promise.all([
      query(`SELECT * FROM public.jobs WHERE id = $1`, [jobId]),
      query(`SELECT * FROM public.job_education_requirements WHERE job_id = $1`, [jobId]),
      query(`
        SELECT s.name, js.is_required 
        FROM public.job_skills js
        JOIN public.skills s ON js.skill_id = s.id
        WHERE js.job_id = $1
      `, [jobId])
    ]);

    if (jobRes.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    // Load Candidate Data
    const [eduRes, skillRes, expRes, prefRes] = await Promise.all([
      query(`SELECT * FROM public.education WHERE user_id = $1`, [userId]),
      query(`
        SELECT s.name 
        FROM public.candidate_skills cs
        JOIN public.skills s ON cs.skill_id = s.id
        WHERE cs.user_id = $1
      `, [userId]),
      query(`SELECT * FROM public.experience WHERE user_id = $1`, [userId]),
      query(`SELECT * FROM public.candidate_preferences WHERE user_id = $1`, [userId])
    ]);

    const candidate = {
      education: eduRes.rows,
      skills: skillRes.rows.map(s => s.name),
      experience: expRes.rows,
      preferences: prefRes.rows[0] || {}
    };

    const match = calculateJobMatch({
      job: jobRes.rows[0],
      educationReqs: eduReqRes.rows,
      requiredSkills: skillReqRes.rows,
      candidate
    });

    res.json(match);
  } catch (err) {
    console.error('[JOB MATCH ERROR]', err);
    res.status(500).json({ error: 'Failed to evaluate job match.' });
  }
});

// Apply to Job
app.post('/api/jobs/:id/apply', requireAuth, async (req, res) => {
  const jobId = req.params.id;
  const candidateId = req.user.id;
  const { coverLetter } = req.body;

  try {
    // 1. Check duplicate application (Database Unique Constraint Protection)
    const existingApp = await query(
      `SELECT id FROM public.applications WHERE job_id = $1 AND candidate_id = $2`,
      [jobId, candidateId]
    );

    if (existingApp.rows.length > 0) {
      return res.status(409).json({
        error: 'Duplicate application detected: You have already applied for this position.'
      });
    }

    // 2. Fetch Job and Requirements
    const [jobRes, eduReqRes, skillReqRes] = await Promise.all([
      query(`SELECT * FROM public.jobs WHERE id = $1`, [jobId]),
      query(`SELECT * FROM public.job_education_requirements WHERE job_id = $1`, [jobId]),
      query(`
        SELECT s.name, js.is_required 
        FROM public.job_skills js
        JOIN public.skills s ON js.skill_id = s.id
        WHERE js.job_id = $1
      `, [jobId])
    ]);

    if (jobRes.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    const job = jobRes.rows[0];

    // 3. Fetch Candidate Profile & Evaluate Match
    const [eduRes, skillRes, expRes, prefRes, profRes] = await Promise.all([
      query(`SELECT * FROM public.education WHERE user_id = $1`, [candidateId]),
      query(`
        SELECT s.name 
        FROM public.candidate_skills cs
        JOIN public.skills s ON cs.skill_id = s.id
        WHERE cs.user_id = $1
      `, [candidateId]),
      query(`SELECT * FROM public.experience WHERE user_id = $1`, [candidateId]),
      query(`SELECT * FROM public.candidate_preferences WHERE user_id = $1`, [candidateId]),
      query(`SELECT * FROM public.profiles WHERE user_id = $1`, [candidateId])
    ]);

    const candidate = {
      education: eduRes.rows,
      skills: skillRes.rows.map(s => s.name),
      experience: expRes.rows,
      preferences: prefRes.rows[0] || {}
    };

    const match = calculateJobMatch({
      job,
      educationReqs: eduReqRes.rows,
      requiredSkills: skillReqRes.rows,
      candidate
    });

    // 4. HARD BLOCKING: Candidate failing mandatory education requirement
    if (match.mandatoryBlocked) {
      return res.status(403).json({
        error: 'You are not eligible for this job. Reason: Your education does not meet the mandatory requirement.',
        details: match.mandatoryFailReason
      });
    }

    // 5. Insert Application into PostgreSQL
    const appRes = await query(`
      INSERT INTO public.applications (
        job_id, candidate_id, match_score, match_status, eligibility_status,
        application_status, cover_note
      ) VALUES ($1, $2, $3, $4, $5, 'submitted', $6)
      RETURNING *;
    `, [
      jobId,
      candidateId,
      match.score,
      match.match_status,
      match.eligible ? 'eligible' : 'not_eligible',
      coverLetter || ''
    ]);

    const createdApp = appRes.rows[0];

    // 6. Record Initial Status History
    await query(`
      INSERT INTO public.application_status_history (application_id, old_status, new_status, changed_by)
      VALUES ($1, NULL, 'submitted', $2)
    `, [createdApp.id, candidateId]);

    // 7. Create Candidate Notification
    await query(`
      INSERT INTO public.notifications (user_id, title, message, type, related_job_id, related_application_id)
      VALUES ($1, $2, $3, 'application_submitted', $4, $5)
    `, [
      candidateId,
      `Application Submitted: ${job.title}`,
      `Your application for ${job.title} at ${job.company_name} was received successfully. Match Score: ${match.score}%.`,
      job.id,
      createdApp.id
    ]);

    // 8. Trigger Email Confirmation
    const candidateName = profRes.rows[0]?.full_name || req.user.email.split('@')[0];
    await emailService.sendApplicationConfirmation({
      candidateEmail: req.user.email,
      candidateName,
      jobTitle: job.title,
      companyName: job.company_name
    });

    res.json({
      ok: true,
      applicationId: createdApp.id,
      matchScore: match.score,
      matchStatus: match.match_status,
      message: 'Application submitted successfully.'
    });
  } catch (err) {
    if (err.code === '23505') { // Postgres unique_violation
      return res.status(409).json({ error: 'You have already applied for this job.' });
    }
    console.error('[APPLY ERROR]', err);
    res.status(500).json({ error: 'Failed to submit application.' });
  }
});

// Candidate Recommendations
app.get('/api/recommendations', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const [jobsRes, eduRes, skillRes, expRes, prefRes] = await Promise.all([
      query(`
        SELECT j.*, 
          COALESCE(
            (SELECT json_agg(json_build_object('name', s.name, 'is_required', js.is_required))
             FROM public.job_skills js JOIN public.skills s ON js.skill_id = s.id WHERE js.job_id = j.id), '[]'::json
          ) as skills_list,
          COALESCE(
            (SELECT json_agg(row_to_json(jer.*))
             FROM public.job_education_requirements jer WHERE jer.job_id = j.id), '[]'::json
          ) as education_reqs
        FROM public.jobs j
        WHERE j.status = 'published'
      `),
      query(`SELECT * FROM public.education WHERE user_id = $1`, [userId]),
      query(`
        SELECT s.name 
        FROM public.candidate_skills cs
        JOIN public.skills s ON cs.skill_id = s.id
        WHERE cs.user_id = $1
      `, [userId]),
      query(`SELECT * FROM public.experience WHERE user_id = $1`, [userId]),
      query(`SELECT * FROM public.candidate_preferences WHERE user_id = $1`, [userId])
    ]);

    const candidate = {
      education: eduRes.rows,
      skills: skillRes.rows.map(s => s.name),
      experience: expRes.rows,
      preferences: prefRes.rows[0] || {}
    };

    const scoredJobs = jobsRes.rows.map(job => {
      const match = calculateJobMatch({
        job,
        educationReqs: job.education_reqs || [],
        requiredSkills: job.skills_list || [],
        candidate
      });

      return {
        id: job.id,
        title: job.title,
        company: job.company_name,
        location: job.location,
        type: job.job_type,
        workplace: job.work_mode,
        salary: job.salary_min && job.salary_max ? `₹${job.salary_min}–${job.salary_max} LPA` : (job.stipend ? `₹${job.stipend}/month` : 'Competitive'),
        matchScore: match.score,
        matchStatus: match.match_status,
        eligible: match.eligible,
        reasons: match.reasons
      };
    });

    // Sort by match score descending
    scoredJobs.sort((a, b) => b.matchScore - a.matchScore);

    res.json(scoredJobs);
  } catch (err) {
    console.error('[RECOMMENDATIONS ERROR]', err);
    res.status(500).json({ error: 'Failed to load recommendations.' });
  }
});

// Candidate / Admin Applications
app.get('/api/applications', requireAuth, async (req, res) => {
  try {
    const isAdm = req.user.role === 'admin';
    let sql = `
      SELECT a.*, 
        j.title as job_title, j.company_name, j.location as job_location, j.job_type,
        p.full_name as candidate_name, p.email as candidate_email, p.phone as candidate_phone
      FROM public.applications a
      JOIN public.jobs j ON a.job_id = j.id
      JOIN public.profiles p ON a.candidate_id = p.user_id
    `;
    const params = [];

    if (!isAdm) {
      params.push(req.user.id);
      sql += ` WHERE a.candidate_id = $1`;
    }

    sql += ` ORDER BY a.applied_at DESC`;

    const result = await query(sql, params);
    const apps = result.rows.map(r => ({
      id: r.id,
      jobId: r.job_id,
      candidateId: r.candidate_id,
      title: r.job_title,
      company: r.company_name,
      location: r.job_location,
      type: r.job_type,
      candidateName: r.candidate_name,
      candidateEmail: r.candidate_email,
      status: r.application_status,
      matchScore: r.match_score,
      appliedAt: r.applied_at
    }));

    res.json(apps);
  } catch (err) {
    console.error('[APPLICATIONS ERROR]', err);
    res.status(500).json({ error: 'Failed to retrieve applications.' });
  }
});

// Notifications
app.get('/api/notifications', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM public.notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[NOTIFICATIONS ERROR]', err);
    res.status(500).json({ error: 'Failed to load notifications.' });
  }
});

app.patch('/api/notifications/:id/read', requireAuth, async (req, res) => {
  await query(`UPDATE public.notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2`, [req.params.id, req.user.id]);
  res.json({ ok: true });
});

app.post('/api/notifications/:id/read', requireAuth, async (req, res) => {
  await query(`UPDATE public.notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2`, [req.params.id, req.user.id]);
  res.json({ ok: true });
});

// -----------------------------------------------------------------------------
// 6. ADMIN CONSOLE & AUDIT LOGGING (Strictly Authorized Admins Only)
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// 6. ADMIN CONSOLE, ANALYTICS & AUDIT LOGGING (Strictly Authorized Admins Only)
// -----------------------------------------------------------------------------

// Admin Statistics (Real Supabase Data Only)
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    const [
      jobsCount,
      pubJobs,
      activeJobs,
      expiredJobs,
      draftJobs,
      appsCount,
      shortlistedCount,
      rejectedCount,
      studentsCount,
      recruitersCount,
      recentJobsRes,
      recentLogsRes
    ] = await Promise.all([
      query(`SELECT count(*) FROM public.jobs`),
      query(`SELECT count(*) FROM public.jobs WHERE status = 'published'`),
      query(`SELECT count(*) FROM public.jobs WHERE status = 'published' AND (is_expired = false OR is_expired IS NULL) AND (application_deadline IS NULL OR application_deadline >= CURRENT_DATE)`),
      query(`SELECT count(*) FROM public.jobs WHERE is_expired = true OR status = 'expired' OR (application_deadline IS NOT NULL AND application_deadline < CURRENT_DATE)`),
      query(`SELECT count(*) FROM public.jobs WHERE status = 'draft'`),
      query(`SELECT count(*) FROM public.applications`),
      query(`SELECT count(*) FROM public.applications WHERE application_status IN ('shortlisted', 'selected')`),
      query(`SELECT count(*) FROM public.applications WHERE application_status = 'rejected'`),
      query(`SELECT count(*) FROM public.profiles`),
      query(`SELECT count(*) FROM public.recruiter_profiles`),
      query(`SELECT id, title, company_name, location, job_type, status, is_expired, created_at, application_deadline FROM public.jobs ORDER BY created_at DESC LIMIT 5`),
      query(`
        SELECT al.*, au.name as admin_name, au.email as admin_email
        FROM public.audit_logs al
        LEFT JOIN public.admin_users au ON al.admin_user_id = au.user_id
        ORDER BY al.created_at DESC
        LIMIT 8
      `)
    ]);

    res.json({
      totalJobs: parseInt(jobsCount.rows[0].count, 10),
      publishedJobs: parseInt(pubJobs.rows[0].count, 10),
      activeJobs: parseInt(activeJobs.rows[0].count, 10),
      expiredJobs: parseInt(expiredJobs.rows[0].count, 10),
      draftJobs: parseInt(draftJobs.rows[0].count, 10),
      totalApplications: parseInt(appsCount.rows[0].count, 10),
      shortlistedCandidates: parseInt(shortlistedCount.rows[0].count, 10),
      rejectedApplications: parseInt(rejectedCount.rows[0].count, 10),
      totalStudents: parseInt(studentsCount.rows[0].count, 10),
      totalRecruiters: parseInt(recruitersCount.rows[0].count, 10),
      recentJobs: recentJobsRes.rows,
      recentActivities: recentLogsRes.rows
    });
  } catch (err) {
    console.error('[ADMIN STATS ERROR]', err);
    res.status(500).json({ error: 'Failed to load platform statistics.' });
  }
});

// Admin Analytics & Reporting (Time-series, Distributions & Funnels)
app.get('/api/admin/analytics', requireAdmin, async (req, res) => {
  const { range = '30d' } = req.query;
  let days = 30;
  if (range === '7d') days = 7;
  else if (range === '90d') days = 90;
  else if (range === 'all') days = 365;

  try {
    const [
      jobsTrendRes,
      appsTrendRes,
      categoryRes,
      companyRes,
      studentsTrendRes,
      appStatusRes,
      topJobsRes,
      expiringJobsRes
    ] = await Promise.all([
      // Job postings over time
      query(`
        SELECT to_char(created_at, 'YYYY-MM-DD') as date, count(*) as count
        FROM public.jobs
        WHERE created_at >= NOW() - ($1 || ' days')::INTERVAL
        GROUP BY date
        ORDER BY date ASC
      `, [days]),

      // Applications over time
      query(`
        SELECT to_char(created_at, 'YYYY-MM-DD') as date, count(*) as count
        FROM public.applications
        WHERE created_at >= NOW() - ($1 || ' days')::INTERVAL
        GROUP BY date
        ORDER BY date ASC
      `, [days]),

      // Category / Industry distribution
      query(`
        SELECT COALESCE(NULLIF(industry, ''), 'Information Technology') as category, count(*) as count
        FROM public.jobs
        GROUP BY category
        ORDER BY count DESC
        LIMIT 6
      `),

      // Company distribution
      query(`
        SELECT company_name as company, count(*) as count
        FROM public.jobs
        GROUP BY company_name
        ORDER BY count DESC
        LIMIT 6
      `),

      // Student registrations over time
      query(`
        SELECT to_char(created_at, 'YYYY-MM-DD') as date, count(*) as count
        FROM public.profiles
        WHERE created_at >= NOW() - ($1 || ' days')::INTERVAL
        GROUP BY date
        ORDER BY date ASC
      `, [days]),

      // Application status breakdown
      query(`
        SELECT application_status as status, count(*) as count
        FROM public.applications
        GROUP BY application_status
      `),

      // Top applied jobs
      query(`
        SELECT j.id, j.title, j.company_name as company, count(a.id) as applications_count
        FROM public.jobs j
        LEFT JOIN public.applications a ON j.id = a.job_id
        GROUP BY j.id, j.title, j.company_name
        ORDER BY applications_count DESC
        LIMIT 5
      `),

      // Jobs expiring soon
      query(`
        SELECT id, title, company_name as company, application_deadline as deadline,
          ROUND(EXTRACT(EPOCH FROM (application_deadline - NOW())) / 86400) as days_left
        FROM public.jobs
        WHERE application_deadline IS NOT NULL
          AND application_deadline >= NOW()
          AND application_deadline <= NOW() + INTERVAL '14 days'
          AND status = 'published'
        ORDER BY application_deadline ASC
        LIMIT 5
      `)
    ]);

    res.json({
      range,
      jobPostingTrends: jobsTrendRes.rows,
      applicationsOverTime: appsTrendRes.rows,
      categoryDistribution: categoryRes.rows,
      companyDistribution: companyRes.rows,
      studentRegistrationTrends: studentsTrendRes.rows,
      applicationStatusDistribution: appStatusRes.rows,
      mostAppliedJobs: topJobsRes.rows,
      expiringJobs: expiringJobsRes.rows
    });
  } catch (err) {
    console.error('[ADMIN ANALYTICS ERROR]', err);
    res.status(500).json({ error: 'Failed to load analytics data.' });
  }
});

// Admin All Jobs with Full Filtering & Search
app.get('/api/admin/jobs', requireAdmin, async (req, res) => {
  const { search, status, sort = 'newest' } = req.query;

  let sql = `
    SELECT j.*, 
      COALESCE(
        (SELECT json_agg(json_build_object('name', s.name))
         FROM public.job_skills js JOIN public.skills s ON js.skill_id = s.id WHERE js.job_id = j.id), '[]'::json
      ) as skills_list,
      COALESCE(
        (SELECT json_agg(row_to_json(jer.*))
         FROM public.job_education_requirements jer WHERE jer.job_id = j.id), '[]'::json
      ) as education_reqs,
      (SELECT count(*) FROM public.applications a WHERE a.job_id = j.id) as applications_count
    FROM public.jobs j
    WHERE 1=1
  `;
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    sql += ` AND (j.title ILIKE $${params.length} OR j.company_name ILIKE $${params.length} OR j.location ILIKE $${params.length})`;
  }

  if (status && status !== 'all') {
    if (status === 'expired') {
      sql += ` AND (j.is_expired = true OR j.status = 'expired' OR (j.application_deadline IS NOT NULL AND j.application_deadline < CURRENT_DATE))`;
    } else {
      params.push(status);
      sql += ` AND j.status = $${params.length}`;
    }
  }

  if (sort === 'oldest') {
    sql += ` ORDER BY j.created_at ASC`;
  } else if (sort === 'applications') {
    sql += ` ORDER BY applications_count DESC, j.created_at DESC`;
  } else if (sort === 'deadline') {
    sql += ` ORDER BY j.application_deadline ASC NULLS LAST`;
  } else {
    sql += ` ORDER BY j.created_at DESC`;
  }

  try {
    const result = await query(sql, params);

    const formatted = result.rows.map(r => {
      const edu = r.education_reqs?.[0] || {};
      const isExpired = Boolean(r.is_expired || (r.application_deadline && new Date(r.application_deadline) < new Date()));
      return {
        id: r.id,
        title: r.title,
        company: r.company_name,
        company_name: r.company_name,
        logo: r.company_logo_path,
        company_logo_path: r.company_logo_path,
        location: r.location,
        type: r.job_type,
        job_type: r.job_type,
        workplace: r.work_mode,
        work_mode: r.work_mode,
        industry: r.industry || 'Information Technology',
        company_type: r.company_type || 'Product',
        salary: r.salary_min && r.salary_max ? `₹${r.salary_min}–${r.salary_max} LPA` : (r.stipend ? `₹${r.stipend}/month` : ''),
        salary_min: r.salary_min,
        salary_max: r.salary_max,
        salary_period: r.salary_period || 'Annual',
        stipend: r.stipend,
        openings: r.openings || 1,
        experience: r.experience_required,
        experience_required: r.experience_required,
        skills: (r.skills_list || []).map(s => s.name).join(', '),
        jd: r.description,
        description: r.description,
        responsibilities: r.responsibilities,
        requirements: r.requirements,
        posting_date: r.posting_date || r.created_at,
        application_opening_date: r.application_opening_date || r.created_at,
        application_deadline: r.application_deadline,
        application_method: r.application_method || 'both',
        external_application_url: r.external_application_url || null,
        internal_application_enabled: r.internal_application_enabled !== false,
        qualification: r.qualification || edu.degree || '',
        eligible_branches: r.eligible_branches || edu.branch || '',
        min_cgpa: r.min_cgpa || edu.minimum_cgpa || null,
        status: isExpired ? 'expired' : r.status,
        is_expired: isExpired,
        published: (!isExpired && r.status === 'published') ? 1 : 0,
        applicationsCount: parseInt(r.applications_count, 10) || 0,
        created_at: r.created_at,
        updated_at: r.updated_at,
        edu_degree: edu.degree || '',
        edu_branches: edu.branch || '',
        edu_min_cgpa: edu.minimum_cgpa || '',
        edu_grad_years: edu.graduation_year_from ? `${edu.graduation_year_from}–${edu.graduation_year_to}` : '',
        edu_eligibility_mandatory: edu.is_mandatory ? 1 : 0
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error('[ADMIN GET JOBS ERROR]', err);
    res.status(500).json({ error: 'Failed to load jobs.' });
  }
});

// Admin Create Job (Complete Comprehensive Metadata)
app.post('/api/admin/jobs', requireAdmin, async (req, res) => {
  const b = req.body;
  if (!b.title || !b.company) {
    return res.status(400).json({ error: 'Job title and company name are required.' });
  }

  try {
    // 1. Ensure company exists or create
    let companyId = null;
    try {
      const compCheck = await query(`SELECT id FROM public.companies WHERE name ILIKE $1`, [b.company.trim()]);
      if (compCheck.rows.length > 0) {
        companyId = compCheck.rows[0].id;
      } else {
        const compIns = await query(`
          INSERT INTO public.companies (name, logo_url, industry, company_type, location)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id
        `, [
          b.company.trim(),
          b.logo || null,
          b.industry || 'Information Technology',
          b.company_type || 'Product',
          b.location || 'Pune, Maharashtra'
        ]);
        companyId = compIns.rows[0]?.id || null;
      }
    } catch (e) {
      console.warn('Company auto-creation non-blocking warning:', e.message);
    }

    const postingDate = b.posting_date ? new Date(b.posting_date).toISOString() : new Date().toISOString();
    const openingDate = b.application_opening_date ? new Date(b.application_opening_date).toISOString() : postingDate;
    const deadline = b.application_deadline || b.deadline || null;
    const isExpired = deadline ? new Date(deadline) < new Date() : false;
    const statusVal = isExpired ? 'expired' : (b.published ? 'published' : (b.status || 'draft'));

    const jobRes = await query(`
      INSERT INTO public.jobs (
        company_id, title, company_name, company_logo_path, description, responsibilities, requirements,
        job_type, work_mode, location, experience_required, industry, company_type,
        salary_min, salary_max, salary_period, stipend, openings,
        posting_date, application_opening_date, application_deadline, application_method,
        external_application_url, internal_application_enabled,
        qualification, eligible_branches, min_cgpa, is_expired,
        status, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18,
        $19, $20, $21, $22,
        $23, $24,
        $25, $26, $27, $28,
        $29, $30
      )
      RETURNING *;
    `, [
      companyId,
      b.title.trim(),
      b.company.trim(),
      b.logo || null,
      b.jd || b.description || b.title,
      b.responsibilities || '',
      b.requirements || '',
      b.type || 'Full-time',
      b.workplace || 'Hybrid',
      b.location || 'Pune, Maharashtra',
      b.experience || '0–2 years',
      b.industry || 'Information Technology',
      b.company_type || 'Product',
      b.salary_min ? parseFloat(b.salary_min) : null,
      b.salary_max ? parseFloat(b.salary_max) : null,
      b.salary_period || 'Annual',
      b.stipend || null,
      parseInt(b.openings, 10) || 1,
      postingDate,
      openingDate,
      deadline ? new Date(deadline).toISOString() : null,
      b.application_method || 'both',
      b.external_application_url || null,
      b.internal_application_enabled !== false,
      b.qualification || b.edu_degree || 'BE / B.Tech / BCA / MCA / M.Tech',
      b.eligible_branches || b.edu_branches || 'Computer Engineering, Information Technology, AI & DS',
      b.min_cgpa || b.edu_min_cgpa ? parseFloat(b.min_cgpa || b.edu_min_cgpa) : 6.0,
      isExpired,
      statusVal,
      req.user.id
    ]);

    const newJob = jobRes.rows[0];

    // Education requirement entry
    if (b.edu_degree || b.qualification) {
      await query(`
        INSERT INTO public.job_education_requirements (
          job_id, education_level, degree, branch, minimum_cgpa, is_mandatory
        ) VALUES ($1, 'Higher Education', $2, $3, $4, $5)
      `, [
        newJob.id,
        b.edu_degree || b.qualification,
        b.edu_branches || b.eligible_branches || 'All Eligible',
        parseFloat(b.edu_min_cgpa || b.min_cgpa) || null,
        Boolean(b.edu_eligibility_mandatory !== 0)
      ]);
    }

    // Skills association
    if (b.skills) {
      const skillsArr = b.skills.split(',').map(s => s.trim()).filter(Boolean);
      for (const sName of skillsArr) {
        let sRes = await query(`SELECT id FROM public.skills WHERE name ILIKE $1`, [sName]);
        let sId = sRes.rows[0]?.id;
        if (!sId) {
          const ins = await query(`INSERT INTO public.skills (name, category) VALUES ($1, 'Technical') RETURNING id`, [sName]);
          sId = ins.rows[0].id;
        }
        await query(`INSERT INTO public.job_skills (job_id, skill_id, is_required) VALUES ($1, $2, TRUE) ON CONFLICT DO NOTHING`, [newJob.id, sId]);
      }
    }

    await createAuditLog(req.user.id, 'create_job', 'job', newJob.id, null, {
      title: newJob.title,
      company: newJob.company_name,
      status: newJob.status,
      application_method: newJob.application_method
    });

    res.json({ ok: true, job: newJob });
  } catch (err) {
    console.error('[ADMIN CREATE JOB ERROR]', err);
    res.status(500).json({ error: 'Failed to create job.' });
  }
});

// Admin Update Job
app.put('/api/admin/jobs/:id', requireAdmin, async (req, res) => {
  const jobId = req.params.id;
  const b = req.body;

  try {
    const existing = await query(`SELECT * FROM public.jobs WHERE id = $1`, [jobId]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Job not found.' });

    const current = existing.rows[0];
    const deadline = b.application_deadline !== undefined ? b.application_deadline : current.application_deadline;
    const isExpired = b.is_expired !== undefined 
      ? b.is_expired 
      : (deadline ? new Date(deadline) < new Date() : false);

    let statusVal = current.status;
    if (b.status) {
      statusVal = b.status;
    } else if (b.published !== undefined) {
      statusVal = b.published ? 'published' : 'draft';
    }
    if (isExpired && statusVal === 'published') {
      statusVal = 'expired';
    }

    const updateRes = await query(`
      UPDATE public.jobs SET
        title = COALESCE($1, title),
        company_name = COALESCE($2, company_name),
        company_logo_path = COALESCE($3, company_logo_path),
        description = COALESCE($4, description),
        responsibilities = COALESCE($5, responsibilities),
        requirements = COALESCE($6, requirements),
        job_type = COALESCE($7, job_type),
        work_mode = COALESCE($8, work_mode),
        location = COALESCE($9, location),
        experience_required = COALESCE($10, experience_required),
        industry = COALESCE($11, industry),
        company_type = COALESCE($12, company_type),
        salary_min = COALESCE($13, salary_min),
        salary_max = COALESCE($14, salary_max),
        salary_period = COALESCE($15, salary_period),
        stipend = COALESCE($16, stipend),
        openings = COALESCE($17, openings),
        posting_date = COALESCE($18, posting_date),
        application_opening_date = COALESCE($19, application_opening_date),
        application_deadline = $20,
        application_method = COALESCE($21, application_method),
        external_application_url = $22,
        internal_application_enabled = COALESCE($23, internal_application_enabled),
        qualification = COALESCE($24, qualification),
        eligible_branches = COALESCE($25, eligible_branches),
        min_cgpa = COALESCE($26, min_cgpa),
        is_expired = $27,
        status = $28,
        updated_at = now()
      WHERE id = $29
      RETURNING *;
    `, [
      b.title,
      b.company || b.company_name,
      b.logo || b.company_logo_path,
      b.jd || b.description,
      b.responsibilities,
      b.requirements,
      b.type || b.job_type,
      b.workplace || b.work_mode,
      b.location,
      b.experience || b.experience_required,
      b.industry,
      b.company_type,
      b.salary_min !== undefined ? parseFloat(b.salary_min) : null,
      b.salary_max !== undefined ? parseFloat(b.salary_max) : null,
      b.salary_period,
      b.stipend,
      b.openings ? parseInt(b.openings, 10) : null,
      b.posting_date ? new Date(b.posting_date).toISOString() : null,
      b.application_opening_date ? new Date(b.application_opening_date).toISOString() : null,
      deadline ? new Date(deadline).toISOString() : null,
      b.application_method,
      b.external_application_url !== undefined ? b.external_application_url : current.external_application_url,
      b.internal_application_enabled !== undefined ? Boolean(b.internal_application_enabled) : current.internal_application_enabled,
      b.qualification || b.edu_degree,
      b.eligible_branches || b.edu_branches,
      b.min_cgpa || b.edu_min_cgpa ? parseFloat(b.min_cgpa || b.edu_min_cgpa) : null,
      isExpired,
      statusVal,
      jobId
    ]);

    // Update skills if provided
    if (b.skills) {
      await query(`DELETE FROM public.job_skills WHERE job_id = $1`, [jobId]);
      const skillsArr = b.skills.split(',').map(s => s.trim()).filter(Boolean);
      for (const sName of skillsArr) {
        let sRes = await query(`SELECT id FROM public.skills WHERE name ILIKE $1`, [sName]);
        let sId = sRes.rows[0]?.id;
        if (!sId) {
          const ins = await query(`INSERT INTO public.skills (name, category) VALUES ($1, 'Technical') RETURNING id`, [sName]);
          sId = ins.rows[0].id;
        }
        await query(`INSERT INTO public.job_skills (job_id, skill_id, is_required) VALUES ($1, $2, TRUE) ON CONFLICT DO NOTHING`, [jobId, sId]);
      }
    }

    await createAuditLog(req.user.id, 'update_job', 'job', jobId, existing.rows[0], updateRes.rows[0]);

    res.json({ ok: true, job: updateRes.rows[0] });
  } catch (err) {
    console.error('[ADMIN UPDATE JOB ERROR]', err);
    res.status(500).json({ error: 'Failed to update job.' });
  }
});

// Admin Candidate Talent Pool List
app.get('/api/admin/candidates', requireAdmin, async (req, res) => {
  const { q, degree, minCgpa } = req.query;

  let sql = `
    SELECT 
      p.id, p.user_id, p.full_name, p.email, p.phone, p.bio, p.profile_photo_path, p.created_at,
      e.institution as college_name, e.degree, e.branch, e.end_year as graduation_year, e.cgpa as current_cgpa,
      (SELECT count(*) FROM public.applications a WHERE a.candidate_id = p.user_id) as applications_count,
      COALESCE(
        (SELECT json_agg(json_build_object('name', s.name, 'category', s.category))
         FROM public.candidate_skills cs JOIN public.skills s ON cs.skill_id = s.id WHERE cs.user_id = p.user_id), '[]'::json
      ) as skills_list
    FROM public.profiles p
    LEFT JOIN LATERAL (
      SELECT degree, branch, institution, end_year, cgpa 
      FROM public.education 
      WHERE user_id = p.user_id 
      ORDER BY start_year DESC NULLS LAST LIMIT 1
    ) e ON true
    WHERE 1=1
  `;
  const params = [];

  if (q) {
    params.push(`%${q}%`);
    sql += ` AND (p.full_name ILIKE $${params.length} OR p.email ILIKE $${params.length} OR e.institution ILIKE $${params.length})`;
  }

  if (degree && degree !== 'all') {
    params.push(degree);
    sql += ` AND e.degree ILIKE $${params.length}`;
  }

  if (minCgpa) {
    params.push(parseFloat(minCgpa));
    sql += ` AND e.cgpa >= $${params.length}`;
  }

  sql += ` ORDER BY p.created_at DESC LIMIT 50`;

  try {
    const result = await query(sql, params);
    const candidates = result.rows.map(r => ({
      id: r.user_id || r.id,
      userId: r.user_id,
      name: r.full_name || 'Candidate',
      email: r.email,
      phone: r.phone || '',
      headline: `${r.degree || 'B.Tech'} student`,
      bio: r.bio || '',
      avatar: r.profile_photo_path,
      college: r.college_name || 'Engineering Institute of Pune',
      degree: r.degree || 'B.Tech',
      branch: r.branch || 'Computer Engineering',
      graduationYear: r.graduation_year || 2026,
      cgpa: r.current_cgpa ? parseFloat(r.current_cgpa) : 7.5,
      applicationsCount: parseInt(r.applications_count, 10) || 0,
      skills: (r.skills_list || []).map(s => s.name),
      createdAt: r.created_at
    }));
    res.json(candidates);
  } catch (err) {
    console.error('[ADMIN CANDIDATES ERROR]', err);
    res.status(500).json({ error: 'Failed to retrieve candidate pool.' });
  }
});

// Admin Delete Job
app.delete('/api/admin/jobs/:id', requireAdmin, async (req, res) => {
  const jobId = req.params.id;
  try {
    const existing = await query(`SELECT * FROM public.jobs WHERE id = $1`, [jobId]);
    await query(`DELETE FROM public.jobs WHERE id = $1`, [jobId]);
    await createAuditLog(req.user.id, 'delete_job', 'job', jobId, existing.rows[0] || null, null);
    res.json({ ok: true });
  } catch (err) {
    console.error('[ADMIN DELETE JOB ERROR]', err);
    res.status(500).json({ error: 'Failed to delete job.' });
  }
});

// Admin Update Application Status
app.patch('/api/admin/applications/:id', requireAdmin, async (req, res) => {
  const appId = req.params.id;
  const { status, notes } = req.body;
  if (!status) return res.status(400).json({ error: 'Status is required.' });

  try {
    const appRes = await query(`
      SELECT a.*, j.title as job_title, p.email as candidate_email, p.full_name as candidate_name
      FROM public.applications a
      JOIN public.jobs j ON a.job_id = j.id
      JOIN public.profiles p ON a.candidate_id = p.user_id
      WHERE a.id = $1
    `, [appId]);

    if (appRes.rows.length === 0) return res.status(404).json({ error: 'Application not found.' });

    const application = appRes.rows[0];
    const oldStatus = application.application_status;

    // Update Application Status
    await query(`UPDATE public.applications SET application_status = $1, updated_at = now() WHERE id = $2`, [status, appId]);

    // Record Status History
    await query(`
      INSERT INTO public.application_status_history (application_id, old_status, new_status, changed_by)
      VALUES ($1, $2, $3, $4)
    `, [appId, oldStatus, status, req.user.id]);

    // Create Candidate Notification
    await query(`
      INSERT INTO public.notifications (user_id, title, message, type, related_job_id, related_application_id)
      VALUES ($1, $2, $3, 'status_updated', $4, $5)
    `, [
      application.candidate_id,
      `Application Status Update: ${application.job_title}`,
      `Your application for ${application.job_title} was updated to "${status}".`,
      application.job_id,
      appId
    ]);

    // Create Audit Log
    await createAuditLog(req.user.id, 'update_application_status', 'application', appId, { status: oldStatus }, { status, notes });

    // Send Email Notification
    await emailService.sendApplicationStatusUpdate({
      candidateEmail: application.candidate_email,
      candidateName: application.candidate_name,
      jobTitle: application.job_title,
      newStatus: status
    });

    res.json({ ok: true, status });
  } catch (err) {
    console.error('[ADMIN APP STATUS UPDATE ERROR]', err);
    res.status(500).json({ error: 'Failed to update application status.' });
  }
});

// Admin View Full Candidate Profile & Signed Resume URL
app.get('/api/admin/candidates/:id', requireAdmin, async (req, res) => {
  const candidateId = req.params.id;
  try {
    const [profRes, eduRes, expRes, skillRes, projRes, certRes] = await Promise.all([
      query(`SELECT * FROM public.profiles WHERE user_id = $1`, [candidateId]),
      query(`SELECT * FROM public.education WHERE user_id = $1 ORDER BY start_year DESC`, [candidateId]),
      query(`SELECT * FROM public.experience WHERE user_id = $1 ORDER BY start_date DESC`, [candidateId]),
      query(`
        SELECT cs.*, s.name as skill_name 
        FROM public.candidate_skills cs
        JOIN public.skills s ON cs.skill_id = s.id
        WHERE cs.user_id = $1
      `, [candidateId]),
      query(`SELECT * FROM public.projects WHERE user_id = $1`, [candidateId]),
      query(`SELECT * FROM public.certifications WHERE user_id = $1`, [candidateId])
    ]);

    if (profRes.rows.length === 0) return res.status(404).json({ error: 'Candidate not found.' });

    // Generate signed resume URL if file exists
    let signedResumeUrl = null;
    try {
      const { data: files } = await supabase.storage.from('resumes').list(candidateId);
      if (files && files.length > 0) {
        const { data: signData } = await supabase.storage
          .from('resumes')
          .createSignedUrl(`${candidateId}/${files[0].name}`, 3600);
        signedResumeUrl = signData?.signedUrl || null;
      }
    } catch (e) {
      console.warn('Resume signed URL error:', e.message);
    }

    // Record view in recruiter_profile_views
    try {
      await query(`
        INSERT INTO public.recruiter_profile_views (recruiter_id, candidate_id)
        VALUES ($1, $2)
      `, [req.user.id, candidateId]);
    } catch (e) {
      // non-blocking
    }

    res.json({
      profile: profRes.rows[0],
      education: eduRes.rows,
      experience: expRes.rows,
      skills: skillRes.rows,
      projects: projRes.rows,
      certifications: certRes.rows,
      signedResumeUrl
    });
  } catch (err) {
    console.error('[ADMIN CANDIDATE DETAILS ERROR]', err);
    res.status(500).json({ error: 'Failed to load candidate details.' });
  }
});

// Admin Audit Logs (Strictly Hidden from Candidates)
app.get('/api/admin/audit-logs', requireAdmin, async (req, res) => {
  try {
    const result = await query(`
      SELECT al.*, au.name as admin_name, au.email as admin_email
      FROM public.audit_logs al
      LEFT JOIN public.admin_users au ON al.admin_user_id = au.user_id
      ORDER BY al.created_at DESC
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('[AUDIT LOGS ERROR]', err);
    res.status(500).json({ error: 'Failed to retrieve audit logs.' });
  }
});

// Admin Accounts (Strictly Capped at 3)
app.get('/api/admin/admins', requireAdmin, async (req, res) => {
  try {
    const result = await query(`SELECT id, email, name, is_active, created_at FROM public.admin_users ORDER BY created_at ASC`);
    res.json(result.rows);
  } catch (err) {
    console.error('[ADMINS LIST ERROR]', err);
    res.status(500).json({ error: 'Failed to retrieve admin accounts.' });
  }
});

// -----------------------------------------------------------------------------
// 7. CONTACT FORM (Stored Securely in PostgreSQL, CEO Routed)
// -----------------------------------------------------------------------------
app.post('/api/contact', contactRateLimiter, async (req, res) => {
  const { name, email, phone, company, subject, message, captchaToken } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }

  // Verify CAPTCHA if enabled
  const captchaResult = await captchaService.verifyToken(captchaToken, req.ip);
  if (!captchaResult.success) {
    return res.status(400).json({ error: 'Security verification failed. Please complete the CAPTCHA.' });
  }

  try {
    const result = await query(`
      INSERT INTO public.contact_messages (
        name, email, phone, company_or_organization, subject, message, status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending')
      RETURNING *;
    `, [name.trim(), email.trim(), phone || null, company || null, subject || 'Student Career Inquiry', message.trim()]);

    // Send email notification to leadership
    await emailService.sendContactNotification({
      name,
      email,
      phone,
      subject,
      message,
      company
    });

    res.json({
      ok: true,
      message: 'Your message has been received by PlacioBridge executive management.'
    });
  } catch (err) {
    console.error('[CONTACT ERROR]', err);
    res.status(500).json({ error: 'Failed to save contact message.' });
  }
});

// -----------------------------------------------------------------------------
// 8. PLACIOBRIDGE TEAM API SERVICE PROXY
// -----------------------------------------------------------------------------
app.get('/api/team', async (req, res) => {
  try {
    const members = await teamService.getTeamMembers();
    res.json(members);
  } catch (err) {
    console.warn('[TEAM API ERROR]', err.message);
    res.json([]);
  }
});

// -----------------------------------------------------------------------------
// SERVE STATIC CLIENT IN PRODUCTION
// -----------------------------------------------------------------------------
const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) res.status(404).send('Not Found');
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Hire-Placio Production Supabase Backend active on http://localhost:${PORT}`);
  });
}

export { app };
