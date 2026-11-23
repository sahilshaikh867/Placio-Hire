import { request } from './apiClient';

export const emailService = {
  // Submit contact message (Routes securely via backend to CEO email, keeping credentials private)
  async sendContactMessage({ name, email, phone, company, subject, message, captchaToken = '' }) {
    return request('/contact', {
      method: 'POST',
      body: JSON.stringify({ name, email, phone, company, subject, message, captchaToken })
    });
  }
};
