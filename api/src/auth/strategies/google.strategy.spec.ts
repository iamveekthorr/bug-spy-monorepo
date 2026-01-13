import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { GoogleStrategy } from './google.strategy';
import { AuthService } from '../auth.service';

describe('GoogleStrategy', () => {
  let strategy: GoogleStrategy;
  let mockAuthService: any;
  let mockConfigService: any;

  beforeEach(async () => {
    mockAuthService = {
      findOrCreateOAuthUser: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn((key: string) => {
        switch (key) {
          case 'GOOGLE_CLIENT_ID':
            return 'test-google-client-id';
          case 'GOOGLE_CLIENT_SECRET':
            return 'test-google-client-secret';
          case 'GOOGLE_CALLBACK_URL':
            return 'http://localhost:4000/api/v1/auth/google/callback';
          default:
            return null;
        }
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleStrategy,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    strategy = module.get<GoogleStrategy>(GoogleStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    const mockDone = jest.fn();
    const accessToken = 'mock-access-token';
    const refreshToken = 'mock-refresh-token';

    beforeEach(() => {
      mockDone.mockClear();
      mockAuthService.findOrCreateOAuthUser.mockClear();
    });

    it('should successfully validate and return user with valid Google profile', async () => {
      const mockProfile = {
        id: 'google-user-id-123',
        emails: [{ value: 'user@example.com' }],
        displayName: 'Test User',
        photos: [{ value: 'https://example.com/photo.jpg' }],
      };

      const mockUser = {
        _id: 'user-mongo-id',
        email: 'user@example.com',
        provider: 'google',
        providerId: 'google-user-id-123',
        displayName: 'Test User',
        avatar: 'https://example.com/photo.jpg',
      };

      mockAuthService.findOrCreateOAuthUser.mockResolvedValue(mockUser);

      await strategy.validate(accessToken, refreshToken, mockProfile, mockDone);

      expect(mockAuthService.findOrCreateOAuthUser).toHaveBeenCalledWith({
        provider: 'google',
        providerId: 'google-user-id-123',
        email: 'user@example.com',
        displayName: 'Test User',
        avatar: 'https://example.com/photo.jpg',
      });

      expect(mockDone).toHaveBeenCalledWith(null, mockUser);
    });

    it('should handle profile without photos', async () => {
      const mockProfile = {
        id: 'google-user-id-456',
        emails: [{ value: 'user2@example.com' }],
        displayName: 'User Without Photo',
        photos: [],
      };

      const mockUser = {
        _id: 'user-mongo-id-2',
        email: 'user2@example.com',
        provider: 'google',
        providerId: 'google-user-id-456',
        displayName: 'User Without Photo',
      };

      mockAuthService.findOrCreateOAuthUser.mockResolvedValue(mockUser);

      await strategy.validate(accessToken, refreshToken, mockProfile, mockDone);

      expect(mockAuthService.findOrCreateOAuthUser).toHaveBeenCalledWith({
        provider: 'google',
        providerId: 'google-user-id-456',
        email: 'user2@example.com',
        displayName: 'User Without Photo',
        avatar: null,
      });

      expect(mockDone).toHaveBeenCalledWith(null, mockUser);
    });

    it('should return error when email is not provided by Google', async () => {
      const mockProfile = {
        id: 'google-user-id-789',
        emails: [],
        displayName: 'User Without Email',
        photos: [],
      };

      await strategy.validate(accessToken, refreshToken, mockProfile, mockDone);

      expect(mockAuthService.findOrCreateOAuthUser).not.toHaveBeenCalled();
      expect(mockDone).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Email not provided by Google',
        }),
        false,
      );
    });

    it('should return error when emails array is undefined', async () => {
      const mockProfile = {
        id: 'google-user-id-999',
        displayName: 'User With Undefined Emails',
        photos: [],
      };

      await strategy.validate(accessToken, refreshToken, mockProfile, mockDone);

      expect(mockAuthService.findOrCreateOAuthUser).not.toHaveBeenCalled();
      expect(mockDone).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Email not provided by Google',
        }),
        false,
      );
    });

    it('should handle errors from AuthService', async () => {
      const mockProfile = {
        id: 'google-user-id-error',
        emails: [{ value: 'error@example.com' }],
        displayName: 'Error User',
        photos: [],
      };

      const mockError = new Error('Database connection failed');
      mockAuthService.findOrCreateOAuthUser.mockRejectedValue(mockError);

      await strategy.validate(accessToken, refreshToken, mockProfile, mockDone);

      expect(mockAuthService.findOrCreateOAuthUser).toHaveBeenCalledWith({
        provider: 'google',
        providerId: 'google-user-id-error',
        email: 'error@example.com',
        displayName: 'Error User',
        avatar: null,
      });

      expect(mockDone).toHaveBeenCalledWith(mockError, false);
    });
  });
});
