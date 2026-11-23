import React, { useState } from 'react';
import { emailService } from '../services/emailService';
import { captchaService } from '../services/captchaService';
import { Mail, Phone, Building, Globe, CheckCircle2, Send, ShieldCheck, AlertCircle, User } from 'lucide-react';

export default function ContactSection() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    subject: 'Student Career Inquiry',
    message: ''
  });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validate = () => {
    if (!form.name.trim()) return 'Please enter your full name.';
    if (!form.email.trim() || !form.email.includes('@')) return 'Please provide a valid email address.';
    if (form.phone && form.phone.replace(/\D/g, '').length < 8) return 'Please enter a valid phone number (at least 8 digits).';
    if (!form.message.trim() || form.message.trim().length < 10) return 'Your message must be at least 10 characters long.';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setLoading(true);

    try {
      const captchaToken = await captchaService.executeChallenge('contact_form');
      await emailService.sendContactMessage({
        ...form,
        captchaToken
      });
      setSent(true);
    } catch (err) {
      setError(err.message || 'Failed to submit contact request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="contact-section-wrap" id="contact">
      <div className="section-head">
        <div className="eyebrow">
          <Mail size={14} /> GET IN TOUCH
        </div>
        <h2>Contact PlacioBridge Technologies</h2>
        <p>
          Reach our executive leadership, campus placement partnerships desk, or recruiter network.
        </p>
      </div>

      <div className="contact-grid">
        <div className="contact-card form-side">
          <h3>Send a Secure Message</h3>
          <p className="card-sub">
            Your inquiry is delivered directly to our leadership desk.
          </p>

          {error && (
            <div className="contact-alert error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {sent ? (
            <div className="contact-success-box">
              <CheckCircle2 color="#16a34a" size={40} />
              <h4>Message Delivered Successfully!</h4>
              <p>
                Thank you for contacting PlacioBridge Technologies. Sahil Shaikh and our team will get back to your email shortly.
              </p>
              <button
                className="btn small"
                onClick={() => {
                  setSent(false);
                  setForm({
                    name: '',
                    email: '',
                    phone: '',
                    company: '',
                    subject: 'Student Career Inquiry',
                    message: ''
                  });
                }}
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="contact-form-clean">
              <div className="form-row-two">
                <div className="field-group">
                  <label>Full Name *</label>
                  <input
                    placeholder="e.g. Rahul Sharma"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div className="field-group">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    placeholder="e.g. rahul@college.edu"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row-two">
                <div className="field-group">
                  <label>Phone / WhatsApp</label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div className="field-group">
                  <label>Company / College</label>
                  <input
                    placeholder="e.g. Pune Institute of Tech"
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                  />
                </div>
              </div>

              <div className="field-group">
                <label>Inquiry Subject *</label>
                <select
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                >
                  <option>Student Career Inquiry</option>
                  <option>Campus Placement Partnership</option>
                  <option>Corporate Recruiter Hiring</option>
                  <option>Technical Support</option>
                </select>
              </div>

              <div className="field-group">
                <label>Message *</label>
                <textarea
                  rows={5}
                  placeholder="Tell us about your requirements, student background, or placement inquiry..."
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  required
                />
              </div>

              <div className="captcha-notice">
                <ShieldCheck size={14} /> Protected by automated CAPTCHA security verification
              </div>

              <button className="btn full" type="submit" disabled={loading}>
                {loading ? 'Submitting Inquiry...' : <><Send size={16} /> Submit Message</>}
              </button>
            </form>
          )}
        </div>

        <div className="contact-card info-side">
          <h3>Direct Executive Contact</h3>
          <p className="card-sub">
            Direct point of contact for campus drives, recruitment partnerships, and platform queries.
          </p>

          {/* Sahil Shaikh Contact Card */}
          <div
            style={{
              display: 'flex',
              gap: 16,
              alignItems: 'center',
              background: 'var(--cream)',
              border: '1px solid rgba(255, 91, 46, 0.3)',
              borderRadius: 16,
              padding: '16px 20px',
              marginBottom: 20
            }}
          >
            <img
              src="https://www.placiobridge.com/_next/static/immutable/media/sahil%20shaikh.1tb-t_a1arqk7.jpg"
              alt="Sahil Shaikh"
              style={{
                width: 68,
                height: 68,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid var(--orange)',
                flexShrink: 0
              }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div>
              <b style={{ fontSize: 18, color: 'var(--ink)', display: 'block' }}>Sahil Shaikh</b>
              <span
                style={{
                  fontSize: 12,
                  color: 'var(--orange)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  display: 'block',
                  marginBottom: 6
                }}
              >
                Lead Executive • PlacioBridge Technologies LLP
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
                <a
                  href="tel:+918329594512"
                  style={{ color: 'var(--ink)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Phone size={14} color="var(--orange)" /> +91 83295 94512
                </a>
                <a
                  href="mailto:sahilshaikhcse@gmail.com"
                  style={{ color: 'var(--orange)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Mail size={14} color="var(--orange)" /> sahilshaikhcse@gmail.com
                </a>
              </div>
            </div>
          </div>

          <div className="info-item">
            <div className="info-icon">
              <Building size={20} />
            </div>
            <div className="info-text">
              <b>PlacioBridge Technologies LLP</b>
              <p>
                Office number 125, 1st floor, Sunshine Joy Complex, Pawale Plaza, Main Pirangut Stand, Pune - 412115, Maharashtra, India
              </p>
            </div>
          </div>

          <div className="info-item">
            <div className="info-icon">
              <Phone size={20} />
            </div>
            <div className="info-text">
              <b>Direct Phone / WhatsApp</b>
              <a href="tel:+918329594512">+91 83295 94512</a>
            </div>
          </div>

          <div className="info-item">
            <div className="info-icon">
              <Mail size={20} />
            </div>
            <div className="info-text">
              <b>Email Leadership &amp; Hiring</b>
              <a href="mailto:sahilshaikhcse@gmail.com">sahilshaikhcse@gmail.com</a>
            </div>
          </div>

          <div className="info-item">
            <div className="info-icon">
              <Globe size={20} />
            </div>
            <div className="info-text">
              <b>Corporate Web Portal</b>
              <a href="https://placiobridge.com" target="_blank" rel="noreferrer">
                https://placiobridge.com
              </a>
            </div>
          </div>

          <div className="info-badge-box">
            <b>AICTE-Aligned Recruitment Desk</b>
            <p>
              Partnered with engineering institutions across Maharashtra and nationwide for fair, skill-verified tech placements.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
