import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Search,
  MapPin,
  Briefcase,
  Clock,
  User,
  LogIn,
  ChevronRight,
  ShieldCheck,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  ExternalLink,
  Sparkles,
  Award,
  Compass,
  CheckCircle2,
  Building,
  Target
} from 'lucide-react';

import './styles.css';
import { authService } from './services/authService';
import { jobService } from './services/jobService';
import ContactSection from './components/ContactSection';
import CandidateWizard from './components/CandidateWizard';
import CandidateDashboard from './components/CandidateDashboard';
import SmartApplyModal from './components/SmartApplyModal';
import AdminPortal from './components/AdminPortal';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';

function Header({ user, onAuth, currentRoute }) {
  const [open, setOpen] = useState(false);

  const handleSignOut = () => {
    authService.logout();
    onAuth(null);
    location.hash = '#/';
  };

  return (
    <header>
      <div className="nav">
        <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img
            src="/assets/hire-placio-logo.svg"
            alt="Hire-Placio Logo"
            title="Click to enter Placio-Hire Admin Portal"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              location.hash = '#/admin';
            }}
            style={{ cursor: 'pointer', height: 38 }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const fallback = document.getElementById('brand-fallback-icon');
              if (fallback) fallback.style.display = 'inline-flex';
            }}
          />
          <span
            id="brand-fallback-icon"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              location.hash = '#/admin';
            }}
            title="Click to enter Placio-Hire Admin Portal"
            style={{
              display: 'none',
              cursor: 'pointer',
              background: 'rgba(255, 91, 46, 0.15)',
              border: '1px solid var(--orange)',
              borderRadius: '8px',
              padding: '6px 8px',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--orange)'
            }}
          >
            <ShieldCheck size={22} />
          </span>
          <a className="brand-text" href="#/" style={{ textDecoration: 'none' }}>
            <span>
              HIRE-<span>PLACIO</span>
            </span>
            <span className="byline-tag">by PlacioBridge</span>
          </a>
        </div>

        <button className="mobile" onClick={() => setOpen(!open)} aria-label="Toggle navigation">
          {open ? <X /> : <Menu />}
        </button>

        <nav className={open ? 'show' : ''} onClick={() => setOpen(false)}>
          <a href="#/jobs">Find Jobs</a>
          <a href="#/how">How It Works</a>
          <a href="#/about">About</a>
          <a href="#/contact">Contact</a>

          {user && user.role !== 'admin' && (
            <>
              <a href="#/dashboard" style={{ color: 'var(--orange)' }}>
                <Sparkles size={15} /> Dashboard &amp; Matches
              </a>
              <a href="#/wizard">
                <User size={15} /> Profile Wizard ({user.completionPercentage || 0}%)
              </a>
            </>
          )}

          {user?.role === 'admin' && (
            <a href="#/admin" style={{ color: 'var(--orange)' }}>
              <LayoutDashboard size={16} /> Admin Console
            </a>
          )}

          {user ? (
            <button className="link" onClick={handleSignOut}>
              <LogOut size={16} /> Sign out ({user.name ? user.name.split(' ')[0] : 'User'})
            </button>
          ) : (
            <>
              <a href="#/login">Sign In</a>
              <a className="btn small" href="#/register">
                Get Started
              </a>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  const [searchVal, setSearchVal] = useState('');
  const chips = ['React', 'Next.js', 'TypeScript', 'Python', 'Cloud & DevOps', 'Applied AI', 'Docker', 'SaaS'];

  const triggerSearch = () => {
    if (searchVal.trim()) {
      location.hash = '#/jobs?search=' + encodeURIComponent(searchVal.trim());
    } else {
      location.hash = '#/jobs';
    }
  };

  return (
    <>
      <section className="hero">
        <div className="hero-left">
          <div className="eyebrow">
            <Sparkles size={14} /> PLACIOBRIDGE TECHNOLOGIES • CAREER PORTAL
          </div>
          <h1>
            Bridge Your Career to <em>Top Tech Roles</em>
            <br />
            With Hire-Placio
          </h1>
          <p>
            Powered by <strong>PlacioBridge Technologies LLP</strong>. Discover verified internships, campus
            recruitment drives, and high-impact engineering roles in Full-Stack, Cloud &amp; DevOps, and Applied AI.
          </p>

          <div className="searchbar">
            <Search />
            <input
              placeholder="Search by skills (React, Python, Cloud, AI) or role"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && triggerSearch()}
            />
            <button onClick={triggerSearch}>Search Jobs</button>
          </div>

          <div className="chips">
            {chips.map((chip) => (
              <span
                key={chip}
                onClick={() => {
                  location.hash = '#/jobs?search=' + encodeURIComponent(chip);
                }}
              >
                {chip}
              </span>
            ))}
          </div>
        </div>

        {/* Circular Share Frame with Ambient Effects & Edge Fade */}
        <div className="heroart">
          <div className="circle-frame-wrap">
            <div className="circle-ambient-glow"></div>
            <div className="circle-border-outer"></div>
            <div className="circle-border-dashed"></div>
            <div className="circle-backdrop-fill"></div>

            <img
              className="hero-person-img"
              src="/assets/hero-manager.png"
              alt="Confident HR Manager - Hire-Placio"
              onError={(e) => {
                e.currentTarget.src =
                  'https://static.vecteezy.com/system/resources/previews/051/444/320/non_2x/confident-hr-manager-holding-clipboard-with-leadership-smile-on-transparent-background-free-png.png';
              }}
            />

            {/* Seamless curved bottom fade concealing cropped bottom edge */}
            <div className="circle-bottom-fade"></div>
          </div>

          {/* Floating Badges */}
          <div className="float-badge side-left">
            <ShieldCheck className="badge-svg" />
            <div>
              <b>Verified Opportunities</b>
              <span>100% Curated by PlacioBridge</span>
            </div>
          </div>

          <div className="float-badge side-right">
            <div className="badge-icon">⚡</div>
            <div>
              <b>2,000+ Placed</b>
              <span>AICTE &amp; Campus Drives</span>
            </div>
          </div>
        </div>
      </section>

      <section className="trust">
        <span>PLACIOBRIDGE PARTNER ECOSYSTEM</span>
        <span>2,000+ STUDENTS TRAINED &amp; PLACED</span>
        <span>AICTE-ALIGNED HIRING</span>
        <span>FLAGSHIP EDTECH SAAS: PLACIO</span>
      </section>

      <section className="steps" id="steps">
        <div>
          <span>01 DISCOVER</span>
          <h3>Explore Roles</h3>
          <p>
            Find entry-level roles and paid internships across Modern Web, Cloud Infrastructure, and AI Engineering tracks.
          </p>
        </div>
        <div>
          <span>02 APPLY &amp; ASSESS</span>
          <h3>Direct Applications</h3>
          <p>
            Apply instantly with your student profile, verified skills, and resume without middleman delays.
          </p>
        </div>
        <div>
          <span>03 GROW WITH PLACIO</span>
          <h3>Launch Your Career</h3>
          <p>
            Work directly on production-grade systems with PlacioBridge Technologies or our trusted partner companies.
          </p>
        </div>
      </section>

      {/* Section 8: Professional About Us Platform Introduction */}
      <AboutSection />

      {/* Section 10: Redesigned Contact Section (Server-side CEO routing & CAPTCHA) */}
      <ContactSection />
    </>
  );
}

