import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  validateSync,
} from 'class-validator';

export enum Environment {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
  TEST = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsNumber()
  PORT: number;

  @IsString()
  @MinLength(32)
  JWT_ACCESS_SECRET: string;

  @IsString()
  @MinLength(32)
  JWT_REFRESH_SECRET: string;

  @IsString()
  MONGO_URI: string;

  @IsString()
  MONGO_PASSWORD: string;

  @IsString()
  REDIS_URL: string;

  // AWS S3 Configuration (optional, defaults provided in service)
  @IsOptional()
  @IsString()
  AWS_REGION?: string;

  @IsOptional()
  @IsString()
  AWS_ACCESS_KEY_ID?: string;

  @IsOptional()
  @IsString()
  AWS_SECRET_ACCESS_KEY?: string;

  @IsOptional()
  @IsString()
  AWS_S3_BUCKET_NAME?: string;

  // Email Configuration (optional, defaults to stream transport in development)
  @IsOptional()
  @IsString()
  EMAIL_SERVICE?: string; // 'smtp', 'gmail', 'sendgrid'

  @IsOptional()
  @IsString()
  EMAIL_HOST?: string;

  @IsOptional()
  @IsNumber()
  EMAIL_PORT?: number;

  @IsOptional()
  @IsString()
  EMAIL_USER?: string;

  @IsOptional()
  @IsString()
  EMAIL_PASSWORD?: string;

  @IsOptional()
  @IsString()
  EMAIL_FROM?: string;

  @IsOptional()
  @IsString()
  FRONTEND_URL?: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}
