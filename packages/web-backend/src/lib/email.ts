import nodemailer from 'nodemailer';

export interface ContactFormData {
  name: string;
  email: string;
  topic: string;
  message: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const emailUser = process.env.EMAIL_USER;
    const emailPassword = process.env.EMAIL_PASSWORD;
    const emailHost = process.env.EMAIL_HOST || 'smtp.gmail.com';
    const emailPort = parseInt(process.env.EMAIL_PORT || '587');

    if (!emailUser || !emailPassword) {
      console.warn('⚠️  Email credentials not configured. Contact form will not work.');
      console.warn('   Set EMAIL_USER and EMAIL_PASSWORD in your .env file');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: emailHost,
        port: emailPort,
        secure: emailPort === 465, // true for 465, false for other ports
        auth: {
          user: emailUser,
          pass: emailPassword,
        },
      });

      console.log('✓ Email service initialized');
    } catch (error) {
      console.error('✗ Failed to initialize email service:', error);
    }
  }

  async sendContactForm(data: ContactFormData): Promise<void> {
    if (!this.transporter) {
      throw new Error('Email service not configured');
    }

    const { name, email, topic, message } = data;

    const mailOptions = {
      from: `"${name} via Ducky Contact Form" <${process.env.EMAIL_USER}>`,
      to: process.env.CONTACT_EMAIL_TO || process.env.EMAIL_USER,
      replyTo: email,
      subject: `Contact Form: ${this.getTopicLabel(topic)}`,
      text: this.formatPlainText(data),
      html: this.formatHtml(data),
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✓ Contact form email sent:', info.messageId);
    } catch (error) {
      console.error('✗ Failed to send contact form email:', error);
      throw new Error('Failed to send email');
    }
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    if (!this.transporter) {
      throw new Error('Email service not configured');
    }

    const mailOptions = {
      from: `"Ducky.wtf" <${process.env.EMAIL_USER}>`,
      to,
      subject: 'Reset your password',
      text: this.formatPasswordResetPlainText(resetUrl),
      html: this.formatPasswordResetHtml(resetUrl),
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✓ Password reset email sent:', info.messageId);
    } catch (error) {
      console.error('✗ Failed to send password reset email:', error);
      throw new Error('Failed to send email');
    }
  }

  private getTopicLabel(topic: string): string {
    const topics: Record<string, string> = {
      general: 'General question',
      support: 'Technical support',
      billing: 'Billing & plans',
      bug: 'Report a bug',
      feature: 'Feature request',
      other: 'Other',
    };
    return topics[topic] || topic;
  }

  private formatPlainText(data: ContactFormData): string {
    return `
New Contact Form Submission
===========================

Name: ${data.name}
Email: ${data.email}
Topic: ${this.getTopicLabel(data.topic)}

Message:
${data.message}

---
Sent from ducky.wtf contact form
Reply to this email to respond to ${data.name}
    `.trim();
  }

  private formatHtml(data: ContactFormData): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .field { margin-bottom: 20px; }
    .label { font-weight: 600; color: #555; margin-bottom: 5px; }
    .value { background: white; padding: 12px; border-radius: 4px; border-left: 3px solid #667eea; }
    .message { white-space: pre-wrap; }
    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 14px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📬 New Contact Form Submission</h1>
    </div>
    <div class="content">
      <div class="field">
        <div class="label">From:</div>
        <div class="value">${this.escapeHtml(data.name)} &lt;${this.escapeHtml(data.email)}&gt;</div>
      </div>
      <div class="field">
        <div class="label">Topic:</div>
        <div class="value">${this.escapeHtml(this.getTopicLabel(data.topic))}</div>
      </div>
      <div class="field">
        <div class="label">Message:</div>
        <div class="value message">${this.escapeHtml(data.message)}</div>
      </div>
      <div class="footer">
        💡 Reply to this email to respond directly to ${this.escapeHtml(data.name)}
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private formatPasswordResetPlainText(resetUrl: string): string {
    return `
Password Reset Request
======================

You requested to reset your password for your Ducky.wtf account.

Click the link below to reset your password (expires in 15 minutes):
${resetUrl}

If you didn't request this, you can safely ignore this email.

---
The Ducky.wtf Team.
    `.trim();
  }

  private formatPasswordResetHtml(resetUrl: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #000000; color: #fbbf24; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; border-bottom: 3px solid #fbbf24; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #1a1a1a; padding: 30px; border-radius: 0 0 8px 8px; color: #ffffff; }
    .message { background: #000000; padding: 20px; border-radius: 4px; border-left: 3px solid #fbbf24; margin: 20px 0; }
    .button { display: inline-block; background: #fbbf24; color: #000000; padding: 12px 30px; text-decoration: none; border-radius: 4px; margin: 20px 0; font-weight: 700; }
    .button:hover { background: #f59e0b; }
    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #262626; font-size: 14px; color: #a3a3a3; text-align: center; }
    .warning { color: #a3a3a3; font-size: 14px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Password Reset Request</h1>
    </div>
    <div class="content">
      <div class="message">
        <p>You requested to reset your password for your Ducky.wtf account.</p>
        <p>Click the button below to create a new password:</p>
        <div style="text-align: center;">
          <a href="${this.escapeHtml(resetUrl)}" class="button">Reset Password</a>
        </div>
        <p class="warning">This link will expire in 15 minutes.</p>
      </div>
      <div class="footer">
        <p>If you didn't request this password reset, you can safely ignore this email.</p>
        <p>The Ducky.wtf Team.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  async sendTeamInvitationEmail(
    to: string,
    teamName: string,
    token: string,
    inviterName: string
  ): Promise<void> {
    if (!this.transporter) {
      throw new Error('Email service not configured');
    }

    const webUrl = process.env.WEB_URL || 'http://localhost:9179';
    const inviteUrl = `${webUrl}/accept-invitation?token=${token}`;

    const mailOptions = {
      from: `"Ducky.wtf" <${process.env.EMAIL_USER}>`,
      to,
      subject: `You've been invited to join ${teamName} on Ducky.wtf`,
      text: this.formatTeamInvitationPlainText(teamName, inviteUrl, inviterName),
      html: this.formatTeamInvitationHtml(teamName, inviteUrl, inviterName),
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✓ Team invitation email sent:', info.messageId);
    } catch (error) {
      console.error('✗ Failed to send team invitation email:', error);
      throw new Error('Failed to send email');
    }
  }

  async sendMagicLinkEmail(to: string, magicUrl: string): Promise<void> {
    if (!this.transporter) {
      throw new Error('Email service not configured');
    }

    const mailOptions = {
      from: `"Ducky.wtf" <${process.env.EMAIL_USER}>`,
      to,
      subject: 'Your magic link to sign in',
      text: this.formatMagicLinkPlainText(magicUrl),
      html: this.formatMagicLinkHtml(magicUrl),
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✓ Magic link email sent:', info.messageId);
    } catch (error) {
      console.error('✗ Failed to send magic link email:', error);
      throw new Error('Failed to send email');
    }
  }

  private formatTeamInvitationPlainText(
    teamName: string,
    inviteUrl: string,
    inviterName: string
  ): string {
    return `
Team Invitation
===============

${inviterName} has invited you to join ${teamName} on Ducky.wtf.

Click the link below to accept the invitation (expires in 7 days):
${inviteUrl}

If you don't have a Ducky.wtf account yet, you'll be prompted to create one first.

---
The Ducky.wtf Team.
    `.trim();
  }

  private formatTeamInvitationHtml(
    teamName: string,
    inviteUrl: string,
    inviterName: string
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #000000; color: #fbbf24; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; border-bottom: 3px solid #fbbf24; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #1a1a1a; padding: 30px; border-radius: 0 0 8px 8px; color: #ffffff; }
    .message { background: #000000; padding: 20px; border-radius: 4px; border-left: 3px solid #fbbf24; margin: 20px 0; }
    .button { display: inline-block; background: #fbbf24; color: #000000; padding: 12px 30px; text-decoration: none; border-radius: 4px; margin: 20px 0; font-weight: 700; }
    .button:hover { background: #f59e0b; }
    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #262626; font-size: 14px; color: #a3a3a3; text-align: center; }
    .team-name { color: #fbbf24; font-weight: 700; }
    .warning { color: #a3a3a3; font-size: 14px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Team Invitation</h1>
    </div>
    <div class="content">
      <div class="message">
        <p><strong>${this.escapeHtml(inviterName)}</strong> has invited you to join <span class="team-name">${this.escapeHtml(teamName)}</span> on Ducky.wtf.</p>
        <p>Accept this invitation to collaborate on tunnels and custom domains with your team.</p>
        <div style="text-align: center;">
          <a href="${this.escapeHtml(inviteUrl)}" class="button">Accept Invitation</a>
        </div>
        <p class="warning">This invitation will expire in 7 days.</p>
      </div>
      <div class="footer">
        <p>If you don't have a Ducky.wtf account yet, you'll be able to create one when you accept.</p>
        <p>The Ducky.wtf Team.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  private formatMagicLinkPlainText(magicUrl: string): string {
    return `
Magic Link Sign In
==================

Click the link below to sign in to your Ducky.wtf account (expires in 15 minutes):
${magicUrl}

If you didn't request this, you can safely ignore this email.

---
The Ducky.wtf Team.
    `.trim();
  }

  private formatMagicLinkHtml(magicUrl: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #000000; color: #fbbf24; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; border-bottom: 3px solid #fbbf24; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #1a1a1a; padding: 30px; border-radius: 0 0 8px 8px; color: #ffffff; }
    .message { background: #000000; padding: 20px; border-radius: 4px; border-left: 3px solid #fbbf24; margin: 20px 0; }
    .button { display: inline-block; background: #fbbf24; color: #000000; padding: 12px 30px; text-decoration: none; border-radius: 4px; margin: 20px 0; font-weight: 700; }
    .button:hover { background: #f59e0b; }
    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #262626; font-size: 14px; color: #a3a3a3; text-align: center; }
    .warning { color: #a3a3a3; font-size: 14px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🪄 Magic Link Sign In</h1>
    </div>
    <div class="content">
      <div class="message">
        <p>Click the button below to sign in to your Ducky.wtf account:</p>
        <div style="text-align: center;">
          <a href="${this.escapeHtml(magicUrl)}" class="button">Sign In</a>
        </div>
        <p class="warning">This link will expire in 15 minutes.</p>
      </div>
      <div class="footer">
        <p>If you didn't request this sign-in link, you can safely ignore this email.</p>
        <p>The Ducky.wtf Team.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();
  }
}

export const emailService = new EmailService();

export async function sendTeamInvitationEmail(
  to: string,
  teamName: string,
  token: string,
  inviterName: string
): Promise<void> {
  return emailService.sendTeamInvitationEmail(to, teamName, token, inviterName);
}
