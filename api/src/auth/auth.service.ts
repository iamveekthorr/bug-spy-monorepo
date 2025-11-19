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
    // Get the user details from the DB
    const { email, password } = loginDTO;
    const doc = await this.userModel.findOne({ email }).select('+password');

    if (!doc) throw new AppError('No user found!', HttpStatus.NOT_FOUND);

    // Check that the password provided matches
    const isCorrectPassword = await bcrypt.compare(password, doc.password);

    if (!isCorrectPassword) {
      throw new AppError(
        'This user is not authenticated. Please try again',
        HttpStatus.BAD_REQUEST,
      );
    }

    const { password: _, ...user } = doc.toObject({
      flattenObjectIds: true,
      versionKey: false,
    });

    return { user };
  }

  async signup(registrationDTO: RegistrationDTO) {
    // Get body data
    // Check if the user exists
    const existingUser =
      (await this.cacheManager.get(registrationDTO.email)) ||
      (await this.userModel.findOne({ email: registrationDTO.email }));

    // works for undefined and null
    if (existingUser != null) {
      // User exists in cache
      // Throw error if the user exists
      throw new AppError(
        'Invalid action! - User creation failed (existing user identified)',
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
    await user.save();
    // Write email to cache
    await this.cacheManager.set<boolean>(user.email, true, 60 * 60 * 6 * 1000);

    // Return a success string.
    return { message: 'User created successfully' };
  }

  async generateTokens(payload: JwtPayload) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: 60 * 60 * 24, // 1D
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      }),
      this.jwtService.signAsync(payload, {
        // Access token will expire in 1week
        expiresIn: 60 * 60 * 24 * 7,
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
