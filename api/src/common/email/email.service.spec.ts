import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import * as nodemailer from 'nodemailer';

// Mock nodemailer
jest.mock('nodemailer');

describe('EmailService', () => {
  let service: EmailService;
  let configService: ConfigService;
  let mockTransporter: any;

  const mockConfigValues = {
    NODE_ENV: 'development',
    EMAIL_SERVICE: 'smtp',
    EMAIL_HOST: 'smtp.example.com',
    EMAIL_PORT: 587,
    EMAIL_USER: 'test@example.com',
    EMAIL_PASSWORD: 'password123',
    EMAIL_FROM: 'noreply@bugspyjs.com',
    FRONTEND_URL: 'http://localhost:3000',
  };

  beforeEach(async () => {
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({
        messageId: 'test-message-id',
      }),
    };

    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfigValues[key]),
          },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initialization', () => {
    it('should create transporter with SMTP configuration', () => {
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        auth: {
          user: 'test@example.com',
          pass: 'password123',
        },
      });
    });

    it('should create Gmail transporter when EMAIL_SERVICE is gmail', async () => {
      (nodemailer.createTransport as jest.Mock).mockClear();
      mockConfigValues.EMAIL_SERVICE = 'gmail';

      const module = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => mockConfigValues[key]),
            },
          },
        ],
      }).compile();

      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        service: 'gmail',
        auth: {
          user: 'test@example.com',
          pass: 'password123',
        },
      });
    });

    it('should create SendGrid transporter when EMAIL_SERVICE is sendgrid', async () => {
      (nodemailer.createTransport as jest.Mock).mockClear();
      mockConfigValues.EMAIL_SERVICE = 'sendgrid';

      const module = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => mockConfigValues[key]),
            },
          },
        ],
      }).compile();

      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.sendgrid.net',
        port: 587,
        auth: {
          user: 'apikey',
          pass: 'password123',
        },
      });
    });

    it('should create stream transport in development without email config', async () => {
      (nodemailer.createTransport as jest.Mock).mockClear();

      const configWithoutEmail = {
        ...mockConfigValues,
        EMAIL_USER: undefined,
      };

      const module = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => configWithoutEmail[key]),
            },
          },
        ],
      }).compile();

      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        streamTransport: true,
        newline: 'unix',
        buffer: true,
      });
    });
  });

  describe('sendEmail', () => {
    it('should send email with compiled template', async () => {
      await service.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        template: '<h1>Hello {{name}}</h1>',
        context: { name: 'John' },
      });

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'noreply@bugspyjs.com',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<h1>Hello John</h1>',
      });
    });

    it('should throw error when email sending fails', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP error'));

      await expect(
        service.sendEmail({
          to: 'recipient@example.com',
          subject: 'Test Subject',
          template: '<h1>Test</h1>',
          context: {},
        }),
      ).rejects.toThrow('SMTP error');
    });

    it('should use default from address when not configured', async () => {
      (configService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'EMAIL_FROM') return undefined;
        return mockConfigValues[key];
      });

      await service.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        template: '<h1>Test</h1>',
        context: {},
      });

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'noreply@bugspyjs.com',
        }),
      );
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email with reset link', async () => {
      await service.sendPasswordResetEmail(
        'user@example.com',
        'test-reset-token',
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Reset Your Password - Bug Spy JS',
          html: expect.stringContaining(
            'http://localhost:3000/reset-password?token=test-reset-token',
          ),
        }),
      );
    });

    it('should include security notices in reset email', async () => {
      await service.sendPasswordResetEmail(
        'user@example.com',
        'test-reset-token',
      );

      const emailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(emailCall.html).toContain('expire in 30 minutes');
      expect(emailCall.html).toContain("didn't request this reset");
      expect(emailCall.html).toContain('password will not change');
    });

    it('should use configured FRONTEND_URL', async () => {
      (configService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'FRONTEND_URL') return 'https://app.bugspyjs.com';
        return mockConfigValues[key];
      });

      await service.sendPasswordResetEmail(
        'user@example.com',
        'test-reset-token',
      );

      const emailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(emailCall.html).toContain(
        'https://app.bugspyjs.com/reset-password?token=test-reset-token',
      );
    });
  });

  describe('sendPasswordResetConfirmationEmail', () => {
    it('should send password reset confirmation email', async () => {
      await service.sendPasswordResetConfirmationEmail('user@example.com');

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Password Reset Successful - Bug Spy JS',
          html: expect.stringContaining('password has been successfully reset'),
        }),
      );
    });

    it('should include security warning in confirmation email', async () => {
      await service.sendPasswordResetConfirmationEmail('user@example.com');

      const emailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(emailCall.html).toContain("Didn't make this change");
      expect(emailCall.html).toContain('contact our support team');
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email without name', async () => {
      await service.sendWelcomeEmail('newuser@example.com');

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'newuser@example.com',
          subject: 'Welcome to Bug Spy JS!',
          html: expect.stringContaining('Welcome to Bug Spy JS'),
        }),
      );
    });

    it('should send welcome email with name', async () => {
      await service.sendWelcomeEmail('newuser@example.com', 'John Doe');

      const emailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(emailCall.to).toBe('newuser@example.com');
      expect(emailCall.subject).toBe('Welcome to Bug Spy JS!');
      expect(emailCall.html).toContain('Thank you for signing up');
    });

    it('should include account creation confirmation', async () => {
      await service.sendWelcomeEmail('newuser@example.com');

      const emailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(emailCall.html).toContain('account has been successfully created');
      expect(emailCall.html).toContain('start capturing web metrics');
    });
  });
});
