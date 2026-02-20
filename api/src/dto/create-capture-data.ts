import {
  IsNotEmpty,
  IsString,
  IsUrl,
  IsOptional,
  IsIn,
  Length,
  Matches,
  IsBoolean,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

import { IsValidDevice } from '~/decorators/is-valid-device.decorator';

export class CreateCaptureData {
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
    allow_underscores: false,
    host_blacklist: [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '::1',
      '169.254.169.254',
    ],
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 2000, { message: 'URL must be between 1 and 2000 characters' })
  @Matches(/^https?:\/\/(?!.*\.(local|internal|test|dev|staging)(?:\/|$))/i, {
    message: 'Internal/development domains are not allowed',
  })
  readonly url: string;

  @IsOptional()
  @IsString()
  @IsValidDevice()
  readonly deviceType?: DeviceType;

  @IsOptional()
  @IsString()
  @IsIn(['performance', 'screenshot', 'cookie'], {
    message: 'testType must be one of: performance, screenshot, cookie',
  })
  readonly testType?: 'performance' | 'screenshot' | 'cookie';

  @IsOptional()
  @IsString()
  @IsIn(['3g', '4g', '5g', 'wifi', 'none'], {
    message: 'networkType must be one of: 3g, 4g, 5g, wifi, none',
  })
  readonly networkType?: string = 'wifi';

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  readonly includeScreenshots?: boolean = true;

  @IsOptional()
  @IsString()
  @Length(1, 100, { message: 'testId must be between 1 and 100 characters' })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message:
      'testId can only contain alphanumeric characters, hyphens, and underscores',
  })
  readonly testId?: string;
}

export class UrlWithLabel {
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
    allow_underscores: false,
    host_blacklist: [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '::1',
      '169.254.169.254',
    ],
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 2000, { message: 'URL must be between 1 and 2000 characters' })
  @Matches(/^https?:\/\/(?!.*\.(local|internal|test|dev|staging)(?:\/|$))/i, {
    message: 'Internal/development domains are not allowed',
  })
  readonly url: string;

  @IsOptional()
  @IsString()
  @Length(1, 100, { message: 'Label must be between 1 and 100 characters' })
  readonly label?: string;
}

export class CreateBatchCaptureData {
  @IsArray()
  @ArrayMinSize(2, {
    message: 'At least 2 URLs are required for batch testing',
  })
  @ArrayMaxSize(50, { message: 'Maximum 50 URLs allowed per batch' })
  @ValidateNested({ each: true })
  @Type(() => UrlWithLabel)
  readonly urls: UrlWithLabel[];

  @IsOptional()
  @IsString()
  @IsIn(['3g', '4g', '5g', 'wifi', 'none'], {
    message: 'networkType must be one of: 3g, 4g, 5g, wifi, none',
  })
  readonly networkType?: string = 'wifi';

  @IsOptional()
  @IsString()
  @IsValidDevice()
  readonly deviceType?: DeviceType;

  @IsOptional()
  @IsString()
  @IsIn(['performance', 'screenshot', 'cookie'], {
    message: 'testType must be one of: performance, screenshot, cookie',
  })
  readonly testType?: 'performance' | 'screenshot' | 'cookie' = 'performance';

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  readonly includeScreenshots?: boolean = true;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  readonly sequential?: boolean = false; // false = parallel, true = sequential

  @IsOptional()
  @IsString()
  @Length(1, 100, { message: 'batchId must be between 1 and 100 characters' })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message:
      'batchId can only contain alphanumeric characters, hyphens, and underscores',
  })
  readonly batchId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 200, { message: 'batchName must be between 1 and 200 characters' })
  readonly batchName?: string;
}

export class BatchCaptureQuery {
  @IsString()
  @IsNotEmpty()
  readonly urls: string; // Comma-separated URLs

  @IsOptional()
  @IsString()
  readonly labels?: string; // Comma-separated labels

  @IsOptional()
  @IsString()
  @IsIn(['performance', 'screenshot', 'cookie'], {
    message: 'testType must be one of: performance, screenshot, cookie',
  })
  readonly testType?: 'performance' | 'screenshot' | 'cookie' = 'performance';

  @IsOptional()
  @IsString()
  @IsValidDevice()
  readonly deviceType?: string = 'desktop';

  @IsOptional()
  @IsString()
  @IsIn(['true', 'false'], {
    message: 'sequential must be either "true" or "false"',
  })
  readonly sequential?: string = 'false';

  @IsOptional()
  @IsString()
  @IsIn(['true', 'false'], {
    message: 'includeScreenshots must be either "true" or "false"',
  })
  readonly includeScreenshots?: string = 'true';

  @IsOptional()
  @IsString()
  @Length(1, 200, { message: 'batchName must be between 1 and 200 characters' })
  readonly batchName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100, { message: 'batchId must be between 1 and 100 characters' })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message:
      'batchId can only contain alphanumeric characters, hyphens, and underscores',
  })
  readonly batchId?: string;
}
