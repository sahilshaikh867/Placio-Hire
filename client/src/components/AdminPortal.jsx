import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { jobService } from '../services/jobService';
import { applicationService } from '../services/applicationService';
import { captchaService } from '../services/captchaService';
import {
  ShieldCheck,
  LayoutDashboard,
  Plus,
  Edit,
  Trash2,
  FileText,
  User,
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
  History,
  Lock,
  ExternalLink,
  Eye,
  X,
  Search,
  Filter,
  BarChart3,
  TrendingUp,
  Calendar,
  Briefcase,
  MapPin,
  GraduationCap,
  Award,
  Layers,
  ChevronRight,
  Globe,
  DollarSign
} from 'lucide-react';

export default function AdminPortal({ currentUser, onAdminLoginSuccess }) {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(
    currentUser?.role === 'admin'
  );

  // OTP Login states
  const [adminEmail, setAdminEmail] = useState('');
  const [otpStep, setOtpStep] = useState('request'); // 'request' or 'verify'
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpMsg, setOtpMsg] = useState('');
  const [otpError, setOtpError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  // Active navigation tab
  // 'overview' | 'jobs' | 'candidates' | 'analytics' | 'applications' | 'audits'
  const [activeTab, setActiveTab] = useState('overview');

  // Core Data
  const [stats, setStats] = useState({});
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [adminAccounts, setAdminAccounts] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsRange, setAnalyticsRange] = useState('30d');
  const [candidates, setCandidates] = useState([]);

  // Job Filters & Search
  const [jobSearch, setJobSearch] = useState('');
  const [jobStatusFilter, setJobStatusFilter] = useState('all');
  const [jobSort, setJobSort] = useState('newest');

  // Candidate Filters
  const [candidateSearch, setCandidateSearch] = useState('');
  const [candidateDegree, setCandidateDegree] = useState('all');
  const [candidateMinCgpa, setCandidateMinCgpa] = useState('');

  // Modals & Drawers
  const [jobFormOpen, setJobFormOpen] = useState(false);
  const [jobFormTab, setJobFormTab] = useState('basic'); // 'basic' | 'eligibility' | 'compensation' | 'dates' | 'application'
  const [editingJobId, setEditingJobId] = useState(null);
  const [previewJob, setPreviewJob] = useState(null);
  const [inspectCandidate, setInspectCandidate] = useState(null);
  const [loadingInspect, setLoadingInspect] = useState(false);

  // Initial Job Form State
  const defaultJobForm = {
    title: '',
    company: 'PlacioBridge Technologies LLP',
    logo: '',
    location: 'Pune, Maharashtra',
    type: 'Full-time',
    workplace: 'Hybrid',
    industry: 'Information Technology',
    company_type: 'Product',
    description: '',
    responsibilities: '',
    requirements: '',
    experience: '0–2 years',
    skills: 'React, Node.js, JavaScript, SQL',
    preferred_skills: 'TypeScript, Docker, AWS',
    qualification: 'BE / B.Tech / BCA / MCA / M.Tech',
    eligible_branches: 'Computer Engineering, Information Technology, AI & DS',
    min_cgpa: 6.5,
    openings: 2,
    edu_eligibility_mandatory: true,
    salary_min: 500000,
    salary_max: 800000,
    salary_period: 'Annual',
    stipend: '',
    posting_date: new Date().toISOString().split('T')[0],
    application_opening_date: new Date().toISOString().split('T')[0],
    application_deadline: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    application_method: 'both', // 'both' | 'internal' | 'external'
    external_application_url: '',
    internal_application_enabled: true,
    published: true,
    status: 'published'
  };

  const [jobForm, setJobForm] = useState(defaultJobForm);

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      setIsAdminAuthenticated(true);
      loadAdminData();
    }
  }, [currentUser]);

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Load Admin Data
  const loadAdminData = async () => {
    try {
      const [s, j, a, logs, admins] = await Promise.all([
        jobService.getAdminStats().catch(() => ({})),
        jobService.getAdminJobs({ search: jobSearch, status: jobStatusFilter, sort: jobSort }).catch(() => []),
        applicationService.getApplications().catch(() => []),
        jobService.getAuditLogs().catch(() => []),
        jobService.getAdminAccounts().catch(() => [])
      ]);
      setStats(s);
      setJobs(j);
      setApplications(a);
      setAuditLogs(logs);
      setAdminAccounts(admins);
    } catch (err) {
      console.warn('Admin load error:', err);
    }
  };

  // Re-fetch jobs on filter change
  useEffect(() => {
    if (isAdminAuthenticated) {
      jobService.getAdminJobs({ search: jobSearch, status: jobStatusFilter, sort: jobSort })
        .then(setJobs)
        .catch(console.warn);
    }
  }, [jobSearch, jobStatusFilter, jobSort, isAdminAuthenticated]);

  // Load Analytics when Analytics tab is opened
  useEffect(() => {
    if (activeTab === 'analytics' && isAdminAuthenticated) {
      jobService.getAdminAnalytics(analyticsRange)
        .then(setAnalytics)
        .catch(console.warn);
    }
  }, [activeTab, analyticsRange, isAdminAuthenticated]);

  // Load Candidates when Talent Pool tab is opened
  useEffect(() => {
    if (activeTab === 'candidates' && isAdminAuthenticated) {
      jobService.getCandidates({ q: candidateSearch, degree: candidateDegree, minCgpa: candidateMinCgpa })
        .then(setCandidates)
        .catch(console.warn);
    }
  }, [activeTab, candidateSearch, candidateDegree, candidateMinCgpa, isAdminAuthenticated]);

  // Request Admin OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!adminEmail) return;
    setOtpLoading(true);
    setOtpError('');
    setOtpMsg('');
    try {
      const captchaToken = await captchaService.executeChallenge('admin_login');
      const res = await authService.requestAdminOtp(adminEmail, captchaToken);
      setOtpStep('verify');
      setOtpMsg(res.message || 'Verification passkey dispatched to your inbox.');
      setCooldown(60);
    } catch (err) {
      setOtpError(err.message || 'Failed to request OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  // Verify Admin OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode) return;
    setOtpLoading(true);
    setOtpError('');
    try {
      const res = await authService.verifyAdminOtp(adminEmail, otpCode);
      setIsAdminAuthenticated(true);
      if (onAdminLoginSuccess) onAdminLoginSuccess(res.user);
      loadAdminData();
    } catch (err) {
      setOtpError(err.message || 'Invalid or expired OTP code');
    } finally {
      setOtpLoading(false);
    }
  };

  // Save Job (Create or Update)
  const handleSaveJob = async (e) => {
    e.preventDefault();
    try {
      if (editingJobId) {
        await jobService.updateJob(editingJobId, jobForm);
      } else {
        await jobService.createJob(jobForm);
      }
      setJobFormOpen(false);
      setEditingJobId(null);
      setJobForm(defaultJobForm);
      loadAdminData();
      alert('Job posting saved successfully!');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEditJob = (job) => {
    setEditingJobId(job.id);
    setJobForm({
      ...job,
      edu_eligibility_mandatory: Boolean(job.edu_eligibility_mandatory),
      published: job.status === 'published',
      posting_date: job.posting_date ? job.posting_date.split('T')[0] : '',
      application_opening_date: job.application_opening_date ? job.application_opening_date.split('T')[0] : '',
      application_deadline: job.application_deadline ? job.application_deadline.split('T')[0] : ''
    });
    setJobFormTab('basic');
    setJobFormOpen(true);
    setActiveTab('jobs');
  };

  const handleTogglePublish = async (job) => {
    const newStatus = job.status === 'published' ? 'draft' : 'published';
    try {
      await jobService.updateJob(job.id, {
        status: newStatus,
        published: newStatus === 'published'
      });
      loadAdminData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleMarkExpired = async (job) => {
    if (!confirm(`Mark "${job.title}" as expired? Candidates will no longer be able to submit applications.`)) return;
    try {
      await jobService.updateJob(job.id, {
        status: 'expired',
        is_expired: true
      });
      loadAdminData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteJob = async (id) => {
    if (!confirm('Are you sure you want to permanently delete this job posting? This action is audited.')) return;
    try {
      await jobService.deleteJob(id);
      loadAdminData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdateStatus = async (appId, newStatus) => {
    try {
      await applicationService.updateStatus(appId, newStatus);
      loadAdminData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleInspectCandidate = async (candidateId) => {
    setLoadingInspect(true);
    try {
      const data = await applicationService.getCandidateProfile(candidateId);
      setInspectCandidate(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoadingInspect(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 1. UNAUTHENTICATED: SECURE OTP LOGIN
  // ---------------------------------------------------------------------------
  if (!isAdminAuthenticated) {
    return (
      <main className="page admin-auth-page">
        <div className="admin-login-card">
          <div className="admin-badge-lock">
            <Lock size={28} />
          </div>
          <h2>Placio-Hire Admin Portal</h2>
          <p className="admin-login-sub">
            Restricted to authorized PlacioBridge administrative personnel. Authentication requires single-use email OTP verification.
          </p>

          {otpError && (
            <div className="contact-alert error" style={{ marginBottom: 14 }}>
              <AlertTriangle size={16} />
              <span>{otpError}</span>
            </div>
          )}

          {otpMsg && (
            <div className="contact-alert success" style={{ marginBottom: 14 }}>
              <CheckCircle size={16} />
              <span>{otpMsg}</span>
            </div>
          )}

          {otpStep === 'request' ? (
            <form onSubmit={handleRequestOtp}>
              <div className="field-group">
                <label>Authorized Administrator Email</label>
                <input
                  type="email"
                  placeholder="admin@placiobridge.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                />
              </div>

              <div className="captcha-notice" style={{ margin: '14px 0' }}>
                <ShieldCheck size={14} /> CAPTCHA active • IP and device fingerprint verified
              </div>

              <button className="btn full" type="submit" disabled={otpLoading || cooldown > 0}>
                {otpLoading ? 'Dispatching Verification...' : cooldown > 0 ? `Resend Cooldown (${cooldown}s)` : 'Send Verification Code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp}>
              <div className="field-group">
                <label>Enter Email Verification Code</label>
                <input
                  type="text"
                  maxLength={12}
                  placeholder="Enter code from email"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.trim())}
                  required
                  style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '20px', fontWeight: 'bold' }}
                />
              </div>

              <div className="otp-meta-row" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <span className="muted" style={{ fontSize: 12 }}>Check your inbox or spam folder</span>
                {cooldown > 0 ? (
                  <span className="muted" style={{ fontSize: 12 }}>Resend in {cooldown}s</span>
                ) : (
                  <button type="button" className="link small" onClick={handleRequestOtp}>
                    Resend Code
                  </button>
                )}
              </div>

              <button className="btn full" type="submit" disabled={otpLoading} style={{ marginTop: 16 }}>
                {otpLoading ? 'Verifying Code...' : 'Authenticate & Enter Console'}
              </button>

              <button
                type="button"
                className="link small"
                style={{ marginTop: 12, display: 'block', marginInline: 'auto' }}
                onClick={() => setOtpStep('request')}
              >
                ← Back to email input
              </button>
            </form>
          )}
        </div>
      </main>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. AUTHENTICATED ADMIN CONSOLE
  // ---------------------------------------------------------------------------
  return (
    <main className="page admin-console-page">
      {/* Console Top Header */}
      <div className="admin-header-bar">
        <div>
          <span className="eyebrow" style={{ color: 'var(--orange)' }}>
            <ShieldCheck size={14} /> PLACIOBRIDGE TECHNOLOGIES • ENTERPRISE PLACEMENT DESK
          </span>
          <h2>Admin Control Center</h2>
          <p>
            Oversee active campus recruitment drives, review student candidate pools, manage official application URLs, and inspect analytics.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn"
            onClick={() => {
              setEditingJobId(null);
              setJobForm(defaultJobForm);
              setJobFormTab('basic');
              setJobFormOpen(true);
              setActiveTab('jobs');
            }}
          >
            <Plus size={16} /> Post New Job
          </button>
        </div>
      </div>

      {/* 8 Metric Dashboard Cards */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <b>{stats.totalStudents ?? 0}</b>
          <span>Total Students</span>
        </div>
        <div className="admin-stat-card">
          <b>{stats.totalRecruiters ?? 0}</b>
          <span>Total Recruiters</span>
        </div>
        <div className="admin-stat-card">
          <b>{stats.totalJobs ?? 0}</b>
          <span>Total Jobs</span>
        </div>
        <div className="admin-stat-card active-jobs">
          <b>{stats.activeJobs ?? stats.publishedJobs ?? 0}</b>
          <span>Active Postings</span>
        </div>
        <div className="admin-stat-card">
          <b>{stats.expiredJobs ?? 0}</b>
          <span>Expired Jobs</span>
        </div>
        <div className="admin-stat-card">
          <b>{stats.draftJobs ?? 0}</b>
          <span>Draft Postings</span>
        </div>
        <div className="admin-stat-card">
          <b>{stats.totalApplications ?? 0}</b>
          <span>Applications</span>
        </div>
        <div className="admin-stat-card shortlisted">
          <b>{stats.shortlistedCandidates ?? 0}</b>
          <span>Shortlisted</span>
        </div>
      </div>

      {/* Authorized Admins Chip Bar */}
      <div className="authorized-admins-bar">
        <div className="admins-badge-info">
          <Users size={16} />
          <span><b>Active Administrators ({adminAccounts.length} / 3 Allowed):</b></span>
        </div>
        <div className="admin-emails-chips">
          {adminAccounts.map((a) => (
            <span key={a.id || a.email} className="admin-pill">
              <ShieldCheck size={12} color="var(--orange)" /> {a.name || 'Admin'} ({a.email})
            </span>
          ))}
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="admin-tabs-nav">
        <button
          className={`admin-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <LayoutDashboard size={15} /> Overview
        </button>
        <button
          className={`admin-tab-btn ${activeTab === 'jobs' ? 'active' : ''}`}
          onClick={() => setActiveTab('jobs')}
        >
          <Briefcase size={15} /> Job Postings ({jobs.length})
        </button>
        <button
          className={`admin-tab-btn ${activeTab === 'candidates' ? 'active' : ''}`}
          onClick={() => setActiveTab('candidates')}
        >
          <GraduationCap size={15} /> Talent Pool
        </button>
        <button
          className={`admin-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <BarChart3 size={15} /> Analytics &amp; Reports
        </button>
        <button
          className={`admin-tab-btn ${activeTab === 'applications' ? 'active' : ''}`}
          onClick={() => setActiveTab('applications')}
        >
          <User size={15} /> Candidate Applications ({applications.length})
        </button>
        <button
          className={`admin-tab-btn ${activeTab === 'audits' ? 'active' : ''}`}
          onClick={() => setActiveTab('audits')}
        >
          <History size={15} /> Audit Logs ({auditLogs.length})
        </button>
      </div>

      {/* TAB CONTENT 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="admin-tab-panel">
          {/* Quick Actions Ribbon */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <button
              className="btn small"
              onClick={() => {
                setEditingJobId(null);
                setJobForm(defaultJobForm);
                setJobFormOpen(true);
                setActiveTab('jobs');
              }}
            >
              <Plus size={14} /> Add New Job
            </button>
            <button className="btn small secondary" onClick={() => setActiveTab('candidates')}>
              <Search size={14} /> Search Candidate Pool
            </button>
            <button className="btn small secondary" onClick={() => setActiveTab('analytics')}>
              <TrendingUp size={14} /> View Analytics
            </button>
            <button className="btn small secondary" onClick={() => setActiveTab('applications')}>
              <FileText size={14} /> Review Pipeline
            </button>
          </div>

          <div className="admin-panel-split">
            {/* Recently Added Jobs */}
            <div className="admin-section-box">
              <div className="box-head">
                <h3>Recently Added Jobs</h3>
                <button className="link small" onClick={() => setActiveTab('jobs')}>
                  View all ({jobs.length}) →
                </button>
              </div>

              {jobs.length === 0 ? (
                <p className="muted">No jobs posted yet. Click "+ Post New Job" to create your first listing.</p>
              ) : (
                <div className="table-responsive">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Job Title &amp; Company</th>
                        <th>Type &amp; Mode</th>
                        <th>Deadline</th>
                        <th>Status</th>
                        <th className="th-actions">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobs.slice(0, 5).map((j) => (
                        <tr key={j.id}>
                          <td>
                            <b>{j.title}</b>
                            <small>{j.company} · {j.location}</small>
                          </td>
                          <td>
                            <span>{j.type}</span>
                            <small>{j.workplace}</small>
                          </td>
                          <td>
                            {j.application_deadline ? (
                              <span>{new Date(j.application_deadline).toLocaleDateString()}</span>
                            ) : (
                              <span className="muted">Open</span>
                            )}
                          </td>
                          <td>
                            <span className={`status-tag ${j.is_expired ? 'expired' : j.status}`}>
                              {j.is_expired ? 'Expired' : j.status}
                            </span>
                          </td>
                          <td className="action-cell">
                            <div className="admin-action-group">
                              <button
                                type="button"
                                className="action-btn view"
                                title="Preview Job Details"
                                onClick={() => setPreviewJob(j)}
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                type="button"
                                className="action-btn edit"
                                title="Edit Job Posting"
                                onClick={() => handleEditJob(j)}
                              >
                                <Edit size={15} />
                              </button>
                              <button
                                type="button"
                                className="action-btn delete"
                                title="Delete Job"
                                onClick={() => handleDeleteJob(j.id)}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Platform Security & Activity Feeds */}
            <div className="admin-section-box">
              <div className="box-head">
                <h3>Platform Activity Log</h3>
                <button className="link small" onClick={() => setActiveTab('audits')}>
                  Full Audit Trail →
                </button>
              </div>
              <div className="quick-jobs-list">
                {auditLogs.slice(0, 6).map((log) => (
                  <div className="quick-job-row" key={log.id}>
                    <div>
                      <b style={{ fontSize: 13 }}>{log.action?.replace('_', ' ').toUpperCase()}</b>
                      <span>{log.admin_name || 'System Admin'} ({log.admin_email || 'admin@placiobridge.com'})</span>
                    </div>
                    <small style={{ color: 'var(--muted)', fontSize: 11 }}>
                      {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </small>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: JOBS MANAGEMENT */}
      {activeTab === 'jobs' && (
        <div className="admin-tab-panel">
          {/* Job Filter and Search Toolbar */}
          <div className="admin-toolbar" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--muted)' }} />
              <input
                type="text"
                placeholder="Search jobs by title, company, or location..."
                value={jobSearch}
                onChange={(e) => setJobSearch(e.target.value)}
                style={{ paddingLeft: 36, width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <select
                value={jobStatusFilter}
                onChange={(e) => setJobStatusFilter(e.target.value)}
                style={{ minWidth: 140 }}
              >
                <option value="all">All Statuses</option>
                <option value="published">Published</option>
                <option value="draft">Drafts</option>
                <option value="expired">Expired / Closed</option>
              </select>

              <select
                value={jobSort}
                onChange={(e) => setJobSort(e.target.value)}
                style={{ minWidth: 150 }}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="applications">Most Applications</option>
                <option value="deadline">Upcoming Deadline</option>
              </select>

              <button
                className="btn"
                onClick={() => {
                  setEditingJobId(null);
                  setJobForm(defaultJobForm);
                  setJobFormTab('basic');
                  setJobFormOpen(true);
                }}
              >
                <Plus size={16} /> + Add Job
              </button>
            </div>
          </div>

          {/* Jobs Listing Table */}
          <div className="admin-section-box">
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Job Title &amp; Company</th>
                    <th>Mode &amp; Location</th>
                    <th>Important Dates</th>
                    <th>Applications</th>
                    <th>Application Method</th>
                    <th>Status</th>
                    <th className="th-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                        No job postings found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    jobs.map((j) => (
                      <tr key={j.id}>
                        <td>
                          <b>{j.title}</b>
                          <small>{j.company} · {j.industry || 'IT'}</small>
                        </td>
                        <td>
                          <span>{j.workplace}</span>
                          <small>{j.location}</small>
                        </td>
                        <td>
                          <small>Posted: {new Date(j.created_at).toLocaleDateString()}</small>
                          {j.application_deadline ? (
                            <small style={{ color: j.is_expired ? '#ef4444' : 'inherit' }}>
                              Last Date: {new Date(j.application_deadline).toLocaleDateString()}
                            </small>
                          ) : (
                            <small className="muted">No deadline set</small>
                          )}
                        </td>
                        <td>
                          <span className="match-pill" style={{ background: '#e0f2fe', color: '#0369a1' }}>
                            {j.applicationsCount || 0} Applicants
                          </span>
                        </td>
                        <td>
                          {j.external_application_url ? (
                            <a
                              href={j.external_application_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="link small"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            >
                              Official Portal <ExternalLink size={12} />
                            </a>
                          ) : (
                            <span style={{ fontSize: 12 }}>Internal Only</span>
                          )}
                        </td>
                        <td>
                          <span className={`status-tag ${j.is_expired ? 'expired' : j.status}`}>
                            {j.is_expired ? 'Expired' : j.status}
                          </span>
                        </td>
                        <td className="action-cell">
                          <div className="admin-action-group">
                            <button
                              type="button"
                              className="action-btn view"
                              title="Preview Job Details"
                              onClick={() => setPreviewJob(j)}
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              type="button"
                              className="action-btn edit"
                              title="Edit Job Posting"
                              onClick={() => handleEditJob(j)}
                            >
                              <Edit size={15} />
                            </button>
                            <button
                              type="button"
                              className={`action-btn ${j.status === 'published' ? 'publish' : 'draft'}`}
                              title={j.status === 'published' ? 'Unpublish to Draft' : 'Publish Job'}
                              onClick={() => handleTogglePublish(j)}
                            >
                              <Globe size={15} />
                            </button>
                            {!j.is_expired && (
                              <button
                                type="button"
                                className="action-btn expire"
                                title="Mark as Expired / Closed"
                                onClick={() => handleMarkExpired(j)}
                              >
                                <Clock size={15} />
                              </button>
                            )}
                            <button
                              type="button"
                              className="action-btn delete"
                              title="Delete Job Posting"
                              onClick={() => handleDeleteJob(j.id)}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: CANDIDATE TALENT POOL */}
      {activeTab === 'candidates' && (
        <div className="admin-tab-panel">
          {/* Candidate Filter Toolbar */}
          <div className="admin-toolbar" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--muted)' }} />
              <input
                type="text"
                placeholder="Search by candidate name, college, email, or skills..."
                value={candidateSearch}
                onChange={(e) => setCandidateSearch(e.target.value)}
                style={{ paddingLeft: 36, width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <select
                value={candidateDegree}
                onChange={(e) => setCandidateDegree(e.target.value)}
                style={{ minWidth: 140 }}
              >
                <option value="all">All Degrees</option>
                <option value="B.Tech">B.Tech / B.E.</option>
                <option value="BCA">BCA</option>
                <option value="MCA">MCA</option>
                <option value="M.Tech">M.Tech</option>
              </select>

              <select
                value={candidateMinCgpa}
                onChange={(e) => setCandidateMinCgpa(e.target.value)}
                style={{ minWidth: 140 }}
              >
                <option value="">Any CGPA</option>
                <option value="6.0">6.0+ CGPA</option>
                <option value="7.0">7.0+ CGPA</option>
                <option value="8.0">8.0+ CGPA</option>
                <option value="9.0">9.0+ CGPA</option>
              </select>
            </div>
          </div>

          {/* Candidate Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {candidates.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', padding: '60px 0', textAlign: 'center', color: 'var(--muted)' }}>
                No candidate profiles match your search criteria.
              </div>
            ) : (
              candidates.map((c) => (
                <div
                  key={c.id}
                  style={{
                    background: '#fff',
                    border: '1px solid var(--line)',
                    borderRadius: 16,
                    padding: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.02)'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: '50%',
                          background: 'var(--orange)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          fontSize: 18
                        }}
                      >
                        {c.name ? c.name[0] : 'S'}
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: 16 }}>{c.name}</h4>
                        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{c.email}</span>
                      </div>
                    </div>

                    <div style={{ fontSize: 13, marginBottom: 10, color: 'var(--ink-soft)' }}>
                      <div><b>College:</b> {c.college}</div>
                      <div><b>Degree:</b> {c.degree} ({c.branch}) · {c.graduationYear}</div>
                      <div><b>Current CGPA:</b> <span style={{ color: 'var(--orange)', fontWeight: 700 }}>{c.cgpa}</span></div>
                    </div>

                    {c.skills && c.skills.length > 0 && (
                      <div className="tags" style={{ marginBottom: 14 }}>
                        {c.skills.slice(0, 4).map((s) => (
                          <span key={s} style={{ fontSize: 11 }}>{s}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                    <small className="muted">{c.applicationsCount} Applications</small>
                    <button
                      className="btn small"
                      onClick={() => handleInspectCandidate(c.userId || c.id)}
                    >
                      <Eye size={14} /> View Full Profile
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: ANALYTICS & REPORTS */}
      {activeTab === 'analytics' && (
        <div className="admin-tab-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3>Campus Recruitment &amp; Drive Analytics</h3>
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                Real-time insights across job volumes, candidate pipeline status, and branch distributions.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              {['7d', '30d', '90d', 'all'].map((r) => (
                <button
                  key={r}
                  className={`btn small ${analyticsRange === r ? '' : 'secondary'}`}
                  onClick={() => setAnalyticsRange(r)}
                >
                  {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : r === '90d' ? '90 Days' : 'All Time'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
            {/* 1. Category Distribution */}
            <div className="admin-section-box">
              <h3>Jobs by Category / Industry</h3>
              <div style={{ marginTop: 16 }}>
                {analytics?.categoryDistribution?.length > 0 ? (
                  analytics.categoryDistribution.map((cat, i) => (
                    <div key={i} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                        <span><b>{cat.category}</b></span>
                        <span className="muted">{cat.count} jobs</span>
                      </div>
                      <div style={{ background: '#f1f5f9', borderRadius: 99, height: 8, overflow: 'hidden' }}>
                        <div
                          style={{
                            background: 'var(--orange)',
                            height: '100%',
                            width: `${Math.min(100, (parseInt(cat.count, 10) / (stats.totalJobs || 1)) * 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="muted">No category data available.</p>
                )}
              </div>
            </div>

            {/* 2. Top Companies */}
            <div className="admin-section-box">
              <h3>Top Participating Companies</h3>
              <div style={{ marginTop: 16 }}>
                {analytics?.companyDistribution?.length > 0 ? (
                  analytics.companyDistribution.map((comp, i) => (
                    <div key={i} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                        <span><b>{comp.company}</b></span>
                        <span className="muted">{comp.count} openings</span>
                      </div>
                      <div style={{ background: '#f1f5f9', borderRadius: 99, height: 8, overflow: 'hidden' }}>
                        <div
                          style={{
                            background: '#0ea5e9',
                            height: '100%',
                            width: `${Math.min(100, (parseInt(comp.count, 10) / (stats.totalJobs || 1)) * 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="muted">No company data available.</p>
                )}
              </div>
            </div>

            {/* 3. Application Pipeline Status Funnel */}
            <div className="admin-section-box">
              <h3>Application Status Funnel</h3>
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {analytics?.applicationStatusDistribution?.length > 0 ? (
                  analytics.applicationStatusDistribution.map((st, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: 10 }}>
                      <span style={{ textTransform: 'capitalize', fontWeight: 600, fontSize: 13 }}>
                        {st.status?.replace('_', ' ')}
                      </span>
                      <span className="match-pill" style={{ background: '#e2e8f0', color: '#1e293b' }}>
                        {st.count} Candidates
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="muted">No application status data available.</p>
                )}
              </div>
            </div>

            {/* 4. Most Applied Jobs */}
            <div className="admin-section-box">
              <h3>Most Applied Opportunities</h3>
              <div style={{ marginTop: 16 }}>
                {analytics?.mostAppliedJobs?.length > 0 ? (
                  analytics.mostAppliedJobs.map((top, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
                      <div>
                        <b style={{ fontSize: 14 }}>{top.title}</b>
                        <small style={{ display: 'block', color: 'var(--muted)' }}>{top.company}</small>
                      </div>
                      <span className="match-pill">{top.applications_count} Applied</span>
                    </div>
                  ))
                ) : (
                  <p className="muted">No application data yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 5: CANDIDATE APPLICATIONS */}
      {activeTab === 'applications' && (
        <div className="admin-tab-panel">
          <div className="admin-section-box">
            <div className="box-head">
              <h3>Candidate Applications Pipeline</h3>
              <span className="muted" style={{ fontSize: 13 }}>Showing all submitted campus job applications</span>
            </div>

            {applications.length === 0 ? (
              <p className="muted" style={{ padding: '30px 0', textAlign: 'center' }}>No candidate applications recorded yet.</p>
            ) : (
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Candidate Info</th>
                      <th>Target Role &amp; Company</th>
                      <th>Fit Match</th>
                      <th>Applied Date</th>
                      <th>Application Status</th>
                      <th className="th-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((app) => (
                      <tr key={app.id}>
                        <td>
                          <b>{app.candidate_name || 'Candidate'}</b>
                          <small>{app.candidate_email}</small>
                        </td>
                        <td>
                          <b>{app.title}</b>
                          <small>{app.company || 'PlacioBridge'}</small>
                        </td>
                        <td>
                          <span className="match-pill">{app.match_score || 75}%</span>
                        </td>
                        <td>
                          <small>{new Date(app.created_at || Date.now()).toLocaleDateString()}</small>
                        </td>
                        <td>
                          <select
                            value={app.status || 'Applied'}
                            onChange={(e) => handleUpdateStatus(app.id, e.target.value)}
                            className="table-select"
                          >
                            <option value="Applied">Applied</option>
                            <option value="Under Review">Under Review</option>
                            <option value="Shortlisted">Shortlisted</option>
                            <option value="Selected">Selected / Hired</option>
                            <option value="Rejected">Rejected</option>
                          </select>
                        </td>
                        <td className="action-cell">
                          <div className="admin-action-group">
                            <button
                              type="button"
                              className="action-btn view"
                              title="Inspect Candidate Profile & Resume"
                              onClick={() => handleInspectCandidate(app.user_id || app.candidate_id)}
                            >
                              <Eye size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 6: AUDIT LOGS */}
      {activeTab === 'audits' && (
        <div className="admin-tab-panel">
          <div className="admin-section-box">
            <div className="box-head">
              <h3>System &amp; Administration Audit Logs</h3>
              <span className="muted" style={{ fontSize: 13 }}>Every creation, update, and deletion is cryptographically tracked</span>
            </div>

            {auditLogs.length === 0 ? (
              <p className="muted" style={{ padding: '30px 0', textAlign: 'center' }}>No administrative audit events recorded yet.</p>
            ) : (
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Admin User</th>
                      <th>Action</th>
                      <th>Entity Type</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td>
                          <b>{log.admin_name || 'System Admin'}</b>
                          <small>{log.admin_email || 'admin@placiobridge.com'}</small>
                        </td>
                        <td>
                          <span className="audit-action-pill">{log.action}</span>
                        </td>
                        <td>
                          <span style={{ fontSize: 12, textTransform: 'capitalize' }}>{log.entity_type}</span>
                        </td>
                        <td>
                          <span className="audit-meta-text">
                            {JSON.stringify(log.new_data || log.meta || {})}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* JOB CREATION & EDIT MODAL (COMPREHENSIVE 6-SECTION CONFIGURATION)         */}
      {/* ======================================================================= */}
      {jobFormOpen && (
        <div className="modal-overlay" onClick={() => setJobFormOpen(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: 880, width: '95%', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0 }}>{editingJobId ? 'Edit Job Posting' : 'Post New Campus Job / Internship'}</h3>
                <span className="muted" style={{ fontSize: 13 }}>
                  Configure all job parameters, application dates, educational filters, and official external portal links.
                </span>
              </div>
              <button type="button" className="action-btn close" title="Close" onClick={() => setJobFormOpen(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Sub-tabs for Form Navigation */}
            <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--line)', marginBottom: 20, overflowX: 'auto' }}>
              <button
                type="button"
                className={`admin-tab-btn ${jobFormTab === 'basic' ? 'active' : ''}`}
                onClick={() => setJobFormTab('basic')}
                style={{ fontSize: 13, padding: '8px 14px' }}
              >
                1. Basic Info
              </button>
              <button
                type="button"
                className={`admin-tab-btn ${jobFormTab === 'eligibility' ? 'active' : ''}`}
                onClick={() => setJobFormTab('eligibility')}
                style={{ fontSize: 13, padding: '8px 14px' }}
              >
                2. Eligibility &amp; Criteria
              </button>
              <button
                type="button"
                className={`admin-tab-btn ${jobFormTab === 'compensation' ? 'active' : ''}`}
                onClick={() => setJobFormTab('compensation')}
                style={{ fontSize: 13, padding: '8px 14px' }}
              >
                3. Compensation &amp; Location
              </button>
              <button
                type="button"
                className={`admin-tab-btn ${jobFormTab === 'dates' ? 'active' : ''}`}
                onClick={() => setJobFormTab('dates')}
                style={{ fontSize: 13, padding: '8px 14px' }}
              >
                4. Important Dates
              </button>
              <button
                type="button"
                className={`admin-tab-btn ${jobFormTab === 'application' ? 'active' : ''}`}
                onClick={() => setJobFormTab('application')}
                style={{ fontSize: 13, padding: '8px 14px' }}
              >
                5. Application Method &amp; URLs
              </button>
            </div>

            <form onSubmit={handleSaveJob}>
              {/* SECTION 1: BASIC INFO */}
              {jobFormTab === 'basic' && (
                <div>
                  <div className="form-row-two">
                    <div className="field-group">
                      <label>Job Title *</label>
                      <input
                        type="text"
                        placeholder="e.g. Associate Software Engineer - Cloud & AI"
                        value={jobForm.title}
                        onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                        required
                      />
                    </div>
                    <div className="field-group">
                      <label>Company / Organization Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. PlacioBridge Technologies"
                        value={jobForm.company}
                        onChange={(e) => setJobForm({ ...jobForm, company: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row-two">
                    <div className="field-group">
                      <label>Category / Industry</label>
                      <select
                        value={jobForm.industry || 'Information Technology'}
                        onChange={(e) => setJobForm({ ...jobForm, industry: e.target.value })}
                      >
                        <option>Information Technology</option>
                        <option>Software Engineering</option>
                        <option>Artificial Intelligence & Data</option>
                        <option>Cloud Computing & DevOps</option>
                        <option>Cybersecurity</option>
                        <option>Product & UI/UX Design</option>
                        <option>Finance & Business Analytics</option>
                        <option>Core Engineering</option>
                      </select>
                    </div>
                    <div className="field-group">
                      <label>Company Logo URL (Optional)</label>
                      <input
                        type="url"
                        placeholder="https://example.com/logo.png"
                        value={jobForm.logo || ''}
                        onChange={(e) => setJobForm({ ...jobForm, logo: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-row-two">
                    <div className="field-group">
                      <label>Job Type</label>
                      <select
                        value={jobForm.type || 'Full-time'}
                        onChange={(e) => setJobForm({ ...jobForm, type: e.target.value })}
                      >
                        <option>Full-time</option>
                        <option>Internship</option>
                        <option>Part-time</option>
                        <option>Contract</option>
                      </select>
                    </div>
                    <div className="field-group">
                      <label>Workplace Mode</label>
                      <select
                        value={jobForm.workplace || 'Hybrid'}
                        onChange={(e) => setJobForm({ ...jobForm, workplace: e.target.value })}
                      >
                        <option>On-site</option>
                        <option>Hybrid</option>
                        <option>Remote</option>
                      </select>
                    </div>
                  </div>

                  <div className="field-group">
                    <label>Job Description / Role Overview *</label>
                    <textarea
                      rows={4}
                      placeholder="Comprehensive overview of the opportunity..."
                      value={jobForm.description || jobForm.jd || ''}
                      onChange={(e) => setJobForm({ ...jobForm, description: e.target.value, jd: e.target.value })}
                      required
                    />
                  </div>

                  <div className="field-group">
                    <label>Key Responsibilities</label>
                    <textarea
                      rows={3}
                      placeholder="Outline core day-to-day duties and technical deliverables..."
                      value={jobForm.responsibilities || ''}
                      onChange={(e) => setJobForm({ ...jobForm, responsibilities: e.target.value })}
                    />
                  </div>

                  <div className="field-group">
                    <label>Requirements &amp; Technical Stacks</label>
                    <textarea
                      rows={3}
                      placeholder="Specific frameworks, languages, problem-solving skills..."
                      value={jobForm.requirements || ''}
                      onChange={(e) => setJobForm({ ...jobForm, requirements: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* SECTION 2: ELIGIBILITY & CRITERIA */}
              {jobFormTab === 'eligibility' && (
                <div>
                  <div className="form-row-two">
                    <div className="field-group">
                      <label>Required Experience</label>
                      <select
                        value={jobForm.experience || '0–2 years'}
                        onChange={(e) => setJobForm({ ...jobForm, experience: e.target.value })}
                      >
                        <option>Fresher / 2025–2027 Batch</option>
                        <option>0–1 years</option>
                        <option>0–2 years</option>
                        <option>1–3 years</option>
                        <option>3+ years</option>
                      </select>
                    </div>
                    <div className="field-group">
                      <label>Number of Openings</label>
                      <input
                        type="number"
                        min={1}
                        value={jobForm.openings || 1}
                        onChange={(e) => setJobForm({ ...jobForm, openings: parseInt(e.target.value, 10) || 1 })}
                      />
                    </div>
                  </div>

                  <div className="field-group">
                    <label>Required Skills (Comma separated)</label>
                    <input
                      type="text"
                      placeholder="e.g. React, Node.js, Python, PostgreSQL"
                      value={jobForm.skills || ''}
                      onChange={(e) => setJobForm({ ...jobForm, skills: e.target.value })}
                    />
                  </div>

                  <div className="field-group">
                    <label>Preferred / Nice-to-have Skills</label>
                    <input
                      type="text"
                      placeholder="e.g. Docker, Kubernetes, AWS, TypeScript"
                      value={jobForm.preferred_skills || ''}
                      onChange={(e) => setJobForm({ ...jobForm, preferred_skills: e.target.value })}
                    />
                  </div>

                  <div className="form-row-two">
                    <div className="field-group">
                      <label>Eligible Degrees</label>
                      <input
                        type="text"
                        placeholder="e.g. BE, B.Tech, BCA, MCA, M.Tech"
                        value={jobForm.qualification || jobForm.edu_degree || ''}
                        onChange={(e) => setJobForm({ ...jobForm, qualification: e.target.value, edu_degree: e.target.value })}
                      />
                    </div>
                    <div className="field-group">
                      <label>Eligible Branches</label>
                      <input
                        type="text"
                        placeholder="e.g. Computer Engineering, IT, AI & DS, All Branches"
                        value={jobForm.eligible_branches || jobForm.edu_branches || ''}
                        onChange={(e) => setJobForm({ ...jobForm, eligible_branches: e.target.value, edu_branches: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-row-two">
                    <div className="field-group">
                      <label>Minimum CGPA Required</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        placeholder="e.g. 6.5"
                        value={jobForm.min_cgpa || jobForm.edu_min_cgpa || ''}
                        onChange={(e) => setJobForm({ ...jobForm, min_cgpa: e.target.value, edu_min_cgpa: e.target.value })}
                      />
                    </div>
                    <div className="field-group" style={{ display: 'flex', alignItems: 'center', marginTop: 24 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={Boolean(jobForm.edu_eligibility_mandatory)}
                          onChange={(e) => setJobForm({ ...jobForm, edu_eligibility_mandatory: e.target.checked })}
                        />
                        <span>Enforce Strict Eligibility (Block candidates below criteria)</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 3: COMPENSATION & LOCATION */}
              {jobFormTab === 'compensation' && (
                <div>
                  <div className="form-row-two">
                    <div className="field-group">
                      <label>Minimum Salary (INR per annum)</label>
                      <input
                        type="number"
                        placeholder="e.g. 500000 (5 LPA)"
                        value={jobForm.salary_min || ''}
                        onChange={(e) => setJobForm({ ...jobForm, salary_min: e.target.value })}
                      />
                    </div>
                    <div className="field-group">
                      <label>Maximum Salary (INR per annum)</label>
                      <input
                        type="number"
                        placeholder="e.g. 800000 (8 LPA)"
                        value={jobForm.salary_max || ''}
                        onChange={(e) => setJobForm({ ...jobForm, salary_max: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-row-two">
                    <div className="field-group">
                      <label>Monthly Stipend (For Internships)</label>
                      <input
                        type="text"
                        placeholder="e.g. 25000 / month"
                        value={jobForm.stipend || ''}
                        onChange={(e) => setJobForm({ ...jobForm, stipend: e.target.value })}
                      />
                    </div>
                    <div className="field-group">
                      <label>Office / Work Location</label>
                      <input
                        type="text"
                        placeholder="e.g. Pune, Maharashtra / Bengaluru, Karnataka"
                        value={jobForm.location || ''}
                        onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 4: IMPORTANT DATES */}
              {jobFormTab === 'dates' && (
                <div>
                  <div className="form-row-two">
                    <div className="field-group">
                      <label>Job Posting Date</label>
                      <input
                        type="date"
                        value={jobForm.posting_date || ''}
                        onChange={(e) => setJobForm({ ...jobForm, posting_date: e.target.value })}
                      />
                    </div>
                    <div className="field-group">
                      <label>Applications Opening Date</label>
                      <input
                        type="date"
                        value={jobForm.application_opening_date || ''}
                        onChange={(e) => setJobForm({ ...jobForm, application_opening_date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="field-group">
                    <label>Application Deadline (Last Date to Apply)</label>
                    <input
                      type="date"
                      value={jobForm.application_deadline || ''}
                      onChange={(e) => setJobForm({ ...jobForm, application_deadline: e.target.value })}
                    />
                    <small className="muted" style={{ display: 'block', marginTop: 4 }}>
                      After this date, the job will be automatically marked as Expired and direct applications disabled.
                    </small>
                  </div>
                </div>
              )}

              {/* SECTION 5: APPLICATION METHOD & EXTERNAL URLS */}
              {jobFormTab === 'application' && (
                <div>
                  <div className="field-group">
                    <label>Application Method</label>
                    <select
                      value={jobForm.application_method || 'both'}
                      onChange={(e) => setJobForm({ ...jobForm, application_method: e.target.value })}
                    >
                      <option value="both">Both Placio-Hire Internal Apply &amp; Official External Page</option>
                      <option value="internal">Placio-Hire Internal Apply Only</option>
                      <option value="external">Official Company Website Only (Redirect)</option>
                    </select>
                  </div>

                  <div className="field-group">
                    <label>Official Company Career Page / Application URL</label>
                    <input
                      type="url"
                      placeholder="https://careers.company.com/jobs/apply/12345"
                      value={jobForm.external_application_url || ''}
                      onChange={(e) => setJobForm({ ...jobForm, external_application_url: e.target.value })}
                    />
                    <small className="muted" style={{ display: 'block', marginTop: 4 }}>
                      When provided, a prominent <b>"Apply on Official Website ↗"</b> button is rendered on the student job details view.
                    </small>
                  </div>

                  <div className="field-group" style={{ marginTop: 16 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={jobForm.internal_application_enabled !== false}
                        onChange={(e) => setJobForm({ ...jobForm, internal_application_enabled: e.target.checked })}
                      />
                      <span>Enable Placio-Hire One-Click Candidate Profile Submission</span>
                    </label>
                  </div>

                  <div className="field-group" style={{ marginTop: 16 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={Boolean(jobForm.published)}
                        onChange={(e) => setJobForm({ ...jobForm, published: e.target.checked, status: e.target.checked ? 'published' : 'draft' })}
                      />
                      <span>Publish Immediately (Make visible to all verified candidates)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Bottom Form Action Buttons */}
              <div className="form-bottom-actions">
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setJobFormOpen(false)}
                >
                  Cancel
                </button>

                <div style={{ display: 'flex', gap: 10 }}>
                  {jobFormTab !== 'basic' && (
                    <button
                      type="button"
                      className="btn secondary"
                      onClick={() => {
                        const tabs = ['basic', 'eligibility', 'compensation', 'dates', 'application'];
                        const prevIdx = tabs.indexOf(jobFormTab) - 1;
                        if (prevIdx >= 0) setJobFormTab(tabs[prevIdx]);
                      }}
                    >
                      ← Previous Section
                    </button>
                  )}

                  {jobFormTab !== 'application' ? (
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        const tabs = ['basic', 'eligibility', 'compensation', 'dates', 'application'];
                        const nextIdx = tabs.indexOf(jobFormTab) + 1;
                        if (nextIdx < tabs.length) setJobFormTab(tabs[nextIdx]);
                      }}
                    >
                      Next Section →
                    </button>
                  ) : (
                    <button type="submit" className="btn">
                      {editingJobId ? 'Update & Save Job' : 'Publish Campus Job'}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* JOB PREVIEW MODAL                                                       */}
      {/* ======================================================================= */}
      {previewJob && (
        <div className="modal-overlay" onClick={() => setPreviewJob(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: 720, width: '95%', maxHeight: '85vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <span className="eyebrow" style={{ color: 'var(--orange)' }}>CANDIDATE VIEW PREVIEW</span>
                <h3 style={{ margin: 0 }}>{previewJob.title}</h3>
                <span className="muted">{previewJob.company} · {previewJob.location}</span>
              </div>
              <button type="button" className="action-btn close" title="Close" onClick={() => setPreviewJob(null)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <span style={{ fontSize: 13, color: 'var(--muted)', display: 'block' }}>Compensation:</span>
                <b>{previewJob.salary || 'Competitive Industry Standard'}</b>
              </div>
              <div>
                <span style={{ fontSize: 13, color: 'var(--muted)', display: 'block' }}>Work Mode:</span>
                <b>{previewJob.workplace} · {previewJob.type}</b>
              </div>
              <div>
                <span style={{ fontSize: 13, color: 'var(--muted)', display: 'block' }}>Last Date:</span>
                <b>{previewJob.application_deadline ? new Date(previewJob.application_deadline).toLocaleDateString() : 'Rolling'}</b>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              {previewJob.external_application_url && (
                <a
                  href={previewJob.external_application_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  Apply on Official Website <ExternalLink size={14} />
                </a>
              )}
              {previewJob.internal_application_enabled !== false && (
                <button className="btn secondary">Apply via Placio-Hire</button>
              )}
            </div>

            <article style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink)' }}>
              <h4>Job Description</h4>
              <p>{previewJob.jd || previewJob.description}</p>

              {previewJob.responsibilities && (
                <>
                  <h4>Key Responsibilities</h4>
                  <p>{previewJob.responsibilities}</p>
                </>
              )}

              {previewJob.qualification && (
                <>
                  <h4>Education &amp; Eligibility</h4>
                  <p>
                    <b>Degree:</b> {previewJob.qualification} · <b>Branches:</b> {previewJob.eligible_branches || 'All'} · <b>Min CGPA:</b> {previewJob.min_cgpa || 'None'}
                  </p>
                </>
              )}

              {previewJob.skills && (
                <>
                  <h4>Required Skills</h4>
                  <div className="tags">
                    {previewJob.skills.split(',').map((s) => (
                      <span key={s.trim()}>{s.trim()}</span>
                    ))}
                  </div>
                </>
              )}
            </article>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* CANDIDATE INSPECTOR MODAL                                               */}
      {/* ======================================================================= */}
      {inspectCandidate && (
        <div className="modal-overlay" onClick={() => setInspectCandidate(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: 760, width: '95%', maxHeight: '85vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <span className="eyebrow" style={{ color: 'var(--orange)' }}>TALENT POOL DOSSIER</span>
                <h3 style={{ margin: 0 }}>{inspectCandidate.profile?.full_name || 'Candidate Profile'}</h3>
                <span className="muted">{inspectCandidate.profile?.email} · {inspectCandidate.profile?.phone_number || 'No phone provided'}</span>
              </div>
              <button type="button" className="action-btn close" title="Close" onClick={() => setInspectCandidate(null)}>
                <X size={18} />
              </button>
            </div>

            {inspectCandidate.signedResumeUrl && (
              <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '12px 18px', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <span style={{ color: '#065f46', fontSize: 13, fontWeight: 600 }}>Verified Resume Uploaded &amp; Available</span>
                <a
                  href={inspectCandidate.signedResumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn small"
                  style={{ background: '#059669', borderColor: '#059669' }}
                >
                  View / Download Resume ↗
                </a>
              </div>
            )}

            {inspectCandidate.profile?.headline && (
              <div style={{ marginBottom: 16 }}>
                <b>Headline:</b>
                <p style={{ margin: '4px 0', color: 'var(--ink-soft)' }}>{inspectCandidate.profile.headline}</p>
              </div>
            )}

            {inspectCandidate.profile?.bio && (
              <div style={{ marginBottom: 16 }}>
                <b>Summary:</b>
                <p style={{ margin: '4px 0', color: 'var(--ink-soft)' }}>{inspectCandidate.profile.bio}</p>
              </div>
            )}

            {/* Education */}
            {inspectCandidate.education?.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ borderBottom: '1px solid var(--line)', paddingBottom: 6 }}>Education</h4>
                {inspectCandidate.education.map((edu, i) => (
                  <div key={i} style={{ marginBottom: 10, fontSize: 13 }}>
                    <b>{edu.institution_name}</b> — {edu.degree_type} in {edu.field_of_study}
                    <div className="muted">Batch: {edu.start_year} – {edu.end_year || 'Present'} · CGPA: <b>{edu.cgpa || 'N/A'}</b></div>
                  </div>
                ))}
              </div>
            )}

            {/* Technical Skills */}
            {inspectCandidate.skills?.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ borderBottom: '1px solid var(--line)', paddingBottom: 6 }}>Technical Skills</h4>
                <div className="tags">
                  {inspectCandidate.skills.map((s, i) => (
                    <span key={i}>{s.skill_name || s.name}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Projects */}
            {inspectCandidate.projects?.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ borderBottom: '1px solid var(--line)', paddingBottom: 6 }}>Projects</h4>
                {inspectCandidate.projects.map((p, i) => (
                  <div key={i} style={{ marginBottom: 12, fontSize: 13 }}>
                    <b>{p.title}</b>
                    <p style={{ margin: '4px 0', color: 'var(--ink-soft)' }}>{p.description}</p>
                    {p.project_url && (
                      <a href={p.project_url} target="_blank" rel="noopener noreferrer" className="link small">
                        View Project Repository ↗
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
