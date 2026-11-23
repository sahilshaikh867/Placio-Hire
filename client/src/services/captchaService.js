export const captchaService = {
  // Returns whether CAPTCHA is enabled via environment
  isEnabled() {
    return Boolean(import.meta.env.VITE_CAPTCHA_SITE_KEY);
  },

  getSiteKey() {
    return import.meta.env.VITE_CAPTCHA_SITE_KEY || '';
  },

  // Generates or verifies a client-side verification token
  async executeChallenge(action = 'submit') {
    const siteKey = this.getSiteKey();
    if (!siteKey) {
      // In dev or unconfigured environment, return a clean verified token
      return `dev-token-${Date.now()}`;
    }

    if (window.grecaptcha && window.grecaptcha.enterprise) {
      try {
        return await window.grecaptcha.enterprise.execute(siteKey, { action });
      } catch (err) {
        console.warn('ReCAPTCHA enterprise error:', err);
      }
    }

    if (window.grecaptcha) {
      try {
        return await window.grecaptcha.execute(siteKey, { action });
      } catch (err) {
        console.warn('ReCAPTCHA error:', err);
      }
    }

    return `fallback-token-${Date.now()}`;
  }
};
