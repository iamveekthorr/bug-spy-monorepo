import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import { SCHEMA_OPTIONS } from '~/common/schema-options';
import { User } from '~/users/schema/user.schema';

export type TestResultDocument = HydratedDocument<TestResult>;

@Schema({
  toJSON: { ...SCHEMA_OPTIONS },
  toObject: {
    ...SCHEMA_OPTIONS,
  },
})
export class TestResult {
  _id: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User', index: true })
  userId: User;

  @Prop({ required: true, type: String, index: true })
  url: string;

  @Prop({ required: true, type: Date, default: Date.now })
  timestamp: Date;

  @Prop({ type: Object })
  results: {
    webMetrics?: Record<string, any>;
    screenshots?: Record<string, any>;
    cookieHandling?: Record<string, any>;
    errors?: string[];
    duration?: number;
    summary?: Record<string, any>;
  };

  @Prop({ type: Object })
  testConfig: {
    deviceType?: string;
    testType?: string;
    includeScreenshots?: boolean;
    networkType?: string;
    testId?: string;
  };

  @Prop({
    required: true,
    type: String,
    enum: ['completed', 'failed', 'running'],
    default: 'running',
    index: true,
  })
  status: string;

  @Prop({ type: String })
  testName?: string;

  @Prop({ type: [String], index: true })
  tags?: string[];

  @Prop({ type: Boolean, default: false })
  isArchived?: boolean;

  @Prop({ type: Date })
  completedAt?: Date;

  @Prop({ type: Number })
  performanceScore?: number;

  @Prop({ type: String })
  batchId?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const TestResultSchema = SchemaFactory.createForClass(TestResult);

// Add compound indexes for common query patterns
TestResultSchema.index({ userId: 1, createdAt: -1 }); // User's tests sorted by date
TestResultSchema.index({ userId: 1, status: 1 }); // User's tests by status
TestResultSchema.index({ userId: 1, 'testConfig.testType': 1 }); // User's tests by type
TestResultSchema.index({ userId: 1, 'testConfig.deviceType': 1 }); // User's tests by device
TestResultSchema.index({ userId: 1, isArchived: 1 }); // User's archived tests
TestResultSchema.index({ batchId: 1 }); // Batch test lookup
TestResultSchema.index({ createdAt: -1 }); // Recent tests
TestResultSchema.index({ performanceScore: 1 }); // Performance score queries
