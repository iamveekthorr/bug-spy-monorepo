import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsIn,
  IsNumber,
  Min,
  Max,
  IsDateString,
  IsBoolean,
  ValidateNested,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

/**
 * DTO for querying tests with pagination and filters
 */
export class GetTestsQueryDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  @Transform(({ value }) => parseInt(value, 10))
  readonly page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @Transform(({ value }) => parseInt(value, 10))
  readonly limit?: number = 10;

  @IsOptional()
  @IsString()
  @IsIn(['completed', 'failed', 'running', 'all'], {
    message: 'status must be one of: completed, failed, running, all',
  })
  readonly status?: 'completed' | 'failed' | 'running' | 'all' = 'all';

  @IsOptional()
  @IsString()
  @IsIn(['performance', 'screenshot', 'cookie', 'all'], {
    message: 'testType must be one of: performance, screenshot, cookie, all',
  })
  readonly testType?: 'performance' | 'screenshot' | 'cookie' | 'all' = 'all';

  @IsOptional()
  @IsString()
  @IsIn(['desktop', 'mobile', 'tablet', 'all'], {
    message: 'deviceType must be one of: desktop, mobile, tablet, all',
  })
  readonly deviceType?: 'desktop' | 'mobile' | 'tablet' | 'all' = 'all';

  @IsOptional()
  @IsDateString()
  readonly startDate?: string;

  @IsOptional()
  @IsDateString()
  readonly endDate?: string;

  @IsOptional()
  @IsString()
  @IsIn(['createdAt', 'updatedAt', 'url', 'status'], {
    message: 'sortBy must be one of: createdAt, updatedAt, url, status',
  })
  readonly sortBy?: 'createdAt' | 'updatedAt' | 'url' | 'status' = 'createdAt';

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'], {
    message: 'sortOrder must be either asc or desc',
  })
  readonly sortOrder?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @IsString()
  readonly search?: string; // Search by URL
}

/**
 * DTO for creating a scheduled test
 */
export class CreateScheduleDto {
  @IsNotEmpty()
  @IsString()
  readonly name: string;

  @IsNotEmpty()
  @IsString()
  readonly url: string;

  @IsNotEmpty()
  @IsString()
  @IsIn(['hourly', 'daily', 'weekly', 'monthly'], {
    message: 'frequency must be one of: hourly, daily, weekly, monthly',
  })
  readonly frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';

  @IsOptional()
  @IsString()
  @IsIn(['performance', 'screenshot', 'cookie'], {
    message: 'testType must be one of: performance, screenshot, cookie',
  })
  readonly testType?: 'performance' | 'screenshot' | 'cookie' = 'performance';

  @IsOptional()
  @IsString()
  @IsIn(['desktop', 'mobile', 'tablet'], {
    message: 'deviceType must be one of: desktop, mobile, tablet',
  })
  readonly deviceType?: 'desktop' | 'mobile' | 'tablet' = 'desktop';

  @IsOptional()
  @IsBoolean()
  readonly includeScreenshots?: boolean = true;

  @IsOptional()
  @IsString()
  readonly description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  readonly tags?: string[];
}

/**
 * DTO for updating a scheduled test
 */
export class UpdateScheduleDto {
  @IsOptional()
  @IsString()
  readonly name?: string;

  @IsOptional()
  @IsString()
  readonly url?: string;

  @IsOptional()
  @IsString()
  @IsIn(['hourly', 'daily', 'weekly', 'monthly'], {
    message: 'frequency must be one of: hourly, daily, weekly, monthly',
  })
  readonly frequency?: 'hourly' | 'daily' | 'weekly' | 'monthly';

  @IsOptional()
  @IsString()
  @IsIn(['performance', 'screenshot', 'cookie'], {
    message: 'testType must be one of: performance, screenshot, cookie',
  })
  readonly testType?: 'performance' | 'screenshot' | 'cookie';

  @IsOptional()
  @IsString()
  @IsIn(['desktop', 'mobile', 'tablet'], {
    message: 'deviceType must be one of: desktop, mobile, tablet',
  })
  readonly deviceType?: 'desktop' | 'mobile' | 'tablet';

