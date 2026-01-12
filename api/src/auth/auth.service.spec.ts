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
});
