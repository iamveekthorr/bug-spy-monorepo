import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { GitHubStrategy } from './github.strategy';
import { AuthService } from '../auth.service';

describe('GitHubStrategy', () => {
  let strategy: GitHubStrategy;
  let mockAuthService: any;
  let mockConfigService: any;

  beforeEach(async () => {
    mockAuthService = {
      findOrCreateOAuthUser: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn((key: string) => {
        switch (key) {
          case 'GITHUB_CLIENT_ID':
            return 'test-github-client-id';
          case 'GITHUB_CLIENT_SECRET':
            return 'test-github-client-secret';
          case 'GITHUB_CALLBACK_URL':
            return 'http://localhost:4000/api/v1/auth/github/callback';
          default:
            return null;
        }
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GitHubStrategy,
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

    strategy = module.get<GitHubStrategy>(GitHubStrategy);
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

    it('should successfully validate and return user with valid GitHub profile', async () => {
      const mockProfile = {
        id: 'github-user-id-123',
        username: 'testuser',
        emails: [{ value: 'user@example.com' }],
        displayName: 'Test User',
        photos: [{ value: 'https://avatars.githubusercontent.com/u/12345' }],
      };

      const mockUser = {
        _id: 'user-mongo-id',
        email: 'user@example.com',
        provider: 'github',
        providerId: 'github-user-id-123',
        displayName: 'Test User',
        avatar: 'https://avatars.githubusercontent.com/u/12345',
      };

      mockAuthService.findOrCreateOAuthUser.mockResolvedValue(mockUser);

      await strategy.validate(accessToken, refreshToken, mockProfile, mockDone);

      expect(mockAuthService.findOrCreateOAuthUser).toHaveBeenCalledWith({
        provider: 'github',
        providerId: 'github-user-id-123',
        email: 'user@example.com',
        displayName: 'Test User',
        avatar: 'https://avatars.githubusercontent.com/u/12345',
      });

      expect(mockDone).toHaveBeenCalledWith(null, mockUser);
    });

    it('should use username when displayName is not provided', async () => {
      const mockProfile = {
        id: 'github-user-id-456',
        username: 'johndoe',
        emails: [{ value: 'john@example.com' }],
        photos: [],
      };

      const mockUser = {
        _id: 'user-mongo-id-2',
        email: 'john@example.com',
        provider: 'github',
        providerId: 'github-user-id-456',
        displayName: 'johndoe',
      };

      mockAuthService.findOrCreateOAuthUser.mockResolvedValue(mockUser);

      await strategy.validate(accessToken, refreshToken, mockProfile, mockDone);

      expect(mockAuthService.findOrCreateOAuthUser).toHaveBeenCalledWith({
        provider: 'github',
        providerId: 'github-user-id-456',
        email: 'john@example.com',
        displayName: 'johndoe',
        avatar: null,
      });

      expect(mockDone).toHaveBeenCalledWith(null, mockUser);
    });

    it('should handle profile without photos', async () => {
      const mockProfile = {
        id: 'github-user-id-789',
        username: 'nophoto',
        emails: [{ value: 'nophoto@example.com' }],
        displayName: 'No Photo User',
        photos: [],
      };

      const mockUser = {
        _id: 'user-mongo-id-3',
        email: 'nophoto@example.com',
        provider: 'github',
        providerId: 'github-user-id-789',
        displayName: 'No Photo User',
      };

      mockAuthService.findOrCreateOAuthUser.mockResolvedValue(mockUser);

      await strategy.validate(accessToken, refreshToken, mockProfile, mockDone);

      expect(mockAuthService.findOrCreateOAuthUser).toHaveBeenCalledWith({
        provider: 'github',
        providerId: 'github-user-id-789',
        email: 'nophoto@example.com',
        displayName: 'No Photo User',
        avatar: null,
      });

      expect(mockDone).toHaveBeenCalledWith(null, mockUser);
    });

    it('should return error when email is not provided by GitHub', async () => {
      const mockProfile = {
        id: 'github-user-id-999',
        username: 'noemail',
        emails: [],
        displayName: 'User Without Email',
        photos: [],
      };

      await strategy.validate(accessToken, refreshToken, mockProfile, mockDone);

      expect(mockAuthService.findOrCreateOAuthUser).not.toHaveBeenCalled();
      expect(mockDone).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Email not provided by GitHub',
        }),
        false,
      );
    });

    it('should return error when emails array is undefined', async () => {
      const mockProfile = {
        id: 'github-user-id-1000',
        username: 'undefinedemail',
        displayName: 'User With Undefined Emails',
        photos: [],
      };

      await strategy.validate(accessToken, refreshToken, mockProfile, mockDone);

      expect(mockAuthService.findOrCreateOAuthUser).not.toHaveBeenCalled();
      expect(mockDone).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Email not provided by GitHub',
        }),
        false,
      );
    });

    it('should handle errors from AuthService', async () => {
      const mockProfile = {
        id: 'github-user-id-error',
        username: 'erroruser',
        emails: [{ value: 'error@example.com' }],
        displayName: 'Error User',
        photos: [],
      };

      const mockError = new Error('Database connection failed');
      mockAuthService.findOrCreateOAuthUser.mockRejectedValue(mockError);

      await strategy.validate(accessToken, refreshToken, mockProfile, mockDone);

      expect(mockAuthService.findOrCreateOAuthUser).toHaveBeenCalledWith({
        provider: 'github',
        providerId: 'github-user-id-error',
        email: 'error@example.com',
        displayName: 'Error User',
        avatar: null,
      });

      expect(mockDone).toHaveBeenCalledWith(mockError, false);
    });
  });
});
