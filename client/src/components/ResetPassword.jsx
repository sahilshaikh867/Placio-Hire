import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft, ShieldCheck, KeyRound, AlertTriangle } from 'lucide-react';
import { authService } from '../services/authService';
import { supabase } from '../services/supabaseClient';
import { validatePassword, PASSWORD_REQUIREMENTS } from '../utils/passwordValidator';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [sessionChecking, setSessionChecking] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Password validation analysis
  const validation = validatePassword(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  useEffect(() => {
    let mounted = true;

    // Listen for auth state changes (e.g. PASSWORD_RECOVERY event)
    const { data: authListener } = supabase?.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY' || session) {
        setHasValidSession(true);
        setUserEmail(session?.user?.email || '');
        setSessionChecking(false);
      }
    }) || { data: { subscription: null } };

    // Also check initial session and URL hash/params
    async function checkSession() {
      try {
        const session = await authService.getRecoverySession();
        if (!mounted) return;

        // Check if there is an active session or recovery token in hash/query
        const hash = window.location.hash || '';
        const search = window.location.search || '';
        const isRecoveryTokenPresent =
          hash.includes('access_token') ||
          hash.includes('type=recovery') ||
          search.includes('code=');

        if (session || isRecoveryTokenPresent) {
          setHasValidSession(true);
          setUserEmail(session?.user?.email || '');
        } else {
          setHasValidSession(false);
        }
      } catch (err) {
        if (mounted) setHasValidSession(false);
      } finally {
        if (mounted) setSessionChecking(false);
      }
    }

    checkSession();

    return () => {
      mounted = false;
      if (authListener?.subscription) authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Pre-flight validation
    if (!validation.isValid) {
      setError('Password does not meet the minimum security requirements (at least 12 characters with mixed cases, numbers, and symbols).');
      return;
    }

    if (password !== confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }

    try {
      setLoading(true);
      await authService.updatePassword(password);
      setSuccess(true);
      setPassword('');
      setConfirmPassword('');

      // Sign out recovery session to require clean login with new credentials
      setTimeout(async () => {
        try {
          await authService.logout();
        } catch (e) {
          // ignore
        }
        window.location.hash = '#/login';
      }, 3000);
    } catch (err) {
      console.error('[RESET PASSWORD ERROR]', err);
      setError(err.message || 'Failed to update password. Your recovery link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  // State 1: Verifying Recovery Session
  if (sessionChecking) {
    return (
      <main className="auth">
        <div className="authbox" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div className="spinner" style={{ margin: '0 auto 16px', width: 36, height: 36, border: '3px solid #f3f3f3', borderTop: '3px solid var(--orange)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <h3>Verifying Security Session</h3>
          <p style={{ color: 'var(--muted)', fontSize: 13.5 }}>
            Validating your encrypted password recovery token...
          </p>
        </div>
      </main>
    );
  }

  // State 2: Invalid or Expired Recovery Session
  if (!hasValidSession && !success) {
    return (
      <main className="auth">
        <div className="authbox" style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 60,
              height: 60,
              background: '#fef2f2',
              color: '#dc2626',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              border: '1px solid #fecaca'
            }}
          >
            <AlertTriangle size={30} />
          </div>
          <h2 style={{ fontSize: 22, margin: '0 0 8px' }}>Recovery Link Expired or Invalid</h2>
          <p style={{ color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.6, marginBottom: 20 }}>
            This password recovery link has already been used, has expired, or is missing a valid security token. For your protection, password reset links can only be used once.
          </p>

          <a href="#/forgot-password" className="btn full" style={{ textDecoration: 'none', display: 'block', marginBottom: 12 }}>
            Request New Recovery Link
          </a>

          <a
            href="#/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: 'var(--ink-soft)',
              textDecoration: 'none',
              fontSize: 13
            }}
          >
            <ArrowLeft size={14} /> Back to Sign In
          </a>
        </div>
      </main>
    );
  }

  // State 3: Successful Password Reset
  if (success) {
    return (
      <main className="auth">
        <div className="authbox" style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 64,
              height: 64,
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
            <CheckCircle2 size={36} />
          </div>
          <h2 style={{ fontSize: 22, margin: '0 0 8px' }}>Password Successfully Updated!</h2>
          <p style={{ color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.6, marginBottom: 20 }}>
            Your Placio-Hire account password has been securely reset. You will be automatically redirected to sign in in a few seconds.
          </p>

          <a href="#/login" className="btn full" style={{ textDecoration: 'none', display: 'block' }}>
            Proceed to Sign In Now
          </a>
        </div>
      </main>
    );
  }

  // State 4: Set New Password Form
  return (
    <main className="auth">
      <div className="authbox" style={{ maxWidth: 480 }}>
        <div className="eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <KeyRound size={13} color="var(--orange)" /> CHOOSE NEW PASSWORD
        </div>
        <h2>Set a Strong New Password</h2>
        <p>
          {userEmail ? (
            <>Securing account for <b>{userEmail}</b>. Please create a compliant password with at least 12 characters.</>
          ) : (
            <>Choose a compliant password with at least 12 characters to protect your profile and recruitment pipeline.</>
          )}
        </p>

        {error && (
          <div className="contact-alert error" style={{ marginBottom: 16 }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* New Password */}
          <div className="field-group" style={{ marginBottom: 14 }}>
            <label>New Password *</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter at least 12 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingRight: 40 }}
                required
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--muted)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 4
                }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Password Strength Indicator */}
          {password.length > 0 && (
            <div style={{ marginBottom: 16, background: '#f8fafc', border: '1px solid var(--line)', borderRadius: 10, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Password Strength:</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: validation.strengthColor }}>
                  {validation.strength}
                </span>
              </div>
              <div style={{ height: 4, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden', marginBottom: 10 }}>
                <div
                  style={{
                    height: '100%',
                    width: `${validation.score}%`,
                    background: validation.strengthColor,
                    transition: 'all 0.3s ease'
                  }}
                />
              </div>

              {/* Requirement Checklist */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {validation.checks.map((req) => (
                  <div
                    key={req.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 11.5,
                      color: req.met ? '#16a34a' : '#64748b'
                    }}
                  >
                    <CheckCircle2 size={13} color={req.met ? '#16a34a' : '#cbd5e1'} />
                    <span style={{ textDecoration: req.met ? 'none' : 'none' }}>{req.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Confirm Password */}
          <div className="field-group" style={{ marginBottom: 16 }}>
            <label>Confirm New Password *</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirm ? 'text' : 'password'}
                placeholder="Re-enter your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ paddingRight: 40 }}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--muted)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 4
                }}
                aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {confirmPassword.length > 0 && !passwordsMatch && (
              <span style={{ fontSize: 11.5, color: '#dc2626', marginTop: 4, display: 'block' }}>
                Passwords do not match
              </span>
            )}
            {passwordsMatch && (
              <span style={{ fontSize: 11.5, color: '#16a34a', marginTop: 4, display: 'block' }}>
                ✓ Passwords match
              </span>
            )}
          </div>

          <button
            className="btn full"
            type="submit"
            disabled={loading || !validation.isValid || !passwordsMatch}
            style={{ marginTop: 8 }}
          >
            {loading ? 'Securing Account...' : 'Update & Save New Password'}
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
                fontSize: 13
              }}
            >
              <ArrowLeft size={14} /> Back to Sign In
            </a>
          </p>
        </form>
      </div>
    </main>
  );
}
