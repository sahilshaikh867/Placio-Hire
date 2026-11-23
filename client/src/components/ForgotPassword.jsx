import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle2, AlertCircle, ArrowLeft, ShieldCheck, KeyRound } from 'lucide-react';
import { authService } from '../services/authService';
import { validateEmail } from '../utils/passwordValidator';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  // Cooldown countdown timer
  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your registered email address.');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address (e.g. name@college.edu).');
      return;
    }

    if (cooldown > 0) {
      setError(`Please wait ${cooldown} seconds before requesting another recovery email.`);
      return;
    }

    try {
      setLoading(true);
      await authService.requestPasswordReset(email);
      setSubmitted(true);
      setCooldown(60); // 60s cooldown
    } catch (err) {
      setError(err.message || 'Unable to process recovery request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth">
      <div className="authbox">
        <div className="eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <KeyRound size={13} color="var(--orange)" /> PASSWORD RECOVERY
        </div>
        <h2>Reset Your Password</h2>
        <p>
          Enter the email address associated with your Hire-Placio student, teacher, or recruiter account. We'll send you secure recovery instructions.
        </p>

        {error && (
          <div className="contact-alert error" style={{ marginBottom: 16 }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '10px 0 20px' }}>
            <div
              style={{
                width: 60,
                height: 60,
                background: '#ecfdf5',
                color: '#16a34a',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                border: '1px solid #bbf7d0'
              }}
            >
              <CheckCircle2 size={32} />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 19 }}>Check Your Inbox</h3>
            <p style={{ color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.6, margin: '0 0 20px' }}>
              If an account exists for <b>{email}</b>, a secure recovery email has been dispatched. Please check your inbox and spam folder.
            </p>

            <div style={{ background: '#f8fafc', border: '1px solid var(--line)', borderRadius: 12, padding: 14, marginBottom: 20, fontSize: 12.5, color: '#475569', textAlign: 'left' }}>
              <b>Next steps:</b>
              <ol style={{ margin: '6px 0 0 16px', padding: 0 }}>
                <li>Click the verification link in the email.</li>
                <li>You will be redirected to choose a new password.</li>
                <li>Links expire after a short time for your security.</li>
              </ol>
            </div>

            {cooldown > 0 ? (
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
                Resend recovery link in <b>{cooldown}s</b>
              </div>
            ) : (
              <button
                type="button"
                className="btn secondary small full"
                onClick={handleSubmit}
                disabled={loading}
                style={{ marginBottom: 14 }}
              >
                {loading ? 'Sending...' : 'Resend Recovery Email'}
              </button>
            )}

            <a
              href="#/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                color: 'var(--orange)',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              <ArrowLeft size={14} /> Back to Sign In
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="field-group">
              <label>Registered Account Email *</label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={16}
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--muted)',
                    pointerEvents: 'none'
                  }}
                />
                <input
                  type="email"
                  placeholder="e.g. candidate@college.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: 40 }}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div
              className="captcha-notice"
              style={{ margin: '14px 0', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)' }}
            >
              <ShieldCheck size={14} color="#16a34a" /> Protected by secure session verification and rate limiting.
            </div>

            <button
              className="btn full"
              type="submit"
              disabled={loading || cooldown > 0}
              style={{ marginTop: 8 }}
            >
              {loading ? 'Dispatching Recovery Instructions...' : cooldown > 0 ? `Please wait (${cooldown}s)` : 'Send Recovery Instructions'}
            </button>

            <p className="center" style={{ marginTop: 18 }}>
              <a
                href="#/login"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: 'var(--ink-soft)',
                  textDecoration: 'none',
                  fontSize: 13.5
                }}
              >
                <ArrowLeft size={14} /> Back to Sign In
              </a>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
