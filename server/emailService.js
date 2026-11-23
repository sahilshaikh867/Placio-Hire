import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY || '';
const provider = apiKey ? 'resend' : (process.env.EMAIL_PROVIDER || 'console');
const fromEmail = process.env.EMAIL_FROM || 'Placio-Hire Security <onboarding@resend.dev>';
const contactReceiver = process.env.CONTACT_RECEIVER_EMAIL || 'sahilshaikhcse@gmail.com';

export const emailService = {
  /**
   * Send single-use OTP for authentication
   */
  async sendOtp({ email, otp, role = 'admin' }) {
    const displayOtp = process.env.NODE_ENV === 'production' ? '******' : otp;
    console.log(`\n============================================================`);
    console.log(`[ADMIN SECURITY EMAIL DISPATCHED]`);
    console.log(`Recipient: ${email}`);
    console.log(`Role:      ${role.toUpperCase()}`);
    console.log(`OTP Code:  ${displayOtp}`);
    console.log(`Time:      ${new Date().toISOString()}`);
    console.log(`============================================================\n`);

    if (provider === 'resend' && apiKey) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: fromEmail,
            to: email,
            subject: `[Placio-Hire] Your Administrator Verification Code: ${otp}`,
            text: `Placio-Hire Administrator Portal Security\n\nYour single-use verification code is: ${otp}\n\nThis OTP is valid for 10 minutes. If you did not request this access, please audit your account immediately.\n\n— PlacioBridge Security Team`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f8fafc; padding: 40px 20px; text-align: center;">
                <div style="max-width: 520px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 16px; padding: 36px 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                  <div style="display: inline-block; background: rgba(255, 91, 46, 0.15); border: 1px solid rgba(255, 91, 46, 0.3); border-radius: 99px; padding: 6px 16px; margin-bottom: 20px;">
                    <span style="color: #ff5b2e; font-weight: 700; font-size: 13px; letter-spacing: 1px; text-transform: uppercase;">Administrator Access Gate</span>
                  </div>
                  <h2 style="color: #ffffff; margin: 0 0 12px; font-size: 24px; font-weight: 700;">Placio-Hire Security Code</h2>
                  <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 28px;">
                    An authorized administrator login attempt was initiated for <strong>${email}</strong>. Use the verification passkey below to enter the Placio-Hire Administrator Portal.
                  </p>
                  <div style="background: #0b0f19; border: 1px dashed #ff5b2e; border-radius: 12px; padding: 20px; margin-bottom: 28px;">
                    <span style="font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #ff5b2e; font-family: 'Courier New', monospace;">${otp}</span>
                  </div>
                  <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 0;">
                    This one-time passcode expires in <strong>10 minutes</strong>. Never share this code with anyone. If you did not make this request, notify PlacioBridge Security immediately.
                  </p>
                </div>
                <div style="margin-top: 24px; color: #475569; font-size: 11px;">
                  &copy; ${new Date().getFullYear()} PlacioBridge Technologies LLP. All rights reserved.
                </div>
              </div>
            `
          })
        });
        const data = await res.json();
        console.log('[EMAIL SERVICE] Resend dispatch result:', data);
        return data;
      } catch (err) {
        console.error('[EMAIL SERVICE] Failed to send via Resend:', err);
      }
    }

    return { ok: true, provider: 'console', recipient: email };
  },

  /**
   * Send Application Confirmation
   */
  async sendApplicationConfirmation({ candidateEmail, candidateName, jobTitle, companyName }) {
    console.log(`[EMAIL SERVICE] Sending Application Confirmation to ${candidateEmail} for ${jobTitle} at ${companyName}`);

    if (provider === 'resend' && apiKey) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: fromEmail,
            to: candidateEmail,
            subject: `Application Received: ${jobTitle} at ${companyName}`,
            text: `Hi ${candidateName || 'Candidate'},\n\nYour application for ${jobTitle} at ${companyName} has been received by our recruitment team.\n\nYou can track the status of your application in your Hire-Placio student dashboard.`
          })
        });
      } catch (err) {
        console.error('[EMAIL SERVICE] Failed to send application confirmation:', err);
      }
    }
    return { ok: true };
  },

  /**
   * Send Application Status Update
   */
  async sendApplicationStatusUpdate({ candidateEmail, candidateName, jobTitle, newStatus }) {
    console.log(`[EMAIL SERVICE] Sending Status Update (${newStatus}) to ${candidateEmail} for ${jobTitle}`);

    if (provider === 'resend' && apiKey) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: fromEmail,
            to: candidateEmail,
            subject: `Application Update: ${jobTitle} (${newStatus.toUpperCase()})`,
            text: `Hi ${candidateName || 'Candidate'},\n\nYour application for ${jobTitle} has been updated to: ${newStatus}.\n\nLog in to your student portal to review next steps.`
          })
        });
      } catch (err) {
        console.error('[EMAIL SERVICE] Failed to send status update:', err);
      }
    }
    return { ok: true };
  },

  /**
   * Route Contact Us form messages
   */
  async sendContactNotification({ name, email, phone, subject, message, company }) {
    console.log(`[EMAIL SERVICE] Contact message from ${name} (${email}) routed to ${contactReceiver}`);

    if (provider === 'resend' && apiKey) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: fromEmail,
            to: contactReceiver,
            reply_to: email,
            subject: `[Hire-Placio Contact Form] ${subject || 'New Message'} from ${name}`,
            text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone || 'N/A'}\nOrganization: ${company || 'N/A'}\n\nMessage:\n${message}`
          })
        });
      } catch (err) {
        console.error('[EMAIL SERVICE] Failed to send contact notification:', err);
      }
    }
    return { ok: true };
  }
};
