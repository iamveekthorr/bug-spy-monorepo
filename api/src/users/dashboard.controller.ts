import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '~/auth/guards/jwt.guard';
import { CurrentUser } from '~/auth/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';
import { ScheduleService } from './schedule.service';
import {
  GetTestsQueryDto,
  CreateScheduleDto,
  UpdateScheduleDto,
  PerformanceAnalyticsQueryDto,
} from '~/dto/dashboard.dto';

interface AuthenticatedUser {
  id: string;
  email: string;
}

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(
    private readonly dashboardService: DashboardService,
    private readonly scheduleService: ScheduleService,
  ) {}

  /**
   * GET /dashboard/stats
   * Get comprehensive dashboard statistics
   */
  @Get('stats')
  @HttpCode(HttpStatus.OK)
  async getDashboardStats(@CurrentUser() user: AuthenticatedUser) {
    this.logger.log(`Getting dashboard stats for user: ${user.email}`);
    return this.dashboardService.getDashboardStats(user.id);
  }

  /**
   * GET /dashboard/tests
   * Get paginated and filtered tests
   */
  @Get('tests')
  @HttpCode(HttpStatus.OK)
  async getUserTests(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetTestsQueryDto,
  ) {
    this.logger.log(
      `Getting tests for user: ${user.email}, page: ${query.page}, limit: ${query.limit}`,
    );
    return this.dashboardService.getUserTestsPaginated(user.id, query);
  }

  /**
   * GET /dashboard/tests/:id
   * Get a single test result by ID
   */
  @Get('tests/:id')
  @HttpCode(HttpStatus.OK)
  async getTestById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') testId: string,
  ) {
    this.logger.log(`Getting test ${testId} for user: ${user.email}`);
    return this.dashboardService.getTestById(user.id, testId);
  }

  /**
   * DELETE /dashboard/tests/:id
   * Delete a test result
   */
  @Delete('tests/:id')
  @HttpCode(HttpStatus.OK)
  async deleteTest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') testId: string,
  ) {
    this.logger.log(`Deleting test ${testId} for user: ${user.email}`);
    return this.dashboardService.deleteTest(user.id, testId);
  }

  /**
   * PATCH /dashboard/tests/:id/archive
   * Archive a test result
   */
  @Patch('tests/:id/archive')
  @HttpCode(HttpStatus.OK)
  async archiveTest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') testId: string,
  ) {
    this.logger.log(`Archiving test ${testId} for user: ${user.email}`);
    return this.dashboardService.archiveTest(user.id, testId);
  }

  /**
   * GET /dashboard/analytics/performance
   * Get performance analytics over time
   */
  @Get('analytics/performance')
  @HttpCode(HttpStatus.OK)
  async getPerformanceAnalytics(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PerformanceAnalyticsQueryDto,
  ) {
    this.logger.log(
      `Getting performance analytics for user: ${user.email}, period: ${query.period}`,
    );
    return this.dashboardService.getPerformanceAnalytics(user.id, query);
  }

  // ==================== SCHEDULE ENDPOINTS ====================

  /**
   * POST /dashboard/schedules
   * Create a new test schedule
   */
  @Post('schedules')
  @HttpCode(HttpStatus.CREATED)
  async createSchedule(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateScheduleDto,
  ) {
    this.logger.log(
      `Creating schedule for user: ${user.email}, name: ${dto.name}`,
    );
    return this.scheduleService.createSchedule(user.id, dto);
  }

  /**
   * GET /dashboard/schedules
   * Get all schedules for the user
   */
  @Get('schedules')
  @HttpCode(HttpStatus.OK)
  async getUserSchedules(@CurrentUser() user: AuthenticatedUser) {
    this.logger.log(`Getting schedules for user: ${user.email}`);
    return this.scheduleService.getUserSchedules(user.id);
  }

  /**
   * GET /dashboard/schedules/:id
   * Get a single schedule by ID
   */
  @Get('schedules/:id')
  @HttpCode(HttpStatus.OK)
  async getScheduleById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') scheduleId: string,
  ) {
    this.logger.log(`Getting schedule ${scheduleId} for user: ${user.email}`);
    return this.scheduleService.getScheduleById(user.id, scheduleId);
  }

  /**
   * PUT /dashboard/schedules/:id
   * Update a schedule
   */
  @Put('schedules/:id')
  @HttpCode(HttpStatus.OK)
  async updateSchedule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') scheduleId: string,
    @Body() dto: UpdateScheduleDto,
  ) {
    this.logger.log(`Updating schedule ${scheduleId} for user: ${user.email}`);
    return this.scheduleService.updateSchedule(user.id, scheduleId, dto);
  }

  /**
   * DELETE /dashboard/schedules/:id
   * Delete a schedule
   */
  @Delete('schedules/:id')
  @HttpCode(HttpStatus.OK)
  async deleteSchedule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') scheduleId: string,
  ) {
    this.logger.log(`Deleting schedule ${scheduleId} for user: ${user.email}`);
    return this.scheduleService.deleteSchedule(user.id, scheduleId);
  }

  /**
   * PATCH /dashboard/schedules/:id/toggle
   * Toggle schedule active status
   */
  @Patch('schedules/:id/toggle')
  @HttpCode(HttpStatus.OK)
  async toggleSchedule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') scheduleId: string,
  ) {
    this.logger.log(`Toggling schedule ${scheduleId} for user: ${user.email}`);
    return this.scheduleService.toggleSchedule(user.id, scheduleId);
  }
}
