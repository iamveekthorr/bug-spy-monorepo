import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from '~/auth/auth.module';
import { UserController } from './user.controller';
import { DashboardController } from './dashboard.controller';
import { UserService } from './user.service';
import { DashboardService } from './dashboard.service';
import { ScheduleService } from './schedule.service';
import { User, UserSchema } from './schema/user.schema';
import { TestResult, TestResultSchema } from '~/capture-metrics/schemas/test-result.schema';
import { TestSchedule, TestScheduleSchema } from '~/capture-metrics/schemas/test-schedule.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: TestResult.name, schema: TestResultSchema },
      { name: TestSchedule.name, schema: TestScheduleSchema },
    ]),
    forwardRef(() => AuthModule),
  ],
  controllers: [UserController, DashboardController],
  providers: [UserService, DashboardService, ScheduleService],
  exports: [UserService, DashboardService, ScheduleService],
})
export class UsersModule {}
