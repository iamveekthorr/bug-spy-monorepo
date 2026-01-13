import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { HttpStatus } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service';
import { User } from '../users/schema/user.schema';
import { AppError } from '../common/app-error.common';
import { Login } from './dto/login.dto';
import { RegistrationDTO } from './dto/create-user.dto';

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AuthService', () => {
  let service: AuthService;
  let mockJwtService: any;
  let mockConfigService: any;
  let mockUserModel: any;
  let mockCacheManager: any;

  beforeEach(async () => {
    mockJwtService = {
      signAsync: jest.fn().mockResolvedValue('mock-token'),
      verify: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn((key: string) => {
        switch (key) {
          case 'JWT_ACCESS_SECRET':
            return 'access-secret-test-key';
          case 'JWT_REFRESH_SECRET':
            return 'refresh-secret-test-key';
          default:
            return 'test-value';
        }
      }),
    };

    mockUserModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
    };

    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    const loginDto: Login = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should successfully login with valid credentials', async () => {
      const mockUser = {
        _id: 'user-id',
        email: 'test@example.com',
        password: 'hashed-password',
        toObject: jest.fn().mockReturnValue({
          _id: 'user-id',
          email: 'test@example.com',
        }),
      };

      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });
      mockedBcrypt.compare.mockResolvedValue(true as never);

      const result = await service.login(loginDto);

      expect(result).toEqual({
        user: {
          _id: 'user-id',
          email: 'test@example.com',
        },
      });
    });

    it('should throw error when user does not exist', async () => {
      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await expect(service.login(loginDto)).rejects.toThrow(AppError);
    });

    it('should throw error when password is incorrect', async () => {
      const mockUser = {
        _id: 'user-id',
        email: 'test@example.com',
        password: 'hashed-password',
      };

      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(service.login(loginDto)).rejects.toThrow(AppError);
    });
  });

  describe('signup', () => {
    const registrationDto: RegistrationDTO = {
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    };

    it('should successfully create a new user', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockUserModel.findOne.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue('hashed-password' as never);
      
      const mockCreatedUser = {
        email: 'test@example.com',
        password: 'hashed-password',
      };
      mockUserModel.create.mockResolvedValue(mockCreatedUser);

      const result = await service.signup(registrationDto);

      expect(result).toEqual({ message: 'User created successfully' });
      expect(mockCacheManager.set).toHaveBeenCalled();
    });

    it('should throw error when user already exists', async () => {
      mockCacheManager.get.mockResolvedValue(true);

      await expect(service.signup(registrationDto)).rejects.toThrow(AppError);
    });
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', async () => {
      const payload = { sub: 'user-id' };
      mockJwtService.signAsync.mockResolvedValueOnce('access-token');
      mockJwtService.signAsync.mockResolvedValueOnce('refresh-token');

      const result = await service.generateTokens(payload);

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });

    it('should throw error when JWT secrets are missing', async () => {
      mockConfigService.get.mockReturnValue(null);

      await expect(service.generateTokens({ sub: 'user-id' })).rejects.toThrow(
        AppError,
      );
    });
  });

  describe('findOrCreateOAuthUser', () => {
    const oAuthData = {
      provider: 'google',
      providerId: 'google-123',
      email: 'oauth@example.com',
      displayName: 'OAuth User',
      avatar: 'https://example.com/avatar.jpg',
    };

    it('should return existing user if found by provider and providerId', async () => {
      const mockExistingUser = {
        _id: 'existing-user-id',
        email: 'oauth@example.com',
        provider: 'google',
        providerId: 'google-123',
        displayName: 'OAuth User',
        avatar: 'https://example.com/avatar.jpg',
        toObject: jest.fn().mockReturnValue({
          _id: 'existing-user-id',
          email: 'oauth@example.com',
          provider: 'google',
          providerId: 'google-123',
        }),
      };

      mockUserModel.findOne.mockResolvedValueOnce(mockExistingUser);

      const result = await service.findOrCreateOAuthUser(oAuthData);

      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        provider: 'google',
        providerId: 'google-123',
      });
      expect(result).toEqual({
        _id: 'existing-user-id',
        email: 'oauth@example.com',
        provider: 'google',
        providerId: 'google-123',
      });
    });

    it('should create new user if not found by provider and providerId', async () => {
      const mockCreatedUser = {
        _id: 'new-user-id',
        email: 'oauth@example.com',
        provider: 'google',
        providerId: 'google-123',
        displayName: 'OAuth User',
        avatar: 'https://example.com/avatar.jpg',
        toObject: jest.fn().mockReturnValue({
          _id: 'new-user-id',
          email: 'oauth@example.com',
          provider: 'google',
          providerId: 'google-123',
          displayName: 'OAuth User',
          avatar: 'https://example.com/avatar.jpg',
        }),
      };

      mockUserModel.findOne.mockResolvedValueOnce(null); // No user with provider/providerId
      mockUserModel.findOne.mockResolvedValueOnce(null); // No user with email
      mockUserModel.create.mockResolvedValue(mockCreatedUser);

      const result = await service.findOrCreateOAuthUser(oAuthData);

      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        provider: 'google',
        providerId: 'google-123',
      });
      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        email: 'oauth@example.com',
      });
      expect(mockUserModel.create).toHaveBeenCalledWith({
        email: 'oauth@example.com',
        provider: 'google',
        providerId: 'google-123',
        displayName: 'OAuth User',
        avatar: 'https://example.com/avatar.jpg',
      });
      expect(result).toEqual({
        _id: 'new-user-id',
        email: 'oauth@example.com',
        provider: 'google',
        providerId: 'google-123',
        displayName: 'OAuth User',
        avatar: 'https://example.com/avatar.jpg',
      });
    });

    it('should throw conflict error if user exists with same email but different provider', async () => {
      const mockExistingUser = {
        _id: 'existing-user-id',
        email: 'oauth@example.com',
        provider: 'local',
      };

      mockUserModel.findOne.mockResolvedValueOnce(null); // No user with google provider
      mockUserModel.findOne.mockResolvedValueOnce(mockExistingUser); // User with same email exists

      await expect(service.findOrCreateOAuthUser(oAuthData)).rejects.toThrow(
        AppError,
      );
    });

    it('should throw conflict error on duplicate key error (11000)', async () => {
      mockUserModel.findOne.mockResolvedValueOnce(null);
      mockUserModel.findOne.mockResolvedValueOnce(null);
      mockUserModel.create.mockRejectedValue({ code: 11000 });

      await expect(service.findOrCreateOAuthUser(oAuthData)).rejects.toThrow(
        AppError,
      );
    });

    it('should throw internal server error on unexpected database error', async () => {
      mockUserModel.findOne.mockResolvedValueOnce(null);
      mockUserModel.findOne.mockResolvedValueOnce(null);
      mockUserModel.create.mockRejectedValue(new Error('Database connection lost'));

      await expect(service.findOrCreateOAuthUser(oAuthData)).rejects.toThrow(
        AppError,
      );
    });

    it('should handle GitHub provider', async () => {
      const githubData = {
        provider: 'github',
        providerId: 'github-456',
        email: 'github@example.com',
        displayName: 'GitHub User',
      };

      const mockCreatedUser = {
        _id: 'github-user-id',
        ...githubData,
        toObject: jest.fn().mockReturnValue({
          _id: 'github-user-id',
          ...githubData,
        }),
      };

      mockUserModel.findOne.mockResolvedValueOnce(null);
      mockUserModel.findOne.mockResolvedValueOnce(null);
      mockUserModel.create.mockResolvedValue(mockCreatedUser);

      const result = await service.findOrCreateOAuthUser(githubData);

      expect(mockUserModel.create).toHaveBeenCalledWith(githubData);
      expect(result._id).toBe('github-user-id');
      expect(result.provider).toBe('github');
    });
  });
});
