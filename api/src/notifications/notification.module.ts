import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { NotificationService } from './notification.service';
import { EmailModule } from '~/common/email/email.module';
import {
  TestResult,
  TestResultSchema,
} from '~/capture-metrics/schemas/test-result.schema';
import { User, UserSchema } from '~/users/schema/user.schema';

@Module({
  imports: [
    EmailModule,
    MongooseModule.forFeature([
      { name: TestResult.name, schema: TestResultSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
