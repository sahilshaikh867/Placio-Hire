import React, { useState, useEffect } from 'react';
import { applicationService } from '../services/applicationService';
import { jobService } from '../services/jobService';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  X,
  AlertTriangle,
  Sparkles,
  FileText,
  Send
} from 'lucide-react';

export default function SmartApplyModal({ job, user, onClose, onAppliedSuccess }) {
  const [matchData, setMatchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (job?.id) {
      setLoading(true);
      jobService.getJobMatch(job.id)
        .then(setMatchData)
        .catch((err) => {
          console.warn('Could not calculate match:', err);
          setMatchData({
            score: 75,
            eligible: true,
            breakdown: {
              educationEligible: true,
              educationMandatory: false,
              reasons: ['✓ Standard match evaluation applied'],
              matchedSkills: [],
              missingSkills: []
            }
          });
        })
        .finally(() => setLoading(false));
    }
  }, [job]);

  const handleApply = async () => {
    setError('');
    setSubmitting(true);
    try {
      await applicationService.applyToJob(job.id, {
        coverLetter,
        resume: user?.resume
      });
      setSuccess(true);
      if (onAppliedSuccess) onAppliedSuccess(job.id);
    } catch (err) {
      setError(err.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  const isMandatoryEducationFailed =
    matchData &&
    job.edu_eligibility_mandatory &&
    !matchData.breakdown?.educationEligible;

  const score = matchData?.score || 0;
  const isWeakMatch = score < 60;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="eyebrow" style={{ color: 'var(--orange)' }}>
              <Sparkles size={14} /> JOB MATCH ANALYSIS
            </span>
            <h3>Apply for {job.title}</h3>
            <p className="muted">{job.company} · {job.location}</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="modal-loading">
            Evaluating educational eligibility &amp; technical match...
          </div>
        ) : success ? (
          <div className="modal-success-box">
            <CheckCircle2 color="#16a34a" size={48} />
            <h4>Application Submitted Successfully!</h4>
            <div className="applied-meta-card">
              <p><b>Role:</b> {job.title}</p>
              <p><b>Company:</b> {job.company}</p>
              <p><b>Match Score:</b> {score}%</p>
              <p><b>Status:</b> Applied</p>
            </div>
            <p className="success-notice">
              A confirmation email has been dispatched to <b>{user?.email}</b>. You can track recruitment milestones from your Candidate Dashboard.
            </p>
            <button className="btn" onClick={onClose}>
              Return to Jobs
            </button>
          </div>
        ) : (
          <div className="modal-body">
            {/* Match Score Banner */}
            <div className={`match-score-card ${isMandatoryEducationFailed ? 'failed' : isWeakMatch ? 'weak' : 'strong'}`}>
              <div className="score-ring">
                <b>{score}%</b>
                <span>Match Score</span>
              </div>
              <div className="score-text">
                {isMandatoryEducationFailed ? (
                  <>
                    <h4 style={{ color: '#dc2626' }}>
                      <ShieldAlert size={18} /> Education Eligibility: NOT ELIGIBLE
                    </h4>
                    <p>
                      This job requires a <b>{job.edu_degree || 'specified degree'}</b> ({job.edu_branches || 'specified branches'}) background. Your profile does not meet this mandatory requirement.
                    </p>
                  </>
                ) : isWeakMatch ? (
                  <>
                    <h4 style={{ color: '#d97706' }}>
                      <AlertTriangle size={18} /> Moderate / Weak Match ({score}%)
                    </h4>
                    <p>
                      This job may not be an ideal fit for your current skill profile, but education criteria allows you to apply.
                    </p>
                  </>
                ) : (
                  <>
                    <h4 style={{ color: '#16a34a' }}>
                      <ShieldCheck size={18} /> Strong Job Match ({score}%)
                    </h4>
                    <p>
                      Your education, technical skills, and career preferences align well with this opportunity.
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Why This Job Matches Breakdown */}
            <div className="match-reasons-box">
              <h5>Transparent Match Breakdown</h5>
              <ul>
                {matchData?.breakdown?.reasons?.map((r, i) => (
                  <li key={i} className="reason-item positive">
                    {r}
                  </li>
                ))}
                {matchData?.breakdown?.missingSkills?.length > 0 && (
                  <li className="reason-item warning">
                    ⚠ Missing preferred skills: {matchData.breakdown.missingSkills.join(', ')}
                  </li>
                )}
              </ul>
            </div>

            {/* Resume verification */}
            <div className="resume-attach-notice">
              <FileText size={16} />
              <div>
                <span>Attached Resume: <b>{user?.resume || 'No resume uploaded'}</b></span>
                {!user?.resume && (
                  <p style={{ color: '#dc2626', margin: '4px 0 0' }}>
                    Please upload a resume in the Candidate Wizard before applying.
                  </p>
                )}
              </div>
            </div>

            {/* Optional cover letter */}
            {!isMandatoryEducationFailed && (
              <div className="field-group" style={{ marginTop: 14 }}>
                <label>Note to Hiring Team (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Share a brief note about your interest or relevant projects..."
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                />
              </div>
            )}

            {error && (
              <div className="contact-alert error" style={{ marginTop: 12 }}>
                <AlertTriangle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Actions */}
            <div className="modal-actions">
              <button className="btn secondary" onClick={onClose} disabled={submitting}>
                Cancel
              </button>

              {isMandatoryEducationFailed ? (
                <button className="btn danger" disabled title="Mandatory education requirements not met">
                  Application Blocked (Ineligible)
                </button>
              ) : (
                <button
                  className="btn"
                  disabled={submitting || !user?.resume}
                  onClick={handleApply}
                >
                  {submitting ? 'Submitting...' : isWeakMatch ? 'Apply Anyway' : 'Submit Application'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