function AboutSection() {
  return (
    <section className="about-platform-section" style={{ padding: '80px 24px', maxWidth: 1200, margin: '0 auto' }}>
      <div className="section-head">
        <div className="eyebrow">
          <Building size={14} /> ABOUT PLACIOBRIDGE TECHNOLOGIES
        </div>
        <h2>Engineering Future Tech Careers</h2>
        <p>
          Bridging the gap between engineering college talent and high-growth technology enterprises.
        </p>
      </div>

      <div className="about-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
        <div className="panel" style={{ margin: 0 }}>
          <div style={{ color: 'var(--orange)', marginBottom: 12 }}>
            <Target size={28} />
          </div>
          <h3 style={{ margin: '0 0 8px' }}>Our Mission</h3>
          <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6 }}>
            To empower students and freshers across tier-1, tier-2, and tier-3 colleges with verified, skill-validated opportunities in Full Stack, Cloud &amp; DevOps, and Applied Artificial Intelligence.
          </p>
        </div>

        <div className="panel" style={{ margin: 0 }}>
          <div style={{ color: 'var(--orange)', marginBottom: 12 }}>
            <Sparkles size={28} />
          </div>
          <h3 style={{ margin: '0 0 8px' }}>Our Vision</h3>
          <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6 }}>
            Build India's most transparent student hiring ecosystem where transparent match scores eliminate ghost jobs and connect candidates based on verified engineering competence.
          </p>
        </div>

        <div className="panel" style={{ margin: 0 }}>
          <div style={{ color: 'var(--orange)', marginBottom: 12 }}>
            <Award size={28} />
          </div>
          <h3 style={{ margin: '0 0 8px' }}>What Hire-Placio Delivers</h3>
          <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6 }}>
            Multi-step candidate onboarding, structured skill taxonomies, automated educational eligibility verification, and direct integration with Placio Smart Campus recruitment drives.
          </p>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <main className="page">
      <div className="pagehead">
        <div>
          <div className="eyebrow">HIRING WORKFLOW</div>
          <h2>How Hire-Placio Works</h2>
          <p>A transparent and streamlined process built specifically for students and emerging talent.</p>
        </div>
        <a className="btn" href="#/jobs">
          Explore Jobs
        </a>
      </div>

      <div className="steps" style={{ padding: '10px 0 40px' }}>
        <div>
          <span>PHASE 1</span>
          <h3>Student Profile Wizard</h3>
          <p>
            Create your account with your educational background, tech stack (React, Node, Python, Cloud), projects, and latest resume.
          </p>
        </div>
        <div>
          <span>PHASE 2</span>
          <h3>Verified Job Matches</h3>
          <p>
            Browse real, active roles curated by PlacioBridge Technologies with clear eligibility, responsibilities, and stipends.
          </p>
        </div>
        <div>
          <span>PHASE 3</span>
          <h3>Assessment &amp; Offer</h3>
          <p>
            Undergo practical code reviews, interview drives, and track your application status in real-time.
          </p>
        </div>
      </div>
    </main>
  );
}

