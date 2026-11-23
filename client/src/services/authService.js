import { request, setToken, getToken } from './apiClient';
import { supabase } from './supabaseClient';

export const authService = {
  // Candidate registration (Always explicitly candidate role)
  async register(name, email, password) {
    const data = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });
    if (data.token) {
      setToken(data.token);
    }
    return data;
  },

  // Candidate login with password
  async login(email, password) {
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (data.token) {
      setToken(data.token);
    }
    return data;
  },

  // Candidate Request OTP (Email OTP flow)
  async requestCandidateOtp(email) {
    return request('/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  // Candidate Verify OTP
  async verifyCandidateOtp(email, otp) {
    const data = await request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp })
    });
    if (data.token) {
      setToken(data.token);
    }
    return data;
  },

  // Admin Request OTP (Max 3 authorized admins, cooldown & rate limits)
  async requestAdminOtp(email, captchaToken = '') {
    return request('/admin/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({ email, captchaToken })
    });
  },

  // Admin Verify OTP
  async verifyAdminOtp(email, otp) {
    const data = await request('/admin/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp })
    });
    if (data.token) {
      setToken(data.token);
    }
    return data;
  },

  // Get current authenticated session profile
  async getCurrentUser() {
    if (!getToken()) return null;
    return request('/me');
  },

  // Request Password Reset via Supabase Auth
  async requestPasswordReset(email) {
    if (!email || !email.includes('@')) {
      throw new Error('Please provide a valid email address.');
    }
    const cleanEmail = email.trim().toLowerCase();
    const redirectUrl = `${window.location.origin}/#/reset-password`;

    if (supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: redirectUrl
      });
      if (error) {
        console.warn('[AUTH RECOVERY]', error.message);
        if (error.status === 429 || error.message.toLowerCase().includes('rate limit') || error.message.toLowerCase().includes('wait')) {
          throw new Error('Too many requests. Please wait before requesting another recovery email.');
        }
      }
    }

    // Generic response to prevent account enumeration
    return {
      ok: true,
      message: 'If an account exists with this email address, you will receive password recovery instructions shortly.'
    };
  },

  // Update Password for an active recovery session
  async updatePassword(newPassword) {
    if (!supabase) {
      throw new Error('Authentication service is currently unavailable.');
    }
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });
    if (error) {
      throw new Error(error.message || 'Failed to update password. Your recovery session may have expired.');
    }
    return data;
  },

  // Get current session for recovery verification
  async getRecoverySession() {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data?.session || null;
  },

  async logout() {
    setToken(null);
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        // ignore
      }
    }
  }
};
