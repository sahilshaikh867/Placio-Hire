import React, { useState, useEffect } from 'react';
import { recommendationService } from '../services/recommendationService';
import { applicationService } from '../services/applicationService';
import { notificationService } from '../services/notificationService';
import SmartApplyModal from './SmartApplyModal';
import {
  Sparkles,
  Briefcase,
  MapPin,
  Clock,
  ChevronRight,
  FileText,
  Bell,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Edit3
} from 'lucide-react';

export default function CandidateDashboard({ user, onOpenProfileWizard }) {
  const [activeTab, setActiveTab] = useState('recommendations');
  const [recommendations, setRecommendations] = useState([]);
  const [applications, setApplications] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJobToApply, setSelectedJobToApply] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [recs, apps, notifs] = await Promise.all([
        recommendationService.getRecommendations().catch(() => []),
        applicationService.getApplications().catch(() => []),
        notificationService.getNotifications().catch(() => [])
      ]);
      setRecommendations(recs);
      setApplications(apps);
      setNotifications(notifs);
    } catch (e) {
      console.warn('Dashboard load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('review')) return 'badge review';
    if (s.includes('shortlist')) return 'badge shortlisted';
    if (s.includes('reject')) return 'badge rejected';
    if (s.includes('hire')) return 'badge hired';
    return 'badge applied';
  };

  const completionPct = user?.completionPercentage || 0;

  return (
    <div className="candidate-dash-container">
      {/* Top Welcome Card */}
      <div className="dash-welcome-card">
        <div className="welcome-left">
          <div className="user-avatar-wrap">
            {user?.profile_photo ? (
              <img
                src={`/uploads/${user.profile_photo}`}
                alt={user.name}
                className="user-avatar-img"
              />
            ) : (
              <div className="user-avatar-placeholder">
                {(user?.name || 'S')[0].toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <h2>Welcome back, {user?.name ? user.name.split(' ')[0] : 'Candidate'} 👋</h2>
            <p>
              Your verified profile is live. Explore AICTE-aligned engineering and cloud roles tailored to your career preferences.
            </p>
          </div>
        </div>

        <div className="welcome-right">
          <div className="profile-comp-widget">
            <div className="comp-info">
              <span>Profile Completion</span>
              <b>{completionPct}%</b>
            </div>
            <div className="comp-bar-track">
              <div
                className="comp-bar-fill"
                style={{ width: `${completionPct}%` }}
              />
            </div>
            <button className="btn small secondary" onClick={onOpenProfileWizard}>
              <Edit3 size={14} /> Update Profile
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="dash-tabs-bar">
        <button
          className={`dash-tab-btn ${activeTab === 'recommendations' ? 'active' : ''}`}
          onClick={() => setActiveTab('recommendations')}
        >
          <Sparkles size={16} /> Recommended For You ({recommendations.length})
        </button>
        <button
          className={`dash-tab-btn ${activeTab === 'applications' ? 'active' : ''}`}
          onClick={() => setActiveTab('applications')}
        >
          <FileText size={16} /> My Applications ({applications.length})
        </button>
        <button
          className={`dash-tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          <Bell size={16} /> Notifications ({notifications.filter((n) => !n.read).length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="dash-tab-content">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
            Loading candidate intelligence...
          </div>
        ) : activeTab === 'recommendations' ? (
          <div>
            <div className="rec-header">
              <div>
                <h3>Personalized Recommendations</h3>
                <p>
                  Ranked by our transparent rules engine based on your education, structured skills, desired roles, and location.
                </p>
              </div>
            </div>

            {recommendations.length === 0 ? (
              <div className="panel empty-panel">
                <h4>No jobs match your criteria right now</h4>
                <p>Try broadening your skills or career preferences in the Candidate Profile Wizard.</p>
                <button className="btn small" onClick={onOpenProfileWizard}>Edit Preferences</button>
              </div>
            ) : (
              <div className="rec-cards-grid">
                {recommendations.map((job) => {
                  const badge = recommendationService.formatMatchBadge(job.matchScore);
                  const isApplied = applications.some((a) => a.job_id === job.id);

                  return (
                    <div className="rec-card" key={job.id}>
                      <div className="rec-top">
                        <div className="rec-logo">
                          {job.company ? job.company[0] : 'P'}
                        </div>
                        <div className="rec-meta">
                          <span className="rec-company">{job.company}</span>
                          <h4 className="rec-title">{job.title}</h4>
                          <div className="rec-details">
                            <span><MapPin size={13} /> {job.location}</span>
                            <span><Briefcase size={13} /> {job.type}</span>
                            {job.salary && <span>· {job.salary}</span>}
                          </div>
                        </div>

                        <div className={`rec-badge ${badge.className}`}>
                          {badge.label}
                        </div>
                      </div>

                      {/* Why this job matches section */}
                      <div className="rec-why-box">
                        <b>Why this job matches:</b>
                        <ul>
                          {job.matchBreakdown?.reasons?.slice(0, 3).map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="rec-bottom">
                        <div className="rec-tags">
                          {job.skills
                            ?.split(',')
                            .slice(0, 4)
                            .map((s) => (
                              <span key={s.trim()}>{s.trim()}</span>
                            ))}
                        </div>

                        <div className="rec-actions">
                          <a href={`#/jobs/${job.id}`} className="btn small secondary">
                            View Details
                          </a>

                          {isApplied ? (
                            <span className="badge applied">Applied</span>
                          ) : (
                            <button
                              className="btn small"
                              onClick={() => setSelectedJobToApply(job)}
                            >
                              Apply Now
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : activeTab === 'applications' ? (
          <div>
            <h3>Your Application Pipeline</h3>
            <p className="muted" style={{ marginBottom: 20 }}>
              Track interview stages, assessments, and recruitment decisions from hiring teams.
            </p>

            {applications.length === 0 ? (
              <div className="panel empty-panel">
                <h4>No applications submitted yet</h4>
                <p>Browse recommended opportunities and apply using your verified profile.</p>
                <button className="btn small" onClick={() => setActiveTab('recommendations')}>
                  Explore Opportunities
                </button>
              </div>
            ) : (
              <div className="panel">
                {applications.map((app) => (
                  <div className="row" key={app.id}>
                    <div>
                      <b>{app.title}</b>
                      <span>
                        {app.company} · {app.location} · Applied on {app.created_at ? app.created_at.split(' ')[0] : 'Recently'}
                      </span>
                      {app.match_score > 0 && (
                        <small style={{ color: 'var(--orange)', fontWeight: 700 }}>
                          Match Score: {app.match_score}%
                        </small>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span className={getStatusClass(app.status)}>{app.status}</span>
                      <a href={`#/jobs/${app.job_id}`} className="view-link">
                        View Role <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <h3>Notification Center</h3>
            <p className="muted" style={{ marginBottom: 20 }}>
              Real-time updates regarding application confirmations, employer reviews, and status shifts.
            </p>

            {notifications.length === 0 ? (
              <div className="panel empty-panel">
                <p>No notifications at this time.</p>
              </div>
            ) : (
              <div className="notifications-list">
                {notifications.map((n) => (
                  <div className={`notif-card ${n.read ? 'read' : 'unread'}`} key={n.id}>
                    <div className="notif-icon">
                      <CheckCircle2 color="var(--orange)" size={20} />
                    </div>
                    <div className="notif-body">
                      <b>{n.title}</b>
                      <p>{n.message}</p>
                      <small>{n.created_at ? n.created_at.split(' ')[0] : 'Just now'}</small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Smart Apply Modal */}
      {selectedJobToApply && (
        <SmartApplyModal
          job={selectedJobToApply}
          user={user}
          onClose={() => setSelectedJobToApply(null)}
          onAppliedSuccess={() => {
            loadDashboardData();
          }}
        />
      )}
    </div>
  );
}
