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
