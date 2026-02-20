import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: any;
  let mockResponse: any;
  let mockRequest: any;

  beforeEach(async () => {
    mockAuthService = {
      login: jest.fn(),
      signup: jest.fn(),
      generateTokens: jest.fn(),
    };

    mockResponse = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };

    mockRequest = {
      user: null,
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('signup', () => {
    const signupDto = {
      email: 'newuser@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
    };

    it('should successfully create a new user and return tokens', async () => {
      const mockUser = {
        _id: 'new-user-123',
        id: 'new-user-123',
        email: 'newuser@example.com',
        provider: 'local',
      };

      const mockTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      };

      mockAuthService.signup.mockResolvedValue({ user: mockUser });
      mockAuthService.generateTokens.mockResolvedValue(mockTokens);

      const result = await controller.signup(signupDto, mockResponse);

      expect(mockAuthService.signup).toHaveBeenCalledWith(signupDto);
      expect(mockAuthService.generateTokens).toHaveBeenCalledWith({
        sub: 'new-user-123',
      });

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'mock-refresh-token',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/api/v1/auth/refresh',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        }),
      );

      expect(result).toEqual({
        user: mockUser,
        accessToken: 'mock-access-token',
      });
    });

    it('should set secure cookie in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const mockUser = {
        _id: 'prod-user-123',
        id: 'prod-user-123',
        email: 'produser@example.com',
        provider: 'local',
      };

      const mockTokens = {
        accessToken: 'prod-access-token',
        refreshToken: 'prod-refresh-token',
      };

      mockAuthService.signup.mockResolvedValue({ user: mockUser });
      mockAuthService.generateTokens.mockResolvedValue(mockTokens);

      await controller.signup(signupDto, mockResponse);

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'prod-refresh-token',
        expect.objectContaining({
          secure: true,
        }),
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should throw error when user ID is not found', async () => {
      const mockUser = {
        email: 'newuser@example.com',
      };

      mockAuthService.signup.mockResolvedValue({ user: mockUser });

      await expect(controller.signup(signupDto, mockResponse)).rejects.toThrow(
        'User ID not found after signup',
      );
    });

    it('should handle user object with only _id field', async () => {
      const mockUser = {
        _id: { toString: () => 'user-with-objectid' },
        email: 'objectid@example.com',
      };

      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      mockAuthService.signup.mockResolvedValue({ user: mockUser });
      mockAuthService.generateTokens.mockResolvedValue(mockTokens);

      const result = await controller.signup(signupDto, mockResponse);

      expect(mockAuthService.generateTokens).toHaveBeenCalledWith({
        sub: 'user-with-objectid',
      });
      expect(result).toHaveProperty('accessToken');
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'user@example.com',
      password: 'Password123!',
    };

    it('should successfully login and return tokens', async () => {
      const mockUser = {
        _id: 'user-123',
        id: 'user-123',
        email: 'user@example.com',
        provider: 'local',
      };

      const mockTokens = {
        accessToken: 'login-access-token',
        refreshToken: 'login-refresh-token',
      };

      mockAuthService.login.mockResolvedValue({ user: mockUser });
      mockAuthService.generateTokens.mockResolvedValue(mockTokens);

      const result = await controller.login(loginDto, mockResponse);

      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
      expect(mockAuthService.generateTokens).toHaveBeenCalledWith({
        sub: 'user-123',
      });

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'login-refresh-token',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/api/v1/auth/refresh',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        }),
      );

      expect(result).toEqual({
        user: mockUser,
        accessToken: 'login-access-token',
      });
    });

    it('should set secure cookie in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const mockUser = {
        _id: 'prod-user-456',
        id: 'prod-user-456',
        email: 'produser@example.com',
      };

      const mockTokens = {
        accessToken: 'prod-access-token',
        refreshToken: 'prod-refresh-token',
      };

      mockAuthService.login.mockResolvedValue({ user: mockUser });
      mockAuthService.generateTokens.mockResolvedValue(mockTokens);

      await controller.login(loginDto, mockResponse);

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'prod-refresh-token',
        expect.objectContaining({
          secure: true,
        }),
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should throw error when user ID is not found', async () => {
      const mockUser = {
        email: 'user@example.com',
      };

      mockAuthService.login.mockResolvedValue({ user: mockUser });

      await expect(controller.login(loginDto, mockResponse)).rejects.toThrow(
        'User ID not found in user object',
      );
    });

    it('should handle different user ID formats', async () => {
      const testCases = [
        {
          desc: '_id as string',
          user: { _id: 'string-id-123', email: 'test1@example.com' },
          expectedId: 'string-id-123',
        },
        {
          desc: 'id field',
          user: { id: 'id-field-456', email: 'test2@example.com' },
          expectedId: 'id-field-456',
        },
        {
          desc: '_id with toString',
          user: {
            _id: { toString: () => 'objectid-789' },
            email: 'test3@example.com',
          },
          expectedId: 'objectid-789',
        },
      ];

      for (const testCase of testCases) {
        jest.clearAllMocks();
        mockAuthService.login.mockResolvedValue({ user: testCase.user });
        mockAuthService.generateTokens.mockResolvedValue({
          accessToken: 'token',
          refreshToken: 'refresh',
        });

        await controller.login(loginDto, mockResponse);

        expect(mockAuthService.generateTokens).toHaveBeenCalledWith({
          sub: testCase.expectedId,
        });
      }
    });
  });

  describe('refresh', () => {
    it('should successfully refresh tokens', async () => {
      const mockUser = {
        sub: 'user-refresh-123',
        email: 'refresh@example.com',
      };

      const mockTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      mockAuthService.generateTokens.mockResolvedValue(mockTokens);

      const result = await controller.refresh(mockUser, mockResponse);

      expect(mockAuthService.generateTokens).toHaveBeenCalledWith({
        sub: 'user-refresh-123',
      });

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'new-refresh-token',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/api/v1/auth/refresh',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        }),
      );

      expect(result).toEqual({
        accessToken: 'new-access-token',
      });
    });

    it('should set secure cookie in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const mockUser = {
        sub: 'user-prod-refresh',
      };

      const mockTokens = {
        accessToken: 'prod-access-token',
        refreshToken: 'prod-refresh-token',
      };

      mockAuthService.generateTokens.mockResolvedValue(mockTokens);

      await controller.refresh(mockUser, mockResponse);

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'prod-refresh-token',
        expect.objectContaining({
          secure: true,
        }),
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should only return accessToken in response', async () => {
      const mockUser = {
        sub: 'user-123',
      };

      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      mockAuthService.generateTokens.mockResolvedValue(mockTokens);

      const result = await controller.refresh(mockUser, mockResponse);

      // Should not expose refreshToken in response body
      expect(result).not.toHaveProperty('refreshToken');
      expect(result).toHaveProperty('accessToken');
    });
  });

  describe('logout', () => {
    it('should clear refresh token cookie', () => {
      const result = controller.logout(mockResponse);

      expect(mockResponse.clearCookie).toHaveBeenCalledWith(
        'refresh_token',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/api/v1/auth/refresh',
        }),
      );

      expect(result).toEqual({
        message: 'Logged out successfully',
      });
    });

    it('should set secure flag in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      controller.logout(mockResponse);

      expect(mockResponse.clearCookie).toHaveBeenCalledWith(
        'refresh_token',
        expect.objectContaining({
          secure: true,
        }),
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should not require authentication', () => {
      // Logout should work without authentication
      const result = controller.logout(mockResponse);

      expect(result).toHaveProperty('message');
      expect(mockResponse.clearCookie).toHaveBeenCalled();
    });
  });

  describe('OAuth endpoints', () => {
    describe('googleAuth', () => {
      it('should be defined', () => {
        expect(controller.googleAuth).toBeDefined();
      });
    });

    describe('googleAuthCallback', () => {
      it('should successfully handle Google OAuth callback', async () => {
        const mockUser = {
          _id: 'user-id-123',
          email: 'google@example.com',
          provider: 'google',
          providerId: 'google-123',
          displayName: 'Google User',
        };

        const mockTokens = {
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
        };

        mockRequest.user = mockUser;
        mockAuthService.generateTokens.mockResolvedValue(mockTokens);

        const result = await controller.googleAuthCallback(
          mockRequest,
          mockResponse,
        );

        expect(mockAuthService.generateTokens).toHaveBeenCalledWith({
          sub: 'user-id-123',
        });

        expect(mockResponse.cookie).toHaveBeenCalledWith(
          'refresh_token',
          'mock-refresh-token',
          expect.objectContaining({
            httpOnly: true,
            sameSite: 'strict',
            path: '/api/v1/auth/refresh',
            maxAge: 7 * 24 * 60 * 60 * 1000,
          }),
        );

        expect(result).toEqual({
          user: mockUser,
          accessToken: 'mock-access-token',
        });
      });

      it('should set secure cookie in production', async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        const mockUser = {
          _id: 'user-id-456',
          email: 'prod@example.com',
          provider: 'google',
        };

        const mockTokens = {
          accessToken: 'prod-access-token',
          refreshToken: 'prod-refresh-token',
        };

        mockRequest.user = mockUser;
        mockAuthService.generateTokens.mockResolvedValue(mockTokens);

        await controller.googleAuthCallback(mockRequest, mockResponse);

        expect(mockResponse.cookie).toHaveBeenCalledWith(
          'refresh_token',
          'prod-refresh-token',
          expect.objectContaining({
            secure: true,
          }),
        );

        process.env.NODE_ENV = originalEnv;
      });
    });

    describe('githubAuth', () => {
      it('should be defined', () => {
        expect(controller.githubAuth).toBeDefined();
      });
    });

    describe('githubAuthCallback', () => {
      it('should successfully handle GitHub OAuth callback', async () => {
        const mockUser = {
          _id: 'user-id-789',
          email: 'github@example.com',
          provider: 'github',
          providerId: 'github-456',
          displayName: 'GitHub User',
        };

        const mockTokens = {
          accessToken: 'github-access-token',
          refreshToken: 'github-refresh-token',
        };

        mockRequest.user = mockUser;
        mockAuthService.generateTokens.mockResolvedValue(mockTokens);

        const result = await controller.githubAuthCallback(
          mockRequest,
          mockResponse,
        );

        expect(mockAuthService.generateTokens).toHaveBeenCalledWith({
          sub: 'user-id-789',
        });

        expect(mockResponse.cookie).toHaveBeenCalledWith(
          'refresh_token',
          'github-refresh-token',
          expect.objectContaining({
            httpOnly: true,
            sameSite: 'strict',
            path: '/api/v1/auth/refresh',
            maxAge: 7 * 24 * 60 * 60 * 1000,
          }),
        );

        expect(result).toEqual({
          user: mockUser,
          accessToken: 'github-access-token',
        });
      });

      it('should set secure cookie in production', async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        const mockUser = {
          _id: 'user-id-999',
          email: 'github-prod@example.com',
          provider: 'github',
        };

        const mockTokens = {
          accessToken: 'github-prod-access-token',
          refreshToken: 'github-prod-refresh-token',
        };

        mockRequest.user = mockUser;
        mockAuthService.generateTokens.mockResolvedValue(mockTokens);

        await controller.githubAuthCallback(mockRequest, mockResponse);

        expect(mockResponse.cookie).toHaveBeenCalledWith(
          'refresh_token',
          'github-prod-refresh-token',
          expect.objectContaining({
            secure: true,
          }),
        );

        process.env.NODE_ENV = originalEnv;
      });
    });
  });
});
