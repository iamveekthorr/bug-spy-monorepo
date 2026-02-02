import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { AuthService } from './auth.service';
import { User } from '~/users/schema/user.schema';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AppError } from '~/common/app-error.common';

describe('AuthService - Password Reset', () => {
  let service: AuthService;
  let userModel: any;
  let cacheManager: any;

  const mockUser = {
    _id: '507f1f77bcf86cd799439011',
    email: 'test@example.com',
    password: 'hashedPassword123',
    provider: 'local',
    resetPasswordToken: null,
    resetPasswordExpires: null,
    resetPasswordAttempts: 0,
    lastResetPasswordRequest: null,
    save: jest.fn(),
    toObject: jest.fn(),
  };

  const mockUserModel = {
    findOne: jest.fn(),
    create: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: any = {
        JWT_ACCESS_SECRET: 'test-access-secret',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
      };
      return config[key];
    }),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userModel = module.get(getModelToken(User.name));
    cacheManager = module.get(CACHE_MANAGER);

    // Reset mocks
    jest.clearAllMocks();
    mockUser.save.mockResolvedValue(mockUser);
    mockUser.toObject.mockReturnValue({ ...mockUser });
  });

  describe('forgotPassword', () => {
    const forgotPasswordDto: ForgotPasswordDto = {
      email: 'test@example.com',
    };

    it('should generate reset token for valid local user', async () => {
      const user = {
        ...mockUser,
        provider: 'local',
        resetPasswordAttempts: 0,
        save: jest.fn().mockResolvedValue(true),
      };

      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(user),
      });

      const result = await service.forgotPassword(forgotPasswordDto);

      expect(result.message).toContain('reset link');
      expect(user.save).toHaveBeenCalled();
      expect(user.resetPasswordToken).toBeDefined();
      expect(user.resetPasswordExpires).toBeDefined();
      expect(user.resetPasswordAttempts).toBe(1);

      // Verify token is hashed (should be 64 char hex)
      expect(user.resetPasswordToken).toMatch(/^[a-f0-9]{64}$/);

      // Verify expiration is set to 30 minutes from now
      expect(user.resetPasswordExpires).toBeDefined();
      if (user.resetPasswordExpires) {
        const expiryTime = new Date(user.resetPasswordExpires).getTime();
        const now = Date.now();
        const thirtyMinutes = 30 * 60 * 1000;
        expect(expiryTime).toBeGreaterThan(now);
        expect(expiryTime).toBeLessThanOrEqual(now + thirtyMinutes + 1000); // +1s buffer
      }
    });

    it('should return success message even for non-existent email (security)', async () => {
      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      const result = await service.forgotPassword(forgotPasswordDto);

      expect(result.message).toContain('reset link');
      expect(mockUserModel.findOne).toHaveBeenCalled();
    });

    it('should return success message for OAuth users without sending token (security)', async () => {
      const oauthUser = {
        ...mockUser,
        provider: 'google',
        save: jest.fn(),
      };

      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(oauthUser),
      });

      const result = await service.forgotPassword(forgotPasswordDto);

      expect(result.message).toContain('reset link');
      expect(oauthUser.save).not.toHaveBeenCalled();
    });

    it('should enforce rate limiting (5 attempts per 24 hours)', async () => {
      const user = {
        ...mockUser,
        provider: 'local',
        resetPasswordAttempts: 5,
        lastResetPasswordRequest: new Date(Date.now() - 1000), // 1 second ago
        save: jest.fn(),
      };

      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(user),
      });

      await expect(service.forgotPassword(forgotPasswordDto)).rejects.toThrow(
        AppError,
      );
      await expect(service.forgotPassword(forgotPasswordDto)).rejects.toThrow(
        'Too many password reset attempts',
      );
    });

    it('should reset attempt counter after 24 hours', async () => {
      const user = {
        ...mockUser,
        provider: 'local',
        resetPasswordAttempts: 5,
        lastResetPasswordRequest: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
        save: jest.fn().mockResolvedValue(true),
      };

      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(user),
      });

      const result = await service.forgotPassword(forgotPasswordDto);

      expect(result.message).toContain('reset link');
      expect(user.resetPasswordAttempts).toBe(1); // Reset and incremented
      expect(user.save).toHaveBeenCalled();
    });

    it('should increment attempt counter on each request', async () => {
      const user = {
        ...mockUser,
        provider: 'local',
        resetPasswordAttempts: 2,
        lastResetPasswordRequest: new Date(Date.now() - 1000),
        save: jest.fn().mockResolvedValue(true),
      };

      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(user),
      });

      await service.forgotPassword(forgotPasswordDto);

      expect(user.resetPasswordAttempts).toBe(3);
    });

    it('should return success message even on internal errors (security)', async () => {
      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockRejectedValue(new Error('Database error')),
      });

      const result = await service.forgotPassword(forgotPasswordDto);

      expect(result.message).toContain('reset link');
      // Should not throw error or reveal internal details
    });
  });

  describe('resetPassword', () => {
    const plainToken = 'a'.repeat(64); // 64 char hex string
    const hashedToken = crypto
      .createHash('sha256')
      .update(plainToken)
      .digest('hex');

    const resetPasswordDto: ResetPasswordDto = {
      token: plainToken,
      newPassword: 'NewP@ssw0rd123',
    };

    it('should reset password with valid token', async () => {
      const user = {
        ...mockUser,
        email: 'test@example.com',
        resetPasswordToken: hashedToken,
        resetPasswordExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 min from now
        save: jest.fn().mockResolvedValue(true),
      };

      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(user),
      });

      const bcryptHashSpy = jest.spyOn(bcrypt, 'hash');

      const result = await service.resetPassword(resetPasswordDto);

      expect(result.message).toContain('successfully');
      expect(user.save).toHaveBeenCalled();
      expect(user.resetPasswordToken).toBeNull();
      expect(user.resetPasswordExpires).toBeNull();
      expect(user.resetPasswordAttempts).toBe(0);
      expect(bcryptHashSpy).toHaveBeenCalledWith(
        resetPasswordDto.newPassword,
        12,
      );

      bcryptHashSpy.mockRestore();
    });

    it('should reject invalid token', async () => {
      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        AppError,
      );
      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        'invalid or has expired',
      );
    });

    it('should reject expired token', async () => {
      const user = {
        ...mockUser,
        resetPasswordToken: hashedToken,
        resetPasswordExpires: new Date(Date.now() - 1000), // Expired 1 second ago
        save: jest.fn(),
      };

      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(null), // Query filters expired tokens
      });

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        AppError,
      );
    });

    it('should hash the token before database lookup', async () => {
      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow();

      // Verify findOne was called with hashed token
      const findOneCall = mockUserModel.findOne.mock.calls[0][0];
      expect(findOneCall.resetPasswordToken).toBe(hashedToken);
      expect(findOneCall.resetPasswordToken).not.toBe(plainToken);
    });

    it('should properly hash new password with bcrypt', async () => {
      const user = {
        ...mockUser,
        resetPasswordToken: hashedToken,
        resetPasswordExpires: new Date(Date.now() + 10 * 60 * 1000),
        save: jest.fn().mockResolvedValue(true),
      };

      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(user),
      });

      const bcryptHashSpy = jest
        .spyOn(bcrypt, 'hash')
        .mockResolvedValue('hashedNewPassword' as never);

      await service.resetPassword(resetPasswordDto);

      expect(bcryptHashSpy).toHaveBeenCalledWith('NewP@ssw0rd123', 12);
      expect(user.password).toBe('hashedNewPassword');

      bcryptHashSpy.mockRestore();
    });

    it('should clear reset token fields after successful reset', async () => {
      const user = {
        ...mockUser,
        resetPasswordToken: hashedToken,
        resetPasswordExpires: new Date(Date.now() + 10 * 60 * 1000),
        resetPasswordAttempts: 3,
        save: jest.fn().mockResolvedValue(true),
      };

      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(user),
      });

      await service.resetPassword(resetPasswordDto);

      expect(user.resetPasswordToken).toBeNull();
      expect(user.resetPasswordExpires).toBeNull();
      expect(user.resetPasswordAttempts).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockRejectedValue(new Error('Database error')),
      });

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        AppError,
      );
      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        'Failed to reset password',
      );
    });

    it('should prevent token reuse (single-use tokens)', async () => {
      const user = {
        ...mockUser,
        resetPasswordToken: hashedToken,
        resetPasswordExpires: new Date(Date.now() + 10 * 60 * 1000),
        save: jest.fn().mockResolvedValue(true),
      };

      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(user),
      });

      // First reset should succeed
      await service.resetPassword(resetPasswordDto);

      expect(user.resetPasswordToken).toBeNull();

      // Second reset with same token should fail (token is now null)
      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        AppError,
      );
    });
  });

  describe('Security Tests', () => {
    it('should use cryptographically secure random tokens', async () => {
      const user = {
        ...mockUser,
        provider: 'local',
        resetPasswordAttempts: 0,
        save: jest.fn().mockResolvedValue(true),
      };

      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(user),
      });

      await service.forgotPassword({ email: 'test@example.com' });

      // Token should be 64 character hex string (32 bytes)
      expect(user.resetPasswordToken).toHaveLength(64);
      expect(user.resetPasswordToken).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should never store plain tokens in database', async () => {
      const user = {
        ...mockUser,
        provider: 'local',
        resetPasswordAttempts: 0,
        save: jest.fn().mockResolvedValue(true),
      };

      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(user),
      });

      // Mock crypto to verify hashing
      const cryptoSpy = jest.spyOn(crypto, 'createHash');

      await service.forgotPassword({ email: 'test@example.com' });

      expect(cryptoSpy).toHaveBeenCalledWith('sha256');
      expect(user.resetPasswordToken).toBeDefined();

      cryptoSpy.mockRestore();
    });

    it('should use SHA-256 for token hashing', async () => {
      const plainToken = 'test-token-123';
      const expectedHash = crypto
        .createHash('sha256')
        .update(plainToken)
        .digest('hex');

      const user = {
        ...mockUser,
        resetPasswordToken: expectedHash,
        resetPasswordExpires: new Date(Date.now() + 10 * 60 * 1000),
        save: jest.fn().mockResolvedValue(true),
      };

      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(user),
      });

      await service.resetPassword({
        token: plainToken,
        newPassword: 'NewP@ssw0rd123',
      });

      const findOneCall = mockUserModel.findOne.mock.calls[0][0];
      expect(findOneCall.resetPasswordToken).toBe(expectedHash);
    });
  });
});
