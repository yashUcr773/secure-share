// Email service for SecureShare
// Handles sending verification and password reset emails

import { config } from './config';

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export class EmailService {
  /**
   * Send an email (placeholder implementation)
   * In production, integrate with services like SendGrid, Mailgun, or AWS SES
   */
  private static async sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
    try {
      // In development, log email content instead of sending
      if (process.env.NODE_ENV !== 'production') {
        console.log('\n📧 Email would be sent:');
        console.log(`To: ${options.to}`);
        console.log(`Subject: ${options.subject}`);
        console.log(`Text: ${options.text}`);
        console.log('HTML version available\n');
        return { success: true };
      }      // Production email sending with SendGrid
      const sgMail = require('@sendgrid/mail');
      
      if (!process.env.SENDGRID_API_KEY) {
        throw new Error('SENDGRID_API_KEY environment variable is not set');
      }
      
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      
      const emailData = {
        to: options.to,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@secureshare.app',
        subject: options.subject,
        text: options.text,
        html: options.html,
      };
      
      await sgMail.send(emailData);
      return { success: true };

    } catch (error) {
      console.error('Email sending error:', error);
      return { success: false, error: 'Failed to send email' };
    }
  }

  /**
   * Generate email verification template
   */
  private static generateVerificationTemplate(verificationLink: string, userEmail: string): EmailTemplate {
    const subject = 'Verify your SecureShare account';
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email - SecureShare</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { margin-top: 30px; font-size: 14px; color: #666; text-align: center; }
        .warning { background: #fef3cd; border: 1px solid #fecaca; padding: 15px; border-radius: 6px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>SecureShare</h1>
        <p>Secure File Sharing Platform</p>
    </div>
    <div class="content">
        <h2>Verify Your Email Address</h2>
        <p>Thank you for signing up for SecureShare! To complete your registration and secure your account, please verify your email address by clicking the button below:</p>
        
        <div style="text-align: center;">
            <a href="${verificationLink}" class="button">Verify Email Address</a>
        </div>
        
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 4px; font-family: monospace;">${verificationLink}</p>
        
        <div class="warning">
            <strong>Security Notice:</strong>
            <ul>
                <li>This verification link will expire in 24 hours</li>
                <li>If you didn't create a SecureShare account, please ignore this email</li>
                <li>Never share this verification link with anyone</li>
            </ul>
        </div>
        
        <p>After verification, you'll be able to:</p>
        <ul>
            <li>Securely upload and share files</li>
            <li>Create password-protected share links</li>
            <li>Manage your files with enterprise-grade security</li>
        </ul>
    </div>
    <div class="footer">
        <p>This email was sent to ${userEmail}. If you have any questions, contact our support team.</p>
        <p>&copy; 2025 SecureShare. All rights reserved.</p>
    </div>
</body>
</html>`;

    const text = `
SecureShare - Verify Your Email Address

Thank you for signing up for SecureShare! To complete your registration and secure your account, please verify your email address.

Verification Link: ${verificationLink}

Security Notice:
- This verification link will expire in 24 hours
- If you didn't create a SecureShare account, please ignore this email
- Never share this verification link with anyone

After verification, you'll be able to securely upload and share files with enterprise-grade security.

This email was sent to ${userEmail}. If you have any questions, contact our support team.

© 2025 SecureShare. All rights reserved.
`;

    return { subject, html, text };
  }

  /**
   * Generate password reset template
   */
  private static generatePasswordResetTemplate(resetLink: string, userEmail: string): EmailTemplate {
    const subject = 'Reset your SecureShare password';
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset - SecureShare</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { margin-top: 30px; font-size: 14px; color: #666; text-align: center; }
        .warning { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 6px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>SecureShare</h1>
        <p>Password Reset Request</p>
    </div>
    <div class="content">
        <h2>Reset Your Password</h2>
        <p>We received a request to reset your SecureShare account password. If you made this request, click the button below to set a new password:</p>
        
        <div style="text-align: center;">
            <a href="${resetLink}" class="button">Reset Password</a>
        </div>
        
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 4px; font-family: monospace;">${resetLink}</p>
        
        <div class="warning">
            <strong>Security Notice:</strong>
            <ul>
                <li>This password reset link will expire in 1 hour</li>
                <li>If you didn't request a password reset, please ignore this email</li>
                <li>Your password will remain unchanged until you use this link</li>
                <li>For security, this link can only be used once</li>
            </ul>
        </div>
        
        <p><strong>Didn't request this?</strong> If you didn't ask to reset your password, you can safely ignore this email. Your account remains secure.</p>
    </div>
    <div class="footer">
        <p>This email was sent to ${userEmail}. If you have any questions, contact our support team.</p>
        <p>&copy; 2025 SecureShare. All rights reserved.</p>
    </div>
</body>
</html>`;

    const text = `
SecureShare - Password Reset Request

We received a request to reset your SecureShare account password. If you made this request, use the link below to set a new password:

Reset Link: ${resetLink}

Security Notice:
- This password reset link will expire in 1 hour
- If you didn't request a password reset, please ignore this email
- Your password will remain unchanged until you use this link
- For security, this link can only be used once

Didn't request this? If you didn't ask to reset your password, you can safely ignore this email. Your account remains secure.

This email was sent to ${userEmail}. If you have any questions, contact our support team.

© 2025 SecureShare. All rights reserved.
`;

    return { subject, html, text };
  }

  /**
   * Send email verification email
   */
  static async sendVerificationEmail(email: string, verificationLink: string): Promise<{ success: boolean; error?: string }> {
    try {
      const template = this.generateVerificationTemplate(verificationLink, email);
      
      return await this.sendEmail({
        to: email,
        ...template
      });
    } catch (error) {
      console.error('Failed to send verification email:', error);
      return { success: false, error: 'Failed to send verification email' };
    }
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(email: string, resetLink: string): Promise<{ success: boolean; error?: string }> {
    try {
      const template = this.generatePasswordResetTemplate(resetLink, email);
      
      return await this.sendEmail({
        to: email,
        ...template
      });
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      return { success: false, error: 'Failed to send password reset email' };
    }
  }

  /**
   * Send login notification email (optional security feature)
   */
  static async sendLoginNotification(email: string, ipAddress: string, userAgent: string): Promise<{ success: boolean; error?: string }> {
    try {
      const loginTime = new Date().toLocaleString();
      
      const subject = 'New login to your SecureShare account';
      const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Login Notification - SecureShare</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .info-box { background: #ecfdf5; border: 1px solid #a7f3d0; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .footer { margin-top: 30px; font-size: 14px; color: #666; text-align: center; }
    </style>
</head>
<body>
    <div class="header">
        <h1>SecureShare</h1>
        <p>Login Notification</p>
    </div>
    <div class="content">
        <h2>New Login Detected</h2>
        <p>We detected a new login to your SecureShare account. If this was you, no action is needed.</p>
        
        <div class="info-box">
            <strong>Login Details:</strong>
            <ul>
                <li><strong>Time:</strong> ${loginTime}</li>
                <li><strong>IP Address:</strong> ${ipAddress}</li>
                <li><strong>Device:</strong> ${userAgent}</li>
            </ul>
        </div>
        
        <p><strong>Wasn't you?</strong> If you didn't log in, please immediately:</p>
        <ul>
            <li>Change your password</li>
            <li>Review your account activity</li>
            <li>Contact our support team</li>
        </ul>
    </div>
    <div class="footer">
        <p>This email was sent to ${email} for security purposes.</p>
        <p>&copy; 2025 SecureShare. All rights reserved.</p>
    </div>
</body>
</html>`;

      const text = `
SecureShare - Login Notification

We detected a new login to your SecureShare account. If this was you, no action is needed.

Login Details:
- Time: ${loginTime}
- IP Address: ${ipAddress}
- Device: ${userAgent}

Wasn't you? If you didn't log in, please immediately:
- Change your password
- Review your account activity
- Contact our support team

This email was sent to ${email} for security purposes.
© 2025 SecureShare. All rights reserved.
`;

      return await this.sendEmail({
        to: email,
        subject,
        html,
        text
      });
    } catch (error) {
      console.error('Failed to send login notification email:', error);
      return { success: false, error: 'Failed to send login notification' };
    }
  }
}
