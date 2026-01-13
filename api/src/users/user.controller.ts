import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '~/auth/guards/jwt.guard';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: any) {
    return this.userService.getUserById(req.user.sub);
  }

  @Get('dashboard/stats')
  @UseGuards(JwtAuthGuard)
  async getDashboardStats(@Req() req: any) {
    return this.userService.getDashboardStats(req.user.sub);
  }

  @Get('tests')
  @UseGuards(JwtAuthGuard)
  async getUserTests(@Req() req: any) {
    return this.userService.getUserTests(req.user.sub);
  }
}
