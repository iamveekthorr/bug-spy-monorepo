import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import * as handlebars from 'handlebars';

export interface SendEmailOptions {
  to: string;
  subject: string;
  template: string;
  context: Record<string, any>;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;

  constructor(private readonly configService: ConfigService) {
    this.initializeTransporter();
  }

  /**
   * Initialize nodemailer transporter based on environment
   */
  private initializeTransporter() {
    const emailService = this.configService.get<string>('EMAIL_SERVICE');
    const emailUser = this.configService.get<string>('EMAIL_USER');
    const emailPassword = this.configService.get<string>('EMAIL_PASSWORD');
    const emailFrom = this.configService.get<string>('EMAIL_FROM');
    const emailHost = this.configService.get<string>('EMAIL_HOST');
    const emailPort = this.configService.get<number>('EMAIL_PORT');

    // Development mode - use ethereal.email for testing
    if (this.configService.get('NODE_ENV') === 'development' && !emailUser) {
      this.logger.warn(
        'No email configuration found. Email functionality will be logged only.',
      );
      this.transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true,
      });
      return;
    }

    // Production mode - use configured SMTP service
    if (emailService === 'smtp' && emailHost) {
      this.transporter = nodemailer.createTransport({
        host: emailHost,
        port: emailPort || 587,
        secure: emailPort === 465,
        auth: {
          user: emailUser,
          pass: emailPassword,
        },
      });
      this.logger.log(`Email service initialized with SMTP: ${emailHost}`);
    } else if (emailService === 'gmail') {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: emailUser,
          pass: emailPassword,
        },
      });
      this.logger.log('Email service initialized with Gmail');
    } else if (emailService === 'sendgrid') {
      this.transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        auth: {
          user: 'apikey',
          pass: emailPassword,
        },
      });
      this.logger.log('Email service initialized with SendGrid');
    } else {
      this.logger.warn(
        'Email service not configured properly. Using stream transport.',
      );
      this.transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true,
      });
    }
  }

  /**
   * Send email using template
   */
  async sendEmail(options: SendEmailOptions): Promise<void> {
    try {
      const { to, subject, template, context } = options;
      const emailFrom = this.configService.get<string>('EMAIL_FROM');

      // Compile template
      const compiledTemplate = handlebars.compile(template);
      const html = compiledTemplate(context);

      const mailOptions = {
        from: emailFrom || 'noreply@bugspyjs.com',
        to,
        subject,
        html,
      };

      const info = await this.transporter.sendMail(mailOptions);

      // Log in development
      if (this.configService.get('NODE_ENV') === 'development') {
        this.logger.debug(`Email sent to ${to}: ${subject}`);
        this.logger.debug(`Preview: ${nodemailer.getTestMessageUrl(info)}`);
      } else {
        this.logger.log(`Email sent successfully to ${to}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      throw error;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
  ): Promise<void> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    const template = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #4a5568;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: #f7fafc;
              padding: 30px;
              border-radius: 0 0 5px 5px;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background-color: #4299e1;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              font-size: 12px;
              color: #718096;
            }
            .warning {
              background-color: #fff5f5;
              border-left: 4px solid #fc8181;
              padding: 10px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>We received a request to reset your password for your Bug Spy JS account.</p>
              <p>Click the button below to reset your password:</p>
              <p style="text-align: center;">
                <a href="{{{resetUrl}}}" class="button">Reset Password</a>
              </p>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #4299e1;">{{{resetUrl}}}</p>
              <div class="warning">
                <p><strong>Security Notice:</strong></p>
                <ul>
                  <li>This link will expire in 30 minutes</li>
                  <li>If you didn't request this reset, please ignore this email</li>
                  <li>Your password will not change until you create a new one</li>
                </ul>
              </div>
              <p>If you have any questions, please contact our support team.</p>
              <p>Best regards,<br>Bug Spy JS Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Reset Your Password - Bug Spy JS',
      template,
      context: { resetUrl },
    });
  }

  /**
   * Send password reset confirmation email
   */
  async sendPasswordResetConfirmationEmail(email: string): Promise<void> {
    const template = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #48bb78;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: #f7fafc;
              padding: 30px;
              border-radius: 0 0 5px 5px;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              font-size: 12px;
              color: #718096;
            }
            .info {
              background-color: #ebf8ff;
              border-left: 4px solid #4299e1;
              padding: 10px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✓ Password Reset Successful</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>Your password has been successfully reset.</p>
              <div class="info">
                <p><strong>What this means:</strong></p>
                <ul>
                  <li>You can now log in with your new password</li>
                  <li>All active sessions have been maintained</li>
                  <li>Your account security has been updated</li>
                </ul>
              </div>
              <p><strong>Didn't make this change?</strong></p>
              <p>If you did not reset your password, please contact our support team immediately as your account may be compromised.</p>
              <p>Best regards,<br>Bug Spy JS Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Password Reset Successful - Bug Spy JS',
      template,
      context: {},
    });
  }

  /**
   * Send welcome email to new users
   */
  async sendWelcomeEmail(email: string, name?: string): Promise<void> {
    const template = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #667eea;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: #f7fafc;
              padding: 30px;
              border-radius: 0 0 5px 5px;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              font-size: 12px;
              color: #718096;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Bug Spy JS!</h1>
            </div>
            <div class="content">
              <p>Hello{{#if name}} {{name}}{{/if}},</p>
              <p>Thank you for signing up for Bug Spy JS. We're excited to have you on board!</p>
              <p>Your account has been successfully created and you can now start capturing web metrics.</p>
              <p>If you have any questions or need assistance, don't hesitate to reach out to our support team.</p>
              <p>Best regards,<br>Bug Spy JS Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Welcome to Bug Spy JS!',
      template,
      context: { name },
    });
  }
}
