import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

import { Login } from './dto/login.dto';
import { RegistrationDTO } from './dto/create-user.dto';
import { JwtPayload } from './dto/jwt-payload.dto';

import { User } from '~/users/schema/user.schema';
import { AppError } from '~/common/app-error.common';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async login(loginDTO: Login) {
    const { email, password } = loginDTO;
    
    try {
      const doc = await this.userModel.findOne({ email }).select('+password');

      if (!doc) {
        throw new AppError('Invalid email or password', HttpStatus.UNAUTHORIZED);
      }

      // Check that the password provided matches
      const isCorrectPassword = await bcrypt.compare(password, doc.password);

      if (!isCorrectPassword) {
        throw new AppError('Invalid email or password', HttpStatus.UNAUTHORIZED);
      }

      const { password: _, ...user } = doc.toObject({
        flattenObjectIds: true,
        versionKey: false,
      });

      return { user };
    } catch (error) {
      // Re-throw AppError instances to preserve custom error handling
      if (error instanceof AppError) {
        throw error;
      }
      
      // Handle unexpected database or bcrypt errors
      throw new AppError('Authentication failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async signup(registrationDTO: RegistrationDTO) {
    try {
      // Check if the user exists
      const existingUser =
        (await this.cacheManager.get(registrationDTO.email)) ||
        (await this.userModel.findOne({ email: registrationDTO.email }));

      // works for undefined and null
      if (existingUser != null) {
        throw new AppError(
          'User already exists',
          HttpStatus.CONFLICT,
        );
      }

      const SALT_ROUND = 12;
      // Encrypt user password if it's a new user
      const encryptedPassword = await bcrypt.hash(
        registrationDTO.password,
        SALT_ROUND,
      );

      // Save the data to the DB
      const user = await this.userModel.create({
        email: registrationDTO.email,
        password: encryptedPassword,
      });

      // Write email to cache to prevent duplicate registrations
      await this.cacheManager.set<boolean>(user.email, true, 60 * 60 * 6 * 1000);

      return { message: 'User created successfully' };
    } catch (error) {
      // Re-throw AppError instances to preserve custom error handling
      if (error instanceof AppError) {
        throw error;
      }
      
      // Handle database validation errors
      if (error.name === 'ValidationError' || error.code === 11000) {
        throw new AppError('Invalid user data', HttpStatus.BAD_REQUEST);
      }
      
      // Handle unexpected errors
      throw new AppError('User registration failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async generateTokens(payload: JwtPayload) {
    try {
      const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET');
      const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');

      if (!accessSecret || !refreshSecret) {
        throw new AppError('JWT configuration error', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const [accessToken, refreshToken] = await Promise.all([
        this.jwtService.signAsync(payload, {
          expiresIn: 60 * 60 * 24, // 1D
          secret: accessSecret,
        }),
        this.jwtService.signAsync(payload, {
          expiresIn: 60 * 60 * 24 * 7, // 1 week
          secret: refreshSecret,
        }),
      ]);

      return { accessToken, refreshToken };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Token generation failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
