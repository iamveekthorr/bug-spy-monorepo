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

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: User;

  @Prop({ required: true, type: String })
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
  })
  status: string;

  @Prop({ type: String })
  testName?: string;

  @Prop({ type: [String] })
  tags?: string[];

  createdAt: Date;
  updatedAt: Date;
}

export const TestResultSchema = SchemaFactory.createForClass(TestResult);