function About() {
  return (
    <main className="page">
      <div className="pagehead">
        <div>
          <div className="eyebrow">ABOUT THE COMPANY</div>
          <h2>PlacioBridge Technologies LLP</h2>
          <p>Engineering mission-critical software solutions, scalable cloud systems, and AI-driven digital platforms.</p>
        </div>
        <a className="btn secondary" href="https://placiobridge.com" target="_blank" rel="noreferrer">
          Visit placiobridge.com <ExternalLink size={15} />
        </a>
      </div>

      <article style={{ padding: 0 }}>
        <h3>Who We Are</h3>
        <p>
          <strong>PlacioBridge Technologies LLP</strong> builds bespoke software products, scalable cloud platforms,
          and artificial intelligence automation for enterprises, fast-growing startups, and universities across India.
          Our headquarters is based in Pune, Maharashtra.
        </p>

        <h3>Our Flagship Platforms &amp; Services</h3>
        <p>
          • <strong>Custom Software &amp; Web Engineering:</strong> Next.js, React, TypeScript, high-concurrency microservices, and reactive dashboards.<br />
          • <strong>Cloud Architecture &amp; DevOps:</strong> Docker, Kubernetes orchestration, AWS/GCP deployments, and Prometheus monitoring.<br />
          • <strong>Applied AI &amp; Automation:</strong> Custom RAG pipelines, LLM workflows, speech-to-text analytics, and autonomous agent bots.<br />
          • <strong>Placio Smart Campus (Flagship EdTech SaaS):</strong> Unified campus placement management, webcam-proctored coding assessments, AI mock interviews, and LMS compliance.
        </p>

        <h3>Why Hire-Placio?</h3>
        <p>
          Having trained and helped place <strong>over 2,000+ students</strong> across India, Hire-Placio is our dedicated initiative
          to directly connect engineering students and freshers with verified, high-quality technical careers without deceptive job postings.
        </p>
      </article>
    </main>
  );
}

