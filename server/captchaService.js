import dotenv from 'dotenv';
dotenv.config();

const captchaEnabled = process.env.CAPTCHA_ENABLED === 'true';
const captchaSecretKey = process.env.CAPTCHA_SECRET_KEY || '';

export const captchaService = {
  isEnabled() {
    return captchaEnabled;
  },

  async verifyToken(token, remoteIp) {
    if (!captchaEnabled) {
      // CAPTCHA is disabled by environment configuration
      return { success: true };
    }

    if (!token) {
      return { success: false, error: 'CAPTCHA token is required when CAPTCHA is enabled' };
    }

    try {
      // Cloudflare Turnstile / Google reCAPTCHA / hCaptcha verification
      const verifyUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
      const formData = new URLSearchParams();
      formData.append('secret', captchaSecretKey);
      formData.append('response', token);
      if (remoteIp) formData.append('remoteip', remoteIp);

      const res = await fetch(verifyUrl, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      return { success: data.success, error: data['error-codes'] ? data['error-codes'].join(', ') : null };
    } catch (err) {
      console.error('[CAPTCHA SERVICE] Verification failed:', err);
      return { success: false, error: 'CAPTCHA verification service error' };
    }
  }
};
