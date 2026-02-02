import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Exclude } from 'class-transformer';

import { SCHEMA_OPTIONS } from '~/common/schema-options';

export type UserDocument = HydratedDocument<User>;

@Schema({
  toJSON: { ...SCHEMA_OPTIONS },
  toObject: {
    ...SCHEMA_OPTIONS,
  },
})
export class User {
  _id: string;

  @Prop({ required: true, type: String, unique: true })
  email: string;

  @Exclude({ toPlainOnly: true })
  @Prop({ required: false, type: String, select: false })
  password: string;

  @Prop({
    required: true,
    type: String,
    enum: ['local', 'google', 'github'],
    default: 'local',
  })
  provider: string = 'local';

  @Prop({ required: false, type: String })
  providerId: string;

  @Prop({ required: false, type: String })
  displayName: string;

  @Prop({ required: false, type: String })
  avatar: string;

  @Prop({
    required: true,
    type: String,
    enum: ['free', 'basic', 'premium'],
    default: 'free',
  })
  subscription: string = 'free';

  // Password reset fields
  @Exclude({ toPlainOnly: true })
  @Prop({ required: false, type: String, select: false })
  resetPasswordToken: string; // Hashed token

  @Exclude({ toPlainOnly: true })
  @Prop({ required: false, type: Date, select: false })
  resetPasswordExpires: Date;

  @Exclude({ toPlainOnly: true })
  @Prop({ required: false, type: Number, default: 0, select: false })
  resetPasswordAttempts: number; // Rate limiting

  @Exclude({ toPlainOnly: true })
  @Prop({ required: false, type: Date, select: false })
  lastResetPasswordRequest: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Add indexes for common query patterns
// Note: email already has a unique index from @Prop decorator
UserSchema.index({ subscription: 1 }); // Index for subscription queries
UserSchema.index({ createdAt: -1 }); // Index for date-based queries
UserSchema.index({ provider: 1, providerId: 1 }, { unique: true, sparse: true }); // Unique provider+providerId combination
