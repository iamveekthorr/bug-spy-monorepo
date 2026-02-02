import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import { SCHEMA_OPTIONS } from '~/common/schema-options';
import { User } from '~/users/schema/user.schema';

export type TestScheduleDocument = HydratedDocument<TestSchedule>;

@Schema({
  toJSON: { ...SCHEMA_OPTIONS },
  toObject: {
    ...SCHEMA_OPTIONS,
  },
})
export class TestSchedule {
  _id: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User', index: true })
  userId: User;

  @Prop({ required: true, type: String })
  name: string;

  @Prop({ required: true, type: String })
  url: string;

  @Prop({
    required: true,
    type: String,
    enum: ['hourly', 'daily', 'weekly', 'monthly'],
  })
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';

  @Prop({
    required: true,
    type: String,
    enum: ['performance', 'screenshot', 'cookie'],
    default: 'performance',
  })
  testType: 'performance' | 'screenshot' | 'cookie';

  @Prop({
    required: true,
    type: String,
    enum: ['desktop', 'mobile', 'tablet'],
    default: 'desktop',
  })
  deviceType: 'desktop' | 'mobile' | 'tablet';

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Boolean, default: true })
  includeScreenshots: boolean;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: [String], index: true })
  tags?: string[];

  @Prop({ type: Date, required: true })
  nextRun: Date;

  @Prop({ type: Date })
  lastRun?: Date;

  @Prop({ type: String })
  lastRunTestId?: string;

  @Prop({ type: String, enum: ['success', 'failed', 'pending'], default: 'pending' })
  lastRunStatus?: 'success' | 'failed' | 'pending';

  @Prop({ type: Number, default: 0 })
  totalRuns: number;

  @Prop({ type: Number, default: 0 })
  successfulRuns: number;

  @Prop({ type: Number, default: 0 })
  failedRuns: number;

  createdAt: Date;
  updatedAt: Date;
}

export const TestScheduleSchema = SchemaFactory.createForClass(TestSchedule);

// Add compound indexes for common query patterns
TestScheduleSchema.index({ userId: 1, isActive: 1 }); // User's active schedules
TestScheduleSchema.index({ userId: 1, createdAt: -1 }); // User's schedules sorted by date
TestScheduleSchema.index({ nextRun: 1, isActive: 1 }); // Scheduled jobs to run
TestScheduleSchema.index({ userId: 1, frequency: 1 }); // User's schedules by frequency
