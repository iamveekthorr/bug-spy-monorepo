import { Controller, Get, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '~/auth/guards/jwt.guard';
import { CurrentUser } from '~/auth/decorators/current-user.decorator';
import { UserService } from './user.service';

interface AuthenticatedUser {
  _id: string;
  email: string;
}

interface SyncTestDto {
  url: string;
  testType?: string;
  deviceType?: string;
  results: Record<string, unknown>;
  timestamp: number;
}

interface SyncTestsRequestDto {
  tests: SyncTestDto[];
}

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    // User object is already populated by AccessTokenStrategy
    return user;
  }

  @Get('dashboard/stats')
  async getDashboardStats(@CurrentUser() user: AuthenticatedUser) {
    const userId = user._id?.toString() || (user as any).id?.toString();
    return this.userService.getDashboardStats(userId);
  }

  @Get('tests')
  async getUserTests(@CurrentUser() user: AuthenticatedUser) {
    const userId = user._id?.toString() || (user as any).id?.toString();
    return this.userService.getUserTests(userId);
  }

  @Post('tests/sync')
  @HttpCode(HttpStatus.OK)
  async syncTests(
    @CurrentUser() user: AuthenticatedUser,
    @Body() syncData: SyncTestsRequestDto,
  ) {
    const userId = user._id?.toString() || (user as any).id?.toString();
    return this.userService.syncTestResults(userId, syncData.tests);
  }
}