function Contact() {
  return (
    <main className="page">
      <ContactSection />
    </main>
  );
}

function Jobs({ user }) {
  const getParams = () => {
    const raw = location.hash.includes('?') ? location.hash.split('?')[1] : '';
    const sp = new URLSearchParams(raw);
    return { search: sp.get('search') || '', type: sp.get('type') || '' };
  };

  const initial = getParams();
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState(initial.search);
  const [type, setType] = useState(initial.type);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    jobService.getJobs({ search, type })
      .then(setJobs)
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, [search, type]);

  return (
    <main className="page">
      <div className="pagehead">
        <div>
          <div className="eyebrow">OPPORTUNITIES</div>
          <h2>Open Tech Jobs &amp; Internships</h2>
          <p>Verified roles with PlacioBridge Technologies and verified partner companies.</p>
        </div>
        {user ? (
          <a className="btn" href="#/dashboard">
            View Recommended For You
          </a>
        ) : (
          <a className="btn" href="#/register">
            Create Student Profile
          </a>
        )}
      </div>

      <div className="filters">
        <div>
          <Search />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, company, skills (e.g. React, Python, Cloud)"
          />
        </div>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All job types</option>
          <option>Full-time</option>
          <option>Internship</option>
          <option>Part-time</option>
          <option>Contract</option>
        </select>
      </div>

      {loading ? (
        <p style={{ color: 'var(--muted)' }}>Loading opportunities...</p>
      ) : jobs.length === 0 ? (
        <div style={{ padding: '50px 0', textAlign: 'center', color: 'var(--muted)' }}>
          <p>No jobs found matching your search criteria.</p>
          <button className="btn small" onClick={() => { setSearch(''); setType(''); }}>Clear Filters</button>
        </div>
      ) : (
        <div className="grid">
          {jobs.map((j) => (
            <a className="jobcard" href={'#/jobs/' + j.id} key={j.id}>
              <div className="logo">{j.company ? j.company.slice(0, 1) : 'P'}</div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                  <span className="muted" style={{ fontWeight: 600 }}>{j.company}</span>
                  {j.is_expired ? (
                    <span className="status-tag expired" style={{ fontSize: 10, padding: '2px 8px' }}>Applications Closed</span>
                  ) : j.application_deadline ? (
                    <span style={{ fontSize: 11, color: 'var(--orange)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <Clock size={11} /> Deadline: {new Date(j.application_deadline).toLocaleDateString()}
                    </span>
                  ) : null}
                  {j.external_application_url && (
                    <span style={{ fontSize: 11, background: '#f0fdf4', color: '#16a34a', padding: '2px 6px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      Official Portal <ExternalLink size={10} />
                    </span>
                  )}
                </div>
                <h3>{j.title}</h3>
                <p>
                  <MapPin /> {j.location} · <Briefcase /> {j.type} ({j.workplace})
                  {j.salary && <span> · {j.salary}</span>}
                  {j.openings && <span> · {j.openings} Openings</span>}
                </p>
                <div className="tags">
                  {j.skills
                    ? j.skills
                        .split(',')
                        .slice(0, 4)
                        .map((s) => <span key={s.trim()}>{s.trim()}</span>)
                    : null}
                </div>
              </div>
              <ChevronRight />
            </a>
          ))}
        </div>
      )}
    </main>
  );
}

function Job({ user }) {
  const parts = location.hash.split('/');
  const id = parts[2] ? parts[2].split('?')[0] : '';
  const [j, setJ] = useState(null);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    if (id) {
      jobService.getJobById(id)
        .then(setJ)
        .catch(() => setJ(null));
    }
  }, [id]);

  if (!j) return <main className="page">Loading job details...</main>;

  return (
    <main className="page">
      <div className="detail">
        <div className="detailtop">
          <div className="logo big">{j.company ? j.company[0] : 'P'}</div>
          <div>
            <div className="muted">{j.company}</div>
            <h2>{j.title}</h2>
            <p>
              <MapPin /> {j.location} · <Briefcase /> {j.type} · <Clock /> {j.experience}
              {j.salary && <span> · {j.salary}</span>}
            </p>
          </div>
          <div className="applybox">
            {j.is_expired ? (
              <span className="badge" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '10px 18px', fontWeight: 700, borderRadius: 10 }}>
                Applications Closed
              </span>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
                {j.external_application_url && (
                  <a
                    href={j.external_application_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn"
                    style={{
                      background: '#1e293b',
                      color: '#ffffff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: '0 4px 14px rgba(0,0,0,0.1)'
                    }}
                  >
                    Apply on Official Website <ExternalLink size={15} />
                  </a>
                )}

                {j.internal_application_enabled !== false && (
                  user ? (
                    user.role === 'admin' ? (
                      <small style={{ color: 'var(--muted)' }}>Admins manage jobs via Dashboard</small>
                    ) : applied ? (
                      <span className="badge hired">Application Submitted</span>
                    ) : (
                      <button className="btn secondary" onClick={() => setApplyModalOpen(true)}>
                        Apply with Match Analysis
                      </button>
                    )
                  ) : (
                    <a className="btn secondary" href="#/login">
                      Sign in to apply
                    </a>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* Highlight Metadata Banner */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, margin: '20px 0', padding: '16px 20px', background: '#f8fafc', borderRadius: 12, border: '1px solid var(--line)' }}>
          <div>
            <small style={{ color: 'var(--muted)', display: 'block' }}>Application Deadline</small>
            <b style={{ color: j.is_expired ? '#dc2626' : 'var(--orange)' }}>
              {j.application_deadline ? new Date(j.application_deadline).toLocaleDateString() : 'Rolling Application'}
            </b>
          </div>
          <div>
            <small style={{ color: 'var(--muted)', display: 'block' }}>Openings Available</small>
            <b>{j.openings || 1} Openings</b>
          </div>
          <div>
            <small style={{ color: 'var(--muted)', display: 'block' }}>Workplace Model</small>
            <b>{j.workplace || 'Hybrid'}</b>
          </div>
          <div>
            <small style={{ color: 'var(--muted)', display: 'block' }}>Minimum CGPA</small>
            <b>{j.min_cgpa || j.edu_min_cgpa || 'No minimum cut-off'}</b>
          </div>
        </div>

        <article>
          {j.jd && (
            <>
              <h3>Job Overview &amp; Mission</h3>
              <p>{j.jd}</p>
            </>
          )}
          {j.responsibilities && (
            <>
              <h3>Key Responsibilities</h3>
              <p>{j.responsibilities}</p>
            </>
          )}
          {j.requirements && (
            <>
              <h3>Requirements &amp; Technical Stacks</h3>
              <p>{j.requirements}</p>
            </>
          )}
          {j.eligibility && (
            <>
              <h3>Candidate Eligibility</h3>
              <p>{j.eligibility}</p>
            </>
          )}
          {j.edu_degree && (
            <>
              <h3>Education Criteria</h3>
              <p>
                <b>Degree:</b> {j.edu_degree} · <b>Branches:</b> {j.edu_branches || 'All'} · <b>Min CGPA:</b> {j.edu_min_cgpa || 'None'} · <b>Batches:</b> {j.edu_grad_years || 'Any'}
                <br />
                <b>Eligibility Status:</b> {j.edu_eligibility_mandatory ? 'Mandatory (Strict Requirement)' : 'Preferred (Flexible)'}
              </p>
            </>
          )}
          {j.skills && (
            <>
              <h3>Required Skills</h3>
              <div className="tags">
                {j.skills.split(',').map((s) => (
                  <span key={s.trim()}>{s.trim()}</span>
                ))}
              </div>
            </>
          )}
        </article>
      </div>

      {applyModalOpen && (
        <SmartApplyModal
          job={j}
          user={user}
          onClose={() => setApplyModalOpen(false)}
          onAppliedSuccess={() => setApplied(true)}
        />
      )}
    </main>
  );
}

function Auth({ register, onAuth }) {
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    try {
      setLoading(true);
      let d;
      if (register) {
        d = await authService.register(f.name, f.email, f.password);
      } else {
        d = await authService.login(f.email, f.password);
      }
      onAuth(d.user);
      location.hash = d.user.role === 'admin' ? '#/admin' : '#/dashboard';
    } catch (e) {
      setError(e.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth">
      <div className="authbox">
        <div className="eyebrow">HIRE-PLACIO</div>
        <h2>{register ? 'Create Student Profile' : 'Welcome to Hire-Placio'}</h2>
        <p>
          {register
            ? 'Sign up to receive personalized recommendations and apply for PlacioBridge verified roles.'
            : 'Sign in to access personalized recommendations and track your recruitment pipeline.'}
        </p>

        {error && (
          <div className="contact-alert error" style={{ marginBottom: 14 }}>
            <span>{error}</span>
          </div>
        )}

        {register && (
          <input
            placeholder="Full Name *"
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
          />
        )}
        <input
          placeholder="Email Address *"
          type="email"
          value={f.email}
          onChange={(e) => setF({ ...f, email: e.target.value })}
        />
        <input
          placeholder="Password *"
          type="password"
          value={f.password}
          onChange={(e) => setF({ ...f, password: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
        {!register && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6, marginBottom: 14 }}>
            <a
              href="#/forgot-password"
              className="link small"
              style={{ fontSize: 13, color: 'var(--orange)', textDecoration: 'none', fontWeight: 600 }}
            >
              Forgot Password?
            </a>
          </div>
        )}
        <button className="btn full" disabled={loading} onClick={handleSubmit}>
          {loading ? 'Processing...' : register ? 'Create Candidate Account' : 'Sign In'}
        </button>
        <p className="center">
          {register ? 'Already have an account? ' : 'New to Hire-Placio? '}
          <a href={register ? '#/login' : '#/register'}>
            {register ? 'Sign in' : 'Create candidate account'}
          </a>
        </p>
      </div>
    </main>
  );
}

function Footer() {
  return (
    <footer>
      <div className="footer-inner">
        <div className="footer-col">
          <div className="footer-brand">
            <img src="/assets/hire-placio-logo.svg" alt="Hire-Placio" width="28" height="28" />
            <span>
              HIRE-<span>PLACIO</span>
            </span>
          </div>
          <p>
            The official student recruitment &amp; tech career acceleration platform by <strong>PlacioBridge Technologies LLP</strong>.
            Connecting ambitious students and freshers to verified software engineering opportunities.
          </p>
          <p style={{ fontSize: '13px' }}>
            Flagship EdTech Platform: <strong>Placio Smart Campus</strong>
          </p>
        </div>

        <div className="footer-col">
          <h4>SOLUTIONS &amp; TRACKS</h4>
          <ul>
            <li><a href="https://placiobridge.com/services#custom-software" target="_blank" rel="noreferrer">Custom Web Engineering</a></li>
            <li><a href="https://placiobridge.com/services#cloud-devops" target="_blank" rel="noreferrer">Cloud &amp; DevOps Systems</a></li>
            <li><a href="https://placiobridge.com/services#applied-ai" target="_blank" rel="noreferrer">Applied AI &amp; Automation</a></li>
            <li><a href="https://placiobridge.com/services#saas-modernization" target="_blank" rel="noreferrer">SaaS Modernization</a></li>
            <li><a href="https://placiobridge.com/products" target="_blank" rel="noreferrer">Placio Smart Campus Platform</a></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>PORTAL NAVIGATION</h4>
          <ul>
            <li><a href="#/jobs">Find Open Jobs</a></li>
            <li><a href="#/dashboard">Candidate Dashboard</a></li>
            <li><a href="#/wizard">Profile Setup Wizard</a></li>
            <li><a href="#/how">How It Works</a></li>
            <li><a href="#/about">About PlacioBridge</a></li>
            <li><a href="#/contact">Contact &amp; Support</a></li>
            <li><a href="#/admin">Admin Console</a></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>EXECUTIVE CONTACT</h4>
          <p style={{ margin: '0 0 4px', fontWeight: 700, color: '#fff' }}>
            Sahil Shaikh
          </p>
          <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--muted)' }}>
            Lead Executive, PlacioBridge Technologies LLP
          </p>
          <p style={{ margin: '0 0 6px' }}>
            Phone: <a href="tel:+918329594512" style={{ color: '#fff', fontWeight: 600 }}>+91 83295 94512</a>
          </p>
          <p style={{ margin: '0 0 12px' }}>
            Email: <a href="mailto:sahilshaikhcse@gmail.com" style={{ color: 'var(--orange)' }}>sahilshaikhcse@gmail.com</a>
          </p>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
            Office number 125, 1st floor, Sunshine Joy Complex, Pawale Plaza, Main Pirangut Stand, Pune - 412115, Maharashtra
          </p>
        </div>
      </div>

      <div className="footer-bottom">
        <div>
          © 2026 <strong>PlacioBridge Technologies LLP</strong>. All rights reserved.
        </div>
        <div>
          Hire-Placio Platform • AICTE Aligned • 2,000+ Students Placed
        </div>
      </div>
    </footer>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [route, setRoute] = useState(location.hash || '#/');

  useEffect(() => {
    const handleHash = () => setRoute(location.hash || '#/');
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  useEffect(() => {
    authService.getCurrentUser()
      .then(setUser)
      .catch(() => {
        authService.logout();
        setUser(null);
      });
  }, []);

  const path = route.replace('#/', '') || '';

  const renderContent = () => {
    if (path.startsWith('jobs/')) return <Job user={user} />;
    if (path === 'jobs' || path.startsWith('jobs?')) return <Jobs user={user} />;
    if (path === 'wizard') return <CandidateWizard initialUser={user} onUpdateProfile={setUser} />;
    if (path === 'dashboard' || path === 'applications') {
      if (!user) return <Auth register={false} onAuth={setUser} />;
      return <CandidateDashboard user={user} onOpenProfileWizard={() => { location.hash = '#/wizard'; }} />;
    }
    if (path === 'how') return <HowItWorks />;
    if (path === 'about') return <About />;
    if (path === 'contact') return <Contact />;
    if (path === 'login' || path === 'register') return <Auth register={path === 'register'} onAuth={setUser} />;
    if (path === 'forgot-password' || location.pathname.includes('forgot-password')) return <ForgotPassword />;
    if (path === 'reset-password' || path.startsWith('reset-password') || location.pathname.includes('reset-password')) return <ResetPassword />;
    if (path === 'admin') return <AdminPortal currentUser={user} onAdminLoginSuccess={setUser} />;
    return <Hero />;
  };

  return (
    <>
      <Header user={user} onAuth={setUser} currentRoute={path} />
      {renderContent()}
      <Footer />
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);