  @IsOptional()
  @IsBoolean()
  readonly isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  readonly includeScreenshots?: boolean;

  @IsOptional()
  @IsString()
  readonly description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  readonly tags?: string[];
}

/**
 * DTO for dashboard statistics response
 */
export class DashboardStatsResponseDto {
  @IsNumber()
  readonly totalTests: number;

  @IsNumber()
  readonly testsThisMonth: number;

  @IsNumber()
  readonly averageScore: number;

  @IsNumber()
  readonly criticalIssues: number;

  @IsOptional()
  readonly changes?: {
    totalTests: {
      value: number;
      percentage: number;
      trend: 'up' | 'down' | 'neutral';
    };
    testsThisMonth: {
      value: number;
      percentage: number;
      trend: 'up' | 'down' | 'neutral';
    };
    averageScore: {
      value: number;
      percentage: number;
      trend: 'up' | 'down' | 'neutral';
    };
    criticalIssues: {
      value: number;
      percentage: number;
      trend: 'up' | 'down' | 'neutral';
    };
  };

  @IsOptional()
  readonly performanceTrend?: {
    thisWeek: number;
    thisMonth: number;
    lastThreeMonths: number;
  };

  @IsOptional()
  readonly testsByStatus?: {
    completed: number;
    failed: number;
    running: number;
  };

  @IsOptional()
  readonly testsByType?: {
    performance: number;
    screenshot: number;
    cookie: number;
  };
}

/**
 * DTO for paginated test results response
 */
export class PaginatedTestsResponseDto {
  @IsArray()
  readonly data: any[];

  @IsNumber()
  readonly total: number;

  @IsNumber()
  readonly page: number;

  @IsNumber()
  readonly limit: number;

  @IsNumber()
  readonly totalPages: number;

  @IsOptional()
  readonly hasNextPage?: boolean;

  @IsOptional()
  readonly hasPreviousPage?: boolean;
}

/**
 * DTO for test detail response
 */
export class TestDetailResponseDto {
  @IsString()
  readonly id: string;

  @IsString()
  readonly url: string;

  @IsString()
  readonly status: string;

  @IsDateString()
  readonly createdAt: string;

  @IsOptional()
  @IsDateString()
  readonly completedAt?: string;

  @IsString()
  readonly testType: string;

  @IsString()
  readonly deviceType: string;

  @IsOptional()
  readonly results?: {
    webMetrics?: any;
    screenshots?: any[];
    cookieHandling?: any;
    errors?: string[];
    duration?: number;
    summary?: any;
  };

  @IsOptional()
  readonly testConfig?: {
    deviceType?: string;
    testType?: string;
    includeScreenshots?: boolean;
    networkType?: string;
    testId?: string;
  };

  @IsOptional()
  @IsString()
  readonly testName?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  readonly tags?: string[];
}

/**
 * DTO for deleting a test result
 */
export class DeleteTestDto {
  @IsNotEmpty()
  @IsString()
  readonly testId: string;
}

/**
 * DTO for bulk operations on tests
 */
export class BulkTestOperationDto {
  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  readonly testIds: string[];

  @IsNotEmpty()
  @IsString()
  @IsIn(['delete', 'archive', 'export'], {
    message: 'operation must be one of: delete, archive, export',
  })
  readonly operation: 'delete' | 'archive' | 'export';
}

/**
 * DTO for performance analytics query
 */
export class PerformanceAnalyticsQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(['7d', '30d', '90d', '1y'], {
    message: 'period must be one of: 7d, 30d, 90d, 1y',
  })
  readonly period?: '7d' | '30d' | '90d' | '1y' = '30d';

  @IsOptional()
  @IsString()
  @IsIn(['performance', 'screenshot', 'cookie', 'all'], {
    message: 'testType must be one of: performance, screenshot, cookie, all',
  })
  readonly testType?: 'performance' | 'screenshot' | 'cookie' | 'all' = 'all';

  @IsOptional()
  @IsString()
  readonly url?: string; // Filter by specific URL
}
